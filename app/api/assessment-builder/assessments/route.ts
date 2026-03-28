import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';
import { validateAssessmentUploadSizes } from '@/lib/assessment-builder-upload-limits';
import {
  uploadAssessmentDocument,
  getAssessmentBuilderBucket,
} from '@/lib/assessment-builder-storage';

export const runtime = 'nodejs';

function parseStakeholders(raw: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Phase 1 (SEI-42 Decision 7): open route, no session; created_by uses stub user.
 * Multipart: clientName, projectBrief?, stakeholders (JSON array string), intent (save_exit | create_draft), files[].
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const clientNameRaw = (form.get('clientName') as string) ?? '';
    const projectBrief = ((form.get('projectBrief') as string) ?? '').trim() || null;
    const stakeholders = parseStakeholders(form.get('stakeholders') as string | null);
    const intent = (form.get('intent') as string) ?? '';
    const files = form.getAll('files').filter((x): x is File => x instanceof File);

    if (intent !== 'save_exit' && intent !== 'create_draft') {
      return NextResponse.json({ error: 'Invalid intent.' }, { status: 400 });
    }

    const clientName = clientNameRaw.trim();
    if (intent === 'create_draft' && !clientName) {
      return NextResponse.json(
        { error: 'Client company is required to create a draft.' },
        { status: 400 },
      );
    }

    const sizes = files.map((f) => f.size);
    const limit = validateAssessmentUploadSizes(sizes);
    if (!limit.ok) {
      return NextResponse.json({ error: limit.error }, { status: 400 });
    }

    const status =
      intent === 'create_draft' ? 'in_progress' : 'new';

    const assessment = await prisma.assessments.create({
      data: {
        created_by: STUB_USER_ID,
        client_name: clientName || 'Untitled assessment',
        stakeholders,
        project_brief: projectBrief,
        status,
      },
    });

    for (const file of files) {
      const { storagePath } = await uploadAssessmentDocument({
        assessmentId: assessment.id,
        file,
      });
      await prisma.assessment_documents.create({
        data: {
          assessment_id: assessment.id,
          filename: file.name,
          file_size: file.size,
          storage_path: storagePath,
        },
      });
    }

    const redirect =
      intent === 'create_draft'
        ? `/guide/assessment-builder/${assessment.id}`
        : '/guide/assessment-builder';

    return NextResponse.json({
      id: assessment.id,
      redirect,
      storageBucket: getAssessmentBuilderBucket(),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to save assessment.';
    console.error('[assessment-builder] POST', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
