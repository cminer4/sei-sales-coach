'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { validateAssessmentUploadSizes } from '@/lib/assessment-builder-upload-limits';

const BRIEF_PLACEHOLDER =
  "Summarize the client's business context, known challenges, and what you're hoping AI could address. Rough notes are fine.";

export function NewAssessmentForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientName, setClientName] = useState('');
  const [stakeholders, setStakeholders] = useState<string[]>([]);
  const [stkInput, setStkInput] = useState('');
  const [projectBrief, setProjectBrief] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submittingSave, setSubmittingSave] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const addFiles = useCallback((list: FileList | File[]) => {
    const incoming = Array.from(list);
    if (incoming.length === 0) return;
    setFiles((prev) => {
      const next = [...prev, ...incoming];
      const v = validateAssessmentUploadSizes(next.map((f) => f.size));
      if (!v.ok) {
        setUploadError(v.error ?? 'Invalid file size.');
        return prev;
      }
      setUploadError(null);
      return next;
    });
  }, []);

  function removeFile(i: number) {
    setFiles((f) => f.filter((_, j) => j !== i));
    setUploadError(null);
  }

  function onKeyDownStk(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = stkInput.trim();
    if (!v) return;
    if (!stakeholders.includes(v)) {
      setStakeholders((s) => [...s, v]);
    }
    setStkInput('');
  }

  function removeStakeholder(name: string) {
    setStakeholders((s) => s.filter((x) => x !== name));
  }

  async function submitSaveExit() {
    setFieldError(null);
    setSubmittingSave(true);
    try {
      const form = new FormData();
      form.append('clientName', clientName);
      form.append('projectBrief', projectBrief);
      form.append('stakeholders', JSON.stringify(stakeholders));
      form.append('intent', 'save_exit');
      for (const f of files) {
        form.append('files', f);
      }
      const res = await fetch('/api/assessment-builder/assessments', {
        method: 'POST',
        body: form,
      });
      const data = (await res.json()) as { error?: string; redirect?: string };
      if (!res.ok) {
        setUploadError(data.error ?? 'Could not save.');
        return;
      }
      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch {
      setUploadError('Something went wrong. Try again.');
    } finally {
      setSubmittingSave(false);
    }
  }

  async function submitCreateDraft() {
    setFieldError(null);
    if (!clientName.trim()) {
      setFieldError('Add a client company name to create a draft.');
      return;
    }
    setSubmittingCreate(true);
    try {
      const form = new FormData();
      form.append('clientName', clientName);
      form.append('projectBrief', projectBrief);
      form.append('stakeholders', JSON.stringify(stakeholders));
      form.append('intent', 'create_draft');
      for (const f of files) {
        form.append('files', f);
      }
      const res = await fetch('/api/assessment-builder/assessments', {
        method: 'POST',
        body: form,
      });
      const data = (await res.json()) as { error?: string; redirect?: string };
      if (!res.ok) {
        setUploadError(data.error ?? 'Could not save.');
        return;
      }
      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch {
      setUploadError('Something went wrong. Try again.');
    } finally {
      setSubmittingCreate(false);
    }
  }

  return (
    <div className="ab-new">
      <div className="ab-cfg-scroll">
        <Link href="/guide/assessment-builder" className="ab-back-btn">
          ← All assessments
        </Link>
        <div className="ab-cfg-eye">New Assessment</div>
        <h1 className="ab-cfg-title">Who are we building this for?</h1>
        <p className="ab-cfg-sub">
          Add what you have. Rough notes are fine, the agent will guide you through the rest
          once you&apos;re in.
        </p>

        <div className="ab-field">
          <label htmlFor="ab-client">Client company</label>
          <input
            id="ab-client"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            autoComplete="organization"
            placeholder="Company or client name"
          />
        </div>

        <div className="ab-field">
          <label htmlFor="ab-stk">Key stakeholders</label>
          <input
            id="ab-stk"
            type="text"
            value={stkInput}
            onChange={(e) => setStkInput(e.target.value)}
            onKeyDown={onKeyDownStk}
            placeholder="Type a name and press Enter"
          />
          <div className="ab-chip-row">
            {stakeholders.map((s) => (
              <span key={s} className="ab-chip">
                {s}
                <button
                  type="button"
                  className="ab-chip-x"
                  onClick={() => removeStakeholder(s)}
                  aria-label={`Remove ${s}`}
                >
                  {' '}
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="ab-field">
          <label htmlFor="ab-brief">
            Project brief <span className="ab-field-label-opt">— optional</span>
          </label>
          <textarea
            id="ab-brief"
            value={projectBrief}
            onChange={(e) => setProjectBrief(e.target.value)}
            placeholder={BRIEF_PLACEHOLDER}
          />
        </div>

        <div className="ab-field">
          <span id="ab-upload-lbl" className="ab-field-label-span">
            Transcripts &amp; documents
          </span>
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            multiple
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            aria-labelledby="ab-upload-lbl"
            onChange={(e) => {
              const input = e.target;
              const selected = input.files;
              if (selected?.length) {
                addFiles(selected);
              }
              input.value = '';
            }}
          />
          <div
            role="group"
            tabIndex={0}
            className={`ab-upload-zone ${drag ? 'ab-drag' : ''} ${files.length > 0 ? 'ab-upload-zone-has-files' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDrag(true);
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              setDrag(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDrag(false);
              const dropped = e.dataTransfer.files;
              if (dropped?.length) {
                addFiles(dropped);
              }
            }}
          >
            <svg
              className="ab-upload-zone-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a888c4"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>Drop files here or click to upload</p>
            <small>PDF, DOCX, TXT</small>
            {files.length > 0 ? (
              <ul className="ab-upload-zone-files" onClick={(e) => e.stopPropagation()}>
                {files.map((f, i) => (
                  <li key={`${f.name}-${f.size}-${f.lastModified}-${i}`} className="ab-upload-zone-chip">
                    <span className="ab-upload-zone-chip-name">{f.name}</span>
                    <span className="ab-upload-zone-chip-size">
                      {f.size < 1024 * 1024
                        ? `${Math.max(1, Math.round(f.size / 1024))} KB`
                        : `${(f.size / 1024 / 1024).toFixed(1)} MB`}
                    </span>
                    <button
                      type="button"
                      className="ab-chip-x"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      aria-label={`Remove ${f.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {uploadError ? <div className="ab-upload-err">{uploadError}</div> : null}
          {fieldError ? <div className="ab-field-err">{fieldError}</div> : null}
        </div>
      </div>

      <div className="ab-cfg-footer">
        <button
          type="button"
          className="ab-btn-save-exit"
          disabled={submittingSave || submittingCreate}
          onClick={() => void submitSaveExit()}
        >
          Save &amp; exit
        </button>
        <button
          type="button"
          className={`ab-btn-primary ${submittingCreate ? 'ab-btn-creating' : ''}`}
          disabled={submittingCreate || submittingSave}
          onClick={() => void submitCreateDraft()}
        >
          {submittingCreate ? (
            <span className="ab-btn-spinner" aria-hidden />
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
          Create Draft
        </button>
      </div>
    </div>
  );
}
