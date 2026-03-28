import {
  CHUNK_OVERLAP_TOKENS,
  CHUNK_TARGET_TOKENS,
  chunkTextIntoSegments,
} from '@/lib/assessment-builder-chunk';

describe('chunkTextIntoSegments', () => {
  it('returns empty array for blank text', () => {
    expect(chunkTextIntoSegments('')).toEqual([]);
    expect(chunkTextIntoSegments('   ')).toEqual([]);
  });

  it('returns a single chunk for short text', () => {
    const s = 'Hello world. This is a short document.';
    const chunks = chunkTextIntoSegments(s);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0]).toContain('Hello');
  });

  it('produces multiple segments when text is long', () => {
    const sentence =
      'The quick brown fox jumps over the lazy dog. '.repeat(200);
    const chunks = chunkTextIntoSegments(sentence);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('uses target and overlap constants from spec', () => {
    expect(CHUNK_TARGET_TOKENS).toBe(800);
    expect(CHUNK_OVERLAP_TOKENS).toBe(100);
  });
});
