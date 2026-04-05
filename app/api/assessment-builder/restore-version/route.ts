import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';
import { parseDraftObject } from '@/lib/assessment-builder-draft-schema';

export async function POST(request: NextRequest) {
  try {
    let body: { assessmentId?: string; versionId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const assessmentId = body.assessmentId?.trim();
    const versionId = body.versionId?.trim();
    if (!assessmentId || !versionId) {
      return NextResponse.json(
        { error: 'assessmentId and versionId are required' },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const v = await tx.assessment_versions.findFirst({
        where: { id: versionId, assessment_id: assessmentId },
        include: { assessments: true },
      });
      if (
        !v ||
        v.assessments.created_by !== STUB_USER_ID ||
        v.assessments.deleted_at !== null
      ) {
        return { ok: false as const, reason: 'not_found' as const };
      }

      let draft;
      try {
        draft = parseDraftObject(v.content_json);
      } catch {
        return { ok: false as const, reason: 'invalid' as const };
      }

      await tx.assessments.update({
        where: { id: assessmentId },
        data: {
          draft_content: draft as object,
          updated_at: new Date(),
        },
      });

      return { ok: true as const };
    });

    if (!result.ok) {
      if (result.reason === 'invalid') {
        return NextResponse.json({ error: 'Invalid version content' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[assessment-builder/restore-version]', e);
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 });
  }
}
