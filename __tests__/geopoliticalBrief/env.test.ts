import { getRequiredEnv } from '@/lib/geopoliticalBrief/env';

describe('geopoliticalBrief/env', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('throws with the missing key name', () => {
    delete process.env.PERPLEXITY_API_KEY;
    expect(() => getRequiredEnv('PERPLEXITY_API_KEY')).toThrow(
      'Missing required environment variable: PERPLEXITY_API_KEY'
    );
  });

  it('returns the value when present', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    expect(getRequiredEnv('ANTHROPIC_API_KEY')).toBe('test-key');
  });
});

