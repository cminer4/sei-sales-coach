import type { DraftContent } from '@/lib/assessment-builder-draft-types';

/**
 * Next version label after publishing. First publish is v1.0; each later publish bumps the minor (v1.1, v1.2).
 */
export function nextPublishVersion(latestExisting: string | null | undefined): string {
  const prev = latestExisting?.trim();
  if (!prev) return 'v1.0';
  const m = /^v(\d+)\.(\d+)$/.exec(prev);
  if (!m) return 'v1.0';
  const major = Number(m[1]);
  const minor = Number(m[2]);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return 'v1.0';
  return `v${major}.${minor + 1}`;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * One-line summary for version history: plain text from Discovery Findings, max 120 characters.
 */
export function draftSummaryOneLine(draft: DraftContent): string {
  const html = typeof draft.findings === 'string' ? draft.findings : '';
  const plain = stripHtmlTags(html).replace(/\s+/g, ' ').trim();
  if (plain.length <= 120) return plain;
  return `${plain.slice(0, 119)}…`;
}
