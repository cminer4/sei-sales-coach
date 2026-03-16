'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { ChevronLeft, Send, Mic, MicOff, Loader2, Target, Zap, MessageSquare, Headphones, Keyboard } from 'lucide-react';
import { VoiceCoach } from '@/components/VoiceCoach';
import { agentConfig } from '@/lib/agentConfig';
import DemoBanner from '@/components/DemoBanner';

const VALID_SESSION_TYPES = ['outreach_15', 'outreach_30', 'discovery_15', 'discovery_30'] as const;

/** SPIN demo session limit: 3 minutes. (Main coach at /coach uses 30s.) Env override for build-time: NEXT_PUBLIC_SPIN_DEMO_LIMIT_MS */
const SPIN_DEMO_LIMIT_MS =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SPIN_DEMO_LIMIT_MS
    ? Number(process.env.NEXT_PUBLIC_SPIN_DEMO_LIMIT_MS)
    : 180_000; // 3 minutes

/** Wrapper so useSearchParams is inside Suspense (Next.js 14+ requirement for static export). */
export default function SpinSessionPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-textured-gradient flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-white/60" /></div>}>
      <SpinSessionPage />
    </Suspense>
  );
}

/** SPIN coaching session — copied from app/coach/page.tsx. Links point to SPIN flow only. */
function SpinSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isStarted, setIsStarted] = useState(false);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  /** ElevenLabs conversation ID when in voice mode; used to fetch transcript for scorecard. */
  const [voiceConversationId, setVoiceConversationId] = useState<string | null>(null);
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false);
  const [transcriptLoadingMessageIndex, setTranscriptLoadingMessageIndex] = useState(0);

  const TRANSCRIPT_LOADING_MESSAGES = ['Reviewing your session...', 'Generating your report...', 'Finishing up...'];
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [keyObjectives, setKeyObjectives] = useState<string[]>([]);
  const [isLoadingObjectives, setIsLoadingObjectives] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const loadingPhrases = agentConfig.onboarding.loadingMessages;

  useEffect(() => {
    if (!isStarted) {
      const interval = setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isStarted, loadingPhrases.length]);

  const [recognition, setRecognition] = useState<any>(null);
  const [hasAutoStartedMic, setHasAutoStartedMic] = useState(false);
  const isMicRequestedRef = useRef(false);
  
  // Progress state
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(8);
  const [timeLeft, setTimeLeft] = useState(15);

  const [demoEnded, setDemoEnded] = useState(false);

  useEffect(() => {
    if (!isStarted) return;
    const timer = setTimeout(() => setDemoEnded(true), SPIN_DEMO_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [isStarted]);

  // Persist sessionType for scorecard: from URL or default outreach_15
  useEffect(() => {
    const sessionType = searchParams.get('sessionType');
    const value =
      sessionType && VALID_SESSION_TYPES.includes(sessionType as (typeof VALID_SESSION_TYPES)[number])
        ? sessionType
        : 'outreach_15';
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('spinSessionType', value);
    }
  }, [searchParams]);

  // Persist conversation transcript for scorecard (source for POST /api/score-session).
  // Built from `messages` state only — text turns. Voice turns are not in messages,
  // so voice-only sessions yield short/empty transcript and scorecard may score poorly.
  useEffect(() => {
    if (typeof window === 'undefined' || !messages.length) return;
    const transcript = messages
      .map((m) => (m.role === 'ai' ? `Coach: ${m.text}` : `Rep: ${m.text}`))
      .join('\n\n');
    window.localStorage.setItem('spinTranscript', transcript);
  }, [messages]);

  useEffect(() => {
    const data = localStorage.getItem('onboarding-data');
    if (data) {
      const parsed = JSON.parse(data);
      setOnboardingData(parsed);
      setMode(parsed.interactionMode || 'text');
      
      if (parsed.duration === 'quick') setTotalQuestions(4);
      else if (parsed.duration === 'intro') setTotalQuestions(7);
      else if (parsed.duration === 'full') setTotalQuestions(12);
      
      if (parsed.sessionId) {
        fetchProcessedSession(parsed.sessionId, parsed);
      } else {
        fetchObjectives(parsed);
        startInterview(parsed);
      }
    }
  }, []);

  const fetchProcessedSession = async (sid: string, localData: any) => {
    setIsLoadingObjectives(true);
    try {
      const response = await fetch('/api/onboarding/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, ...localData }),
      });
      const result = await response.json();
      
      if (result.preProcessedData?.objectives) {
        setKeyObjectives(result.preProcessedData.objectives);
      } else {
        fetchObjectives(localData);
      }

      startInterview({ ...localData, ...result.preProcessedData });

    } catch (error) {
      console.error('Failed to fetch processed session:', error);
      fetchObjectives(localData);
      startInterview(localData);
    } finally {
      setIsLoadingObjectives(false);
    }
  };

  const fetchObjectives = async (data: any) => {
    if (keyObjectives.length > 0 && keyObjectives[0] !== 'Demonstrate problem-solving') return;
    
    setIsLoadingObjectives(true);
    try {
      const response = await fetch('/api/coach/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: data.role,
          company: data.company,
          interviewType: data.interviewType
        }),
      });
      const result = await response.json();
      if (result.objectives) {
        setKeyObjectives(result.objectives);
      }
    } catch (error) {
      console.error('Failed to fetch objectives:', error);
      setKeyObjectives([
        'Uncover prospect pain points',
        'Articulate clear value proposition',
        'Handle objections confidently',
        'Ask discovery questions'
      ]);
    } finally {
      setIsLoadingObjectives(false);
    }
  };

  const startInterview = async (data?: any) => {
    const context = data || onboardingData;
    setIsStarted(true);
    setCurrentQuestion(1);
    
    if (context?.duration === 'quick') setTimeLeft(15);
    else if (context?.duration === 'intro') setTimeLeft(30);
    else if (context?.duration === 'full') setTimeLeft(60);

    if (context?.objectives) {
      setKeyObjectives(context.objectives);
    }

    setIsLoading(true);
    try {
      if (context?.initialGreeting) {
        setMessages([{ role: 'ai', text: context.initialGreeting }]);
        setIsLoading(false);
        return;
      }

      const requestBody = {
        userMessage: agentConfig.initialMessage,
        sessionContext: {
          role: context?.role || 'Candidate',
          company: context?.company || 'Target Company',
          interviewType: context?.interviewType || agentConfig.sessionNoun,
          stage: context?.interviewType || 'Initial',
          conversationHistory: [],
          coachId: agentConfig.coachId,
          resumeText: context?.resumeText || '',
          preferredName: context?.preferredName || ''
        }
      };

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json();

      if (result.response) {
        setMessages([{ role: 'ai', text: result.response }]);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      setMessages([{ role: 'ai', text: agentConfig.fallbackGreeting }]);
    } finally {
      setIsLoading(false);
    }
  };

  /** Navigate to scorecard. In voice mode with conversation ID, poll for transcript from ElevenLabs (up to 8 attempts, 2s apart), then store in localStorage. */
  const handleGoToScorecard = async () => {
    console.log('[SPIN] voiceConversationId at end session:', voiceConversationId);
    console.log('[SPIN End Session] voiceConversationId:', voiceConversationId ?? 'null/undefined', mode === 'voice' && (voiceConversationId == null) ? '— ElevenLabs transcript fetch will be skipped.' : '');
    if (mode === 'voice' && voiceConversationId) {
      // Ensure the voice session is ended before fetching transcript.
      // We don't have direct access to the ElevenLabs conversation object here, but `VoiceCoach`
      // will call `conversation.endSession()` when `demoEnded` flips to true.
      if (!demoEnded) setDemoEnded(true);
      await new Promise((r) => setTimeout(r, 1500));

      setIsFetchingTranscript(true);
      setTranscriptLoadingMessageIndex(0);
      const fetchOnce = async (): Promise<{ transcript: string; status: number }> => {
        console.log('[SPIN transcript fetch] voiceConversationId before fetch:', voiceConversationId);
        const res = await fetch('/api/elevenlabs-conversation-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: voiceConversationId }),
        });
        const data = await res.json();
        console.log('[SPIN transcript fetch] raw response from /api/elevenlabs-conversation-transcript:', { status: res.status, body: data });
        const transcript = (data.transcript ?? '').trim();
        return { transcript, status: res.status };
      };
      const maxAttempts = 8;
      const delayMs = 2000;
      try {
        await new Promise((r) => setTimeout(r, 3000));
        let result: { transcript: string; status: number } | null = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          result = await fetchOnce();
          if (result.status === 200 && result.transcript) {
            break;
          }
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }
        if (!result || result.status !== 200 || !result.transcript) {
          throw new Error('Conversation transcript is not ready yet. Please try again in a moment.');
        }
        console.log('[SPIN transcript] final transcript written to localStorage.spinTranscript — length:', result.transcript.length, '| preview (first 500 chars):', result.transcript.slice(0, 500));
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('spinTranscript', result.transcript);
        }
        router.push('/coach/spin/scorecard');
      } catch (err) {
        console.error('Failed to fetch voice transcript:', err);
        alert(err instanceof Error ? err.message : 'Could not load conversation transcript. Try again or use text mode.');
      } finally {
        setIsFetchingTranscript(false);
      }
    } else {
      router.push('/coach/spin/scorecard');
    }
  };

  // Cycle transcript loading overlay message every 2s while fetching
  useEffect(() => {
    if (!isFetchingTranscript) return;
    const interval = setInterval(() => {
      setTranscriptLoadingMessageIndex((prev) => (prev + 1) % TRANSCRIPT_LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isFetchingTranscript]);

  useEffect(() => {
    console.log('[SPIN] voiceConversationId state changed to:', voiceConversationId);
  }, [voiceConversationId]);

  useEffect(() => {
    if (mode === 'voice' && recognition) {
      isMicRequestedRef.current = false;
      recognition.stop();
      setIsRecording(false);
    }
  }, [mode, recognition]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInputValue(transcript);
      };

      rec.onend = () => {
        if (isMicRequestedRef.current) {
          try {
            rec.start();
          } catch (e) {}
        } else {
          setIsRecording(false);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      setRecognition(rec);
      return () => {
        rec.stop();
      };
    }
  }, []);

  useEffect(() => {
    if (isStarted && mode === 'text' && onboardingData?.interactionMode === 'voice' && recognition && !hasAutoStartedMic) {
      try {
        if (!isRecording) {
          isMicRequestedRef.current = true;
          recognition.start();
          setIsRecording(true);
        }
        setHasAutoStartedMic(true);
      } catch (error) {
        console.error('Failed to auto-start recognition:', error);
      }
    }
  }, [isStarted, mode, onboardingData, recognition, hasAutoStartedMic, isRecording]);

  const toggleRecording = () => {
    if (!recognition) return;
    if (isRecording) {
      isMicRequestedRef.current = false;
      recognition.stop();
      setIsRecording(false);
    } else {
      try {
        isMicRequestedRef.current = true;
        recognition.start();
        setIsRecording(true);
      } catch (error: any) {
        console.error('Failed to start recognition:', error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMsg: { role: 'ai' | 'user'; text: string } = { role: 'user', text: inputValue };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const requestBody = {
        userMessage: userMsg.text,
        sessionContext: {
          role: onboardingData?.role || 'Candidate',
          company: onboardingData?.company || 'Target Company',
          interviewType: onboardingData?.interviewType || agentConfig.sessionNoun,
          stage: onboardingData?.interviewType || 'Initial',
          conversationHistory: messages,
          coachId: agentConfig.coachId,
          resumeText: onboardingData?.resumeText || '',
          preferredName: onboardingData?.preferredName || ''
        }
      };

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json();
      
      if (result.response) {
        const nextQuestionNum = currentQuestion + 1;
        if (nextQuestionNum <= totalQuestions) {
          setCurrentQuestion(nextQuestionNum);
          setTimeLeft(Math.max(1, timeLeft - Math.floor(timeLeft / (totalQuestions - currentQuestion + 1))));
        }
        setMessages([...newMessages, { role: 'ai', text: result.response }]);
      } else {
        throw new Error(result.error || 'No response from coach');
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setMessages([...newMessages, { 
        role: 'ai', 
        text: "I apologize, but I'm having trouble responding right now. Could you please try again?" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-textured-gradient px-6 py-20">
      <DemoBanner />
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-16">
          <Link href="/" className="text-2xl font-bold tracking-tighter">
            {agentConfig.coachPage.headerTitle} <span className="text-white/60">{agentConfig.coachPage.headerSubtitle}</span>
          </Link>
          <div className="flex items-center gap-6">
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => setMode('text')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                  mode === 'text' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Keyboard className="w-4 h-4" />
                Text
              </button>
              <button
                onClick={() => setMode('voice')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                  mode === 'voice' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Headphones className="w-4 h-4" />
                Voice
              </button>
            </div>
            <Link href="/coach/spin" className="text-white/60 hover:text-white transition-colors">
              Reset Session
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {isFetchingTranscript && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
                <div className="flex flex-col items-center justify-center text-center p-12 space-y-8 max-w-md">
                  <div className="relative">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: 360,
                      }}
                      transition={{
                        scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                        rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                      }}
                      className="w-16 h-16 rounded-full border-4 border-white/5 border-t-white/20 relative"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 bg-white/10 rounded-full blur-xl"
                    />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-xl font-bold text-white/80">Preparing your scorecard...</h2>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={transcriptLoadingMessageIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-white/40 font-medium text-sm"
                      >
                        {TRANSCRIPT_LOADING_MESSAGES[transcriptLoadingMessageIndex]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
            {demoEnded && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
                <div className="bg-[#2A1C30] border border-white/20 rounded-2xl p-8 text-center max-w-md w-full shadow-2xl">
                  <h2 className="text-2xl font-bold text-white mb-4">Demo Complete</h2>
                  <p className="text-white/80 text-sm mb-6">
                    Thanks for trying the demo! To experience a full coaching session built on your team's data,{' '}
                    <a
                      href="mailto:cminer@sei.com?subject=SEI%20Sales%20Agent%20Platform%20Inquiry"
                      className="text-white font-medium underline hover:text-white/90 transition-colors"
                    >
                      get in touch with us
                    </a>
                    .
                  </p>
                  {mode === 'voice' && voiceConversationId ? (
                    <button
                      type="button"
                      onClick={handleGoToScorecard}
                      disabled={isFetchingTranscript}
                      className="btn-primary w-full py-4 px-6 text-center block shadow-glow transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isFetchingTranscript ? (
                        <>
                          <Loader2 className="inline-block w-5 h-5 animate-spin mr-2 align-middle" />
                          Loading transcript…
                        </>
                      ) : (
                        agentConfig.coachPage.endSessionLabel
                      )}
                    </button>
                  ) : (
                    <Link href="/coach/spin/scorecard" className="btn-primary w-full py-4 px-6 text-center block shadow-glow transition-all hover:scale-[1.02]">
                      {agentConfig.coachPage.endSessionLabel}
                    </Link>
                  )}
                </div>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card px-8 pb-8 min-h-[650px] flex flex-col relative"
            >
              <AnimatePresence>
                {isStarted && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-[40px] pb-4 text-center"
                  >
                    <span className="text-[14px] text-white/60 font-medium">
                      Question {currentQuestion} of {totalQuestions} • ~{timeLeft} min left
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`flex-grow flex items-center justify-center py-12 h-full ${mode === 'voice' ? 'block' : 'hidden'} ${demoEnded ? 'invisible' : ''}`}>
                <VoiceCoach
                  onboardingData={onboardingData}
                  demoEnded={demoEnded}
                  onConversationId={(id) => {
                    console.log('[SPIN] onConversationId callback fired with:', id);
                    setVoiceConversationId(id);
                  }}
                />
              </div>

              <div className={`flex flex-col flex-grow ${mode === 'text' ? 'block' : 'hidden'}`}>
                {onboardingData?.interactionMode === 'voice' && (
                  <div className={`mb-8 flex flex-col items-center justify-center ${!isStarted ? 'pt-[40px]' : 'pt-4'}`}>
                    <AnimatePresence mode="wait">
                      {isStarted && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center"
                        >
                          <button
                            onClick={toggleRecording}
                            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                              isRecording 
                                ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
                                : 'bg-gradient-primary shadow-glow hover:scale-105'
                            }`}
                          >
                            {isRecording ? <MicOff className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
                            {isRecording && (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="absolute inset-0 rounded-full border-4 border-red-400/30"
                              />
                            )}
                          </button>
                          <p className={`mt-4 font-semibold tracking-wide uppercase text-sm ${isRecording ? 'text-red-400' : 'text-white/60'}`}>
                            {isRecording ? 'Listening...' : 'Tap to Speak'}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="flex-grow flex flex-col overflow-y-auto mb-6 space-y-4 custom-scrollbar px-4">
                  <AnimatePresence mode="wait">
                    {!isStarted ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-grow flex flex-col items-center justify-center text-center p-12 space-y-8"
                      >
                        <div className="relative">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.1, 1],
                              rotate: 360 
                            }}
                            transition={{ 
                              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                              rotate: { duration: 3, repeat: Infinity, ease: "linear" }
                            }}
                            className="w-16 h-16 rounded-full border-4 border-white/5 border-t-white/20 relative"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-white/10 rounded-full blur-xl"
                          />
                        </div>

                        <div className="space-y-3">
                          <h2 className="text-xl font-bold text-white/80">Preparing your session...</h2>
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={loadingPhraseIndex}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="text-white/40 font-medium text-sm"
                            >
                              {loadingPhrases[loadingPhraseIndex]}
                            </motion.p>
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        {messages.map((msg, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: msg.role === 'ai' ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'ai' ? 'bg-white/10 rounded-tl-none' : 'bg-gradient-primary rounded-tr-none'}`}>
                              <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && (
                          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                            <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                              <span className="text-sm text-white/40">{agentConfig.coachPage.thinkingMessage}</span>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="border-t border-white/10 pt-6">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={isStarted ? "Type your response..." : "Connecting..."}
                      disabled={!isStarted || isRecording || isLoading || demoEnded}
                      className="flex-grow bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/30 transition-colors disabled:opacity-50"
                    />
                    <button 
                      type="submit"
                      disabled={!isStarted || !inputValue.trim() || isRecording || isLoading || demoEnded}
                      className="bg-white/10 hover:bg-white/20 p-4 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col gap-6 h-full min-h-[650px]">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 flex-grow">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-red-500" />
                <h3 className="font-bold">Key Objectives</h3>
              </div>
              <ul className="space-y-4">
                {[
                  { letter: 'S', name: 'Situation', tip: 'Confirm context quickly. Do your homework first — don\'t ask what you should already know.' },
                  { letter: 'P', name: 'Problem', tip: 'Find the real pain. Dig past the stated issue to what\'s actually not working.' },
                  { letter: 'I', name: 'Implication', tip: 'Explore the consequences. What happens if this doesn\'t get solved?' },
                  { letter: 'N', name: 'Need-Payoff', tip: 'Let them say the value. Ask what solving this would mean — don\'t tell them.' },
                ].map(({ letter, name, tip }) => (
                  <li key={letter} className="flex items-start gap-3 text-sm">
                    <span className="font-semibold text-white flex-shrink-0" aria-hidden>{letter}</span>
                    <div>
                      <span className="font-bold text-white/90">{name}</span>
                      <p className="text-xs text-white/60 mt-0.5 leading-snug">{tip}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
              {isStarted ? (
                mode === 'voice' && voiceConversationId ? (
                  <button
                    type="button"
                    onClick={handleGoToScorecard}
                    disabled={!demoEnded || isFetchingTranscript}
                    className={`btn-primary w-full py-4 px-6 text-center block transition-all disabled:opacity-50 disabled:cursor-not-allowed ${demoEnded ? 'shadow-glow hover:scale-[1.02] ring-2 ring-white/40 ring-offset-2 ring-offset-transparent' : ''}`}
                  >
                    {isFetchingTranscript ? (
                      <>
                        <Loader2 className="inline-block w-5 h-5 animate-spin mr-2 align-middle" />
                        Loading transcript…
                      </>
                    ) : (
                      'Generate Scorecard'
                    )}
                  </button>
                ) : (
                  demoEnded ? (
                    <Link
                      href="/coach/spin/scorecard"
                      className="btn-primary w-full py-4 px-6 text-center block shadow-glow transition-all hover:scale-[1.02] ring-2 ring-white/40 ring-offset-2 ring-offset-transparent"
                    >
                      Generate Scorecard
                    </Link>
                  ) : (
                    <div className="w-full py-4 px-6 text-center block bg-white/5 border border-white/10 rounded-xl text-white/20 cursor-not-allowed font-semibold">
                      Generate Scorecard
                    </div>
                  )
                )
              ) : (
                <div className="w-full py-4 px-6 text-center block bg-white/5 border border-white/10 rounded-xl text-white/20 cursor-not-allowed font-semibold">
                  Generate Scorecard
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
