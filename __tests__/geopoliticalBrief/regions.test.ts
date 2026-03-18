import { ALLOWED_REGIONS, assertRegionsAllowed } from '@/lib/geopoliticalBrief/regions';

describe('geopoliticalBrief/regions', () => {
  it('exposes the eight allowed regions', () => {
    expect(ALLOWED_REGIONS).toEqual([
      'North America',
      'Western Europe',
      'Eastern Europe',
      'Middle East',
      'Southeast Asia',
      'China / North Asia',
      'Latin America',
      'Sub-Saharan Africa',
    ]);
  });

  it('accepts only allowed regions', () => {
    expect(() => assertRegionsAllowed(['Western Europe', 'Southeast Asia'])).not.toThrow();
  });

  it('rejects unknown regions with a helpful error', () => {
    expect(() => assertRegionsAllowed(['Europe'])).toThrow(/Invalid region/i);
  });
});

