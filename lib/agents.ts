/**
 * Data access for the agents table (Supabase).
 * Used by admin Prompt Control tab API routes only.
 * Table: agents (agent_id, name, prompt, document_tags, status, agent_type, created_at)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type AgentStatus = 'active' | 'draft';

export const AGENT_TYPES = ['Guide', 'Analyst', 'Builder', 'Orchestrator'] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export type Agent = {
  agent_id: string;
  name: string;
  prompt: string | null;
  document_tags: string[] | null;
  status: string;
  agent_type: string;
  created_at: string;
};

export type AgentUpdatePayload = {
  name?: string;
  status?: AgentStatus;
  prompt?: string | null;
  document_tags?: string[] | null;
  agent_type?: AgentType;
};

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

/**
 * Returns the system prompt and agent_id for the active SPIN Sales Coach agent in a single Supabase call.
 * Throws if no agent with name 'SPIN Sales Coach' and status 'active' is found, or if prompt is empty.
 * Used by the score-session API so one agent fetch drives both scoring prompt and KB eval-docs filter.
 */
export async function getActiveSpinCoachPromptAndAgentId(): Promise<{ prompt: string; agentId: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('agents')
    .select('prompt, agent_id')
    .eq('name', 'SPIN Sales Coach')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const prompt = data?.prompt;
  const agentId = data?.agent_id;
  if (!agentId || typeof agentId !== 'string') {
    throw new Error('No active SPIN Sales Coach agent found. Set an agent with name "SPIN Sales Coach" to active in Prompt Control.');
  }
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('No active SPIN Sales Coach agent found. Set an agent with name "SPIN Sales Coach" to active in Prompt Control.');
  }
  return { prompt: prompt.trim(), agentId };
}

/**
 * Returns the agent_id (UUID) for the active SPIN Sales Coach agent.
 * Throws if no agent with name 'SPIN Sales Coach' and status 'active' is found.
 * Used by the score-session API to filter KB evaluation criteria documents.
 */
export async function getActiveSpinCoachAgentId(): Promise<string> {
  const { agentId } = await getActiveSpinCoachPromptAndAgentId();
  return agentId;
}

/**
 * Returns the system prompt for the active SPIN Sales Coach agent, or null if none.
 * Used by the score-session API so the scoring system prompt is always from the DB (Prompt Control).
 */
export async function getActiveSpinCoachPrompt(): Promise<string | null> {
  try {
    const { prompt } = await getActiveSpinCoachPromptAndAgentId();
    return prompt;
  } catch {
    return null;
  }
}

/**
 * List agents that are active or draft (for admin Prompt Control tab).
 */
export async function listAgents(): Promise<Agent[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('agents')
    .select('agent_id, name, prompt, document_tags, status, agent_type, created_at')
    .in('status', ['active', 'draft'])
    .order('name');
  if (error) throw error;
  return data ?? [];
}

/**
 * Update an existing agent. Validates name is non-empty when provided.
 */
export async function updateAgent(
  agentId: string,
  payload: AgentUpdatePayload
): Promise<Agent> {
  if (payload.name !== undefined && !String(payload.name).trim()) {
    throw new Error('Name is required');
  }
  if (payload.status !== undefined && payload.status !== 'active' && payload.status !== 'draft') {
    throw new Error('Status must be active or draft');
  }
  if (payload.agent_type !== undefined && !AGENT_TYPES.includes(payload.agent_type)) {
    throw new Error(`Agent type must be one of: ${AGENT_TYPES.join(', ')}`);
  }
  const supabase = getSupabase();
  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.prompt !== undefined) updates.prompt = payload.prompt;
  if (payload.document_tags !== undefined) updates.document_tags = payload.document_tags;
  if (payload.agent_type !== undefined) updates.agent_type = payload.agent_type;
  if (Object.keys(updates).length === 0) {
    const { data } = await supabase.from('agents').select('*').eq('agent_id', agentId).single();
    if (!data) throw new Error('Agent not found');
    return data as Agent;
  }
  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('agent_id', agentId)
    .select()
    .single();
  if (error) throw error;
  return data as Agent;
}
