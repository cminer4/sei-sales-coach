/**
 * POST /api/research/company
 * SEI-39: Company research for live research feature.
 * Accepts { companyName: string }, uses Anthropic with web_search to produce a 150-200 word brief.
 * Returns { companyName, brief, retrievedAt }. Times out after 40s; returns 500 on failure or timeout.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';
const TIMEOUT_MS = 40_000;

const SYSTEM_PROMPT = `You are a research assistant. Use web search to find current, factual information about the company you are given.

Your task: Write a single, cohesive company brief in 150-200 words. Include:
1. Recent news (last 12 months)
2. Business overview (what they do, size, sector)
3. Known operational or strategic challenges
4. Industry context (competitive landscape, trends)

Write in clear, neutral prose. Do not use bullet points in the final brief — use short paragraphs or flowing text. Output only the brief text, no headings or labels.`;

export async function POST(req: NextRequest) {
  let companyName: string;

  try {
    const body = await req.json();
    const name = body?.companyName;
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'companyName is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    companyName = name.trim();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Research service is not configured' },
      { status: 500 }
    );
  }

  const client = new Anthropic({ apiKey });
  const userMessage = `Research the company "${companyName}" and write the 150-200 word brief as instructed.`;

  try {
    const response = await Promise.race([
      client.messages.create(
        {
          model: MODEL,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
          tools: [
            {
              type: 'web_search_20250305',
              name: 'web_search',
              max_uses: 8,
            },
          ],
        },
        { timeout: TIMEOUT_MS }
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Research request timed out')), TIMEOUT_MS)
      ),
    ]);

    const textBlocks = response.content.filter((c) => c.type === 'text') as Array<{ type: 'text'; text: string }>;
    const brief = textBlocks.map((b) => b.text).join('\n\n').trim();
    if (!brief) {
      return NextResponse.json(
        { error: 'No brief content in response' },
        { status: 500 }
      );
    }

    const cleanBrief = brief.replace(/\n{2,}/g, ' ').replace(/\n/g, ' ').trim();
    const retrievedAt = new Date().toISOString();
    return NextResponse.json({
      companyName,
      brief: cleanBrief,
      retrievedAt,
    });
  } catch (err) {
    console.error('[research/company] Error:', err);
    return NextResponse.json(
      { error: 'Company research failed. Please try again.' },
      { status: 500 }
    );
  }
}
