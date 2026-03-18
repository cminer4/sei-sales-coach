export const ALLOWED_REGIONS = [
  'North America',
  'Western Europe',
  'Eastern Europe',
  'Middle East',
  'Southeast Asia',
  'China / North Asia',
  'Latin America',
  'Sub-Saharan Africa',
] as const;

export type AllowedRegion = (typeof ALLOWED_REGIONS)[number];

export function assertRegionsAllowed(regions: string[]): asserts regions is AllowedRegion[] {
  if (!Array.isArray(regions) || regions.length === 0) {
    throw new Error('regions must be a non-empty array');
  }

  const allowed = new Set<string>(ALLOWED_REGIONS);
  for (const r of regions) {
    if (typeof r !== 'string' || !allowed.has(r)) {
      throw new Error(
        `Invalid region: ${JSON.stringify(r)}. Allowed regions: ${ALLOWED_REGIONS.join(', ')}`
      );
    }
  }
}

