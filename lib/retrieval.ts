import prisma from './prisma';
import { generateEmbedding } from './embeddings-legacy';

export interface RetrievalFilter {
  roles?: string[];
  stages?: string[];
  documentTypes?: string[];
}

export interface RetrievalResult {
  chunkText: string;
  similarity: number;
  documentTitle: string;
  documentType: string;
  strictnessOverride: number | null;
  metadata: any;
  /** Document adherence weight 1-10: 1-4 background, 5 supporting, 6-10 core */
  weight: number;
}

/**
 * Retrieves relevant context chunks from the knowledge base using vector similarity search.
 * Filters chunks by agent: documents with agents = ['all'] or containing agentId are included.
 */
export async function retrieveRelevantContext(
  query: string,
  agentId: string,
  options: {
    filters?: RetrievalFilter;
    topK?: number;
    similarityThreshold?: number;
  } = {}
): Promise<RetrievalResult[]> {
  const {
    filters = {},
    topK = 5,
    similarityThreshold = 0.7,
  } = options;

  try {
    const queryEmbedding = await generateEmbedding(query);
    const embeddingSql = `[${queryEmbedding.join(',')}]`;

    const queryParams: any[] = [embeddingSql, agentId, similarityThreshold];
    const extraClauses: string[] = [];

    if (filters.documentTypes && filters.documentTypes.length > 0) {
      extraClauses.push(`d.category = ANY($${queryParams.length + 1}::text[])`);
      queryParams.push(filters.documentTypes);
    }

    const whereExtra = extraClauses.length > 0 ? ` AND ${extraClauses.join(' AND ')}` : '';
    const limitParam = queryParams.length + 1;
    queryParams.push(topK);

    const results = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        c.content as "chunkText",
        1 - (c.embedding <=> $1::vector) as "similarity",
        d.title as "documentTitle",
        d.category as "documentType",
        NULL::int as "strictnessOverride",
        NULL::jsonb as "metadata",
        COALESCE(d.weight, 5)::int as "weight"
      FROM knowledge_base_chunks c
      JOIN knowledge_base_documents d ON c.document_id = d.id
      WHERE d.status = 'published'
        AND (c.agents @> ARRAY['all']::text[] OR c.agents @> ARRAY[$2]::text[])
        AND 1 - (c.embedding <=> $1::vector) >= $3
        ${whereExtra}
      ORDER BY "similarity" DESC
      LIMIT $${limitParam}
      `,
      ...queryParams
    );

    return results.map((r) => ({
      chunkText: r.chunkText,
      similarity: Number(r.similarity),
      documentTitle: r.documentTitle,
      documentType: r.documentType,
      strictnessOverride: r.strictnessOverride,
      metadata: r.metadata ?? {},
      weight: typeof r.weight === 'number' ? r.weight : 5,
    }));
  } catch (error: any) {
    console.error('ERROR in retrieveRelevantContext:', error);
    throw new Error('Failed to retrieve relevant context: ' + error.message);
  }
}
