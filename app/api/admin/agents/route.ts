import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * List all agents (all statuses) for Knowledge Base "Assign to Agents" and filters.
 */
export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(
      agents.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
      }))
    );
  } catch (error: any) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
