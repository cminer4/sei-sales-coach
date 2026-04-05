'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { validateAssessmentUploadSizes } from '@/lib/assessment-builder-upload-limits';
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
  | { role: 'a'; kind: 'status'; text: string }
  | {
      role: 'a';
      kind: 'suggestion';
      section: DraftSectionKey;
      html: string;
      summary: string;
    };

const SECTION_LABELS: Record<DraftSectionKey, string> = {
  findings: 'Findings',
  interviews: 'Interviews',
  hypothesis: 'Hypothesis',
  stakeholder_map: 'Stakeholder map',
  opportunities: 'Opportunities',
};

function stripHtmlPlain(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sectionChangeSummary(beforeHtml: string, afterHtml: string): string {
  const before = stripHtmlPlain(beforeHtml);
  const after = stripHtmlPlain(afterHtml);
  if (before === after) {
    return 'Refined for structure and formatting.';
  }
  if (after.length > before.length * 1.15) {
    return 'Expanded with your input and added detail.';
  }
  if (after.length < before.length * 0.85) {
    return 'Tightened for clarity.';
  }
  return 'Updated to reflect your feedback and the latest context.';
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function unwrapMark(el: HTMLElement) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
  if (parent instanceof HTMLElement) {
    parent.normalize();
  }
}

/** Prototype DEMO[0] — client name in strong; escape minimal for safe HTML. */
function buildIntroHtml(clientName: string): string {
  const n = clientName.trim() || 'the client';
  const safe = n.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `Hi — I'm here to help you build the AI Assessment for <strong>${safe}</strong>. I've read through what you shared and generated a first draft on the right — you can start editing it now.<br><br>I have a few questions that will help me sharpen the content as we work through it.`;
}

const Q1_HTML =
  'What is the <strong>primary business challenge</strong> driving this engagement — cost reduction, revenue growth, or risk/compliance?';

const Q2_HTML =
  'One more: <strong>any significant blockers or unresolved dependencies</strong> that came up in the sessions?';

/** True when the prop has a usable draft (non-null and at least one section has visible text). */
function isDraftContentNonEmpty(d: DraftContent | null | undefined): boolean {
  if (d == null) return false;
  return DRAFT_SECTION_KEYS.some((k) => {
    const html = d[k] ?? '';
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 0;
  });
}

const CLOSING_HTML =
  'The draft is live on the right. Select any text to highlight or add a comment. When you\'re ready to finalize, hit Publish Draft.';

const PIPELINE_STEPS = [
  'Reviewing uploaded documents',
  'Extracting key information from transcripts',
  'Retrieving SEI methodology',
  'Building your Discovery draft',
] as const;

/**
 * Builder shell: left panel animation, document canvas with extract → generate pipeline,
 * contenteditable draft, toolbar, SEI Guide chat, refine with suggestion cards for dirty sections.
 */
export function AssessmentBuilderWorkspace({
  assessment,
}: {
  assessment: WorkspaceAssessment;
}) {
  const router = useRouter();
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
  const [publishing, setPublishing] = useState(false);
  const [configMode, setConfigMode] = useState(false);
  const [localAssessment, setLocalAssessment] = useState(assessment);
  const [stkInput, setStkInput] = useState('');
  const [savingCtx, setSavingCtx] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [rerunBusy, setRerunBusy] = useState(false);
  const [pipelineChecklistVisible, setPipelineChecklistVisible] = useState(false);
  const [pipelineActiveStep, setPipelineActiveStep] = useState(0);
  const [builderExiting, setBuilderExiting] = useState(false);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgsEndRef = useRef<HTMLDivElement | null>(null);
  const scriptTimersRef = useRef<number[]>([]);
  const closePanelTimersRef = useRef<number[]>([]);
  const mountTimersRef = useRef<number[]>([]);
  const uploadDocInputRef = useRef<HTMLInputElement>(null);

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
    mountTimersRef.current.forEach(clearTimeout);
    mountTimersRef.current = [
      window.setTimeout(() => setPanelSlim(true), 80),
      window.setTimeout(() => setConfigGone(true), 280),
      window.setTimeout(() => setChatIn(true), 300),
    ];
    return () => {
      mountTimersRef.current.forEach(clearTimeout);
      mountTimersRef.current = [];
    };
  }, []);

  /**
   * When `assessment.draftContent` is already populated (saved or published), skip the pipeline.
   * Runs before paint so we do not flash the loading shimmer.
   */
  useLayoutEffect(() => {
    setDocumentPainted(false);
    setScriptSequenceComplete(false);
    setMessages([]);
    setPipelineChecklistVisible(false);
    if (isDraftContentNonEmpty(assessment.draftContent)) {
      setDraft(assessment.draftContent!);
      setPipelinePhase('ready');
    } else {
      setDraft(null);
      setPipelinePhase('loading');
    }
  }, [assessment.id, assessment.draftContent]);

  useEffect(() => {
    setLocalAssessment(assessment);
  }, [assessment]);

  const executePipeline = useCallback(
    async (opts: { cancelled: () => boolean; clearChatOnStart?: boolean }) => {
      const cancelled = opts.cancelled;
      const clearChatOnStart = opts.clearChatOnStart !== false;
      try {
        if (clearChatOnStart) {
          setMessages([]);
        }
        setPipelineChecklistVisible(true);
        setPipelineActiveStep(0);

        const ex = await fetch('/api/assessment-builder/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentId: assessment.id }),
        });
        const exJson = await ex.json();
        if (cancelled()) return;
        setPipelineActiveStep(1);
        if (!ex.ok && exJson.errors?.length) {
          console.warn('[assessment-builder] extract warnings', exJson.errors);
        }

        await new Promise<void>((r) => {
          requestAnimationFrame(() => r());
        });
        if (cancelled()) return;
        setPipelineActiveStep(2);

        setPipelineActiveStep(3);
        const gen = await fetch('/api/assessment-builder/generate-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentId: assessment.id }),
        });
        const genJson = await gen.json();
        if (!gen.ok) {
          throw new Error(genJson.error || 'Generate failed');
        }
        if (cancelled()) return;
        const d = genJson.draft as DraftContent;
        setPipelineChecklistVisible(false);
        setDraft(d);
        setPipelinePhase('ready');
      } catch (e) {
        console.error(e);
        if (!cancelled()) {
          setPipelineChecklistVisible(false);
          setPipelinePhase('error');
        }
      }
    },
    [assessment.id],
  );

  /** No saved draft: extract then generate-draft (no user action). Shimmer stays until document is painted. */
  useEffect(() => {
    if (isDraftContentNonEmpty(assessment.draftContent)) return;
    let cancelled = false;
    void executePipeline({ cancelled: () => cancelled, clearChatOnStart: true });
    return () => {
      cancelled = true;
    };
  }, [assessment.id, assessment.draftContent, executePipeline]);

  useEffect(() => {
    return () => {
      closePanelTimersRef.current.forEach(clearTimeout);
    };
  }, []);

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
    if (scriptSequenceComplete) return;
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

  const openConfigMode = () => {
    mountTimersRef.current.forEach(clearTimeout);
    mountTimersRef.current = [];
    setDrawerOpen(false);
    setChatIn(false);
    setConfigGone(false);
    requestAnimationFrame(() => {
      setConfigHide(false);
      setPanelSlim(false);
    });
    setConfigMode(true);
  };

  const closeConfigMode = () => {
    closePanelTimersRef.current.forEach(clearTimeout);
    closePanelTimersRef.current = [];
    setConfigHide(true);
    const t2 = window.setTimeout(() => setPanelSlim(true), 80);
    const t3 = window.setTimeout(() => setConfigGone(true), 280);
    const t4 = window.setTimeout(() => setChatIn(true), 300);
    const t5 = window.setTimeout(() => setConfigMode(false), 320);
    closePanelTimersRef.current.push(t2, t3, t4, t5);
  };

  const saveContext = async () => {
    setSavingCtx(true);
    try {
      const res = await fetch(`/api/assessment-builder/assessments/${assessment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectBrief: localAssessment.projectBrief,
          stakeholders: localAssessment.stakeholders,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        projectBrief?: string | null;
        stakeholders?: string[];
      };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setLocalAssessment((prev) => ({
        ...prev,
        projectBrief: data.projectBrief ?? null,
        stakeholders: data.stakeholders ?? prev.stakeholders,
      }));
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCtx(false);
    }
  };

  const rerunPipeline = async () => {
    setRerunBusy(true);
    setPipelinePhase('loading');
    setDocumentPainted(false);
    setDraft(null);
    try {
      await executePipeline({ cancelled: () => false, clearChatOnStart: false });
    } finally {
      setRerunBusy(false);
    }
  };

  const onDocsPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files);
    const v = validateAssessmentUploadSizes(list.map((f) => f.size));
    if (!v.ok) {
      window.alert(v.error ?? 'Invalid file size.');
      e.target.value = '';
      return;
    }
    setUploadingDocs(true);
    try {
      const form = new FormData();
      for (const f of list) {
        form.append('files', f);
      }
      const res = await fetch(`/api/assessment-builder/assessments/${assessment.id}/documents`, {
        method: 'POST',
        body: form,
      });
      const data = (await res.json()) as {
        error?: string;
        documents?: { id: string; filename: string }[];
      };
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const added = data.documents ?? [];
      setLocalAssessment((prev) => ({
        ...prev,
        documents: [...prev.documents, ...added],
      }));
      router.refresh();
    } catch (err) {
      console.error(err);
      window.alert('Upload failed. Try again.');
    } finally {
      setUploadingDocs(false);
      e.target.value = '';
    }
  };

  const addStakeholderFromInput = () => {
    const v = stkInput.trim();
    if (!v) return;
    setLocalAssessment((prev) => ({
      ...prev,
      stakeholders: prev.stakeholders.includes(v)
        ? prev.stakeholders
        : [...prev.stakeholders, v],
    }));
    setStkInput('');
  };

  const removeStakeholderChip = (name: string) => {
    setLocalAssessment((prev) => ({
      ...prev,
      stakeholders: prev.stakeholders.filter((x) => x !== name),
    }));
  };

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
    editorRef.current?.querySelector<HTMLElement>('.ab-sec[contenteditable="true"]')?.focus();
    if (cmd === 'bold') document.execCommand('bold');
    else if (cmd === 'italic') document.execCommand('italic');
    else document.execCommand('insertUnorderedList');
  };

  const applyHL = (color: string) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    editorRef.current?.querySelector<HTMLElement>('.ab-sec[contenteditable="true"]')?.focus();
    const range = sel.getRangeAt(0);
    const start = range.startContainer;
    const startEl =
      start.nodeType === Node.TEXT_NODE ? start.parentElement : (start as Element);
    const markAtStart = startEl?.closest?.('mark[data-color]') as HTMLElement | null;
    if (markAtStart && markAtStart.getAttribute('data-color') === color) {
      unwrapMark(markAtStart);
      sel.removeAllRanges();
      onEditorInput();
      return;
    }
    const m = document.createElement('mark');
    m.setAttribute('data-color', color);
    try {
      range.surroundContents(m);
    } catch {
      document.execCommand(
        'insertHTML',
        false,
        `<mark data-color="${color}">${sel.toString()}</mark>`,
      );
    }
    onEditorInput();
  };

  const clearHighlightFromSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const root = editorRef.current;
    if (!root) return;
    const marks = root.querySelectorAll('mark[data-color]');
    const toUnwrap: HTMLElement[] = [];
    marks.forEach((node) => {
      try {
        if (range.intersectsNode(node)) {
          toUnwrap.push(node as HTMLElement);
        }
      } catch {
        /* intersectsNode unsupported */
      }
    });
    if (toUnwrap.length === 0) {
      editorRef.current?.querySelector<HTMLElement>('.ab-sec[contenteditable="true"]')?.focus();
      document.execCommand('removeFormat');
      onEditorInput();
      return;
    }
    toUnwrap.forEach((el) => unwrapMark(el));
    sel.removeAllRanges();
    onEditorInput();
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

      const replyText = typeof data.reply === 'string' ? data.reply : '';
      const suggestionMsgs: ChatMsg[] = [];
      for (const k of DRAFT_SECTION_KEYS) {
        const before = latest[k] ?? '';
        const after = merged[k] ?? '';
        if (before.trim() !== after.trim()) {
          suggestionMsgs.push({
            role: 'a',
            kind: 'suggestion',
            section: k,
            html: after,
            summary: sectionChangeSummary(before, after),
          });
        }
      }
      setMessages((m) => [
        ...m,
        { role: 'a', html: escapeHtmlText(replyText) },
        ...suggestionMsgs,
      ]);

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

  const handlePublish = async () => {
    const root = editorRef.current;
    if (!root || publishing) return;

    // Snapshot at click time only from the contenteditable DOM. Do not use React `draft`
    // state here — it is not updated on every keystroke (auto-save reads DOM separately;
    // `draft` can lag behind manual edits until refine or other flows call setDraft).
    const liveDraft: Partial<DraftContent> = {};
    for (const key of DRAFT_SECTION_KEYS) {
      const sec = root.querySelector(`[data-section="${key}"]`);
      if (!sec) {
        console.error('[assessment-builder] publish: missing section in DOM', key);
        return;
      }
      liveDraft[key] = sec.innerHTML;
    }
    const draftPayload = liveDraft as DraftContent;

    setPublishing(true);
    try {
      const res = await fetch('/api/assessment-builder/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: assessment.id,
          draft: draftPayload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('[assessment-builder] publish failed', data);
        setPublishing(false);
        return;
      }
      setBuilderExiting(true);
      await new Promise((r) => setTimeout(r, 280));
      router.push(`/guide/assessment-builder/${assessment.id}/published`);
    } catch (e) {
      console.error(e);
      setPublishing(false);
      setBuilderExiting(false);
    }
  };

  const dismissSuggestion = (section: DraftSectionKey) => {
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
    dismissSuggestion(section);
  };

  const stk = localAssessment.stakeholders.length;
  const docs = localAssessment.documents.length;
  const hasDraftForUpdate =
    isDraftContentNonEmpty(assessment.draftContent) ||
    (draft !== null && isDraftContentNonEmpty(draft));
  const showLiveEditor = pipelinePhase === 'ready' && draft !== null;
  const showShimmerOverlay = !documentPainted && pipelinePhase !== 'error';
  const chatEnabled =
    scriptSequenceComplete && pipelinePhase === 'ready' && documentPainted;

  const resizeChatTextarea = useCallback(() => {
    const el = chatTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18;
    const maxH = Math.round(lineHeight * 4);
    const next = Math.min(el.scrollHeight, maxH);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
  }, []);

  useLayoutEffect(() => {
    resizeChatTextarea();
  }, [chatInput, resizeChatTextarea]);

  return (
    <div className={`ab-builder-root ${builderExiting ? 'ab-builder-exiting' : ''}`}>
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
              <input id="ab-ws-client" type="text" readOnly value={localAssessment.clientName} />
            </div>
            <div className="ab-field">
              <span className="ab-field-label-span">Key stakeholders</span>
              {configMode ? (
                <>
                  <div className="ab-chip-row">
                    {localAssessment.stakeholders.map((s) => (
                      <span key={s} className="ab-chip ab-chip-ed">
                        {s}
                        <button
                          type="button"
                          className="ab-chip-x"
                          aria-label={`Remove ${s}`}
                          onClick={() => removeStakeholderChip(s)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    className="ab-stk-input"
                    type="text"
                    value={stkInput}
                    placeholder="Add stakeholder, press Enter"
                    onChange={(e) => setStkInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addStakeholderFromInput();
                      }
                    }}
                  />
                </>
              ) : (
                <div className="ab-chip-row">
                  {localAssessment.stakeholders.map((s) => (
                    <span key={s} className="ab-chip">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="ab-field">
              <label htmlFor="ab-ws-brief">
                Project brief{' '}
                <span style={{ color: '#6e5490', fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>
                  — optional
                </span>
              </label>
              <textarea
                id="ab-ws-brief"
                readOnly={!configMode}
                value={localAssessment.projectBrief ?? ''}
                onChange={(e) =>
                  setLocalAssessment((prev) => ({
                    ...prev,
                    projectBrief: e.target.value,
                  }))
                }
              />
            </div>
            <div className="ab-field">
              <span className="ab-field-label-span">Transcripts &amp; documents</span>
              <div className="ab-chip-row" style={{ marginTop: 8 }}>
                {localAssessment.documents.map((d) => (
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
              {configMode ? (
                <>
                  <input
                    ref={uploadDocInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    tabIndex={-1}
                    onChange={onDocsPicked}
                  />
                  <button
                    type="button"
                    className="ab-btn-add-docs"
                    disabled={uploadingDocs}
                    onClick={() => uploadDocInputRef.current?.click()}
                  >
                    {uploadingDocs ? 'Uploading…' : 'Add documents'}
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <div className={`ab-cfg-footer ${configMode ? 'ab-cfg-footer-edit' : ''}`}>
            {configMode ? (
              <>
                <button type="button" className="ab-btn-save-exit" onClick={closeConfigMode}>
                  Back to chat
                </button>
                <button
                  type="button"
                  className="ab-btn-secondary"
                  disabled={savingCtx}
                  onClick={() => void saveContext()}
                >
                  {savingCtx ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className="ab-btn-primary"
                  disabled={rerunBusy || pipelinePhase === 'loading'}
                  onClick={() => void rerunPipeline()}
                >
                  {rerunBusy
                    ? hasDraftForUpdate
                      ? 'Updating…'
                      : 'Running…'
                    : hasDraftForUpdate
                      ? 'Update Document'
                      : 'Re-run pipeline'}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="ab-btn-save-exit" disabled>
                  Save &amp; exit
                </button>
                <button type="button" className="ab-btn-primary" disabled>
                  Create Draft
                </button>
              </>
            )}
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
              <span className="ab-ph-name">{localAssessment.clientName}</span>
              <button
                type="button"
                className={`ab-ph-edit ${configMode ? 'ab-ph-edit-on' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (configMode) closeConfigMode();
                  else openConfigMode();
                }}
              >
                {configMode ? 'Close' : '✎ Edit'}
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
              <span
                className="ab-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO SEI-43: Open transcript drawer with split-screen document reader.
                  setDrawerOpen((o) => !o);
                }}
              >
                📄 {docs} document{docs !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className={`ab-drawer ${drawerOpen ? 'open' : ''}`}>
            <div className="ab-drawer-inner">
              <div>
                <div className="ab-dr-lbl">Stakeholders</div>
                <div className="ab-chip-row">
                  {localAssessment.stakeholders.map((s) => (
                    <span key={s} className="ab-chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="ab-dr-lbl">Documents</div>
                <div className="ab-doc-pills">
                  {localAssessment.documents.map((d) => (
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
            {pipelineChecklistVisible ? (
              <div className="ab-pipeline-checklist-card" aria-live="polite">
                <div className="ab-pipeline-checklist-title">Preparing your draft</div>
                <ul className="ab-pipeline-checklist-list">
                  {PIPELINE_STEPS.map((label, i) => {
                    const done = i < pipelineActiveStep;
                    const active = i === pipelineActiveStep;
                    let icon = '○';
                    if (done) icon = '✓';
                    else if (active) icon = '→';
                    return (
                      <li
                        key={label}
                        className={`${done ? 'done' : ''} ${active ? 'active' : ''}`.trim()}
                      >
                        <span className="ab-pipeline-checklist-icon">{icon}</span>
                        <span>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
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
              if (msg.role === 'a' && 'kind' in msg && msg.kind === 'status') {
                return (
                  <div key={i} className="ab-msg-row ab-msg-row-status">
                    <div className="ab-bubble ab-bubble-status">{msg.text}</div>
                  </div>
                );
              }
              if (msg.role === 'a' && 'kind' in msg && msg.kind === 'suggestion') {
                return (
                  <div key={i} className="ab-msg-row ab-msg-row-suggestion">
                    <div className="ab-sug-card">
                      <div className="ab-sug-card-title">{SECTION_LABELS[msg.section]}</div>
                      <p className="ab-sug-summary-line">{msg.summary}</p>
                      <div className="ab-sug-card-actions">
                        <button
                          type="button"
                          className="ab-sug-apply-update"
                          onClick={() => applySuggestion(msg.section, msg.html)}
                        >
                          Apply update
                        </button>
                        <button
                          type="button"
                          className="ab-sug-dismiss"
                          onClick={() => dismissSuggestion(msg.section)}
                        >
                          Dismiss
                        </button>
                      </div>
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
                ref={chatTextareaRef}
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
                onInput={() => resizeChatTextarea()}
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
                  <button
                    type="button"
                    className="ab-hl-erase"
                    title="Remove highlight"
                    aria-label="Remove highlight from selection"
                    onClick={() => clearHighlightFromSelection()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M20 20H7L3 16c-.6-.6-.6-1.5 0-2.1l10-10c.6-.6 1.5-.6 2.1 0l4 4c.6.6.6 1.5 0 2.1L11 20" />
                      <path d="M6 11l8 8" />
                    </svg>
                  </button>
                  <div className="ab-tbar-pub">
                    <button
                      type="button"
                      className="ab-publish-draft"
                      disabled={!documentPainted || publishing}
                      onClick={() => void handlePublish()}
                    >
                      {publishing ? (
                        <span className="ab-publish-draft-spin" aria-hidden />
                      ) : null}
                      Publish Draft
                    </button>
                  </div>
                </div>
                <div
                  ref={editorRef}
                  className="ab-doc-editor"
                  contentEditable={false}
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
