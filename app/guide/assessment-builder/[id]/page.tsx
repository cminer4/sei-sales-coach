import Link from 'next/link';

export default async function AssessmentBuilderWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="ab-dash">
      <div className="ab-db-head" style={{ marginBottom: 16 }}>
        <h1 className="ab-serif">Assessment workspace</h1>
        <p>
          Draft generation and editor ship in the next slice. Assessment id:{' '}
          <code style={{ fontSize: 12 }}>{id}</code>
        </p>
      </div>
      <Link href="/guide/assessment-builder" className="ab-btn-new" style={{ display: 'inline-flex' }}>
        ← Back to dashboard
      </Link>
    </div>
  );
}
