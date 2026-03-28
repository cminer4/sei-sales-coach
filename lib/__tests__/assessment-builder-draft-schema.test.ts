import {
  mergeRefinedDraft,
  parseDraftJsonString,
  parseDraftObject,
  parseRefineJsonString,
} from '@/lib/assessment-builder-draft-schema';

const validDraft = {
  findings: '<p>a</p>',
  interviews: '<p>b</p>',
  hypothesis: '<p>c</p>',
  stakeholder_map: '<p>d</p>',
  opportunities: '<p>e</p>',
};

describe('parseDraftObject', () => {
  it('accepts five string sections', () => {
    expect(parseDraftObject(validDraft)).toEqual(validDraft);
  });

  it('rejects missing keys', () => {
    expect(() =>
      parseDraftObject({
        findings: '<p>a</p>',
      }),
    ).toThrow();
  });

  it('rejects non-string section', () => {
    expect(() =>
      parseDraftObject({
        ...validDraft,
        findings: 1,
      }),
    ).toThrow();
  });
});

describe('parseDraftJsonString', () => {
  it('parses JSON with markdown fences', () => {
    const raw = '```json\n' + JSON.stringify(validDraft) + '\n```';
    expect(parseDraftJsonString(raw)).toEqual(validDraft);
  });

  it('parses JSON with preamble', () => {
    const raw = 'Here you go:\n' + JSON.stringify(validDraft);
    expect(parseDraftJsonString(raw)).toEqual(validDraft);
  });
});

describe('mergeRefinedDraft', () => {
  it('keeps dirty sections from client draft', () => {
    const client = { ...validDraft, findings: '<p>user</p>' };
    const parsed = parseRefineJsonString(
      JSON.stringify({
        reply: 'ok',
        draft: { ...validDraft, findings: '<p>ai</p>' },
        suggestions: {},
      }),
    );
    const merged = mergeRefinedDraft(client, parsed, ['findings']);
    expect(merged.findings).toBe('<p>user</p>');
    expect(merged.interviews).toBe(validDraft.interviews);
  });
});

describe('parseRefineJsonString', () => {
  it('parses draft and suggestions', () => {
    const payload = {
      reply: 'Here is an update.',
      draft: validDraft,
      suggestions: { findings: '<p>suggested</p>' },
    };
    const out = parseRefineJsonString(JSON.stringify(payload));
    expect(out.draft).toEqual(validDraft);
    expect(out.reply).toBe('Here is an update.');
    expect(out.suggestions.findings).toBe('<p>suggested</p>');
  });
});
