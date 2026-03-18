import { validateBrief } from '@/lib/geopoliticalBrief/validateBrief';

describe('geopoliticalBrief/validateBrief', () => {
  it('accepts a minimal valid brief shape', () => {
    const brief = {
      company: 'IFCO Systems',
      generatedAt: '2026-03-17T00:00:00.000Z',
      horizon: '12-18 months',
      regions: ['Western Europe'],
      scopeSummary: 'Test',
      exposures: [
        { region: 'Western Europe', level: 'moderate', score: 3, summary: 'Test' },
      ],
      scenarios: [
        {
          name: 'Baseline',
          tag: 'baseline',
          probability: 55,
          severity: 'moderate',
          narrative: 'Test',
          implications: ['One', 'Two'],
        },
        {
          name: 'Alternate A',
          tag: 'alternate',
          probability: 20,
          severity: 'low',
          narrative: 'Test',
          implications: ['One', 'Two'],
        },
        {
          name: 'Alternate B',
          tag: 'alternate',
          probability: 15,
          severity: 'moderate',
          narrative: 'Test',
          implications: ['One', 'Two'],
        },
        {
          name: 'Contrarian',
          tag: 'contrarian',
          probability: 10,
          severity: 'high',
          narrative: 'Test',
          implications: ['One', 'Two'],
        },
      ],
      monitoring: [{ item: 'Test', frequency: 'weekly' }],
    };

    const res = validateBrief(brief);
    expect(res.ok).toBe(true);
  });

  it('rejects scenarios when probabilities do not sum to 100', () => {
    const bad = {
      company: 'X',
      generatedAt: '2026-03-17T00:00:00.000Z',
      horizon: '12-18 months',
      regions: ['Western Europe'],
      scopeSummary: 'Test',
      exposures: [{ region: 'Western Europe', level: 'low', score: 2, summary: 'Test' }],
      scenarios: [
        { name: 'Baseline', tag: 'baseline', probability: 50, severity: 'low', narrative: 'T', implications: ['a', 'b'] },
        { name: 'Alt A', tag: 'alternate', probability: 20, severity: 'low', narrative: 'T', implications: ['a', 'b'] },
        { name: 'Alt B', tag: 'alternate', probability: 20, severity: 'low', narrative: 'T', implications: ['a', 'b'] },
        { name: 'Contra', tag: 'contrarian', probability: 20, severity: 'low', narrative: 'T', implications: ['a', 'b'] },
      ],
      monitoring: [{ item: 'Test', frequency: 'weekly' }],
    };

    const res = validateBrief(bad);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/sum to 100/i);
    }
  });
});

