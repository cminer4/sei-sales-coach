'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { buildFullEditorHtml } from '@/lib/assessment-builder-document-html';
import type { DraftContent } from '@/lib/assessment-builder-draft-types';
import { discoveryAssessmentFilename } from '@/lib/assessment-builder-docx';
import type { PublishedViewVersion } from '@/lib/assessment-builder-queries';
import { FinalizeToast } from './FinalizeToast';

function emptyDraft(): DraftContent {
  const p = '<p></p>';
  return {
    findings: p,
    interviews: p,
    hypothesis: p,
    stakeholder_map: p,
    opportunities: p,
  };
}

function formatVersionTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

type Props = {
  assessmentId: string;
  clientName: string;
  draftContent: DraftContent | null;
  versions: PublishedViewVersion[];
};

export function AssessmentPublishedView({ assessmentId, clientName, draftContent, versions }: Props) {
  const router = useRouter();
  const draft = draftContent ?? emptyDraft();
  const html = buildFullEditorHtml(clientName, draft, { readOnly: true });

  const [downloading, setDownloading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ versionLabel: string } | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const currentVersionLabel = versions[0]?.versionNumber ?? '—';

  const handleFinalize = useCallback(async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/assessment-builder/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId }),
      });
      if (!res.ok) {
        console.error('[published] export failed', await res.text());
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = discoveryAssessmentFilename(clientName);
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast({ versionLabel: currentVersionLabel });
    } finally {
      setDownloading(false);
    }
  }, [assessmentId, clientName, currentVersionLabel]);

  const handleRestore = useCallback(
    async (versionId: string) => {
      setRestoringId(versionId);
      try {
        const res = await fetch('/api/assessment-builder/restore-version', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentId, versionId }),
        });
        if (!res.ok) {
          console.error('[published] restore failed', await res.text());
          return;
        }
        router.push(`/guide/assessment-builder/${assessmentId}`);
      } finally {
        setRestoringId(null);
      }
    },
    [assessmentId, router],
  );

  return (
    <div className={`ab-pub-root ${entered ? 'ab-pub-enter' : ''}`}>
      <header className="ab-pub-nav">
        <div className="ab-pub-nav-title">
          {clientName} — Discovery Assessment
        </div>
        <span className="ab-pub-nav-badge">Draft {currentVersionLabel}</span>
        <div className="ab-pub-nav-actions">
          <Link href={`/guide/assessment-builder/${assessmentId}`} className="ab-pub-back">
            ← Back to edit
          </Link>
          <button
            type="button"
            className="ab-pub-finalize"
            disabled={downloading}
            onClick={() => void handleFinalize()}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? 'Preparing…' : 'Finalize & Download'}
          </button>
        </div>
      </header>

      <div className="ab-pub-body">
        <div className="ab-pub-doc-col">
          <div className="ab-pub-doc-scroll">
            <div className="ab-pub-doc-inner">
              <div
                className="ab-doc-editor ab-doc-readonly"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        </div>

        <aside className="ab-pub-ver">
          <div className="ab-pub-ver-head">
            <div className="ab-pub-ver-h1">Version History</div>
            <div className="ab-pub-ver-meta">
              {versions.length} version{versions.length === 1 ? '' : 's'}
              {versions[0] ? ` · ${versions[0].versionNumber} current` : ''}
            </div>
          </div>
          <div className="ab-pub-ver-list">
            {versions.map((v, i) => (
              <div key={v.id} className="ab-pub-ver-item">
                <div
                  className={i === 0 ? 'ab-pub-dot ab-pub-dot-current' : 'ab-pub-dot ab-pub-dot-old'}
                  aria-hidden
                />
                <div className="ab-pub-ver-label">Draft {v.versionNumber}</div>
                <div className="ab-pub-ver-time">
                  {formatVersionTime(v.createdAtIso)}
                  {i === 0 ? ' · Current' : ''}
                </div>
                <div className="ab-pub-ver-sum">{v.summary || '—'}</div>
                {i > 0 ? (
                  <button
                    type="button"
                    className="ab-pub-restore"
                    disabled={restoringId === v.id}
                    onClick={() => void handleRestore(v.id)}
                  >
                    ↩ Restore this version
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {toast ? (
        <FinalizeToast
          clientName={clientName}
          versionLabel={toast.versionLabel}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
