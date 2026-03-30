import type { DraftContent } from '@/lib/assessment-builder-draft-types';
import {
  buildAssessmentDocx,
  discoveryAssessmentFilename,
  packAssessmentDocx,
  paragraphsFromSectionHtml,
  textRunsFromHtmlFragment,
} from '@/lib/assessment-builder-docx';

function sampleDraft(): DraftContent {
  return {
    findings: '<p>Intro <strong>bold</strong> end.</p>',
    interviews: '<ul><li>First item</li><li>Second</li></ul>',
    hypothesis: '<p>H1</p>',
    stakeholder_map: '<p>Map</p>',
    opportunities: '<p>Opp</p>',
  };
}

describe('textRunsFromHtmlFragment', () => {
  it('splits plain and bold segments', () => {
    const runs = textRunsFromHtmlFragment('a <strong>b</strong> c');
    expect(runs.length).toBeGreaterThanOrEqual(2);
  });
});

describe('paragraphsFromSectionHtml', () => {
  it('creates bullet paragraphs for list items', () => {
    const ps = paragraphsFromSectionHtml('<ul><li>One</li><li>Two</li></ul>');
    expect(ps.length).toBe(2);
  });
});

describe('discoveryAssessmentFilename', () => {
  it('sanitizes client name for download', () => {
    expect(discoveryAssessmentFilename('Acme Corp')).toBe('Acme Corp-Discovery-Assessment.docx');
    expect(discoveryAssessmentFilename('Bad<>Name!')).toBe('BadName-Discovery-Assessment.docx');
  });
});

describe('buildAssessmentDocx', () => {
  it('returns a Document', () => {
    const doc = buildAssessmentDocx({ clientName: 'Acme Corp' }, sampleDraft());
    expect(doc).toBeDefined();
    expect(typeof doc).toBe('object');
  });

  it('packs to a non-empty buffer', async () => {
    const doc = buildAssessmentDocx({ clientName: 'Test' }, sampleDraft());
    const buf = await packAssessmentDocx(doc);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(2000);
  });
});
