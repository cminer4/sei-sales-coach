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
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
