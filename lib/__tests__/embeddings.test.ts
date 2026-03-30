const mockCreate = jest.fn().mockResolvedValue({
  data: [{ embedding: Array(1536).fill(0.1) }],
})

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: mockCreate,
    },
  })),
}))

import { embedText, EMBEDDING_DIMENSIONS } from '../embeddings'

describe('embedText', () => {
  beforeAll(() => {
    if (!process.env.OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = 'test-key-for-jest'
    }
  })

  it('returns a vector of the correct dimension', async () => {
    const result = await embedText('SEI AI Assessment Builder test')
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(EMBEDDING_DIMENSIONS)
    expect(typeof result[0]).toBe('number')
    expect(mockCreate).toHaveBeenCalled()
  })
})
