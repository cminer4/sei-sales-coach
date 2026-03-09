import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * List all agents for admin Prompt Control tab (full shape) and Knowledge Base "Assign to Agents".
 */
export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(
      agents.map((a) => ({
        id: a.id,
        agent_id: a.id,
        name: a.name,
        prompt: a.prompt,
        document_tags: a.documentTags,
        status: a.status,
        agent_type: a.agentType,
        created_at: a.createdAt.toISOString(),
      }))
    );
  } catch (error: unknown) {
    console.error('Error fetching agents:', error);
    const message = error instanceof Error ? error.message : String(error);
    const hint =
      /agent_type|column.*does not exist/i.test(message)
        ? ' The database may be missing the agent_type column. Run the SEI-36 migrations in Supabase (20260309140000 and 20260309140001).'
        : '';
    return NextResponse.json(
      { error: `Failed to fetch agents.${hint}`, detail: message },
      { status: 500 }
    );
  }
}
