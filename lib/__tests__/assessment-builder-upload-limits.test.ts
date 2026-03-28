import { validateAssessmentUploadSizes } from '@/lib/assessment-builder-upload-limits';

describe('validateAssessmentUploadSizes', () => {
  it('accepts empty file list', () => {
    expect(validateAssessmentUploadSizes([]).ok).toBe(true);
  });

  it('rejects a file over 10MB', () => {
    const r = validateAssessmentUploadSizes([11 * 1024 * 1024]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/10\s*MB/i);
  });

  it('rejects when total exceeds 25MB', () => {
    const r = validateAssessmentUploadSizes([
      10 * 1024 * 1024,
      10 * 1024 * 1024,
      6 * 1024 * 1024,
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/25\s*MB/i);
  });

  it('accepts files within limits', () => {
    const r = validateAssessmentUploadSizes([
      5 * 1024 * 1024,
      5 * 1024 * 1024,
      10 * 1024 * 1024,
    ]);
    expect(r.ok).toBe(true);
  });
});
