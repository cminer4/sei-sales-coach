import type { DraftContent } from '@/lib/assessment-builder-draft-types';
import { DRAFT_SECTION_KEYS } from '@/lib/assessment-builder-draft-types';

const SECTION_META: {
  key: keyof DraftContent;
  title: string;
  chip: 'draft' | 'building';
}[] = [
  { key: 'findings', title: 'Discovery Findings', chip: 'draft' },
  { key: 'interviews', title: 'Stakeholder Interviews', chip: 'draft' },
  { key: 'hypothesis', title: 'Hypothesis Brief', chip: 'building' },
  { key: 'stakeholder_map', title: 'Stakeholder Map', chip: 'building' },
  { key: 'opportunities', title: 'Opportunity Shortlist', chip: 'draft' },
];

export type BuildDocumentHtmlOptions = {
  /** Published / read-only: no per-section contenteditable (avoids editing on published route). */
  readOnly?: boolean;
};

/**
 * Section blocks: each h2 is locked; each body lives in a [data-section] div that is the only
 * editable surface in the builder (contenteditable on the section, not the root) so execCommand
 * and typing stay inside the section wrapper.
 */
export function buildDocumentHtmlFromDraft(
  draft: DraftContent,
  options?: BuildDocumentHtmlOptions,
): string {
  const readOnly = options?.readOnly === true;
  const blocks: string[] = [];
  for (const { key, title, chip } of SECTION_META) {
    const chipClass = chip === 'draft' ? 'sdraft' : 'sbuild';
    const chipLabel = chip === 'draft' ? 'Draft' : 'Building';
    blocks.push(
      `<h2 contenteditable="false">${escapeHtml(title)} <span class="schip ${chipClass}" contenteditable="false">${chipLabel}</span></h2>`,
    );
    const editableAttr = readOnly ? 'contenteditable="false"' : 'contenteditable="true"';
    blocks.push(
      `<div class="ab-sec" data-section="${key}" data-manually-edited="false" ${editableAttr}>`,
    );
    blocks.push(draft[key] || '<p></p>');
    blocks.push('</div>');
  }
  return blocks.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type BuildFullEditorHtmlOptions = BuildDocumentHtmlOptions;

/** Full document body for the builder canvas (prototype docpage). */
export function buildFullEditorHtml(
  clientName: string,
  draft: DraftContent,
  options?: BuildFullEditorHtmlOptions,
): string {
  const d = new Date();
  const sub = `${escapeHtml(clientName)} · ${d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} · Confidential`;
  const locked = [
    `<div class="ab-doc-locked" contenteditable="false">`,
    `<div class="ab-doc-eye">SEI Management Consulting — Discovery Assessment</div>`,
    `<div class="ab-doc-h1">AI Readiness Discovery Report</div>`,
    `<div class="ab-doc-sub">${sub}</div>`,
    `</div>`,
  ].join('\n');
  const body = `<div class="ab-doc-body" contenteditable="false">${buildDocumentHtmlFromDraft(draft, options)}</div>`;
  return [locked, body].join('\n');
}

function parseDraftSectionsFromEditorRoot(root: HTMLElement): DraftContent | null {
  const out: Partial<DraftContent> = {};
  for (const key of DRAFT_SECTION_KEYS) {
    const sec = root.querySelector(`[data-section="${key}"]`);
    if (!sec) return null;
    out[key] = sec.innerHTML;
  }
  return out as DraftContent;
}

export { parseDraftSectionsFromEditorRoot };
