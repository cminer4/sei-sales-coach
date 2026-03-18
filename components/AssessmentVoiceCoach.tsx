'use client';

import { useState, useCallback, useEffect, memo, useMemo, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface AssessmentVoiceCoachProps {
  onboardingData?: any;
  demoEnded?: boolean;
  onConversationId?: (conversationId: string) => void;
  onEndSession?: () => void;
}

export const AssessmentVoiceCoach = memo(function AssessmentVoiceCoach({ 
  onboardingData, 
  demoEnded, 
  onConversationId,
  onEndSession,
}: AssessmentVoiceCoachProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionAttemptRef = useRef(false);

  const onConnect = useCallback(() => {
    console.log('✅ Connected to ElevenLabs (Assessment Agent)');
    setIsConnecting(false);
    setConnectionError(null);
  }, []);

  const onDisconnect = useCallback(() => {
    console.log('ℹ️ Disconnected from ElevenLabs (Assessment Agent)');
    setIsConnecting(false);
    connectionAttemptRef.current = false;
  }, []);

  const onError = useCallback((error: any) => {
    console.error('❌ ElevenLabs Assessment Agent error:', error);
    setConnectionError(error?.message || 'Connection failed');
    setIsConnecting(false);
    connectionAttemptRef.current = false;
  }, []);

  const onMessage = useCallback((message: any) => {
    console.log('📩 Assessment Agent message:', message);
  }, []);

  const conversationConfig = useMemo(() => ({
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  }), [onConnect, onDisconnect, onError, onMessage]);

  const conversation = useConversation(conversationConfig);
  const { isSpeaking, status } = conversation;

  useEffect(() => {
    console.log('📊 Assessment Agent status:', status);
  }, [status]);

  useEffect(() => {
    if (demoEnded && status === 'connected') {
      conversation.endSession();
    }
  }, [demoEnded, status, conversation]);

  const startConversation = useCallback(async () => {
    if (conversation.status === 'connected' || connectionAttemptRef.current) {
      console.log('Already connecting or connected, skipping');
      return;
    }
    connectionAttemptRef.current = true;

    try {
      console.log('🚀 Starting Assessment Agent conversation...');
      setIsConnecting(true);
      setConnectionError(null);

      const response = await fetch('/api/elevenlabs-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: onboardingData?.firstName || 'Consultant',
          knowledge_level: onboardingData?.knowledgeLevel || 'familiar',
          agent_type: 'assessment',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Signed URL error: ${errText}`);
      }
      
      const { signedUrl, sessionId, conversationId } = await response.json();
      console.log('Assessment voice session stored with ID:', sessionId);
      if (onConversationId) onConversationId(conversationId);

      await conversation.startSession({ signedUrl });

    } catch (error: any) {
      console.error('Failed to start Assessment voice session:', error);
      setConnectionError(error.message);
      setIsConnecting(false);
      connectionAttemptRef.current = false;
    }
  }, [conversation, onboardingData, onConversationId]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    onEndSession?.();
  }, [conversation, onEndSession]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  return (
    <div className="flex flex-col items-center justify-center space-y-12 p-12 bg-plum/5 rounded-3xl border border-plum/10 shadow-sm w-full max-w-lg mx-auto">
      <style>{`
        @keyframes waveform {
          0%, 100% { height: 12px; }
          50% { height: 48px; }
        }
        .waveform-bar {
          width: 4px;
          background-color: #9B59B6;
          border-radius: 9999px;
          animation: waveform 0.8s ease-in-out infinite;
        }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .ripple {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background-color: #9B59B6;
          animation: ripple 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>

      <div className="relative h-48 flex flex-col items-center justify-center">
        {status === 'connected' ? (
          isSpeaking ? (
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-1.5 h-16">
                <div className="waveform-bar" style={{ animationDelay: '0s' }} />
                <div className="waveform-bar" style={{ animationDelay: '0.15s' }} />
                <div className="waveform-bar" style={{ animationDelay: '0.3s' }} />
                <div className="waveform-bar" style={{ animationDelay: '0.45s' }} />
                <div className="waveform-bar" style={{ animationDelay: '0.6s' }} />
              </div>
              <p className="text-plum font-bold uppercase tracking-widest text-sm animate-pulse">
                Guide Speaking...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className="ripple" />
                <div className="ripple" style={{ animationDelay: '1s' }} />
                <div className="relative z-10 w-20 h-20 rounded-full bg-plum/20 flex items-center justify-center text-plum border border-plum/20">
                  <Mic className="w-10 h-10" />
                </div>
              </div>
              <p className="text-plum/60 font-bold uppercase tracking-widest text-sm">
                Listening...
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-plum/5 flex items-center justify-center text-plum/20 border border-plum/10">
              <MicOff className="w-10 h-10" />
            </div>
            <p className="text-plum/30 font-bold uppercase tracking-widest text-sm">
              Ready to Start
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-6 w-full">
        <div className="flex items-center gap-4">
          {status !== 'connected' ? (
            <button 
              onClick={startConversation} 
              disabled={isConnecting}
              className="rounded-full px-10 py-4 bg-gradient-primary shadow-glow hover:scale-105 transition-all text-white font-bold flex items-center justify-center min-w-[240px]"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic className="mr-3 h-5 w-5" />
                  Start Learning
                </>
              )}
            </button>
          ) : (
            <>
              <button 
                onClick={toggleMute}
                className={`rounded-full w-14 h-14 flex items-center justify-center transition-all border ${
                  isMuted 
                    ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                    : 'bg-plum/10 border-plum/20 text-plum hover:bg-plum/20'
                }`}
              >
                {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </button>
              <button 
                onClick={stopConversation}
                className="rounded-full px-10 py-4 bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all text-white font-bold"
              >
                End Session
              </button>
            </>
          )}
        </div>

        {status === 'connected' && (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 bg-green-500/5 px-4 py-2 rounded-full border border-green-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Connection is live
          </div>
        )}

        {connectionError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-medium max-w-xs text-center">
            {connectionError}
          </div>
        )}
      </div>
    </div>
  );
});
