import prisma from '@/lib/prisma';
import type { DraftContent } from '@/lib/assessment-builder-draft-types';

export async function persistAssessmentDraft(params: {
  assessmentId: string;
  createdBy: string;
  draft: DraftContent;
}): Promise<boolean> {
  const res = await prisma.assessments.updateMany({
    where: { id: params.assessmentId, created_by: params.createdBy, deleted_at: null },
    data: {
      draft_content: params.draft as object,
      updated_at: new Date(),
    },
  });
  return res.count === 1;
}
