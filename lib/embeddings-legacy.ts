import OpenAI from 'openai';
import prisma from './prisma';

let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    openai = new OpenAI({
      apiKey,
    });
  }
  return openai;
}

/**
 * Splits text into chunks of approximately targetLength characters.
 * Tries to split on sentence boundaries for better semantic coherence.
 */
export function chunkDocument(text: string, targetLength: number = 800): string[] {
  if (!text) return [];

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > targetLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += sentence;
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generates an embedding for the given text using OpenAI.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getOpenAIClient();
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generates embeddings for an array of texts in batches.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  try {
    const client = getOpenAIClient();
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize).map(t => t.replace(/\n/g, ' '));

      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });

      const batchEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);

      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw new Error('Failed to generate batch embeddings');
  }
}

/**
 * Stores chunks and their embeddings in knowledge_base_chunks for RAG.
 * Used when publishing a knowledge base document.
 */
export async function storeKnowledgeBaseChunks(
  documentId: string,
  chunks: string[],
  embeddings: number[][],
  agents: string[],
  category: string
): Promise<void> {
  try {
    await prisma.knowledgeBaseChunk.deleteMany({
      where: { documentId },
    });

    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddings[i];
      const embeddingSql = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO knowledge_base_chunks (id, document_id, content, chunk_index, embedding, agents, category, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4::vector, $5::text[], $6, NOW())`,
        documentId,
        chunks[i],
        i,
        embeddingSql,
        agents,
        category
      );
    }
  } catch (error) {
    console.error('Error storing knowledge base chunks:', error);
    throw new Error('Failed to store knowledge base chunks');
  }
}
