import { NextRequest, NextResponse } from 'next/server';
import { agent_type } from '@prisma/client';
import prisma from '@/lib/prisma';
import { chunkDocument, generateEmbeddings, storeKnowledgeBaseChunks } from '@/lib/embeddings';

const VALID_CATEGORIES = [
  'methodology',
  'buyer_persona',
  'account_intelligence',
  'sei_products',
  'sei_capabilities',
  'case_studies',
  'evaluation_criteria',
] as const;

const VALID_PERSONA_TYPES = ['archetype', 'real_account'] as const;

const VALID_AGENT_TYPES = ['Guide', 'Analyst', 'Builder', 'Orchestrator'] as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const agentId = searchParams.get('agent') || undefined;
    const status = searchParams.get('status') || undefined;
    const agentType = searchParams.get('agentType') || searchParams.get('agent_type') || undefined;

    // Build AND list so category, status, agent filter, and agentType filter combine correctly.
    const andConditions: object[] = [];
    if (category) andConditions.push({ category });
    if (status && status !== 'all') andConditions.push({ status });
    if (agentId) {
      andConditions.push({
        OR: [
          { agents: { has: 'all' } },
          { agents: { has: agentId } },
        ],
      });
    }
    // SEI-36: Filter by agent type — show docs assigned to that type OR assigned to all agents.
    if (agentType && VALID_AGENT_TYPES.includes(agentType as (typeof VALID_AGENT_TYPES)[number])) {
      const agentsOfType = await prisma.agent.findMany({
        where: { agentType: agentType as agent_type },
        select: { id: true },
      });
      const agentIdsOfType = agentsOfType.map((a) => a.id);
      andConditions.push({
        OR: [
          { agents: { has: 'all' } },
          { agents: { hasSome: agentIdsOfType } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const documents = await prisma.knowledgeBaseDocument.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    const list = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      personaType: doc.personaType,
      content: doc.content,
      agents: doc.agents,
      weight: doc.weight,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString().split('T')[0],
    }));

    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

function clampWeight(v: unknown): number {
  const n = typeof v === 'number' && !Number.isNaN(v) ? v : 5;
  return Math.min(10, Math.max(1, n));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      category,
      personaType,
      content,
      agents,
      weight: bodyWeight,
      status,
    } = body;

    if (!title || !category || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, content' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    if (category === 'buyer_persona' && personaType && !VALID_PERSONA_TYPES.includes(personaType)) {
      return NextResponse.json({ error: 'Invalid persona_type for buyer_persona' }, { status: 400 });
    }

    const agentList: string[] = Array.isArray(agents) && agents.length > 0
      ? agents
      : [];

    const weight = clampWeight(bodyWeight);
    const doc = await prisma.knowledgeBaseDocument.create({
      data: {
        title,
        description: description ?? null,
        category,
        personaType: category === 'buyer_persona' ? (personaType ?? null) : null,
        content,
        agents: agentList,
        weight,
        status: status === 'published' ? 'published' : 'draft',
      },
    });

    if (status === 'published' && agentList.length > 0) {
      try {
        const chunks = chunkDocument(content);
        if (chunks.length > 0) {
          const embeddings = await generateEmbeddings(chunks);
          await storeKnowledgeBaseChunks(doc.id, chunks, embeddings, agentList, category);
        }
      } catch (embError) {
        console.error('Embedding generation failed for document:', doc.id, embError);
        const message = embError instanceof Error ? embError.message : 'Chunking or embedding failed';
        return NextResponse.json(
          {
            error: `Publish failed: ${message}. The document was created; edit and publish again to retry.`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      personaType: doc.personaType,
      content: doc.content,
      agents: doc.agents,
      weight: doc.weight,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString().split('T')[0],
    });
  } catch (error: unknown) {
    console.error('Error creating document:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to create document: ${message}` },
      { status: 500 }
    );
  }
}
