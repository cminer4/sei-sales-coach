export type ParseWithRetryResult =
  | { ok: true; value: unknown; rawFirst: string; rawRetry?: string }
  | { ok: false; error: string; rawFirst: string; rawRetry?: string };

export async function parseJsonWithSingleRetry(opts: {
  runOnce: (args?: { retryInstruction?: string }) => Promise<string>;
}): Promise<ParseWithRetryResult> {
  const retryInstruction =
    'Your previous response was not valid JSON. Return only the JSON object with no other text.';

  const rawFirst = await opts.runOnce({});
  try {
    return { ok: true, value: JSON.parse(rawFirst), rawFirst };
  } catch {
    // fallthrough to retry
  }

  const rawRetry = await opts.runOnce({ retryInstruction });
  try {
    return { ok: true, value: JSON.parse(rawRetry), rawFirst, rawRetry };
  } catch {
    return {
      ok: false,
      error: 'Response could not be parsed as JSON after one retry',
      rawFirst,
      rawRetry,
    };
  }
}

