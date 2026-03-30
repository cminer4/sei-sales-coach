import OpenAI from 'openai'

let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable')
    }
    openai = new OpenAI({ apiKey })
  }
  return openai
}

export const EMBEDDING_DIMENSIONS = 1536

export async function embedText(text: string): Promise<number[]> {
  const model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'
  const truncated = text.slice(0, 32000)
  const response = await getOpenAI().embeddings.create({
    model,
    input: truncated,
  })
  return response.data[0].embedding
}
