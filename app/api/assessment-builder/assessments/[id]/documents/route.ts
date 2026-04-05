import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';
import { validateAssessmentUploadSizes } from '@/lib/assessment-builder-upload-limits';
import { uploadAssessmentDocument } from '@/lib/assessment-builder-storage';

export const runtime = 'nodejs';

/** List documents with extracted text for transcript drawer (stub user only). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const assessmentId = id?.trim();
    if (!assessmentId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const row = await prisma.assessments.findFirst({
      where: { id: assessmentId, created_by: STUB_USER_ID, deleted_at: null },
      select: { id: true },
    });
    if (!row) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const documents = await prisma.assessment_documents.findMany({
      where: { assessment_id: assessmentId },
      select: { id: true, filename: true, extracted_text: true },
      orderBy: { uploaded_at: 'asc' },
    });

    return NextResponse.json({
      documents: documents.map((d) => ({
        id: d.id,
        filename: d.filename,
        extracted_text: d.extracted_text,
      })),
    });
  } catch (e) {
    console.error('[assessment-builder/assessments/[id]/documents] GET', e);
    return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
  }
}

/** Append documents to an existing assessment (multipart: files[]). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const assessmentId = id?.trim();
    if (!assessmentId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const row = await prisma.assessments.findFirst({
      where: { id: assessmentId, created_by: STUB_USER_ID, deleted_at: null },
      select: { id: true },
    });
    if (!row) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const form = await request.formData();
    const files = form.getAll('files').filter((x): x is File => x instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const sizes = files.map((f) => f.size);
    const limit = validateAssessmentUploadSizes(sizes);
    if (!limit.ok) {
      return NextResponse.json({ error: limit.error }, { status: 400 });
    }

    const created: { id: string; filename: string }[] = [];
    for (const file of files) {
      const { storagePath } = await uploadAssessmentDocument({
        assessmentId,
        file,
      });
      const doc = await prisma.assessment_documents.create({
        data: {
          assessment_id: assessmentId,
          filename: file.name,
          file_size: file.size,
          storage_path: storagePath,
        },
        select: { id: true, filename: true },
      });
      created.push({ id: doc.id, filename: doc.filename });
    }

    await prisma.assessments.update({
      where: { id: assessmentId },
      data: { updated_at: new Date() },
    });

    return NextResponse.json({ ok: true, documents: created });
  } catch (e) {
    console.error('[assessment-builder/assessments/[id]/documents] POST', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
