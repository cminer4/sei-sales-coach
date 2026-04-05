import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/prisma';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';
import { anthropicMessageText, ASSESSMENT_BUILDER_MODEL } from '@/lib/assessment-builder-anthropic';
import { parseDraftJsonString } from '@/lib/assessment-builder-draft-schema';
import { persistAssessmentDraft } from '@/lib/assessment-builder-persist-draft';
import { getAssessmentBuilderAgent } from '@/lib/assessment-builder-agent';
import {
  buildAssessmentDraftGenerationSystemFallback,
  buildAssessmentDraftGenerationUserContent,
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
    let body: { assessmentId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const assessmentId = body.assessmentId?.trim();
    if (!assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required' }, { status: 400 });
    }

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
      retrieveAssessmentChunks(assessmentId, queryText, 8),
      retrieveKbChunksForBuilder(queryText, 4),
    ]);

    const agent = await getAssessmentBuilderAgent();
    const systemPrompt =
      agent?.prompt?.trim() || buildAssessmentDraftGenerationSystemFallback();
    const userContent = buildAssessmentDraftGenerationUserContent({
      clientName: row.client_name,
      projectBrief: row.project_brief,
      stakeholders: row.stakeholders,
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
    let draft;
    try {
      draft = parseDraftJsonString(raw);
    } catch (parseErr) {
      console.error('[assessment-builder/generate-draft] JSON parse', parseErr);
      return NextResponse.json(
        { error: 'Draft generation returned invalid JSON' },
        { status: 502 },
      );
    }

    const saved = await persistAssessmentDraft({
      assessmentId,
      createdBy: STUB_USER_ID,
      draft,
    });
    if (!saved) {
      return NextResponse.json({ error: 'Failed to persist draft' }, { status: 500 });
    }

    return NextResponse.json({ draft });
  } catch (e) {
    console.error('[assessment-builder/generate-draft]', e);
    return NextResponse.json({ error: 'Generate draft failed' }, { status: 500 });
  }
}
