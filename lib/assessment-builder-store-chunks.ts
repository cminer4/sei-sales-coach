import prisma from '@/lib/prisma';

/**
 * Inserts one row into document_chunks with pgvector embedding.
 * Matches embeddings-legacy storeKnowledgeBaseChunks: literal `[...]` passed as ::vector.
 */
export async function insertDocumentChunk(params: {
  assessmentId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}): Promise<void> {
  const embeddingSql = `[${params.embedding.join(',')}]`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO document_chunks (id, assessment_id, document_id, chunk_index, content, embedding)
     VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5::vector)`,
    params.assessmentId,
    params.documentId,
    params.chunkIndex,
    params.content,
    embeddingSql,
  );
}

export async function countChunksForDocument(documentId: string): Promise<number> {
  const rows = await prisma.document_chunks.count({
    where: { document_id: documentId },
  });
  return rows;
}
