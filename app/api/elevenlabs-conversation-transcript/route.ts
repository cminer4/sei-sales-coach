/**
 * POST /api/elevenlabs-conversation-transcript
 * Fetches the full conversation transcript from ElevenLabs conversation history API.
 * Used after a SPIN voice session ends so the scorecard can score the voice conversation.
 * Body: { conversationId: string }
 * Returns: { transcript: string } in "Coach: ... \n\n Rep: ..." format for /api/score-session.
 */

import { NextRequest, NextResponse } from 'next/server';

type TranscriptEntry = {
  source?: string;
  role?: string;
  type?: string;
  message?: string;
  text?: string;
  content?: string;
  [key: string]: unknown;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API not configured' }, { status: 500 });
  }

  let body: { conversationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const conversationId = body.conversationId?.trim();
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }
  console.log('[transcript] conversationId received:', conversationId);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const text = await response.text();
    console.log('[transcript] ElevenLabs response status:', response.status);
    console.log('[transcript] ElevenLabs raw body (first 500):', text.slice(0, 500));

    if (!response.ok) {
      console.error('[elevenlabs-conversation-transcript] ElevenLabs API error:', response.status, text);
      return NextResponse.json(
        { error: response.status === 404 ? 'Conversation not found or transcript not ready yet.' : 'Failed to fetch transcript.' },
        { status: response.status === 404 ? 404 : 502 }
      );
    }

    const data = JSON.parse(text);
    if (data.status === 'processing') {
      return NextResponse.json({ transcript: '' }, { status: 202 });
    }
    const rawTranscript: TranscriptEntry[] = Array.isArray(data.transcript) ? data.transcript : [];

    // Format to match text-mode transcript: "Coach: ... \n\n Rep: ..."
    const lines = rawTranscript.map((entry) => {
      const text = entry.message ?? entry.text ?? entry.content ?? '';
      const source = (entry.source ?? entry.role ?? entry.type ?? '').toLowerCase();
      const isAgent = source === 'agent' || source === 'ai' || source === 'assistant';
      const prefix = isAgent ? 'Coach:' : 'Rep:';
      return `${prefix} ${String(text).trim()}`;
    });

    const transcript = lines.filter(Boolean).join('\n\n');
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error('[elevenlabs-conversation-transcript] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch transcript.' }, { status: 500 });
  }
}
