import { NextRequest, NextResponse } from 'next/server';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';
import { parseDraftObject } from '@/lib/assessment-builder-draft-schema';
import { persistAssessmentDraft } from '@/lib/assessment-builder-persist-draft';

export async function POST(request: NextRequest) {
  try {
    let body: { assessmentId?: string; draft?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const assessmentId = body.assessmentId?.trim();
    if (!assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required' }, { status: 400 });
    }

    let draft;
    try {
      draft = parseDraftObject(body.draft);
    } catch {
      return NextResponse.json({ error: 'Invalid draft payload' }, { status: 400 });
    }

    const saved = await persistAssessmentDraft({
      assessmentId,
      createdBy: STUB_USER_ID,
      draft,
    });
    if (!saved) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[assessment-builder/save-draft]', e);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
