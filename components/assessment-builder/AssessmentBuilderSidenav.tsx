import Link from 'next/link';

export function AssessmentBuilderSidenav() {
  return (
    <nav className="ab-snav" aria-label="Assessment Builder">
      <div className="ab-snav-logo">S</div>
      <div className="ab-snav-items">
        <Link href="/guide/assessment-builder" className="ab-snav-btn on" title="Assessments">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
