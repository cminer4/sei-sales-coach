import Anthropic from '@anthropic-ai/sdk';
import { getRequiredEnv } from './env';

let anthropic: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = getRequiredEnv('ANTHROPIC_API_KEY');
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

