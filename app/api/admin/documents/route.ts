import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const agentId = searchParams.get('agent') || undefined;
    const status = searchParams.get('status') || undefined;

    const where: {
      category?: string;
      status?: string;
      OR?: Array<{ agents: { has: string } }>;
    } = {};
    if (category) where.category = category;
    if (status && status !== 'all') where.status = status;
    if (agentId) {
      where.OR = [
        { agents: { has: 'all' } },
        { agents: { has: agentId } },
      ];
    }

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

    const doc = await prisma.knowledgeBaseDocument.create({
      data: {
        title,
        description: description ?? null,
        category,
        personaType: category === 'buyer_persona' ? (personaType ?? null) : null,
        content,
        agents: agentList,
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
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString().split('T')[0],
    });
  } catch (error: any) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
