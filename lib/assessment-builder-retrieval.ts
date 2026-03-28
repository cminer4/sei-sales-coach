import prisma from '@/lib/prisma';
import { embedText } from '@/lib/embeddings';

export type AssessmentChunkHit = { content: string; similarity: number };
export type KbChunkHit = {
  content: string;
  similarity: number;
  documentTitle: string;
  documentCategory: string;
};

/**
 * Top-K similarity over assessment document_chunks (pgvector <=>).
 */
export async function retrieveAssessmentChunks(
  assessmentId: string,
  queryText: string,
  topK: number,
): Promise<AssessmentChunkHit[]> {
  const queryEmbedding = await embedText(queryText);
  const embeddingSql = `[${queryEmbedding.join(',')}]`;
  const rows = await prisma.$queryRawUnsafe<
    { content: string; similarity: number }[]
  >(
    `
    SELECT content, 1 - (embedding <=> $1::vector) AS similarity
    FROM document_chunks
    WHERE assessment_id = $2::uuid
      AND embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $3
    `,
    embeddingSql,
    assessmentId,
    topK,
  );
  return rows.map((r) => ({
    content: r.content,
    similarity: Number(r.similarity),
  }));
}

/**
 * Top-K KB chunks scoped to assessment-builder (or all) on published documents.
 */
export async function retrieveKbChunksForBuilder(
  queryText: string,
  topK: number,
): Promise<KbChunkHit[]> {
  const queryEmbedding = await embedText(queryText);
  const embeddingSql = `[${queryEmbedding.join(',')}]`;
  const rows = await prisma.$queryRawUnsafe<
    {
      content: string;
      similarity: number;
      documentTitle: string;
      documentCategory: string;
    }[]
  >(
    `
    SELECT
      c.content AS content,
      1 - (c.embedding <=> $1::vector) AS similarity,
      d.title AS "documentTitle",
      d.category AS "documentCategory"
    FROM knowledge_base_chunks c
    JOIN knowledge_base_documents d ON c.document_id = d.id
    WHERE d.status = 'published'
      AND c.embedding IS NOT NULL
      AND (
        'assessment-builder' = ANY(c.agents)
        OR 'all' = ANY(c.agents)
      )
    ORDER BY c.embedding <=> $1::vector
    LIMIT $2
    `,
    embeddingSql,
    topK,
  );
  return rows.map((r) => ({
    content: r.content ?? '',
    similarity: Number(r.similarity),
    documentTitle: r.documentTitle,
    documentCategory: r.documentCategory,
  }));
}

export function buildRetrievalQueryText(params: {
  clientName: string;
  projectBrief: string | null;
  stakeholders: string[];
}): string {
  const parts = [
    params.clientName,
    params.projectBrief ?? '',
    params.stakeholders.join(', '),
  ];
  return parts.filter(Boolean).join('\n').slice(0, 8000);
}
