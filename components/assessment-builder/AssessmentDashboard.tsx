'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  filterDashboardRows,
  sortDashboardRows,
  formatDashboardRelativeDate,
  type DashboardRow,
  type DashboardSortOption,
  type DashboardStatusFilter,
} from '@/lib/assessment-builder-dashboard';
import { ASSESSMENT_BUILDER_SEED_ROWS } from '@/lib/assessment-builder-seed-data';

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

export function AssessmentDashboard() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>('all');
  const [sort, setSort] = useState<DashboardSortOption>('date-desc');
  const [thKey, setThKey] = useState<'name' | 'status' | 'date' | null>('date');
  const [nameDir, setNameDir] = useState<'asc' | 'desc'>('desc');
  const [dateDir, setDateDir] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo(() => {
    const filtered = filterDashboardRows(ASSESSMENT_BUILDER_SEED_ROWS, query, statusFilter);
    return sortDashboardRows(filtered, sort);
  }, [query, statusFilter, sort]);

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
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="ab-tbl-empty">
                No assessments match your search.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
