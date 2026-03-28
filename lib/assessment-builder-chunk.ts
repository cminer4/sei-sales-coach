import { decode, encode } from 'gpt-tokenizer';

/** Spec: ~800 token segments with 100 token overlap */
export const CHUNK_TARGET_TOKENS = 800;
export const CHUNK_OVERLAP_TOKENS = 100;

/**
 * Splits plain text into overlapping segments for embedding.
 * Step size is target minus overlap so consecutive chunks share overlap tokens.
 */
export function chunkTextIntoSegments(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const tokens = encode(t);
  const step = CHUNK_TARGET_TOKENS - CHUNK_OVERLAP_TOKENS;
  const out: string[] = [];
  for (let start = 0; start < tokens.length; start += step) {
    const slice = tokens.slice(start, start + CHUNK_TARGET_TOKENS);
    if (slice.length === 0) break;
    out.push(decode(slice));
  }
  return out;
}
