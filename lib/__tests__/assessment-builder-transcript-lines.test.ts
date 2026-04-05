import {
  classifyTranscriptLine,
  parseTranscriptForDisplay,
  splitTranscriptLines,
} from '../assessment-builder-transcript-lines';

describe('splitTranscriptLines', () => {
  it('returns empty array for empty string', () => {
    expect(splitTranscriptLines('')).toEqual([]);
  });

  it('splits on LF and CRLF', () => {
    expect(splitTranscriptLines('a\nb')).toEqual(['a', 'b']);
    expect(splitTranscriptLines('a\r\nb')).toEqual(['a', 'b']);
  });
});

describe('classifyTranscriptLine', () => {
  it('marks Q: lines as consultant', () => {
    expect(classifyTranscriptLine('Q: What is the goal?')).toBe('consultant');
    expect(classifyTranscriptLine('q: lower')).toBe('consultant');
  });

  it('marks Interviewer: lines as consultant', () => {
    expect(classifyTranscriptLine('Interviewer: Hello')).toBe('consultant');
    expect(classifyTranscriptLine('interviewer: hi')).toBe('consultant');
  });

  it('marks other non-empty lines as client', () => {
    expect(classifyTranscriptLine('We need better tooling.')).toBe('client');
    expect(classifyTranscriptLine('Question: not a consultant prefix')).toBe('client');
  });

  it('marks whitespace-only as blank', () => {
    expect(classifyTranscriptLine('')).toBe('blank');
    expect(classifyTranscriptLine('   ')).toBe('blank');
  });
});

describe('parseTranscriptForDisplay', () => {
  it('returns empty for empty input', () => {
    expect(parseTranscriptForDisplay('')).toEqual([]);
  });

  it('preserves line order and kinds', () => {
    const rows = parseTranscriptForDisplay(
      'Q: First question\n\nClient answer\nInterviewer: Follow up',
    );
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ kind: 'consultant', text: 'Q: First question' });
    expect(rows[1]).toEqual({ kind: 'blank', text: '' });
    expect(rows[2]).toEqual({ kind: 'client', text: 'Client answer' });
    expect(rows[3]).toEqual({ kind: 'consultant', text: 'Interviewer: Follow up' });
  });
});
