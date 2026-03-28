'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { validateAssessmentUploadSizes } from '@/lib/assessment-builder-upload-limits';

const DEFAULT_BRIEF = `Client is mid-size regional bank, ~1,200 employees. Leadership is bought in but IT and compliance are concerned about data governance. Strong interest in automating loan underwriting. Data infrastructure is fragmented.`;

export function NewAssessmentForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientName, setClientName] = useState('Meridian Financial Group');
  const [stakeholders, setStakeholders] = useState<string[]>([
    'Dana Reyes',
    'Tom Archuleta',
    'Sarah Kim',
  ]);
  const [stkInput, setStkInput] = useState('');
  const [projectBrief, setProjectBrief] = useState(DEFAULT_BRIEF);
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const addFiles = useCallback((list: FileList | File[]) => {
    setFiles((prev) => {
      const next = [...prev, ...Array.from(list)];
      const sizes = next.map((f) => f.size);
      const v = validateAssessmentUploadSizes(sizes);
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

  async function submit(intent: 'save_exit' | 'create_draft') {
    setFieldError(null);
    if (intent === 'create_draft' && !clientName.trim()) {
      setFieldError('Add a client company name to create a draft.');
      return;
    }
    setPending(true);
    try {
      const form = new FormData();
      form.append('clientName', clientName);
      form.append('projectBrief', projectBrief);
      form.append('stakeholders', JSON.stringify(stakeholders));
      form.append('intent', intent);
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
        setPending(false);
        return;
      }
      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch {
      setUploadError('Something went wrong. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ab-new">
      <div className="ab-cfg-scroll">
        <Link href="/guide/assessment-builder" className="ab-back-btn">
          ← All assessments
        </Link>
        <div className="ab-cfg-eye">New Assessment</div>
        <h2 className="ab-cfg-title">Who are we building this for?</h2>
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
            Project brief{' '}
            <span style={{ color: '#6e5490', fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>
              — optional
            </span>
          </label>
          <textarea id="ab-brief" value={projectBrief} onChange={(e) => setProjectBrief(e.target.value)} />
        </div>

        <div className="ab-field">
          <span id="ab-upload-lbl">Transcripts &amp; documents</span>
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            multiple
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            aria-labelledby="ab-upload-lbl"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <div
            role="button"
            tabIndex={0}
            className={`ab-upload-zone ${drag ? 'ab-drag' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a888c4"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: 4 }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>Drop files here or click to upload</p>
            <small>PDF, DOCX, TXT</small>
          </div>
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="ab-file-item">
              <span className="ab-fn">{f.name}</span>
              <span className="ab-fs">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              <button type="button" className="ab-chip-x" onClick={() => removeFile(i)} aria-label="Remove file">
                ×
              </button>
            </div>
          ))}
          {uploadError ? <div className="ab-upload-err">{uploadError}</div> : null}
          {fieldError ? <div className="ab-field-err">{fieldError}</div> : null}
        </div>
      </div>

      <div className="ab-cfg-footer">
        <button
          type="button"
          className="ab-btn-save-exit"
          disabled={pending}
          onClick={() => submit('save_exit')}
        >
          Save &amp; exit
        </button>
        <button
          type="button"
          className="ab-btn-primary"
          disabled={pending}
          onClick={() => submit('create_draft')}
        >
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
          Create Draft
        </button>
      </div>
    </div>
  );
}
