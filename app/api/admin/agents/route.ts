/**
 * GET /api/admin/agents
 * Returns agents where status is 'active' or 'draft' for the Prompt Control tab.
 */

import { NextResponse } from 'next/server';
import { listAgents } from '@/lib/agents';

export async function GET() {
  try {
    const agents = await listAgents();
    return NextResponse.json(agents);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load agents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
