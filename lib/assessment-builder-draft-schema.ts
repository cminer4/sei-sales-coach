import type { DraftContent, DraftSectionKey } from '@/lib/assessment-builder-draft-types';
import { DRAFT_SECTION_KEYS, isDraftSectionKey } from '@/lib/assessment-builder-draft-types';

/** Strip markdown fences and slice to outermost JSON object (same idea as assessment-summary). */
export function prepareDraftJsonForParse(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  return s.trim();
}

export function parseDraftObject(parsed: unknown): DraftContent {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Draft JSON must be an object');
  }
  const o = parsed as Record<string, unknown>;
  const out: Partial<DraftContent> = {};
  for (const k of DRAFT_SECTION_KEYS) {
    const v = o[k];
    if (typeof v !== 'string') {
      throw new Error(`Missing or invalid section "${k}" (expected string HTML)`);
    }
    out[k] = v;
  }
  return out as DraftContent;
}

export function parseDraftJsonString(raw: string): DraftContent {
  const s = prepareDraftJsonForParse(raw);
  const parsed = JSON.parse(s) as unknown;
  return parseDraftObject(parsed);
}

/** Parse Prisma Json / DB payload into DraftContent if valid. */
export function draftContentFromDb(value: unknown): DraftContent | null {
  if (value === null || value === undefined) return null;
  try {
    return parseDraftObject(value);
  } catch {
    return null;
  }
}

export type RefineResponsePayload = {
  /** Short SEI Guide chat line shown to the consultant. */
  reply?: string;
  draft: DraftContent;
  /** Proposed HTML for manually edited sections only (no direct inject). */
  suggestions: Partial<Record<DraftSectionKey, string>>;
};

export function parseRefineObject(parsed: unknown): RefineResponsePayload {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Refine JSON must be an object');
  }
  const o = parsed as Record<string, unknown>;
  const reply = typeof o.reply === 'string' ? o.reply : undefined;
  if (!o.draft || typeof o.draft !== 'object') {
    throw new Error('Refine JSON must include draft object');
  }
  const draft = parseDraftObject(o.draft);
  const suggestions: Partial<Record<DraftSectionKey, string>> = {};
  const sug = o.suggestions;
  if (sug !== undefined) {
    if (typeof sug !== 'object' || sug === null) {
      throw new Error('Invalid suggestions');
    }
    for (const k of Object.keys(sug)) {
      if (!isDraftSectionKey(k)) continue;
      const v = (sug as Record<string, unknown>)[k];
      if (typeof v === 'string') {
        suggestions[k] = v;
      }
    }
  }
  return { reply, draft, suggestions };
}

export function parseRefineJsonString(raw: string): RefineResponsePayload {
  const s = prepareDraftJsonForParse(raw);
  const parsed = JSON.parse(s) as unknown;
  return parseRefineObject(parsed);
}

/**
 * Client draft is source of truth for dirty sections; clean sections take Claude output.
 */
export function mergeRefinedDraft(
  clientDraft: DraftContent,
  parsed: RefineResponsePayload,
  dirtySections: DraftSectionKey[],
): DraftContent {
  const merged = { ...clientDraft };
  for (const k of DRAFT_SECTION_KEYS) {
    if (dirtySections.includes(k)) {
      merged[k] = clientDraft[k];
    } else {
      merged[k] = parsed.draft[k];
    }
  }
  return merged;
}
