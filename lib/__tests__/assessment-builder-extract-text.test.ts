import {
  detectExtractableKind,
} from '@/lib/assessment-builder-extract-text';

describe('detectExtractableKind', () => {
  it('detects pdf docx txt', () => {
    expect(detectExtractableKind('Report.PDF')).toBe('pdf');
    expect(detectExtractableKind('notes.docx')).toBe('docx');
    expect(detectExtractableKind('readme.txt')).toBe('txt');
  });

  it('returns null for unknown', () => {
    expect(detectExtractableKind('file.xyz')).toBeNull();
  });
});
