/**
 * Plain-text transcript lines for the Assessment Builder document drawer.
 * Consultant lines: trimmed content starts with "Q:" or "Interviewer:" (case-insensitive).
 * Blank lines are preserved for vertical rhythm.
 */

export type TranscriptLineKind = 'consultant' | 'client' | 'blank';

export type TranscriptLine = {
  kind: TranscriptLineKind;
  /** Original line including leading/trailing whitespace except we keep single newlines as separate entries */
  text: string;
};

/** Split extracted text into lines (LF / CRLF). Empty string yields []. */
export function splitTranscriptLines(raw: string): string[] {
  if (raw === '') return [];
  return raw.split(/\r?\n/);
}

const CONSULTANT_PREFIX = /^(Q:|Interviewer:)/i;

/** Classify a single line after trim for prefix checks; blank lines are blank. */
export function classifyTranscriptLine(line: string): TranscriptLineKind {
  const t = line.trim();
  if (t === '') return 'blank';
  if (CONSULTANT_PREFIX.test(t)) return 'consultant';
  return 'client';
}

/** Build display rows for the drawer (one per source line). */
export function parseTranscriptForDisplay(raw: string): TranscriptLine[] {
  const lines = splitTranscriptLines(raw);
  return lines.map((text) => ({
    kind: classifyTranscriptLine(text),
    text,
  }));
}
