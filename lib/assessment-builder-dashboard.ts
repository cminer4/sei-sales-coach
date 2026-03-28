export type DashboardSortOption =
  | 'date-desc'
  | 'date-asc'
  | 'name-asc'
  | 'name-desc'
  | 'status';

export type DashboardStatusFilter = 'all' | 'Discovery' | 'Draft Ready' | 'Complete';

export type DashboardRow = {
  id: string;
  clientName: string;
  stakeholdersDisplay: string;
  statusLabel: 'Discovery' | 'Draft Ready' | 'Complete';
  statusBadgeClass: 'b-disc' | 'b-draft' | 'b-done';
  dotClass: 'd-live' | 'd-draft' | 'd-done';
  docCount: number;
  updatedAt: Date;
};

const STATUS_STYLES: Record<
  DashboardRow['statusLabel'],
  { badge: DashboardRow['statusBadgeClass']; dot: DashboardRow['dotClass'] }
> = {
  Discovery: { badge: 'b-disc', dot: 'd-live' },
  'Draft Ready': { badge: 'b-draft', dot: 'd-draft' },
  Complete: { badge: 'b-done', dot: 'd-done' },
};

/** Map a persisted assessment + doc count to a dashboard table row. */
export function assessmentToDashboardRow(input: {
  id: string;
  clientName: string;
  stakeholders: string[];
  status: string;
  updatedAt: Date;
  docCount: number;
}): DashboardRow {
  const m = mapDbStatusToDisplay(input.status);
  return {
    id: input.id,
    clientName: input.clientName,
    stakeholdersDisplay: input.stakeholders.join(', '),
    statusLabel: m.label,
    statusBadgeClass: m.badge,
    dotClass: m.dot,
    docCount: input.docCount,
    updatedAt: input.updatedAt,
  };
}

/** Map Prisma assessment.status to dashboard display (FR-004 / prototype). */
export function mapDbStatusToDisplay(dbStatus: string): {
  label: DashboardRow['statusLabel'];
  badge: DashboardRow['statusBadgeClass'];
  dot: DashboardRow['dotClass'];
} {
  let label: DashboardRow['statusLabel'];
  if (dbStatus === 'draft_ready') {
    label = 'Draft Ready';
  } else if (dbStatus === 'complete') {
    label = 'Complete';
  } else {
    label = 'Discovery';
  }
  const s = STATUS_STYLES[label];
  return { label, badge: s.badge, dot: s.dot };
}

export function filterDashboardRows(
  rows: DashboardRow[],
  query: string,
  statusFilter: DashboardStatusFilter,
): DashboardRow[] {
  const q = query.trim().toLowerCase();
  let out = rows;
  if (statusFilter !== 'all') {
    out = out.filter((r) => r.statusLabel === statusFilter);
  }
  if (q) {
    out = out.filter(
      (r) =>
        r.clientName.toLowerCase().includes(q) ||
        r.stakeholdersDisplay.toLowerCase().includes(q) ||
        r.statusLabel.toLowerCase().includes(q),
    );
  }
  return out;
}

export function sortDashboardRows(
  rows: DashboardRow[],
  sort: DashboardSortOption,
): DashboardRow[] {
  const copy = [...rows];
  if (sort === 'date-desc') {
    copy.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } else if (sort === 'date-asc') {
    copy.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  } else if (sort === 'name-asc') {
    copy.sort((a, b) => a.clientName.localeCompare(b.clientName));
  } else if (sort === 'name-desc') {
    copy.sort((a, b) => b.clientName.localeCompare(a.clientName));
  } else if (sort === 'status') {
    copy.sort((a, b) => a.statusLabel.localeCompare(b.statusLabel));
  }
  return copy;
}

/** Relative date string matching prototype fmtDate behavior. */
export function formatDashboardRelativeDate(d: Date, now: Date = new Date()): string {
  const diff = now.getTime() - d.getTime();
  const day = 86400000;
  if (diff < day * 0.5) return 'Today';
  if (diff < day * 1.5) return 'Yesterday';
  if (diff < day * 7) return `${Math.floor(diff / day)} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
