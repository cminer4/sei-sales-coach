'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, Send, Mic, Info, CheckCircle2, Trophy, MicOff, Loader2, Star, Target, Zap, Users, MessageSquare, Headphones, Keyboard } from 'lucide-react';
import { VoiceCoach } from '@/components/VoiceCoach';
import { agentConfig } from '@/lib/agentConfig';
import DemoBanner from '@/components/DemoBanner';

/** SPIN coaching session — copied from app/coach/page.tsx. Links point to SPIN flow only. */
export default function SpinSessionPage() {
  const [isStarted, setIsStarted] = useState(false);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
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
    const timer = setTimeout(() => setDemoEnded(true), 30 * 1000);
    return () => clearTimeout(timer);
  }, [isStarted]);

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
                  <Link href="/coach/spin/scorecard" className="btn-primary w-full py-4 px-6 text-center block shadow-glow transition-all hover:scale-[1.02]">
                    {agentConfig.coachPage.endSessionLabel}
                  </Link>
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
                <VoiceCoach onboardingData={onboardingData} demoEnded={demoEnded} />
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
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold">Live Feedback</h3>
              </div>
              <div className="space-y-4">
                {!isStarted ? (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 italic text-white/50 text-sm">
                    {agentConfig.coachPage.waitingMessage}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400 flex gap-3">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Good opening, keep it concise.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 flex gap-3">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Focus on understanding the prospect's pain points and articulating clear value.</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 flex-grow">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-yellow-500" />
                <h3 className="font-bold">Key Objectives</h3>
              </div>
              <ul className="space-y-4">
                {isLoadingObjectives ? (
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  keyObjectives.length > 0 ? (
                    keyObjectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                        <div className="mt-1.5">
                          {i === 0 && <Zap className="w-3.5 h-3.5 text-yellow-400" />}
                          {i === 1 && <Target className="w-3.5 h-3.5 text-blue-400" />}
                          {i === 2 && <Users className="w-3.5 h-3.5 text-green-400" />}
                          {i === 3 && <Trophy className="w-3.5 h-3.5 text-purple-400" />}
                          {i >= 4 && <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                        </div>
                        <span className="leading-tight">{obj}</span>
                      </li>
                    ))
                  ) : (
                    ['Uncover prospect pain points', 'Articulate clear value proposition', 'Handle objections confidently', 'Ask discovery questions'].map((obj, i) => (
                      <li key={obj} className="flex items-center gap-3 text-sm text-white/70">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        {obj}
                      </li>
                    ))
                  )
                )}
              </ul>
            </motion.div>

            <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
              {isStarted ? (
                <Link
                  href="/coach/spin/scorecard"
                  className={`btn-primary w-full py-4 px-6 text-center block shadow-glow transition-all hover:scale-[1.02] ${demoEnded ? 'ring-2 ring-white/40 ring-offset-2 ring-offset-transparent' : ''}`}
                >
                  {agentConfig.coachPage.endSessionLabel}
                </Link>
              ) : (
                <div className="w-full py-4 px-6 text-center block bg-white/5 border border-white/10 rounded-xl text-white/20 cursor-not-allowed font-semibold">
                  {agentConfig.coachPage.endSessionLabel}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
