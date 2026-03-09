'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Check } from 'lucide-react';

const AGENT_TYPES = ['Guide', 'Analyst', 'Builder', 'Orchestrator'] as const;
type AgentType = (typeof AGENT_TYPES)[number];

type Agent = {
  agent_id: string;
  name: string;
  prompt: string | null;
  document_tags: string[] | null;
  status: string;
  agent_type?: string | null;
  created_at: string;
};

const EMPTY_MESSAGE = 'No agents configured. Agents are added by a developer.';
const AGENT_TYPE_UNSET = '' as const;

function parseDocumentTags(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatDocumentTags(tags: string[] | null): string {
  if (!tags || tags.length === 0) return '';
  return tags.join(', ');
}

export default function PromptControlTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [prompt, setPrompt] = useState('');
  const [documentTagsText, setDocumentTagsText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [agentType, setAgentType] = useState<AgentType | typeof AGENT_TYPE_UNSET>(AGENT_TYPE_UNSET);
  const [agentTypeError, setAgentTypeError] = useState<string | null>(null);

  const selectedAgent = agents.find((a) => a.agent_id === selectedId);
  const prevSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    setError(null);
    fetch('/api/admin/agents')
      .then(async (res) => {
        let data: unknown;
        try {
          data = await res.json();
        } catch {
          const text = await res.text();
          throw new Error(res.ok ? 'Invalid response from server.' : `Could not load agents (${res.status}). ${text.slice(0, 200)}`);
        }
        if (!res.ok) {
          const msg = data && typeof (data as { error?: string }).error === 'string' ? (data as { error: string }).error : null;
          const detail = data && typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : null;
          throw new Error([msg, detail].filter(Boolean).join(' ') || `Could not load agents (${res.status}).`);
        }
        if (!Array.isArray(data)) {
          throw new Error('Invalid response: expected an array of agents.');
        }
        return data as Agent[];
      })
      .then((data: Agent[]) => {
        setAgents(data);
        if (data.length > 0) {
          setSelectedId(data[0].agent_id);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // When user switches to a different agent, fill form and clear save feedback
  useEffect(() => {
    if (!selectedAgent) return;
    setName(selectedAgent.name);
    setStatus((selectedAgent.status as 'draft' | 'active') || 'draft');
    setPrompt(selectedAgent.prompt ?? '');
    setDocumentTagsText(formatDocumentTags(selectedAgent.document_tags));
    const rawType = selectedAgent.agent_type;
    setAgentType(
      rawType && AGENT_TYPES.includes(rawType as AgentType) ? (rawType as AgentType) : AGENT_TYPE_UNSET
    );
    setNameError(null);
    setAgentTypeError(null);
    if (prevSelectedIdRef.current !== selectedId) {
      setSaveError(null);
      setSaveSuccess(null);
      prevSelectedIdRef.current = selectedId;
    }
  }, [selectedId, selectedAgent]);

  const handleSave = () => {
    setSaveError(null);
    setSaveSuccess(null);
    setNameError(null);
    setAgentTypeError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required');
      return;
    }
    if (!agentType || !AGENT_TYPES.includes(agentType as AgentType)) {
      setAgentTypeError(status === 'active' ? 'Assign an Agent Type before activating.' : 'Assign an Agent Type before saving.');
      return;
    }
    if (!selectedId) return;
    setIsSaving(true);
    const documentTags = parseDocumentTags(documentTagsText);
    fetch(`/api/admin/agents/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmedName,
        status,
        agent_type: agentType,
        prompt: prompt || null,
        document_tags: documentTags,
      }),
    })
      .then((res) => {
        const data = res.json();
        if (!res.ok) {
          return data.then((body: { error?: string }) => {
            throw new Error(body.error || 'Could not save. Please try again.');
          });
        }
        return data;
      })
      .then((updated: Agent) => {
        setSaveSuccess(`Saved at ${new Date().toLocaleTimeString()}`);
        setAgents((prev) =>
          prev.map((a) => (a.agent_id === updated.agent_id ? { ...updated, agent_type: updated.agent_type ?? null } : a))
        );
        setSelectedId(updated.agent_id);
      })
      .catch((err) => {
        setSaveError(err.message || 'Could not save. Please try again.');
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] p-8 text-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-plum-dark">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-bold">Loading agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] p-8 text-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3 text-red-800">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] p-8 text-gray-900">
        <div className="max-w-7xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl font-bold text-plum-dark">Prompt Control</h1>
            <p className="text-gray-500 mt-2 font-medium max-w-2xl">
              View and edit existing coach agents. Agents are added by a developer.
            </p>
          </header>
          <p className="text-gray-700 font-medium rounded-2xl border border-plum/10 bg-white p-8 shadow-sm">
            {EMPTY_MESSAGE}
          </p>
        </div>
      </div>
    );
  }

  const hasAgentTypeAssigned = agentType !== AGENT_TYPE_UNSET && AGENT_TYPES.includes(agentType as AgentType);

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-plum-dark">Prompt Control</h1>
          <p className="text-gray-500 mt-2 font-medium max-w-2xl">
            View and edit existing coach agents. Agents are added by a developer. New agents appear as Inactive; assign an Agent Type before toggling to Active.
          </p>
        </header>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-plum/10 p-6 shadow-sm">
            <label className="text-[10px] font-bold text-plum/40 uppercase tracking-widest mb-2 block">
              Agent
            </label>
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value || null)}
              className="w-full max-w-md px-4 py-2.5 rounded-xl border border-plum/20 text-plum-dark font-medium bg-white focus:outline-none focus:ring-2 focus:ring-plum/30"
            >
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id}>
                  {a.name} ({a.status === 'active' ? 'Active' : 'Inactive'})
                </option>
              ))}
            </select>

            <div className="mt-6">
              <label className="text-[10px] font-bold text-plum/40 uppercase tracking-widest mb-2 block">
                Agent Type <span className="text-[#E84855]">*</span>
              </label>
              <select
                value={agentType}
                onChange={(e) => {
                  setAgentType(e.target.value === '' ? AGENT_TYPE_UNSET : (e.target.value as AgentType));
                  setAgentTypeError(null);
                }}
                className={`w-full max-w-md px-4 py-2.5 rounded-xl border text-plum-dark font-medium bg-white focus:outline-none focus:ring-2 focus:ring-plum/30 ${
                  agentTypeError ? 'border-red-400' : 'border-plum/20'
                }`}
                aria-required
                aria-invalid={!!agentTypeError}
              >
                <option value={AGENT_TYPE_UNSET}>Select type...</option>
                {AGENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {!hasAgentTypeAssigned && (
                <p className="text-gray-500 text-xs font-medium mt-1">
                  Select an Agent Type to enable Active.
                </p>
              )}
              {agentTypeError && (
                <p className="text-[#E84855] text-xs font-medium mt-1">
                  {agentTypeError}
                </p>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-plum/10 p-6 shadow-sm space-y-6">
            {/* Agent Status toggle — Active disabled until Agent Type is assigned */}
            <div>
              <label className="text-[10px] font-bold text-plum/40 uppercase tracking-widest mb-2 block">
                Agent Status
              </label>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    status === 'draft' ? 'text-plum-dark' : 'text-gray-400'
                  }`}
                >
                  Inactive
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={status === 'active'}
                  aria-label={hasAgentTypeAssigned ? 'Agent status: Inactive or Active' : 'Assign an Agent Type to enable Active'}
                  aria-disabled={!hasAgentTypeAssigned}
                  onClick={() => {
                    if (!hasAgentTypeAssigned) return;
                    setStatus((s) => (s === 'active' ? 'draft' : 'active'));
                  }}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-plum/40 focus:ring-offset-2 ${
                    status === 'active'
                      ? 'bg-plum-dark'
                      : !hasAgentTypeAssigned
                        ? 'bg-gray-200 cursor-not-allowed opacity-60'
                        : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-out ${
                      status === 'active' ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span
                  className={`text-sm font-medium ${
                    status === 'active' ? 'text-plum-dark' : 'text-gray-400'
                  }`}
                >
                  Active
                </span>
              </div>
              {/* Status banner — reactive to toggle and type */}
              <div
                className={`mt-3 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                  status === 'active'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : !hasAgentTypeAssigned
                      ? 'bg-gray-50 border-gray-200 text-gray-600'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {!hasAgentTypeAssigned
                  ? 'Assign an Agent Type above to enable Active.'
                  : status === 'active'
                    ? 'This agent is currently Active.'
                    : 'This agent is currently Inactive. Toggle to Active when ready.'}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-plum/40 uppercase tracking-widest mb-2 block">
                Agent name <span className="text-[#E84855]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                className={`w-full px-4 py-2.5 rounded-xl border text-gray-900 ${
                  nameError ? 'border-red-400' : 'border-plum/20'
                } focus:outline-none focus:ring-2 focus:ring-plum/30`}
                placeholder="e.g. SPIN Sales Coach"
              />
              {nameError && (
                <p className="text-[#E84855] text-xs font-medium mt-1">
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-plum/40 uppercase tracking-widest mb-2 block">
                System prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={12}
                className="w-full px-4 py-2.5 rounded-xl border border-plum/20 text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-plum/30 resize-y"
                placeholder="Full system prompt for this agent..."
              />
            </div>

            {saveError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{saveError}</p>
              </div>
            )}

            {saveSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-green-800">
                <Check className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{saveSuccess}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-plum-dark text-white font-bold text-sm shadow-md hover:bg-plum-dark/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
