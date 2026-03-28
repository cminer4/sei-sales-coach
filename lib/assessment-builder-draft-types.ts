export const DRAFT_SECTION_KEYS = [
  'findings',
  'interviews',
  'hypothesis',
  'stakeholder_map',
  'opportunities',
] as const;

export type DraftSectionKey = (typeof DRAFT_SECTION_KEYS)[number];

/** Five HTML fragments (no full document wrapper) persisted in assessments.draft_content */
export type DraftContent = Record<DraftSectionKey, string>;

export function isDraftSectionKey(k: string): k is DraftSectionKey {
  return (DRAFT_SECTION_KEYS as readonly string[]).includes(k);
}
