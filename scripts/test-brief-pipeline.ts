type Json = Record<string, any>;

const DEFAULT_BASE_URL = 'http://localhost:3000';

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
}

function assert(condition: unknown, msg: string) {
  if (!condition) fail(msg);
}

function getBaseUrl() {
  return (process.env.BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as any) : undefined;
  if (!res.ok) {
    const err = json?.error ? String(json.error) : `HTTP ${res.status}`;
    throw new Error(`${err}\n${text}`);
  }
  return json as T;
}

function runSanityAssertions(brief: Json) {
  assert(Array.isArray(brief.scenarios), 'brief.scenarios must be an array');
  assert(brief.scenarios.length === 4, 'brief.scenarios must have exactly 4 scenarios');

  const probs = brief.scenarios.map((s: any) => s?.probability);
  assert(probs.every((p: any) => Number.isInteger(p)), 'all scenario probabilities must be integers');
  const sum = probs.reduce((a: number, b: number) => a + b, 0);
  assert(sum === 100, `scenario probabilities must sum to 100 (got ${sum})`);

  const tagCounts = { baseline: 0, alternate: 0, contrarian: 0 } as Record<string, number>;
  for (const s of brief.scenarios) {
    const tag = s?.tag;
    assert(tag === 'baseline' || tag === 'alternate' || tag === 'contrarian', `invalid scenario tag: ${String(tag)}`);
    tagCounts[tag] += 1;

    assert(Array.isArray(s?.implications), `scenario.implications must be an array (tag=${tag})`);
    assert(s.implications.length >= 2, `scenario.implications must have >= 2 items (tag=${tag})`);
  }
  assert(tagCounts.baseline === 1, `expected 1 baseline scenario (got ${tagCounts.baseline})`);
  assert(tagCounts.contrarian === 1, `expected 1 contrarian scenario (got ${tagCounts.contrarian})`);
  assert(tagCounts.alternate === 2, `expected 2 alternate scenarios (got ${tagCounts.alternate})`);
}

async function main() {
  const baseUrl = getBaseUrl();

  const init = await postJson<{ researchId: string }>(`${baseUrl}/api/research/init`, {
    name: 'Demo User',
    role: 'Operations',
    company: 'IFCO Systems',
    industry: 'Logistics and Supply Chain',
    regions: ['Eastern Europe', 'Western Europe', 'Southeast Asia'],
  });

  assert(typeof init.researchId === 'string' && init.researchId.length > 0, 'researchId must be returned');

  await postJson(`${baseUrl}/api/research/enrich`, {
    researchId: init.researchId,
    primaryBusiness:
      'We manage returnable packaging - pallets and containers - for food and beverage companies across Europe and North America',
  });

  const brief = await postJson<Json>(`${baseUrl}/api/brief/generate`, {
    researchId: init.researchId,
    company: 'IFCO Systems',
    role: 'Operations',
    industry: 'Logistics and Supply Chain',
    regions: ['Eastern Europe', 'Western Europe', 'Southeast Asia'],
    chatAnswers: {
      primaryBusiness:
        'We manage returnable packaging - pallets and containers - for food and beverage companies across Europe and North America',
      primaryExposure: 'Supply chain disruption',
      recentDisruption: 'Shipping delays',
      riskOwnership: 'Me / operations team',
    },
  });

  console.log(JSON.stringify(brief, null, 2));

  runSanityAssertions(brief);
  console.log('PASS');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

