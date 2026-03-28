'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DraftContent, DraftSectionKey } from '@/lib/assessment-builder-draft-types';
import { DRAFT_SECTION_KEYS } from '@/lib/assessment-builder-draft-types';
import {
  buildFullEditorHtml,
  parseDraftSectionsFromEditorRoot,
} from '@/lib/assessment-builder-document-html';

export type WorkspaceAssessment = {
  id: string;
  clientName: string;
  stakeholders: string[];
  projectBrief: string | null;
  documents: { id: string; filename: string }[];
  draftContent: DraftContent | null;
};

type ChatMsg =
  | { role: 'a'; html: string }
  | { role: 'u'; text: string }
  | { role: 'a'; kind: 'update'; title: string; note: string }
  | {
      role: 'a';
      kind: 'suggestion';
      section: DraftSectionKey;
      html: string;
    };

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

/** Prototype DEMO[0] — client name in strong; escape minimal for safe HTML. */
function buildIntroHtml(clientName: string): string {
  const n = clientName.trim() || 'the client';
  const safe = n.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `Hi — I'm here to help you build the AI Assessment for <strong>${safe}</strong>. I've read through what you shared and generated a first draft on the right — you can start editing it now.<br><br>I have a few questions that will help me sharpen the content as we work through it.`;
}

function truncateNote(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

const Q1_HTML =
  'What is the <strong>primary business challenge</strong> driving this engagement — cost reduction, revenue growth, or risk/compliance?';

const Q2_HTML =
  'One more: <strong>any significant blockers or unresolved dependencies</strong> that came up in the sessions?';

const CLOSING_HTML =
  'The draft is live on the right. Select any text to highlight or add a comment. When you\'re ready to finalize, hit Publish Draft.';

/**
 * Builder shell: left panel animation, document canvas with extract → generate pipeline,
 * contenteditable draft, toolbar, SEI Guide chat, refine with suggestion cards for dirty sections.
 */
export function AssessmentBuilderWorkspace({
  assessment,
}: {
  assessment: WorkspaceAssessment;
}) {
  const [configHide, setConfigHide] = useState(false);
  const [configGone, setConfigGone] = useState(false);
  const [panelSlim, setPanelSlim] = useState(false);
  const [chatIn, setChatIn] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [pipelinePhase, setPipelinePhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [draft, setDraft] = useState<DraftContent | null>(null);
  /** True only after useLayoutEffect has written full HTML to the editor (no blank canvas flash). */
  const [documentPainted, setDocumentPainted] = useState(false);
  const [dirty, setDirty] = useState<Partial<Record<DraftSectionKey, boolean>>>({});
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  /** Intro + first clarifying question posted; only then may the user send (refine). */
  const [scriptSequenceComplete, setScriptSequenceComplete] = useState(false);
  const [refineRound, setRefineRound] = useState(0);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgsEndRef = useRef<HTMLDivElement | null>(null);
  const scriptTimersRef = useRef<number[]>([]);

  const applyDraftToEditor = useCallback(
    (d: DraftContent) => {
      const el = editorRef.current;
      if (!el) return;
      el.innerHTML = buildFullEditorHtml(assessment.clientName, d);
    },
    [assessment.clientName],
  );

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

  /** On mount: extract then generate-draft (no user action). Shimmer stays until document is painted. */
  useEffect(() => {
    let cancelled = false;
    setDocumentPainted(false);
    setPipelinePhase('loading');
    setDraft(null);
    setScriptSequenceComplete(false);
    setMessages([]);

    async function run() {
      try {
        const ex = await fetch('/api/assessment-builder/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentId: assessment.id }),
        });
        const exJson = await ex.json();
        if (!ex.ok && exJson.errors?.length) {
          console.warn('[assessment-builder] extract warnings', exJson.errors);
        }
        if (cancelled) return;

        const gen = await fetch('/api/assessment-builder/generate-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentId: assessment.id }),
        });
        const genJson = await gen.json();
        if (!gen.ok) {
          throw new Error(genJson.error || 'Generate failed');
        }
        if (cancelled) return;
        const d = genJson.draft as DraftContent;
        setDraft(d);
        setPipelinePhase('ready');
      } catch (e) {
        console.error(e);
        if (!cancelled) setPipelinePhase('error');
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [assessment.id]);

  /** Paint full document before first browser paint so the canvas is never blank. */
  useLayoutEffect(() => {
    if (pipelinePhase !== 'ready' || !draft) return;
    const content = draft;
    function paint() {
      const el = editorRef.current;
      if (!el) return false;
      applyDraftToEditor(content);
      setDocumentPainted(true);
      return true;
    }
    if (!paint()) {
      requestAnimationFrame(() => {
        paint();
      });
    }
  }, [pipelinePhase, draft, applyDraftToEditor]);

  /**
   * After the document is painted: prototype DEMO timing — first agent bubble after 500ms,
   * second agent bubble 900ms later (see next() in sei-assessment-builder-v8.html).
   */
  useEffect(() => {
    if (!documentPainted) return;
    scriptTimersRef.current.forEach(clearTimeout);
    scriptTimersRef.current = [];

    const tIntro = window.setTimeout(() => {
      setMessages([{ role: 'a', html: buildIntroHtml(assessment.clientName) }]);
    }, 500);
    const tQ1 = window.setTimeout(() => {
      setMessages((m) => [...m, { role: 'a', html: Q1_HTML }]);
      setScriptSequenceComplete(true);
    }, 500 + 900);
    scriptTimersRef.current.push(tIntro, tQ1);

    return () => {
      scriptTimersRef.current.forEach(clearTimeout);
      scriptTimersRef.current = [];
    };
  }, [documentPainted, assessment.clientName]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const persistDraft = useCallback(
    async (d: DraftContent) => {
      await fetch('/api/assessment-builder/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: assessment.id, draft: d }),
      });
    },
    [assessment.id],
  );

  const onEditorInput = () => {
    const el = editorRef.current;
    if (!el) return;
    const parsed = parseDraftSectionsFromEditorRoot(el);
    if (!parsed) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistDraft(parsed);
    }, 1500);
  };

  const onEditorKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as Node;
    const sec = (t as HTMLElement).closest?.('[data-section]') as HTMLElement | null;
    if (!sec) return;
    const key = sec.getAttribute('data-section');
    if (!key || !DRAFT_SECTION_KEYS.includes(key as DraftSectionKey)) return;
    if (sec.getAttribute('data-manually-edited') !== 'true') {
      sec.setAttribute('data-manually-edited', 'true');
      setDirty((prev) => ({ ...prev, [key as DraftSectionKey]: true }));
    }
  };

  const fmt = (cmd: 'bold' | 'italic' | 'ul') => {
    editorRef.current?.focus();
    if (cmd === 'bold') document.execCommand('bold');
    else if (cmd === 'italic') document.execCommand('italic');
    else document.execCommand('insertUnorderedList');
  };

  const applyHL = (color: string) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    editorRef.current?.focus();
    const r = sel.getRangeAt(0);
    const m = document.createElement('mark');
    m.setAttribute('data-color', color);
    try {
      r.surroundContents(m);
    } catch {
      document.execCommand(
        'insertHTML',
        false,
        `<mark data-color="${color}">${sel.toString()}</mark>`,
      );
    }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || sending || !scriptSequenceComplete || !documentPainted) return;
    const root = editorRef.current;
    const parsed = root ? parseDraftSectionsFromEditorRoot(root) : null;
    const latest = parsed ?? draft;
    if (!latest) return;
    setSending(true);
    setChatInput('');
    setMessages((m) => [...m, { role: 'u', text }]);

    const dirtySections = DRAFT_SECTION_KEYS.filter((k) => dirty[k]);

    try {
      const res = await fetch('/api/assessment-builder/refine-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: assessment.id,
          userMessage: text,
          draft: latest,
          dirtySections,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refine failed');

      const merged = data.draft as DraftContent;
      setDraft(merged);

      const replyText = typeof data.reply === 'string' ? data.reply : '';
      const note = replyText.trim() ? truncateNote(replyText, 140) : '';
      const sug = data.suggestions as Partial<Record<DraftSectionKey, string>> | undefined;
      const suggestionMsgs: ChatMsg[] = [];
      if (sug) {
        for (const k of DRAFT_SECTION_KEYS) {
          const html = sug[k];
          if (html && dirty[k]) {
            suggestionMsgs.push({ role: 'a', kind: 'suggestion', section: k, html });
          }
        }
      }
      setMessages((m) => {
        const next: ChatMsg[] = [
          ...m,
          { role: 'a', html: escapeHtmlText(replyText) },
        ];
        if (note) {
          next.push({ role: 'a', kind: 'update', title: 'Document updated', note });
        }
        next.push(...suggestionMsgs);
        return next;
      });

      const next = refineRound + 1;
      setRefineRound(next);
      if (next === 1) {
        setTimeout(() => setMessages((m) => [...m, { role: 'a', html: Q2_HTML }]), 500);
      } else if (next === 2) {
        setTimeout(() => setMessages((m) => [...m, { role: 'a', html: CLOSING_HTML }]), 500);
      }
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        {
          role: 'a',
          html: 'Something went wrong updating the draft. Please try again.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const applySuggestion = (section: DraftSectionKey, html: string) => {
    const el = editorRef.current?.querySelector(`[data-section="${section}"]`);
    if (el) {
      el.innerHTML = html;
      el.setAttribute('data-manually-edited', 'true');
    }
    setDirty((d) => ({ ...d, [section]: true }));
    const root = editorRef.current;
    if (root) {
      const parsed = parseDraftSectionsFromEditorRoot(root);
      if (parsed) {
        setDraft(parsed);
        void persistDraft(parsed);
      }
    }
    setMessages((m) =>
      m.filter(
        (x) =>
          !(
            x.role === 'a' &&
            'kind' in x &&
            x.kind === 'suggestion' &&
            x.section === section
          ),
      ),
    );
  };

  const stk = assessment.stakeholders.length;
  const docs = assessment.documents.length;
  const showLiveEditor = pipelinePhase === 'ready' && draft !== null;
  const showShimmerOverlay = !documentPainted && pipelinePhase !== 'error';
  const chatEnabled =
    scriptSequenceComplete && pipelinePhase === 'ready' && documentPainted;

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
          <div className="ab-msgs" aria-label="SEI Guide messages">
            {messages.map((msg, i) => {
              if (msg.role === 'a' && 'kind' in msg && msg.kind === 'update') {
                return (
                  <div key={i} className="ab-msg-row">
                    <div className="ab-upd-card">
                      <div className="ab-upd-lbl">Document updated</div>
                      <div className="ab-upd-title">{msg.title}</div>
                      <div className="ab-upd-note">{msg.note}</div>
                    </div>
                  </div>
                );
              }
              if (msg.role === 'a' && 'kind' in msg && msg.kind === 'suggestion') {
                return (
                  <div key={i} className="ab-msg-row">
                    <span className="ab-msg-who ab-msg-who-a">SEI Guide</span>
                    <div className="ab-sug-card">
                      <div className="ab-sug-lbl">Suggested change ({msg.section})</div>
                      <div className="ab-sug-body" dangerouslySetInnerHTML={{ __html: msg.html }} />
                      <button
                        type="button"
                        className="ab-sug-apply"
                        onClick={() => applySuggestion(msg.section, msg.html)}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                );
              }
              if (msg.role === 'a') {
                return (
                  <div key={i} className="ab-msg-row">
                    <span className="ab-msg-who ab-msg-who-a">SEI Guide</span>
                    <div className="ab-bubble ab-bubble-a" dangerouslySetInnerHTML={{ __html: msg.html }} />
                  </div>
                );
              }
              return (
                <div key={i} className="ab-msg-row ab-msg-row-u">
                  <span className="ab-msg-who ab-msg-who-u">You</span>
                  <div className="ab-bubble ab-bubble-u">{msg.text}</div>
                </div>
              );
            })}
            <div ref={msgsEndRef} />
          </div>
          <div className="ab-chat-footer">
            <div className="ab-chat-wrap">
              <textarea
                placeholder={
                  !documentPainted || pipelinePhase === 'loading'
                    ? 'Preparing draft…'
                    : !scriptSequenceComplete
                      ? 'SEI Guide will ask a question first…'
                      : 'Message SEI Guide…'
                }
                disabled={!chatEnabled || sending}
                rows={1}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendChat();
                  }
                }}
              />
              <button
                type="button"
                className="ab-send-btn ab-send-btn-on"
                disabled={!chatEnabled || sending || !chatInput.trim()}
                aria-label="Send"
                onClick={() => void sendChat()}
              >
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

      <div className="ab-canvas ab-canvas-rel">
        {pipelinePhase === 'error' && (
          <div className="ab-pipeline-err">
            Draft generation failed. Check uploads and try reloading the page.
          </div>
        )}
        {showShimmerOverlay && (
          <div className="ab-shimmer ab-shimmer-overlay">
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
              </div>
            </div>
          </div>
        )}

        {showLiveEditor && (
          <div
            className="ab-live"
            style={{
              opacity: documentPainted ? 1 : 0,
              pointerEvents: documentPainted ? 'auto' : 'none',
            }}
            aria-hidden={!documentPainted}
          >
            <div className="ab-escroll">
              <div className="ab-docpage">
                <div className="ab-tbar">
                  <button type="button" className="ab-tb" onClick={() => fmt('bold')} title="Bold">
                    <b>B</b>
                  </button>
                  <button type="button" className="ab-tb" onClick={() => fmt('italic')} title="Italic">
                    <i>I</i>
                  </button>
                  <button type="button" className="ab-tb" onClick={() => fmt('ul')} title="Bullets">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                  <div className="ab-tb-div" />
                  <span className="ab-hl-lbl">Highlight</span>
                  <button type="button" className="ab-hl" style={{ background: 'rgba(255,210,0,.75)' }} aria-label="Yellow" onClick={() => applyHL('yellow')} />
                  <button type="button" className="ab-hl" style={{ background: 'rgba(78,203,141,.65)' }} aria-label="Green" onClick={() => applyHL('green')} />
                  <button type="button" className="ab-hl" style={{ background: 'rgba(232,93,117,.6)' }} aria-label="Red" onClick={() => applyHL('red')} />
                  <button type="button" className="ab-hl" style={{ background: 'rgba(80,150,255,.6)' }} aria-label="Blue" onClick={() => applyHL('blue')} />
                  <button type="button" className="ab-hl" style={{ background: 'rgba(155,109,255,.6)' }} aria-label="Purple" onClick={() => applyHL('purple')} />
                </div>
                <div
                  ref={editorRef}
                  className="ab-doc-editor"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  onInput={onEditorInput}
                  onKeyDown={onEditorKeyDown}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
