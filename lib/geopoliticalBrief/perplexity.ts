import { getRequiredEnv } from './env';
import { AllowedRegion } from './regions';

const PERPLEXITY_MODEL = 'sonar-pro';

type PerplexityChatResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

async function callPerplexity(prompt: string): Promise<string> {
  const apiKey = getRequiredEnv('PERPLEXITY_API_KEY');

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Perplexity request failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as PerplexityChatResponse;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Perplexity response missing content');
  }
  return content.trim();
}

export async function fetchCompanyIntel(input: {
  company: string;
  industry: string;
  regions: AllowedRegion[];
}): Promise<string> {
  const { company, industry, regions } = input;
  const prompt = [
    `You are a geopolitical and operational risk researcher.`,
    ``,
    `Company: ${company}`,
    `Industry: ${industry}`,
    `Relevant regions: ${regions.join(', ')}`,
    ``,
    `Task: Provide recent, factual intelligence about the company for the last 90 days.`,
    `Include:`,
    `- Recent news and notable events`,
    `- Known supply chain, sourcing, logistics, or operational footprint`,
    `- Any geopolitical exposure, disruptions, or risk events relevant to the company`,
    ``,
    `Output: plain text. Be specific. Prefer dates, named events, and concrete details.`,
  ].join('\n');

  return await callPerplexity(prompt);
}

export async function fetchRegionalSignals(input: {
  regions: AllowedRegion[];
}): Promise<string> {
  const { regions } = input;
  const prompt = [
    `You are a senior geopolitical risk researcher.`,
    ``,
    `Regions: ${regions.join(', ')}`,
    ``,
    `Task: Identify the top current geopolitical risk signals across these regions over the last 30 days.`,
    `Cover: active conflicts, trade policy changes, sanctions actions, infrastructure disruptions, and diplomatic developments.`,
    ``,
    `Output: plain text. Ground in named events and current developments.`,
  ].join('\n');

  return await callPerplexity(prompt);
}

export async function fetchEnrichment(input: {
  company: string;
  industry: string;
  regions: AllowedRegion[];
  primaryBusiness: string;
}): Promise<string> {
  const { company, industry, regions, primaryBusiness } = input;
  const prompt = [
    `You are a geopolitical and supply chain intelligence researcher.`,
    ``,
    `Company: ${company}`,
    `Industry: ${industry}`,
    `Regions: ${regions.join(', ')}`,
    `User business description: ${primaryBusiness}`,
    ``,
    `Task: Based on the user description, pull more specific intelligence beyond the company name alone.`,
    `Focus on: supply chain dependencies, sourcing patterns, customer geography, and operational chokepoints relevant to the described business.`,
    ``,
    `Output: plain text. Be concrete and current.`,
  ].join('\n');

  return await callPerplexity(prompt);
}

