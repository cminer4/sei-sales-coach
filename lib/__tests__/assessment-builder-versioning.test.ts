import type { DraftContent } from '@/lib/assessment-builder-draft-types';
import { draftSummaryOneLine, nextPublishVersion } from '@/lib/assessment-builder-versioning';

const emptyDraft = (): DraftContent => ({
  findings: '',
  interviews: '',
  hypothesis: '',
  stakeholder_map: '',
  opportunities: '',
});

describe('nextPublishVersion', () => {
  it('returns v1.0 when there is no prior version', () => {
    expect(nextPublishVersion(null)).toBe('v1.0');
    expect(nextPublishVersion(undefined)).toBe('v1.0');
    expect(nextPublishVersion('')).toBe('v1.0');
  });

  it('bumps minor after v1.0', () => {
    expect(nextPublishVersion('v1.0')).toBe('v1.1');
    expect(nextPublishVersion('v1.1')).toBe('v1.2');
  });

  it('handles multi-digit minor', () => {
    expect(nextPublishVersion('v2.9')).toBe('v2.10');
  });

  it('falls back to v1.0 on unexpected format', () => {
    expect(nextPublishVersion('bad')).toBe('v1.0');
  });
});

describe('draftSummaryOneLine', () => {
  it('strips tags and uses findings section only', () => {
    const d = emptyDraft();
    d.findings = '<p><strong>Note</strong> Discovery text here.</p>';
    expect(draftSummaryOneLine(d)).toBe('Note Discovery text here.');
  });

  it('truncates to 120 characters with ellipsis', () => {
    const d = emptyDraft();
    const long = 'word '.repeat(40).trim();
    d.findings = `<p>${long}</p>`;
    const s = draftSummaryOneLine(d);
    expect(s.length).toBe(120);
    expect(s.endsWith('…')).toBe(true);
  });

  it('handles empty findings', () => {
    expect(draftSummaryOneLine(emptyDraft())).toBe('');
  });
});
