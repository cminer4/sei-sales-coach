import { parseJsonWithSingleRetry } from '@/lib/geopoliticalBrief/jsonRetry';

describe('geopoliticalBrief/jsonRetry', () => {
  it('returns parsed JSON on first try when valid', async () => {
    const res = await parseJsonWithSingleRetry({
      runOnce: async () => '{"ok":true}',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toEqual({ ok: true });
      expect(res.rawFirst).toBe('{"ok":true}');
      expect(res.rawRetry).toBeUndefined();
    }
  });

  it('retries once when JSON is invalid, then succeeds', async () => {
    let calls = 0;
    const res = await parseJsonWithSingleRetry({
      runOnce: async ({ retryInstruction }) => {
        calls += 1;
        if (calls === 1) return 'not json';
        expect(retryInstruction).toMatch(/not valid json/i);
        return '{"ok":true}';
      },
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toEqual({ ok: true });
      expect(res.rawFirst).toBe('not json');
      expect(res.rawRetry).toBe('{"ok":true}');
    }
  });

  it('fails with both raw responses when retry still invalid', async () => {
    let calls = 0;
    const res = await parseJsonWithSingleRetry({
      runOnce: async () => {
        calls += 1;
        return calls === 1 ? 'not json' : 'still not json';
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/could not be parsed/i);
      expect(res.rawFirst).toBe('not json');
      expect(res.rawRetry).toBe('still not json');
    }
  });
});

