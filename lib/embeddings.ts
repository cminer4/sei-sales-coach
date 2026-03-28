import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const EMBEDDING_DIMENSIONS = 1536

export async function embedText(text: string): Promise<number[]> {
  const model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'
  const truncated = text.slice(0, 32000)
  const response = await openai.embeddings.create({
    model,
    input: truncated,
  })
  return response.data[0].embedding
}
