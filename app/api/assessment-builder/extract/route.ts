import { NextRequest, NextResponse } from 'next/server';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';
import { runAssessmentExtractPipeline } from '@/lib/assessment-builder-extract-pipeline';

export async function POST(request: NextRequest) {
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

    const result = await runAssessmentExtractPipeline({
      assessmentId,
      createdBy: STUB_USER_ID,
    });

    if (result.errors.length && result.processedDocuments === 0 && result.skippedDocuments === 0) {
      return NextResponse.json(
        {
          ok: false,
          ...result,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[assessment-builder/extract]', e);
    return NextResponse.json({ error: 'Extract failed' }, { status: 500 });
  }
}
