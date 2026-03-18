import { ResearchStore } from '@/lib/geopoliticalBrief/researchStore';

describe('geopoliticalBrief/researchStore', () => {
  it('returns 404-style miss when unknown id', () => {
    const store = new ResearchStore({ ttlMs: 30 * 60 * 1000 });
    const res = store.get('does-not-exist');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('NOT_FOUND');
      expect(res.error.httpStatus).toBe(404);
    }
  });

  it('returns 410 when expired', () => {
    const now = new Date('2026-03-17T00:00:00.000Z');
    const store = new ResearchStore({
      ttlMs: 30 * 60 * 1000,
      now: () => now,
    });

    const created = store.create({
      onboarding: {
        name: 'Test',
        role: 'Ops',
        company: 'ExampleCo',
        industry: 'Logistics',
        regions: ['Western Europe'],
      },
      companyIntelligence: '',
      regionalSignals: '',
      enrichment: '',
    });

    const later = new Date(now.getTime() + 30 * 60 * 1000 + 1);
    store.setNow(() => later);

    const res = store.get(created.researchId);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('EXPIRED');
      expect(res.error.httpStatus).toBe(410);
    }
  });
});

