/** SEI-42 Decision 6: max 10MB per file, 25MB total per assessment (enforce in API too). */
export const MAX_BYTES_PER_FILE = 10 * 1024 * 1024;
export const MAX_BYTES_TOTAL = 25 * 1024 * 1024;

export function validateAssessmentUploadSizes(fileSizesBytes: number[]): {
  ok: boolean;
  error?: string;
} {
  for (const size of fileSizesBytes) {
    if (size > MAX_BYTES_PER_FILE) {
      return {
        ok: false,
        error: `Each file must be 10MB or smaller.`,
      };
    }
  }
  const total = fileSizesBytes.reduce((a, b) => a + b, 0);
  if (total > MAX_BYTES_TOTAL) {
    return {
      ok: false,
      error: `Total upload size must be 25MB or smaller.`,
    };
  }
  return { ok: true };
}
