import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/prisma';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';
import { anthropicMessageText, ASSESSMENT_BUILDER_MODEL } from '@/lib/assessment-builder-anthropic';
import type { DraftContent } from '@/lib/assessment-builder-draft-types';
import type { DraftSectionKey } from '@/lib/assessment-builder-draft-types';
import {
  mergeRefinedDraft,
  parseDraftObject,
  parseRefineJsonString,
} from '@/lib/assessment-builder-draft-schema';
import { persistAssessmentDraft } from '@/lib/assessment-builder-persist-draft';
import { getAssessmentBuilderAgent } from '@/lib/assessment-builder-agent';
import {
  buildAssessmentRefineSystemFallback,
  buildAssessmentRefineUserContent,
} from '@/lib/prompts';
import {
  buildRetrievalQueryText,
  retrieveAssessmentChunks,
  retrieveKbChunksForBuilder,
} from '@/lib/assessment-builder-retrieval';

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
  }

  try {
    let body: {
      assessmentId?: string;
      userMessage?: string;
      draft?: unknown;
      dirtySections?: string[];
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const assessmentId = body.assessmentId?.trim();
    const userMessage = body.userMessage?.trim();
    if (!assessmentId || !userMessage) {
      return NextResponse.json(
        { error: 'assessmentId and userMessage are required' },
        { status: 400 },
      );
    }

    let currentDraft: DraftContent;
    try {
      currentDraft = parseDraftObject(body.draft);
    } catch {
      return NextResponse.json({ error: 'Invalid draft payload' }, { status: 400 });
    }

    const dirtyRaw = Array.isArray(body.dirtySections) ? body.dirtySections : [];
    const dirtySections = dirtyRaw.filter(
      (s): s is DraftSectionKey =>
        typeof s === 'string' &&
        ['findings', 'interviews', 'hypothesis', 'stakeholder_map', 'opportunities'].includes(s),
    );

    const row = await prisma.assessments.findFirst({
      where: { id: assessmentId, created_by: STUB_USER_ID, deleted_at: null },
    });
    if (!row) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const queryText = buildRetrievalQueryText({
      clientName: row.client_name,
      projectBrief: row.project_brief,
      stakeholders: row.stakeholders,
    });

    const [assessmentChunks, kbChunks] = await Promise.all([
      retrieveAssessmentChunks(assessmentId, queryText + '\n' + userMessage, 8),
      retrieveKbChunksForBuilder(queryText + '\n' + userMessage, 4),
    ]);

    const agent = await getAssessmentBuilderAgent();
    const systemPrompt =
      agent?.prompt?.trim() || buildAssessmentRefineSystemFallback();
    const userContent = buildAssessmentRefineUserContent({
      clientName: row.client_name,
      projectBrief: row.project_brief,
      userMessage,
      currentDraft,
      dirtySections,
      assessmentChunks,
      kbChunks,
    });

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: ASSESSMENT_BUILDER_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const raw = anthropicMessageText(msg.content);
    let parsed;
    try {
      parsed = parseRefineJsonString(raw);
    } catch (parseErr) {
      console.error('[assessment-builder/refine-section] JSON parse', parseErr);
      return NextResponse.json(
        { error: 'Refine returned invalid JSON' },
        { status: 502 },
      );
    }

    const merged = mergeRefinedDraft(currentDraft, parsed, dirtySections);

    const saved = await persistAssessmentDraft({
      assessmentId,
      createdBy: STUB_USER_ID,
      draft: merged,
    });
    if (!saved) {
      return NextResponse.json({ error: 'Failed to persist draft' }, { status: 500 });
    }

    return NextResponse.json({
      draft: merged,
      suggestions: parsed.suggestions,
      reply:
        parsed.reply?.trim() ||
        'Thanks — I have updated the Discovery draft based on your input.',
    });
  } catch (e) {
    console.error('[assessment-builder/refine-section]', e);
    return NextResponse.json({ error: 'Refine failed' }, { status: 500 });
  }
}
