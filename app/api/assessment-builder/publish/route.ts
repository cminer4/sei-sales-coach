import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';
import { parseDraftObject } from '@/lib/assessment-builder-draft-schema';
import { draftSummaryOneLine, nextPublishVersion } from '@/lib/assessment-builder-versioning';

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

    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.assessments.findFirst({
        where: { id: assessmentId, created_by: STUB_USER_ID, deleted_at: null },
      });
      if (!row) {
        return { ok: false as const, reason: 'not_found' as const };
      }

      const latest = await tx.assessment_versions.findFirst({
        where: { assessment_id: assessmentId },
        orderBy: { created_at: 'desc' },
        select: { version_number: true },
      });
      const versionNumber = nextPublishVersion(latest?.version_number);
      const summary = draftSummaryOneLine(draft);

      await tx.assessments.update({
        where: { id: assessmentId },
        data: {
          draft_content: draft as object,
          status: 'draft_ready',
          updated_at: new Date(),
        },
      });

      await tx.assessment_versions.create({
        data: {
          assessment_id: assessmentId,
          version_number: versionNumber,
          content_json: draft as object,
          summary,
          created_by: STUB_USER_ID,
        },
      });

      return { ok: true as const, versionNumber };
    });

    if (!result.ok) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, versionNumber: result.versionNumber });
  } catch (e) {
    console.error('[assessment-builder/publish]', e);
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 });
  }
}
