'use client';

import { useState, useCallback, useEffect, memo, useMemo, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { agentConfig } from '@/lib/agentConfig';

interface VoiceCoachProps {
  onboardingData?: any;
  demoEnded?: boolean;
}

export const VoiceCoach = memo(function VoiceCoach({ onboardingData, demoEnded }: VoiceCoachProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Use a ref to track if we've already tried to connect to avoid double-triggers
  const connectionAttemptRef = useRef(false);

  // Memoize callbacks to prevent hook re-initialization
  const onConnect = useCallback(() => {
    console.log('✅ Connected to ElevenLabs');
    setIsConnecting(false);
    setConnectionError(null);
  }, []);

  const onDisconnect = useCallback(() => {
    console.log('ℹ️ Disconnected from ElevenLabs');
    setIsConnecting(false);
    connectionAttemptRef.current = false;
  }, []);

  const onError = useCallback((error: any) => {
    console.error('❌ ElevenLabs error details:', error);
    setConnectionError(error?.message || 'Connection failed');
    setIsConnecting(false);
    connectionAttemptRef.current = false;
  }, []);

  const onMessage = useCallback((message: any) => {
    console.log('📩 Received ElevenLabs message:', message);
  }, []);

  // Memoize the entire config object
  const conversationConfig = useMemo(() => ({
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  }), [onConnect, onDisconnect, onError, onMessage]);

  const conversation = useConversation(conversationConfig);
  const { isSpeaking, status } = conversation;

  // Log status changes
  useEffect(() => {
    console.log('📊 ElevenLabs conversation status changed:', status);
  }, [status]);

  // Disconnect when demo limit reached (e.g. 2 user messages)
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
      console.log('🚀 Starting ElevenLabs conversation process...');
      setIsConnecting(true);
      setConnectionError(null);

      // 1. Get signed URL
      const response = await fetch('/api/elevenlabs-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: onboardingData?.preferredName || 'Candidate',
          target_role: onboardingData?.role || 'Software Engineer',
          target_company: onboardingData?.company || 'SEI',
          interviewType: onboardingData?.interviewType || 'General',
          resumeText: onboardingData?.resumeText || '',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Signed URL error: ${errText}`);
      }
      
      const { signedUrl, sessionId } = await response.json();
      console.log('Voice session context stored with ID:', sessionId);

      // 2. Start conversation with signed URL only. Pass empty dynamicVariables so the SDK
      //    doesn't send any custom variables that could mismatch the agent dashboard and cause silent disconnect.
      await conversation.startSession({ signedUrl, dynamicVariables: {} });

    } catch (error: any) {
      console.error('Failed to start voice session:', error);
      setConnectionError(error.message);
      setIsConnecting(false);
      connectionAttemptRef.current = false;
    }
  }, [conversation, onboardingData]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  const isActive = conversation.status === 'connected';

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

      {/* Central Visual Element */}
      <div className="relative h-48 flex flex-col items-center justify-center">
        {status === 'connected' ? (
          isSpeaking ? (
            /* SPEAKING STATE */
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-1.5 h-16">
                <div className="waveform-bar" style={{ animationDelay: '0s' }} />
                <div className="waveform-bar" style={{ animationDelay: '0.15s' }} />
                <div className="waveform-bar" style={{ animationDelay: '0.3s' }} />
                <div className="waveform-bar" style={{ animationDelay: '0.45s' }} />
                <div className="waveform-bar" style={{ animationDelay: '0.6s' }} />
              </div>
              <p className="text-plum font-bold uppercase tracking-widest text-sm animate-pulse">
                {agentConfig.coachPage.voiceSpeakingLabel}
              </p>
            </div>
          ) : (
            /* LISTENING / CONNECTED IDLE STATE */
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className="ripple" />
                <div className="ripple" style={{ animationDelay: '1s' }} />
                <div className="relative z-10 w-20 h-20 rounded-full bg-plum/20 flex items-center justify-center text-plum border border-plum/20">
                  <Mic className="w-10 h-10" />
                </div>
              </div>
              <p className="text-plum/60 font-bold uppercase tracking-widest text-sm">
                {agentConfig.coachPage.voiceListeningLabel}
              </p>
            </div>
          )
        ) : (
          /* IDLE / NOT STARTED */
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-plum/5 flex items-center justify-center text-plum/20 border border-plum/10">
              <MicOff className="w-10 h-10" />
            </div>
            <p className="text-plum/30 font-bold uppercase tracking-widest text-sm">
              {agentConfig.coachPage.voiceReadyLabel}
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
                  {agentConfig.coachPage.voiceStartButton}
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
