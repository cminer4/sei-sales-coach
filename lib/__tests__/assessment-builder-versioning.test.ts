import { nextPublishVersion } from '@/lib/assessment-builder-versioning';

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
