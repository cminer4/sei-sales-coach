'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  filterDashboardRows,
  sortDashboardRows,
  formatDashboardRelativeDate,
  type DashboardRow,
  type DashboardSortOption,
  type DashboardStatusFilter,
} from '@/lib/assessment-builder-dashboard';

function badgeClass(name: DashboardRow['statusBadgeClass']): string {
  if (name === 'b-disc') return 'ab-b-disc';
  if (name === 'b-draft') return 'ab-b-draft';
  return 'ab-b-done';
}

function dotClass(name: DashboardRow['dotClass']): string {
  if (name === 'd-live') return 'ab-d-live';
  if (name === 'd-draft') return 'ab-d-draft';
  return 'ab-d-done';
}

export function AssessmentDashboard({ initialRows }: { initialRows: DashboardRow[] }) {
  const router = useRouter();
  const [rowList, setRowList] = useState(initialRows);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>('all');
  const [sort, setSort] = useState<DashboardSortOption>('date-desc');
  const [thKey, setThKey] = useState<'name' | 'status' | 'date' | null>('date');
  const [nameDir, setNameDir] = useState<'asc' | 'desc'>('desc');
  const [dateDir, setDateDir] = useState<'asc' | 'desc'>('desc');
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [archivePending, setArchivePending] = useState(false);

  const rows = useMemo(() => {
    const filtered = filterDashboardRows(rowList, query, statusFilter);
    return sortDashboardRows(filtered, sort);
  }, [rowList, query, statusFilter, sort]);

  const hasAnyAssessments = rowList.length > 0;

  useEffect(() => {
    setRowList(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (!confirmArchiveId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmArchiveId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmArchiveId]);

  const archiveRow = confirmArchiveId
    ? rowList.find((r) => r.id === confirmArchiveId) ?? null
    : null;

  async function confirmArchive(id: string) {
    setArchivePending(true);
    try {
      const res = await fetch(`/api/assessment-builder/assessments/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const msg =
          res.status === 404
            ? 'Assessment not found or already archived.'
            : 'Could not archive this assessment. Try again.';
        window.alert(msg);
        return;
      }
      setRowList((prev) => prev.filter((r) => r.id !== id));
      setConfirmArchiveId(null);
    } finally {
      setArchivePending(false);
    }
  }

  function closeArchiveModal() {
    if (!archivePending) setConfirmArchiveId(null);
  }

  function setFilter(f: DashboardStatusFilter) {
    setStatusFilter(f);
  }

  function onSortSelect(next: DashboardSortOption) {
    setSort(next);
    if (next.startsWith('name')) {
      setThKey('name');
      setNameDir(next === 'name-asc' ? 'asc' : 'desc');
    } else if (next.startsWith('date')) {
      setThKey('date');
      setDateDir(next === 'date-asc' ? 'asc' : 'desc');
    } else if (next === 'status') {
      setThKey('status');
    }
  }

  function clickNameColumn() {
    const nextDir = nameDir === 'asc' ? 'desc' : 'asc';
    setNameDir(nextDir);
    setSort(nextDir === 'asc' ? 'name-asc' : 'name-desc');
    setThKey('name');
  }

  function clickDateColumn() {
    const nextDir = dateDir === 'asc' ? 'desc' : 'asc';
    setDateDir(nextDir);
    setSort(nextDir === 'asc' ? 'date-asc' : 'date-desc');
    setThKey('date');
  }

  function clickStatusColumn() {
    setSort('status');
    setThKey('status');
  }

  function arrFor(key: 'name' | 'status' | 'date'): string {
    if (thKey !== key) return '↕';
    if (key === 'status') return '↓';
    if (key === 'name') return nameDir === 'desc' ? '↓' : '↑';
    return dateDir === 'desc' ? '↓' : '↑';
  }

  return (
    <div className="ab-dash">
      <div className="ab-db-top">
        <div className="ab-db-head">
          <h1>AI Assessment Builder</h1>
          <p>Turn Discovery findings into structured, client-ready deliverables.</p>
        </div>
        <Link href="/guide/assessment-builder/new" className="ab-btn-new">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Assessment
        </Link>
      </div>

      {!hasAnyAssessments ? (
        <div className="ab-dash-empty">
          <h2>No assessments yet</h2>
          <p>Create your first assessment to get started.</p>
          <Link href="/guide/assessment-builder/new" className="ab-btn-new">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Assessment
          </Link>
        </div>
      ) : null}

      {hasAnyAssessments ? (
        <div className="ab-tbl-controls">
        <div className="ab-tbl-search">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#aaa"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search assessments…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search assessments"
          />
        </div>
        <div className="ab-tbl-filter">
          {(['all', 'Discovery', 'Draft Ready', 'Complete'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`ab-fchip ${statusFilter === f ? 'on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        <div className="ab-tbl-sort-wrap">
          <span className="ab-sort-lbl">Sort by</span>
          <select
            className="ab-sort-sel"
            value={sort}
            onChange={(e) => onSortSelect(e.target.value as DashboardSortOption)}
            aria-label="Sort assessments"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="name-asc">Client A–Z</option>
            <option value="name-desc">Client Z–A</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>
      ) : null}

      {hasAnyAssessments ? (
      <table className="ab-proj-table">
        <thead>
          <tr>
            <th onClick={clickNameColumn} scope="col">
              Client <span className="ab-arr">{arrFor('name')}</span>
            </th>
            <th scope="col">Stakeholders</th>
            <th onClick={clickStatusColumn} scope="col">
              Status <span className="ab-arr">{arrFor('status')}</span>
            </th>
            <th scope="col">Documents</th>
            <th onClick={clickDateColumn} scope="col">
              Last updated <span className="ab-arr">{arrFor('date')}</span>
            </th>
            <th scope="col" className="ab-th-actions">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="ab-tbl-empty">
                No assessments match your search.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r.id}
                className="ab-row-click"
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/guide/assessment-builder/${r.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/guide/assessment-builder/${r.id}`);
                  }
                }}
              >
                <td className="ab-td-name">
                  <span className={`ab-pr-dot ${dotClass(r.dotClass)}`} aria-hidden />
                  {r.clientName}
                </td>
                <td className="ab-td-stk">{r.stakeholdersDisplay}</td>
                <td>
                  <span className={`ab-pr-badge ${badgeClass(r.statusBadgeClass)}`}>
                    {r.statusLabel}
                  </span>
                </td>
                <td className="ab-td-docs">
                  {r.docCount} doc{r.docCount !== 1 ? 's' : ''}
                </td>
                <td className="ab-td-date">{formatDashboardRelativeDate(r.updatedAt)}</td>
                <td
                  className="ab-td-actions"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="ab-archive-icon-btn"
                    title="Archive assessment"
                    aria-label={`Archive assessment ${r.clientName}`}
                    onClick={() => setConfirmArchiveId(r.id)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      ) : null}

      {archiveRow ? (
        <div
          className="ab-dash-modal-backdrop"
          role="presentation"
          onClick={closeArchiveModal}
        >
          <div
            className="ab-dash-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ab-archive-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="ab-archive-modal-title" className="ab-dash-modal-title">
              Archive this assessment?
            </h2>
            <p className="ab-dash-modal-sub">{archiveRow.clientName}</p>
            <div className="ab-dash-modal-actions">
              <button
                type="button"
                className="ab-dash-modal-cancel"
                disabled={archivePending}
                onClick={closeArchiveModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ab-dash-modal-archive"
                disabled={archivePending}
                onClick={() => void confirmArchive(archiveRow.id)}
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
