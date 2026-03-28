import { embedText, EMBEDDING_DIMENSIONS } from '../embeddings'

describe('embedText', () => {
  it('returns a vector of the correct dimension', async () => {
    const result = await embedText('SEI AI Assessment Builder test')
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(EMBEDDING_DIMENSIONS)
    expect(typeof result[0]).toBe('number')
  }, 15000)
})
