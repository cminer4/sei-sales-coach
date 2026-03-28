import prisma from '@/lib/prisma';
import { draftContentFromDb } from '@/lib/assessment-builder-draft-schema';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';
import { assessmentToDashboardRow } from '@/lib/assessment-builder-dashboard';
import type { DraftContent } from '@/lib/assessment-builder-draft-types';

/** Dashboard list: Phase 1 stub user only (Decision 7). */
export async function getDashboardAssessments() {
  const rows = await prisma.assessments.findMany({
    where: { created_by: STUB_USER_ID },
    orderBy: { updated_at: 'desc' },
    include: {
      _count: { select: { assessment_documents: true } },
    },
  });
  return rows.map((a) =>
    assessmentToDashboardRow({
      id: a.id,
      clientName: a.client_name,
      stakeholders: a.stakeholders,
      status: a.status,
      updatedAt: a.updated_at,
      docCount: a._count.assessment_documents,
    }),
  );
}

export async function getAssessmentWorkspaceById(id: string) {
  const row = await prisma.assessments.findFirst({
    where: { id, created_by: STUB_USER_ID },
    include: {
      assessment_documents: { select: { id: true, filename: true } },
    },
  });
  if (!row) return null;
  const draftContent: DraftContent | null = draftContentFromDb(row.draft_content);
  return {
    id: row.id,
    clientName: row.client_name,
    stakeholders: row.stakeholders,
    projectBrief: row.project_brief,
    documents: row.assessment_documents,
    draftContent,
  };
}
