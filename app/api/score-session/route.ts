/**
 * POST /api/score-session
 * Scores a session transcript using the active SPIN Sales Coach prompt from the DB
 * and returns a structured JSON scorecard. When present, KB evaluation_criteria
 * documents (assigned to the active agent) are injected above the transcript as rubric.
 *
 * Transcript source (when called after demo): Client reads localStorage.spinTranscript
 * and sends it in the POST body. That value is set on the SPIN session page
 * (app/coach/spin/session/page.tsx) in a useEffect that builds it from the `messages`
 * state (turn-by-turn "Coach: ... / Rep: ..."). So only text-mode turns are included;
 * voice-only conversation does not update `messages`, so transcript can be empty/short.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/prisma';
import { getActiveSpinCoachPromptAndAgentId } from '@/lib/agents';
import { FALLBACK_RUBRIC, SCORING_PROMPTS, VALID_SESSION_TYPES } from '@/lib/scoringPrompts';
import { logSystemEvent } from '@/lib/logSystemEvent';

const NO_ACTIVE_AGENT_MESSAGE =
  'No active SPIN Sales Coach agent found. Set status to active in Prompt Control.';

/**
 * Prepares raw model output for JSON.parse: trim, strip markdown fences,
 * and extract only the substring from first { to last }.
 */
function prepareForJsonParse(raw: string): string {
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences (multiline)
  s = s.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  // Keep only from first { to last } so we don't fail on leading/trailing text
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  return s.trim();
}

export async function POST(request: NextRequest) {
  try {
    let body: { transcript?: string; sessionType?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const transcript = body.transcript;
    const sessionType = body.sessionType;

    if (transcript === undefined || transcript === null) {
      return NextResponse.json(
        { error: 'transcript is required' },
        { status: 400 }
      );
    }
    if (sessionType === undefined || sessionType === null || typeof sessionType !== 'string') {
      return NextResponse.json(
        { error: 'sessionType is required' },
        { status: 400 }
      );
    }
    if (!VALID_SESSION_TYPES.includes(sessionType as (typeof VALID_SESSION_TYPES)[number])) {
      return NextResponse.json(
        { error: 'sessionType must be one of: outreach_15, outreach_30, discovery_15, discovery_30' },
        { status: 400 }
      );
    }

    // Debug: verify transcript being evaluated (client sends from localStorage.spinTranscript)
    const transcriptLength = typeof transcript === 'string' ? transcript.length : 0;
    const transcriptPreview = typeof transcript === 'string' ? transcript.slice(0, 500) : String(transcript);
    console.log('[score-session] transcript length:', transcriptLength, '| first 500 chars:', transcriptPreview);

    let systemPrompt: string;
    let agentUuid: string;
    try {
      const active = await getActiveSpinCoachPromptAndAgentId();
      systemPrompt = active.prompt;
      agentUuid = active.agentId;
    } catch (err) {
      console.error('Score session: failed to fetch active SPIN agent (prompt + id)', err);
      return NextResponse.json(
        { error: NO_ACTIVE_AGENT_MESSAGE },
        { status: 404 }
      );
    }

    let evalDocs: { id: string; content: string }[] = [];
    let evalError: string | null = null;
    console.log('[score-session] fetching eval docs for agentId:', agentUuid);
    try {
      evalDocs = await prisma.knowledgeBaseDocument.findMany({
        where: {
          category: 'evaluation_criteria',
          status: 'published',
          OR: [
            { agents: { has: 'all' } },
            { agents: { has: agentUuid } },
          ],
        },
        orderBy: { weight: 'desc' },
        select: { id: true, content: true },
      });
    } catch (err) {
      evalError = err instanceof Error ? err.message : String(err);
      console.error('Score session: failed to fetch evaluation criteria docs', err);
      await logSystemEvent({
        route: '/api/score-session',
        event_type: 'eval_docs_retrieval_error',
        severity: 'error',
        agent_id: agentUuid,
        message: 'Prisma error retrieving eval docs from KB.',
        metadata: { error: evalError, agentUuid },
      });
    }

    console.log('[score-session] eval docs retrieved:', {
      count: evalDocs?.length ?? 0,
      ids: evalDocs?.map((d) => d.id) ?? [],
      error: evalError,
    });

    let rubric: string =
      evalDocs && evalDocs.length > 0
        ? evalDocs.map((d) => d.content).join('\n\n')
        : '';
    if (!evalDocs || evalDocs.length === 0) {
      console.warn('[score-session] no eval docs found, falling back to hardcoded rubric');
      rubric = FALLBACK_RUBRIC;
      await logSystemEvent({
        route: '/api/score-session',
        event_type: 'eval_docs_fallback',
        severity: 'warn',
        agent_id: agentUuid,
        message: 'No evaluation criteria docs found in KB. Fell back to hardcoded rubric.',
        metadata: { agentUuid, sessionType },
      });
    }
    const transcriptBlock =
      `${rubric}\n\n<transcript>\n${String(transcript)}\n</transcript>`;

    const template = SCORING_PROMPTS[sessionType];
    if (!template) {
      return NextResponse.json(
        { error: 'Invalid session type' },
        { status: 400 }
      );
    }
    const userMessage = template.replace('{{TRANSCRIPT}}', transcriptBlock);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Scoring service is not configured' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });
    let responseText: string;
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      const block = response.content.find((c) => c.type === 'text');
      responseText = block && 'text' in block ? block.text : '';
    } catch (err) {
      console.error('Score session: Anthropic API error', err);
      return NextResponse.json(
        { error: 'Scoring request failed. Please try again.' },
        { status: 500 }
      );
    }

    // Log raw response for debugging when parsing fails
    console.log('Score session: raw API response text (length=%d):', responseText.length, responseText);

    const stripped = prepareForJsonParse(responseText);
    let scorecard: unknown;
    try {
      scorecard = JSON.parse(stripped);
    } catch (parseErr) {
      console.error('Score session: invalid JSON from model. Stripped length=%d:', stripped.length, parseErr);
      return NextResponse.json(
        { error: 'Scoring response could not be parsed' },
        { status: 500 }
      );
    }

    return NextResponse.json(scorecard);
  } catch (error) {
    console.error('[score-session] fatal error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
