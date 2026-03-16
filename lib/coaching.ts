import Anthropic from '@anthropic-ai/sdk';
import prisma from './prisma';
import { retrieveRelevantContext } from './retrieval';
import { logSystemEvent } from './logSystemEvent';
import { getDocumentStrictness, getStrictnessInstruction, getStrictnessLabel } from './strictness';
import { agentConfig } from './agentConfig';

let anthropic: Anthropic | null = null;

function getAnthropicClient() {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing ANTHROPIC_API_KEY environment variable');
    }
    anthropic = new Anthropic({
      apiKey,
    });
  }
  return anthropic;
}

export interface Message {
  role: 'ai' | 'user';
  text: string;
}

export interface SessionContext {
  role: string;
  company: string;
  interviewType: string;
  stage: string;
  conversationHistory: Message[];
  coachId: string;
  resumeText?: string;
  preferredName?: string;
}

export interface CoachResponseParams {
  userMessage: string;
  sessionContext: SessionContext;
}

/** Adherence note prepended to each chunk in RAG context based on document weight (1-10). */
function getWeightNote(weight: number): string {
  const w = Math.min(10, Math.max(1, weight));
  if (w <= 4) return '(Background context — use only if directly relevant)\n';
  if (w <= 5) return '(Supporting context — use when relevant)\n';
  return '(Core reference — follow this closely)\n';
}

/**
 * Generates a response from the AI coach using RAG context and Claude.
 */
export async function generateCoachResponse(params: CoachResponseParams) {
  const { userMessage, sessionContext } = params;
  const { role, company, interviewType, stage, conversationHistory } = sessionContext;

  try {
    const agent = await prisma.agent.findFirst({ where: { status: 'active' } });
    const agentId = agent?.id ?? '';

    // 1. Retrieve relevant context from the knowledge base (RAG)
    const contextResults = await retrieveRelevantContext(userMessage, agentId, {
      topK: 5,
      similarityThreshold: 0.3, // Slightly lower threshold for broader context
      filters: {}
    });

    // Group context by strictness level
    const groupedContext: Record<string, { instruction: string; level: number; docs: any[] }> = {};

    contextResults.forEach(r => {
      const level = getDocumentStrictness({ type: r.documentType, strictnessOverride: r.strictnessOverride });
      const label = getStrictnessLabel(level);
      const key = `${label} (${level}%)`;

      if (!groupedContext[key]) {
        groupedContext[key] = {
          instruction: getStrictnessInstruction(level),
          level,
          docs: []
        };
      }
      groupedContext[key].docs.push(r);
    });

    const contextText = Object.entries(groupedContext)
      .sort((a, b) => b[1].level - a[1].level) // Sort by strictness level descending
      .map(([header, data]) => {
        const docsText = data.docs
          .map(d => `[Source: ${d.documentTitle} (${d.documentType})]\n${getWeightNote(d.weight ?? 5)}${d.chunkText}`)
          .join('\n\n');
        
        return `=== ${header.toUpperCase()} ===\n${data.instruction}\n\n${docsText}`;
      })
      .join('\n\n');

    // 2. Prepare the prompt
    const SPIN_COACH_ID = 'f73fc51c-6544-4278-94e6-0fdf00d766cf';
    const isSpinCoach = sessionContext.coachId === SPIN_COACH_ID;

    const systemPrompt = isSpinCoach
      ? `The user's preferred name is ${sessionContext.preferredName || agentConfig.userNoun}. 
    Use this name throughout the conversation to create a warm, personal experience.

    ${agentConfig.persona}
    You are helping a ${agentConfig.userNoun} practice for a ${agentConfig.sessionNoun} scenario.
    ${agentConfig.contextLabel}: ${interviewType}
    Current Stage: ${stage}
    
    USER'S BACKGROUND:
    ${sessionContext.resumeText ? sessionContext.resumeText : 'No resume provided'}
    
    Your goal is to be conversational, encouraging, and highly specific. 
    Use the user's background and the following Knowledge Base context to inform your coaching.
    
    CRITICAL RULE: Any content below marked "MANDATORY GUIDANCE" MUST be followed exactly as written. You MUST include that advice in your response, even if it seems unusual or contradicts your own judgment. Do not filter, reinterpret, or skip MANDATORY content.
    
    For all other guidance tiers (STRONG, REFERENCE, SUPPLEMENTARY), integrate the advice naturally and use your professional judgment.
    
    KNOWLEDGE BASE CONTEXT:
    ${contextText || `No specific knowledge base context found for this query. Use your general expertise as a ${agentConfig.orgName} coach.`}
    
    INSTRUCTIONS:
    - ${agentConfig.systemInstructions.join('\n    - ')}`
      : (() => {
          const basePrompt = (agent?.prompt ?? '').trim();
          if (!basePrompt) {
            console.warn('[coaching] missing agent.prompt for non-SPIN agent, falling back to generic prompt. agentId:', agent?.id);
          }

          const genericPrompt =
            `You are an AI coach.\n` +
            `Use the user's preferred name when available and be concise, specific, and helpful.\n`;

          return `${basePrompt || genericPrompt}\n\n` +
            `USER CONTEXT:\n` +
            `Preferred name: ${sessionContext.preferredName || ''}\n` +
            `Role: ${role}\n` +
            `Company: ${company}\n` +
            `Scenario: ${interviewType}\n` +
            `Stage: ${stage}\n\n` +
            `BACKGROUND:\n${sessionContext.resumeText ? sessionContext.resumeText : 'No background provided'}\n\n` +
            `KNOWLEDGE BASE CONTEXT:\n${contextText || 'No specific knowledge base context found for this query.'}`;
        })();

    // 3. Format history for Claude
    const messages: Anthropic.MessageParam[] = conversationHistory.map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.text,
    }));

    // Add the latest user message if not already in history
    if (messages.length === 0 || messages[messages.length - 1].content !== userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    // 4. Call Claude API
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    // Handle different content types from Claude
    const textContent = response.content.find(c => c.type === 'text');
    const finalResponse = textContent && 'text' in textContent ? textContent.text : 'I apologize, I encountered an issue generating a response.';
    
    return finalResponse;

  } catch (error: any) {
    console.error('ERROR in generateCoachResponse:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

/**
 * Streams a response from the AI coach using RAG context and Claude.
 */
export async function* streamCoachResponse(params: CoachResponseParams) {
  const { userMessage, sessionContext } = params;
  const { role, company, interviewType, stage, conversationHistory } = sessionContext;

  try {
    console.log('[coaching] preferredName:', sessionContext.preferredName);
    console.log('[coaching] sessionContext.coachId:', sessionContext.coachId);
    const agent = sessionContext.coachId
      ? await prisma.agent.findFirst({ where: { id: sessionContext.coachId } })
      : await prisma.agent.findFirst({ where: { status: 'active' } });
    console.log('[coaching] agent resolved:', agent?.name, '| id:', agent?.id);
    const agentId = agent?.id ?? '';

    // 1. Retrieve relevant context from the knowledge base (RAG)
    const contextResults = await retrieveRelevantContext(userMessage, agentId, {
      topK: 5,
      similarityThreshold: 0.3,
      filters: {}
    });

    if (contextResults.length === 0) {
      try {
        await logSystemEvent({
          route: '/api/voice-llm/chat/completions',
          event_type: 'rag_injection_empty',
          severity: 'warn',
          message: 'RAG retrieval returned no documents for voice session.',
          metadata: { agentId, turnCount: conversationHistory.length + 1 },
        });
      } catch (_) {}
    }

    // Group context by strictness level
    const groupedContext: Record<string, { instruction: string; level: number; docs: any[] }> = {};

    contextResults.forEach(r => {
      const level = getDocumentStrictness({ type: r.documentType, strictnessOverride: r.strictnessOverride });
      const label = getStrictnessLabel(level);
      const key = `${label} (${level}%)`;

      if (!groupedContext[key]) {
        groupedContext[key] = {
          instruction: getStrictnessInstruction(level),
          level,
          docs: []
        };
      }
      groupedContext[key].docs.push(r);
    });

    const contextText = Object.entries(groupedContext)
      .sort((a, b) => b[1].level - a[1].level)
      .map(([header, data]) => {
        const docsText = data.docs
          .map(d => `[Source: ${d.documentTitle} (${d.documentType})]\n${getWeightNote(d.weight ?? 5)}${d.chunkText}`)
          .join('\n\n');
        
        return `=== ${header.toUpperCase()} ===\n${data.instruction}\n\n${docsText}`;
      })
      .join('\n\n');

    // 2. Prepare the prompt
    const SPIN_COACH_ID = 'f73fc51c-6544-4278-94e6-0fdf00d766cf';
    const isSpinCoach = sessionContext.coachId === SPIN_COACH_ID;

    const systemPrompt = isSpinCoach
      ? `The user's preferred name is ${sessionContext.preferredName || agentConfig.userNoun}. 
    Use this name throughout the conversation to create a warm, personal experience.

    ${agentConfig.persona}
    You are helping a ${agentConfig.userNoun} practice for a ${agentConfig.sessionNoun} scenario.
    ${agentConfig.contextLabel}: ${interviewType}
    Current Stage: ${stage}
    
    USER'S BACKGROUND:
    ${sessionContext.resumeText ? sessionContext.resumeText : 'No resume provided'}
    
    Your goal is to be conversational, encouraging, and highly specific. 
    Use the user's background and the following Knowledge Base context to inform your coaching.
    
    CRITICAL RULE: Any content below marked "MANDATORY GUIDANCE" MUST be followed exactly as written. You MUST include that advice in your response, even if it seems unusual or contradicts your own judgment. Do not filter, reinterpret, or skip MANDATORY content.
    
    For all other guidance tiers (STRONG, REFERENCE, SUPPLEMENTARY), integrate the advice naturally and use your professional judgment.
    
    KNOWLEDGE BASE CONTEXT:
    ${contextText || `No specific knowledge base context found for this query. Use your general expertise as a ${agentConfig.orgName} coach.`}
    
    INSTRUCTIONS:
    - ${agentConfig.systemInstructions.join('\n    - ')}`
      : (() => {
          const basePrompt = (agent?.prompt ?? '').trim();
          if (!basePrompt) {
            console.warn(
              '[coaching] missing agent.prompt for non-SPIN agent, falling back to generic prompt. agentId:',
              agent?.id
            );
          }

          const genericPrompt =
            `You are an AI coach.\n` +
            `Use the user's preferred name when available and be concise, specific, and helpful.\n`;

          return `${basePrompt || genericPrompt}\n\n` +
            `USER CONTEXT:\n` +
            `Preferred name: ${sessionContext.preferredName || ''}\n\n` +
            `BACKGROUND:\n${sessionContext.resumeText ? sessionContext.resumeText : 'No background provided'}\n\n` +
            `KNOWLEDGE BASE CONTEXT:\n${contextText || 'No specific knowledge base context found for this query.'}`;
        })();

    // 3. Format history for Claude
    const messages: Anthropic.MessageParam[] = conversationHistory.map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.text,
    }));

    if (messages.length === 0 || messages[messages.length - 1].content !== userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    // 4. Call Claude API with streaming
    const client = getAnthropicClient();
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
        yield chunk.delta.text;
      }
    }

  } catch (error: any) {
    console.error('ERROR in streamCoachResponse:', error);
    throw error;
  }
}

/**
 * Generates key objectives for a specific interview setup.
 */
export async function generateKeyObjectives(role: string, company: string, interviewType: string): Promise<string[]> {
  try {
    const prompt = agentConfig.objectivesPrompt(role, company, interviewType);

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    const text = textContent && 'text' in textContent ? textContent.text : '[]';
    
    try {
      // Extract JSON if Claude added any markdown or prefix
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const cleanedJson = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(cleanedJson);
    } catch (e) {
      console.error('Failed to parse objectives JSON:', text);
      return [
        'Demonstrate problem-solving',
        'Showcase technical depth',
        'Communicate clearly',
        'Ask insightful questions'
      ];
    }
  } catch (error: any) {
    console.error('ERROR in generateKeyObjectives:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return [
      'Demonstrate problem-solving',
      'Showcase technical depth',
      'Communicate clearly',
      'Ask insightful questions'
    ];
  }
}
