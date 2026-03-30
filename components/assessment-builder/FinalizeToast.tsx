'use client';

import { useEffect } from 'react';

type FinalizeToastProps = {
  clientName: string;
  versionLabel: string;
  onDismiss: () => void;
  durationMs?: number;
};

/**
 * Bottom-center success toast after DOCX download (Phase 4).
 */
export function FinalizeToast({
  clientName,
  versionLabel,
  onDismiss,
  durationMs = 3200,
}: FinalizeToastProps) {
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(), durationMs);
    return () => window.clearTimeout(t);
  }, [onDismiss, durationMs]);

  return (
    <div className="ab-finalize-toast" role="status">
      <span className="ab-finalize-toast-check" aria-hidden>
        ✓
      </span>
      <div className="ab-finalize-toast-text">
        <div className="ab-finalize-toast-title">Document finalized and downloaded</div>
        <div className="ab-finalize-toast-sub">
          {clientName} · {versionLabel}
        </div>
      </div>
    </div>
  );
}
