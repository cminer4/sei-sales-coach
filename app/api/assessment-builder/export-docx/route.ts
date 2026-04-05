import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';
import { draftContentFromDb } from '@/lib/assessment-builder-draft-schema';
import {
  buildAssessmentDocx,
  discoveryAssessmentFilename,
  packAssessmentDocx,
} from '@/lib/assessment-builder-docx';

export const runtime = 'nodejs';

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

    const row = await prisma.assessments.findFirst({
      where: { id: assessmentId, created_by: STUB_USER_ID, deleted_at: null },
    });
    if (!row) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const draft = draftContentFromDb(row.draft_content);
    if (!draft) {
      return NextResponse.json({ error: 'No draft content' }, { status: 400 });
    }

    const doc = buildAssessmentDocx({ clientName: row.client_name }, draft);
    const buf = await packAssessmentDocx(doc);
    const filename = discoveryAssessmentFilename(row.client_name);

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error('[assessment-builder/export-docx]', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
