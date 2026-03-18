import { getAnthropicClient } from './anthropicClient';
import { AllowedRegion } from './regions';

const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

export type BriefSessionPayload = {
  researchId: string;
  company: string;
  role: string;
  industry: string;
  regions: AllowedRegion[];
  chatAnswers: {
    primaryBusiness: string;
    primaryExposure: string;
    recentDisruption: string;
    riskOwnership: string;
  };
};

export type StoredResearchContext = {
  companyIntelligence: string;
  regionalSignals: string;
  enrichment: string;
};

export async function synthesizeBrief(args: {
  session: Omit<BriefSessionPayload, 'researchId'>;
  research: StoredResearchContext;
  retryInstruction?: string;
}): Promise<string> {
  const { session, research, retryInstruction } = args;

  const missingBlocks: string[] = [];
  if (!research.companyIntelligence.trim()) missingBlocks.push('companyIntelligence');
  if (!research.regionalSignals.trim()) missingBlocks.push('regionalSignals');
  if (!research.enrichment.trim()) missingBlocks.push('enrichment');

  const system = [
    `You are a senior geopolitical risk analyst.`,
    `Apply the Seven Pillars framework (Geography, Politics, Economics, Security, Society, History, Technology).`,
    ``,
    `CRITICAL OUTPUT RULES:`,
    `- Return ONLY a single valid JSON object. No preamble. No markdown fences. No explanation.`,
    `- The JSON MUST contain exactly 4 scenarios with tag values:`,
    `  - baseline (1)`,
    `  - alternate (2)`,
    `  - contrarian (1)`,
    `- Probabilities MUST sum to 100.`,
    `- Every scenario MUST have at least 2 implications.`,
    ``,
    `LENGTH LIMITS (to ensure the JSON completes):`,
    `- scopeSummary: max 3 sentences.`,
    `- exposures[].summary: max 2 sentences each.`,
    `- scenarios[].narrative: max 6 sentences each.`,
    `- scenarios[].implications: 2 to 4 bullets each, one sentence per bullet.`,
    `- monitoring: 4 to 7 items.`,
    ``,
    `GROUNDING RULES:`,
    `- Narratives and implications MUST be grounded in the provided research context blocks.`,
    `- If any context block is missing/empty for a region or company detail, reflect reduced confidence using hedged language.`,
    `- Do NOT fabricate company-specific or region-specific facts to compensate for missing context.`,
  ].join('\n');

  const user = [
    `Produce the geopolitical brief JSON for the following session.`,
    retryInstruction ? `\n${retryInstruction}\n` : '',
    ``,
    `Company profile:`,
    `- Name: ${session.company}`,
    `- Role: ${session.role}`,
    `- Industry: ${session.industry}`,
    `- Regions: ${session.regions.join(', ')}`,
    ``,
    `Chat answers:`,
    `- Q1 primaryBusiness: ${session.chatAnswers.primaryBusiness}`,
    `- Q2 primaryExposure: ${session.chatAnswers.primaryExposure}`,
    `- Q3 recentDisruption: ${session.chatAnswers.recentDisruption}`,
    `- Q4 riskOwnership: ${session.chatAnswers.riskOwnership}`,
    ``,
    `Company intelligence (Perplexity call A):`,
    research.companyIntelligence.trim() ? research.companyIntelligence : '(EMPTY)',
    ``,
    `Regional signals (Perplexity call B):`,
    research.regionalSignals.trim() ? research.regionalSignals : '(EMPTY)',
    ``,
    `Enrichment (Perplexity stage 2):`,
    research.enrichment.trim() ? research.enrichment : '(EMPTY)',
    ``,
    missingBlocks.length
      ? `NOTE: The following context blocks are empty: ${missingBlocks.join(
          ', '
        )}. You MUST hedge and avoid fabrication where those gaps matter.`
      : `All context blocks are present.`,
    ``,
    `Output schema:`,
    `{"company":"string","generatedAt":"ISO timestamp","horizon":"12-18 months","regions":["array of strings"],"scopeSummary":"string","exposures":[{"region":"string","level":"high | moderate | low","score":"integer 1-5","summary":"string"}],"scenarios":[{"name":"string","tag":"baseline | alternate | contrarian","probability":"integer 0-100","severity":"high | moderate | low","narrative":"string","implications":["array of strings, minimum 2"]}],"monitoring":[{"item":"string","frequency":"string"}]}`,
  ].join('\n');

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const block = response.content.find((c) => c.type === 'text');
  return block && 'text' in block ? block.text : '';
}

