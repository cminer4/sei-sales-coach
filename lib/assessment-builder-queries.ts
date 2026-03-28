import prisma from '@/lib/prisma';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';
import { assessmentToDashboardRow } from '@/lib/assessment-builder-dashboard';

/** Dashboard list: Phase 1 stub user only (Decision 7). */
export async function getDashboardAssessments() {
  const rows = await prisma.assessment.findMany({
    where: { createdBy: STUB_USER_ID },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { documents: true } },
    },
  });
  return rows.map((a) =>
    assessmentToDashboardRow({
      id: a.id,
      clientName: a.clientName,
      stakeholders: a.stakeholders,
      status: a.status,
      updatedAt: a.updatedAt,
      docCount: a._count.documents,
    }),
  );
}

export async function getAssessmentWorkspaceById(id: string) {
  return prisma.assessment.findFirst({
    where: { id, createdBy: STUB_USER_ID },
    include: {
      documents: { select: { id: true, filename: true } },
    },
  });
}
