'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

interface SystemEventRow {
  id: string;
  created_at: string;
  route: string;
  event_type: string;
  severity: string;
  agent_id: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
}

interface SystemEventsResponse {
  events: SystemEventRow[];
  summary: {
    errorsLast24h: number;
    warningsLast24h: number;
    lastEventAt: string | null;
  };
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  } catch {
    return iso;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const base = 'px-2 py-0.5 rounded text-xs font-medium';
  if (severity === 'error') {
    return <span className={`${base} bg-red-100 text-red-800`}>error</span>;
  }
  if (severity === 'warn') {
    return <span className={`${base} bg-amber-100 text-amber-800`}>warn</span>;
  }
  return <span className={`${base} bg-gray-200 text-gray-700`}>info</span>;
}

export default function SystemHealthTab() {
  const [data, setData] = useState<SystemEventsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchEvents() {
      try {
        const res = await fetch('/api/admin/system-events');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body?.error ?? 'Failed to load system events');
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError('Failed to load system events');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEvents();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        {loading && (
          <p className="text-plum/60">Loading system events…</p>
        )}
        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3">
            {error}
          </div>
        )}
        {!loading && !error && data && (
          <>
            {/* Summary row */}
            <div className="mb-6 flex flex-wrap items-center gap-6">
              <span className="text-sm text-gray-600">
                Errors in last 24h: <strong>{data.summary.errorsLast24h}</strong>
              </span>
              <span className="text-sm text-gray-600">
                Warnings in last 24h: <strong>{data.summary.warningsLast24h}</strong>
              </span>
              <span className="text-sm text-gray-600">
                Last event: {data.summary.lastEventAt ? formatTime(data.summary.lastEventAt) : '—'}
              </span>
              {data.summary.errorsLast24h === 0 && data.summary.warningsLast24h === 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-800 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  All systems healthy
                </span>
              )}
            </div>

            {/* Event table */}
            <div className="rounded-xl border border-plum/10 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-plum/10 bg-plum/5">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Severity</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Route</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Event Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Agent</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          No system events yet.
                        </td>
                      </tr>
                    ) : (
                      data.events.map((row) => (
                        <tr key={row.id} className="border-b border-plum/5 hover:bg-plum/5">
                          <td className="py-2 px-4 text-gray-600 whitespace-nowrap">{formatTime(row.created_at)}</td>
                          <td className="py-2 px-4">
                            <SeverityBadge severity={row.severity} />
                          </td>
                          <td className="py-2 px-4 text-gray-700 font-mono text-xs">{row.route}</td>
                          <td className="py-2 px-4 text-gray-700">{row.event_type}</td>
                          <td className="py-2 px-4 text-gray-600 font-mono text-xs truncate max-w-[8rem]" title={row.agent_id ?? ''}>
                            {row.agent_id ?? '—'}
                          </td>
                          <td className="py-2 px-4 text-gray-700">{row.message}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
