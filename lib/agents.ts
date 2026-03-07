/**
 * Data access for the agents table (Supabase).
 * Used by admin Prompt Control tab API routes only.
 * Table: agents (agent_id, name, prompt, document_tags, status, created_at)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type AgentStatus = 'active' | 'draft';

export type Agent = {
  agent_id: string;
  name: string;
  prompt: string | null;
  document_tags: string[] | null;
  status: string;
  created_at: string;
};

export type AgentUpdatePayload = {
  name?: string;
  status?: AgentStatus;
  prompt?: string | null;
  document_tags?: string[] | null;
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
 * List agents that are active or draft (for admin Prompt Control tab).
 */
export async function listAgents(): Promise<Agent[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('agents')
    .select('agent_id, name, prompt, document_tags, status, created_at')
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
  const supabase = getSupabase();
  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.prompt !== undefined) updates.prompt = payload.prompt;
  if (payload.document_tags !== undefined) updates.document_tags = payload.document_tags;
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
