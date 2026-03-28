import { AssessmentDashboard } from '@/components/assessment-builder/AssessmentDashboard';
import { getDashboardAssessments } from '@/lib/assessment-builder-queries';

export const dynamic = 'force-dynamic';

export default async function AssessmentBuilderDashboardPage() {
  const initialRows = await getDashboardAssessments();
  return <AssessmentDashboard initialRows={initialRows} />;
}
