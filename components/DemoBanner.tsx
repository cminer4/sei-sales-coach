'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full bg-black/60 backdrop-blur-sm border-b border-white/10 px-4 py-2 flex items-center justify-between gap-4 text-sm text-white/90">
      <p>
        You are viewing a demo configured with sample sales data.{' '}
        <a href="mailto:cminer@sei.com?subject=SEI%20Sales%20Agent%20Platform%20Inquiry" className="underline hover:text-white transition-colors font-medium">
          Contact us
        </a>
        {' '}to build a custom AI agent for your organization.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1.5 rounded hover:bg-white/10 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
