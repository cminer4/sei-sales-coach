/**
 * PATCH /api/admin/agents/[id]
 * Updates an existing agent. Body: { name?, status?, prompt?, document_tags?, agent_type? }
 * Name is required when saving (cannot be blank). agent_type must be one of: Guide, Analyst, Builder, Orchestrator.
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateAgent, AGENT_TYPES } from '@/lib/agents';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
  }
  let body: {
    name?: string;
    status?: string;
    prompt?: string | null;
    document_tags?: string[] | null;
    agent_type?: string;
  };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (body.name !== undefined && !String(body.name).trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (
    body.status !== undefined &&
    body.status !== 'active' &&
    body.status !== 'draft'
  ) {
    return NextResponse.json(
      { error: 'Status must be active or draft' },
      { status: 400 }
    );
  }
  if (
    body.agent_type !== undefined &&
    !AGENT_TYPES.includes(body.agent_type as 'Guide' | 'Analyst' | 'Builder' | 'Orchestrator')
  ) {
    return NextResponse.json(
      { error: `Agent type must be one of: ${AGENT_TYPES.join(', ')}` },
      { status: 400 }
    );
  }
  try {
    const agent = await updateAgent(id, {
      name: body.name,
      status: body.status as 'active' | 'draft' | undefined,
      prompt: body.prompt,
      document_tags: body.document_tags,
      agent_type: body.agent_type as 'Guide' | 'Analyst' | 'Builder' | 'Orchestrator' | undefined,
    });
    return NextResponse.json(agent);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
