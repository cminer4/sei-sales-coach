import { notFound } from 'next/navigation';
import { AssessmentPublishedView } from '@/components/assessment-builder/AssessmentPublishedView';
import { getPublishedViewData } from '@/lib/assessment-builder-queries';

export default async function AssessmentPublishedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPublishedViewData(id);
  if (!data) {
    notFound();
  }

  return (
    <div className="ab-workspace-page">
      <AssessmentPublishedView
        assessmentId={data.id}
        clientName={data.clientName}
        draftContent={data.draftContent}
        versions={data.versions}
      />
    </div>
  );
}
