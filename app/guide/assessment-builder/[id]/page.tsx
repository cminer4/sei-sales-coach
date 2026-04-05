import { notFound } from 'next/navigation';
import { AssessmentBuilderWorkspace } from '@/components/assessment-builder/AssessmentBuilderWorkspace';
import { getAssessmentWorkspaceById } from '@/lib/assessment-builder-queries';

export default async function AssessmentBuilderWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assessment = await getAssessmentWorkspaceById(id);
  if (!assessment) {
    notFound();
  }

  return (
    <div className="ab-workspace-page">
      <AssessmentBuilderWorkspace
        assessment={{
          id: assessment.id,
          clientName: assessment.clientName,
          stakeholders: assessment.stakeholders,
          projectBrief: assessment.projectBrief,
          documents: assessment.documents,
          draftContent: assessment.draftContent,
        }}
      />
    </div>
  );
}
