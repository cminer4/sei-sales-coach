import { NextRequest } from 'next/server';
import { streamCoachResponse, Message } from '@/lib/coaching';
import { logSystemEvent } from '@/lib/logSystemEvent';

export async function GET() {
  return new Response('OK', { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    console.log('--- Custom LLM Request Received ---');
    const authHeader = req.headers.get('Authorization');
    const expectedKey = process.env.INTERVIEW_COACH_CUSTOM_LLM_API_KEY;

    if (!expectedKey) {
      console.error('ERROR: INTERVIEW_COACH_CUSTOM_LLM_API_KEY is not set');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== expectedKey) {
      console.warn('Auth mismatch - received:', authHeader?.substring(0, 20), 'expected starts with:', expectedKey?.substring(0, 10));
      console.warn('Unauthorized request attempt to Custom LLM');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    const { messages, dynamic_variables } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('No messages found in request body');
      return new Response(JSON.stringify({ error: 'No messages provided' }), { status: 400 });
    }

    // Extract the latest user message robustly
    const lastMessage = messages[messages.length - 1];
    let userMessage = '';
    
    if (typeof lastMessage.content === 'string') {
      userMessage = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
      // Handle array format (OpenAI compatible)
      const textPart = lastMessage.content.find((p: any) => p.type === 'text');
      userMessage = textPart?.text || '';
    }

    console.log('Extracted user message:', userMessage);
    
    // Format history for our generateCoachResponse (role: 'ai' | 'user')
    const conversationHistory: Message[] = messages.slice(0, -1).map((m: any) => {
      let content = '';
      if (typeof m.content === 'string') {
        content = m.content;
      } else if (Array.isArray(m.content)) {
        const textPart = m.content.find((p: any) => p.type === 'text');
        content = textPart?.text || '';
      }
      
      const role: 'ai' | 'user' = m.role === 'assistant' ? 'ai' : 'user';
      return {
        role,
        text: content
      };
    }).filter((m: any) => m.role !== 'system');

    // Try to get stored session context (from signed URL creation)
    const { getLatestSessionContext } = await import('@/lib/voiceSessionStore');
    const storedContext = await getLatestSessionContext();
    
    if (storedContext) {
      console.log('Found latest voice session context');
    } else {
      console.log('No stored context found, using dynamic variables');
    }

    // Resolve agentId — prefer stored context, fall back to hardcoded SPIN coach
    const agentId = storedContext?.agentId || 'f73fc51c-6544-4278-94e6-0fdf00d766cf';
    console.log('[Voice LLM] Using agentId:', agentId);

    // Extract context — prefer stored context, fall back to dynamic variables
    const sessionContext = {
      role: storedContext?.role || dynamic_variables?.target_role || 'Software Engineer',
      company: storedContext?.company || dynamic_variables?.target_company || 'SEI',
      interviewType: storedContext?.interviewType || 'Technical',
      stage: 'Initial',
      conversationHistory,
      coachId: agentId,
      preferredName: storedContext?.preferredName || dynamic_variables?.user_name || '',
      resumeText: storedContext?.resumeText || '',
    };

    console.log('Starting stream response for message:', userMessage);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let chunkCount = 0;
          for await (const chunk of streamCoachResponse({ userMessage, sessionContext })) {
            const data = {
              choices: [{ delta: { content: chunk } }]
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            chunkCount++;
          }
          console.log(`Stream finished. Sent ${chunkCount} chunks.`);
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: any) {
          console.error('Streaming error in Custom LLM route:', err);
          try {
            await logSystemEvent({
              route: '/api/voice-llm/chat/completions',
              event_type: 'voice_llm_failure',
              severity: 'error',
              message: 'Voice LLM completion failed.',
              metadata: { error: err?.message ?? String(err) },
            });
          } catch (_) {}
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Error in /api/voice-llm:', error);
    try {
      await logSystemEvent({
        route: '/api/voice-llm/chat/completions',
        event_type: 'voice_llm_failure',
        severity: 'error',
        message: 'Voice LLM completion failed.',
        metadata: { error: error?.message ?? String(error) },
      });
    } catch (_) {}
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
