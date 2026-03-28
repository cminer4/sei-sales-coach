import {
  assessmentToDashboardRow,
  filterDashboardRows,
  mapDbStatusToDisplay,
  sortDashboardRows,
  type DashboardRow,
} from '@/lib/assessment-builder-dashboard';

const baseRows: DashboardRow[] = [
  {
    id: '1',
    clientName: 'Meridian Financial Group',
    stakeholdersDisplay: 'Dana Reyes, Tom Archuleta, Sarah Kim',
    statusLabel: 'Discovery',
    statusBadgeClass: 'b-disc',
    dotClass: 'd-live',
    docCount: 2,
    updatedAt: new Date('2026-03-28T12:00:00'),
  },
  {
    id: '2',
    clientName: 'Clearwater Health Systems',
    stakeholdersDisplay: 'Kevin Marsh, Lisa Chen',
    statusLabel: 'Draft Ready',
    statusBadgeClass: 'b-draft',
    dotClass: 'd-draft',
    docCount: 3,
    updatedAt: new Date('2026-03-14T14:22:00'),
  },
];

describe('assessmentToDashboardRow', () => {
  it('maps DB fields to dashboard row', () => {
    const row = assessmentToDashboardRow({
      id: 'a1',
      clientName: 'Acme Co',
      stakeholders: ['A', 'B'],
      status: 'draft_ready',
      updatedAt: new Date('2026-03-01T12:00:00'),
      docCount: 3,
    });
    expect(row.clientName).toBe('Acme Co');
    expect(row.stakeholdersDisplay).toBe('A, B');
    expect(row.statusLabel).toBe('Draft Ready');
    expect(row.docCount).toBe(3);
    expect(row.statusBadgeClass).toBe('b-draft');
    expect(row.dotClass).toBe('d-draft');
  });
});

describe('mapDbStatusToDisplay', () => {
  it('maps new and in_progress to Discovery', () => {
    expect(mapDbStatusToDisplay('new').label).toBe('Discovery');
    expect(mapDbStatusToDisplay('in_progress').label).toBe('Discovery');
  });

  it('maps draft_ready to Draft Ready', () => {
    expect(mapDbStatusToDisplay('draft_ready').label).toBe('Draft Ready');
  });

  it('maps complete to Complete', () => {
    expect(mapDbStatusToDisplay('complete').label).toBe('Complete');
  });
});

describe('filterDashboardRows', () => {
  it('narrows by client name', () => {
    const out = filterDashboardRows(baseRows, 'meridian', 'all');
    expect(out).toHaveLength(1);
    expect(out[0].clientName).toBe('Meridian Financial Group');
  });

  it('narrows by stakeholders text', () => {
    const out = filterDashboardRows(baseRows, 'kevin', 'all');
    expect(out).toHaveLength(1);
    expect(out[0].clientName).toBe('Clearwater Health Systems');
  });

  it('filters by status chip Discovery', () => {
    const out = filterDashboardRows(baseRows, '', 'Discovery');
    expect(out.every((r) => r.statusLabel === 'Discovery')).toBe(true);
  });
});

describe('sortDashboardRows', () => {
  it('sorts by date descending (newest first)', () => {
    const sorted = sortDashboardRows([...baseRows], 'date-desc');
    expect(sorted[0].id).toBe('1');
  });

  it('sorts by date ascending', () => {
    const sorted = sortDashboardRows([...baseRows], 'date-asc');
    expect(sorted[0].id).toBe('2');
  });

  it('sorts by client name A-Z', () => {
    const sorted = sortDashboardRows([...baseRows], 'name-asc');
    expect(sorted[0].clientName.startsWith('C')).toBe(true);
  });

  it('sorts by status label', () => {
    const sorted = sortDashboardRows([...baseRows], 'status');
    const labels = sorted.map((r) => r.statusLabel);
    expect([...labels].sort()).toEqual(labels);
  });
});
