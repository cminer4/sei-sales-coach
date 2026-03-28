'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type WorkspaceAssessment = {
  id: string;
  clientName: string;
  stakeholders: string[];
  projectBrief: string | null;
  documents: { id: string; filename: string }[];
};

/**
 * Builder shell: left panel 60% → 320px, config fades out, chat fades in (prototype timings).
 * Right canvas shows shimmer only until draft generation exists.
 */
export function AssessmentBuilderWorkspace({ assessment }: { assessment: WorkspaceAssessment }) {
  const [configHide, setConfigHide] = useState(false);
  const [configGone, setConfigGone] = useState(false);
  const [panelSlim, setPanelSlim] = useState(false);
  const [chatIn, setChatIn] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setConfigHide(true);
    const t2 = setTimeout(() => setPanelSlim(true), 80);
    const t3 = setTimeout(() => setConfigGone(true), 280);
    const t4 = setTimeout(() => setChatIn(true), 300);
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const stk = assessment.stakeholders.length;
  const docs = assessment.documents.length;

  return (
    <div className="ab-builder-root">
      <div className={`ab-lpanel ${panelSlim ? 'ab-lpanel-slim' : ''}`}>
        <div
          className={`ab-lpanel-cfg ${configHide ? 'ab-hide' : ''} ${configGone ? 'ab-gone' : ''}`}
        >
          <div className="ab-cfg-scroll">
            <Link href="/guide/assessment-builder" className="ab-back-btn">
              ← All assessments
            </Link>
            <div className="ab-cfg-eye">Assessment</div>
            <h2 className="ab-cfg-title">Who are we building this for?</h2>
            <p className="ab-cfg-sub">
              Add what you have. Rough notes are fine, the agent will guide you through the rest
              once you&apos;re in.
            </p>
            <div className="ab-field">
              <label htmlFor="ab-ws-client">Client company</label>
              <input id="ab-ws-client" type="text" readOnly value={assessment.clientName} />
            </div>
            <div className="ab-field">
              <span className="ab-field-label-span">Key stakeholders</span>
              <div className="ab-chip-row">
                {assessment.stakeholders.map((s) => (
                  <span key={s} className="ab-chip">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="ab-field">
              <label htmlFor="ab-ws-brief">
                Project brief{' '}
                <span style={{ color: '#6e5490', fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>
                  — optional
                </span>
              </label>
              <textarea id="ab-ws-brief" readOnly value={assessment.projectBrief ?? ''} />
            </div>
            <div className="ab-field">
              <span className="ab-field-label-span">Transcripts &amp; documents</span>
              <div className="ab-chip-row" style={{ marginTop: 8 }}>
                {assessment.documents.map((d) => (
                  <span key={d.id} className="ab-doc-chip-ro">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: 0.6 }}
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {d.filename}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="ab-cfg-footer">
            <button type="button" className="ab-btn-save-exit" disabled>
              Save &amp; exit
            </button>
            <button type="button" className="ab-btn-primary" disabled>
              Create Draft
            </button>
          </div>
        </div>

        <div className={`ab-chat ${chatIn ? 'ab-chat-in' : ''}`}>
          <div
            className="ab-proj-hdr"
            onClick={() => setDrawerOpen((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setDrawerOpen((o) => !o);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="ab-ph-top">
              <span className="ab-ph-name">{assessment.clientName}</span>
              <button type="button" className="ab-ph-edit" disabled>
                ✎ Edit
              </button>
            </div>
            <div
              className="ab-ph-pills"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <span className="ab-pill" onClick={() => setDrawerOpen((o) => !o)}>
                👤 {stk} stakeholder{stk !== 1 ? 's' : ''}
              </span>
              <span className="ab-pill">📄 {docs} document{docs !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className={`ab-drawer ${drawerOpen ? 'open' : ''}`}>
            <div className="ab-drawer-inner">
              <div>
                <div className="ab-dr-lbl">Stakeholders</div>
                <div className="ab-chip-row">
                  {assessment.stakeholders.map((s) => (
                    <span key={s} className="ab-chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="ab-dr-lbl">Documents</div>
                <div className="ab-doc-pills">
                  {assessment.documents.map((d) => (
                    <span key={d.id} className="ab-doc-pill">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      {d.filename}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="ab-msgs" aria-label="SEI Guide messages" />
          <div className="ab-chat-footer">
            <div className="ab-chat-wrap">
              <textarea
                placeholder="Draft generation coming soon…"
                disabled
                rows={1}
                readOnly
              />
              <button type="button" className="ab-send-btn" disabled aria-label="Send">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="ab-canvas">
        <div className="ab-shimmer">
          <div className="ab-shimmer-doc">
            <div className="ab-shim-page">
              <div className="ab-shimmer-tbar" style={{ margin: '-44px -52px 28px' }}>
                <div className="ab-sh-ghost" style={{ width: 14, height: 14 }} />
                <div className="ab-sh-ghost" style={{ width: 10, height: 14 }} />
                <div className="ab-sh-ghost" style={{ width: 10, height: 14 }} />
                <div style={{ width: 1, height: 16, background: '#e0dbd5', margin: '0 4px' }} />
                <div className="ab-sh-ghost" style={{ width: 55, height: 10 }} />
                <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(255,210,0,.3)' }} />
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(78,203,141,.22)' }} />
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(232,93,117,.2)' }} />
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(80,150,255,.2)' }} />
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(155,109,255,.2)' }} />
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <div className="ab-sh-ghost" style={{ width: 38, height: 10 }} />
                  <div
                    style={{
                      width: 88,
                      height: 26,
                      borderRadius: 6,
                      background: 'linear-gradient(135deg,rgba(232,93,117,.3),rgba(155,109,255,.3))',
                    }}
                  />
                </div>
              </div>
              <div className="ab-sl" style={{ height: 8, width: '40%', marginBottom: 10 }} />
              <div className="ab-sl" style={{ height: 32, width: '64%', marginBottom: 6 }} />
              <div className="ab-sl" style={{ height: 10, width: '40%', marginBottom: 24 }} />
              <div style={{ height: 2, background: '#f0ece8', marginBottom: 20, borderRadius: 1 }} />
              <div className="ab-sl" style={{ height: 12, width: '36%', marginBottom: 12 }} />
              <div className="ab-sl" style={{ height: 8, width: '26%', marginBottom: 10 }} />
              <div className="ab-sl" style={{ height: 9, width: '92%', marginBottom: 7 }} />
              <div className="ab-sl" style={{ height: 9, width: '85%', marginBottom: 7 }} />
              <div className="ab-sl" style={{ height: 9, width: '88%', marginBottom: 7 }} />
              <div className="ab-sl" style={{ height: 9, width: '78%', marginBottom: 16 }} />
              <div className="ab-sl" style={{ height: 12, width: '42%', marginBottom: 12 }} />
              <div className="ab-sl" style={{ height: 9, width: '90%', marginBottom: 7 }} />
              <div className="ab-sl" style={{ height: 9, width: '82%', marginBottom: 7 }} />
              <div className="ab-sl" style={{ height: 9, width: '86%', marginBottom: 16 }} />
              <div className="ab-sl" style={{ height: 12, width: '48%', marginBottom: 12 }} />
              <div className="ab-sl" style={{ height: 9, width: '88%', marginBottom: 7 }} />
              <div className="ab-sl" style={{ height: 9, width: '74%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
