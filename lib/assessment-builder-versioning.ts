/**
 * Next version label after publishing. First publish is v1.0; each later publish bumps the minor (v1.1, v1.2).
 */
export function nextPublishVersion(latestExisting: string | null | undefined): string {
  const prev = latestExisting?.trim();
  if (!prev) return 'v1.0';
  const m = /^v(\d+)\.(\d+)$/.exec(prev);
  if (!m) return 'v1.0';
  const major = Number(m[1]);
  const minor = Number(m[2]);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return 'v1.0';
  return `v${major}.${minor + 1}`;
}
