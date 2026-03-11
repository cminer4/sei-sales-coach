import { NextRequest, NextResponse } from 'next/server';
import { storeSessionContext } from '@/lib/voiceSessionStore';
import { logSystemEvent } from '@/lib/logSystemEvent';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // Parse the body to get onboarding context and agent type
    const body = await req.json().catch(() => ({}));
    
    // Select agent ID based on agent_type parameter
    const isAssessmentAgent = body.agent_type === 'assessment';
    const elevenLabsAgentId = isAssessmentAgent 
      ? process.env.ELEVENLABS_ASSESSMENT_AGENT_ID 
      : process.env.ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    // Database agent UUID for prompt lookup in voice LLM route
    const databaseAgentId = isAssessmentAgent
      ? process.env.ASSESSMENT_COACH_ID
      : 'f73fc51c-6544-4278-94e6-0fdf00d766cf'; // SPIN Sales Coach UUID

    console.log('[Voice] Agent type requested:', body.agent_type ?? 'spin (default)');
    console.log('[Voice] ElevenLabs agent ID:', elevenLabsAgentId ?? '(NOT SET)');
    console.log('[Voice] Database agent ID:', databaseAgentId ?? '(NOT SET)');

    if (!elevenLabsAgentId || !apiKey) {
      console.error('Missing ElevenLabs credentials in environment. agentId:', elevenLabsAgentId, 'apiKey:', apiKey ? '(set)' : '(not set)');
      return NextResponse.json({ error: 'Missing ElevenLabs credentials' }, { status: 500 });
    }

    const sessionId = randomUUID();

    // Store the context in memory, keyed by sessionId
    // Include databaseAgentId so voice LLM route can resolve correct agent prompt
    await storeSessionContext(sessionId, {
      resumeText: body.resumeText || '',
      role: body.target_role || 'Software Engineer',
      company: body.target_company || '',
      interviewType: body.interviewType || 'General',
      preferredName: body.user_name || 'Candidate',
      agentId: databaseAgentId,
    });

    console.log('Stored voice session context for sessionId:', sessionId);
    console.log('Fetching signed URL for agent:', elevenLabsAgentId);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(elevenLabsAgentId)}&include_conversation_id=true`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API returned error:', errorText);
      const err = new Error(`ElevenLabs API error: ${errorText}`);
      (err as any).status = response.status;
      throw err;
    }

    const data = await response.json();
    console.log('[elevenlabs-signed-url] ElevenLabs response body:', JSON.stringify(data));
    const signedUrl = data.signed_url;
    const url = new URL(signedUrl);
    const conversationId = url.searchParams.get('conversation_id') ?? data.conversation_id ?? undefined;
    console.log('[elevenlabs-signed-url] conversation_id (from URL or API):', conversationId ?? '(missing)');
    const responseBody = { signedUrl, sessionId, conversationId };
    console.log('[signed-url] full response being returned to client:', JSON.stringify(responseBody));
    return NextResponse.json(responseBody);

  } catch (error: any) {
    console.error('Error in /api/elevenlabs-signed-url:', error);
    try {
      await logSystemEvent({
        route: '/api/elevenlabs-signed-url',
        event_type: 'elevenlabs_signed_url_failure',
        severity: 'error',
        message: 'Failed to fetch ElevenLabs signed URL.',
        metadata: {
          agentId: process.env.ELEVENLABS_AGENT_ID,
          status: (error as any).status,
          error: error?.message ?? String(error),
        },
      });
    } catch (_) {}
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
