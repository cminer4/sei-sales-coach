import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { chunkDocument, generateEmbeddings, storeKnowledgeBaseChunks } from '@/lib/embeddings-legacy';

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

function clampWeight(v: unknown): number {
  const n = typeof v === 'number' && !Number.isNaN(v) ? v : 5;
  return Math.min(10, Math.max(1, n));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await prisma.knowledgeBaseDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
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
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const agentList: string[] = Array.isArray(agents) && agents.length > 0 ? agents : [];
    const weight = clampWeight(bodyWeight);

    const doc = await prisma.knowledgeBaseDocument.update({
      where: { id },
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
        console.error('Embedding regeneration failed for document:', doc.id, embError);
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
  } catch (error: any) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.knowledgeBaseDocument.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
