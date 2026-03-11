'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import { ChevronLeft, Send, Mic, MicOff, Loader2, BookOpen, Lightbulb, Headphones, Keyboard } from 'lucide-react';
import { AssessmentVoiceCoach } from '@/components/AssessmentVoiceCoach';

const DEMO_LIMIT_MS = 300_000; // 5 minutes

const LEARNING_TOPICS = [
  { icon: BookOpen, title: 'Product Knowledge', tip: 'Understand core capabilities and use cases' },
  { icon: Lightbulb, title: 'Value Articulation', tip: 'Connect features to business outcomes' },
];

export default function AssessmentSessionPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-textured-gradient flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-white/60" /></div>}>
      <AssessmentSessionPage />
    </Suspense>
  );
}

function AssessmentSessionPage() {
  const router = useRouter();
  const [isStarted, setIsStarted] = useState(false);
  const [mode, setMode] = useState<'text' | 'voice'>('voice');
  const [voiceConversationId, setVoiceConversationId] = useState<string | null>(null);
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false);
  const [transcriptLoadingMessageIndex, setTranscriptLoadingMessageIndex] = useState(0);

  const TRANSCRIPT_LOADING_MESSAGES = ['Reviewing your session...', 'Generating your summary...', 'Finishing up...'];
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  
  const loadingPhrases = [
    'Connecting to your guide...',
    'Loading assessment content...',
    'Preparing your session...',
  ];

  useEffect(() => {
    if (!isStarted) {
      const interval = setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isStarted, loadingPhrases.length]);

  const [demoEnded, setDemoEnded] = useState(false);

  useEffect(() => {
    if (!isStarted) return;
    const timer = setTimeout(() => setDemoEnded(true), DEMO_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [isStarted]);

  useEffect(() => {
    const data = localStorage.getItem('assessment-onboarding-data');
    if (data) {
      const parsed = JSON.parse(data);
      setOnboardingData(parsed);
      setMode(parsed.interactionMode || 'voice');
      setIsStarted(true);
      
      if (parsed.interactionMode === 'text') {
        setMessages([{ 
          role: 'ai', 
          text: `Hi ${parsed.firstName}! I'm here to help you learn about the AI Assessment & Strategy product. Based on your ${parsed.knowledgeLevel === 'new' ? 'fresh perspective' : parsed.knowledgeLevel === 'familiar' ? 'existing knowledge' : 'expertise'}, let's dive into how you can articulate value to prospects. What aspect would you like to explore first?` 
        }]);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !messages.length) return;
    const transcript = messages
      .map((m) => (m.role === 'ai' ? `Guide: ${m.text}` : `Consultant: ${m.text}`))
      .join('\n\n');
    window.localStorage.setItem('assessmentTranscript', transcript);
  }, [messages]);

  const handleGoToSummary = async () => {
    if (mode === 'voice' && voiceConversationId) {
      setIsFetchingTranscript(true);
      setTranscriptLoadingMessageIndex(0);
      
      const fetchOnce = async (): Promise<{ transcript: string; status: number }> => {
        const res = await fetch('/api/elevenlabs-conversation-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: voiceConversationId }),
        });
        const data = await res.json();
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
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('assessmentTranscript', result.transcript);
        }
        router.push('/guide/assessment/summary');
      } catch (err) {
        console.error('Failed to fetch voice transcript:', err);
        alert(err instanceof Error ? err.message : 'Could not load conversation transcript. Try again or use text mode.');
      } finally {
        setIsFetchingTranscript(false);
      }
    } else {
      router.push('/guide/assessment/summary');
    }
  };

  useEffect(() => {
    if (!isFetchingTranscript) return;
    const interval = setInterval(() => {
      setTranscriptLoadingMessageIndex((prev) => (prev + 1) % TRANSCRIPT_LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isFetchingTranscript]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMsg: { role: 'ai' | 'user'; text: string } = { role: 'user', text: inputValue };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const responses = [
        "That's a great observation! The AI Assessment helps organizations understand their AI maturity across key dimensions. What specific challenges do you think prospects face when trying to adopt AI?",
        "Exactly right. When positioning against competitors, focus on our methodology-driven approach and the actionable roadmap we deliver. How would you handle the objection that 'we can do this internally'?",
        "Good thinking! The key differentiator is that we don't just assess — we provide a strategic pathway. What questions would you ask to uncover whether a prospect truly understands their AI readiness?",
        "That's the right approach. Remember, the Assessment reveals gaps that the prospect often doesn't know they have. What would you say is the biggest value driver for most clients?",
      ];
      
      const aiResponse = responses[Math.min(newMessages.filter(m => m.role === 'user').length - 1, responses.length - 1)];
      setMessages([...newMessages, { role: 'ai', text: aiResponse }]);
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
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-16">
          <Link href="/guide" className="text-2xl font-bold tracking-tighter">
            SEI <span className="text-white/60">AI Assessment Guide</span>
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
            <Link href="/guide/assessment" className="text-white/60 hover:text-white transition-colors">
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
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-xl font-bold text-white/80">Preparing your summary...</h2>
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
                  <h2 className="text-2xl font-bold text-white mb-4">Session Complete</h2>
                  <p className="text-white/80 text-sm mb-6">
                    Great learning session! Let's see how you did and what areas you can continue to develop.
                  </p>
                  <button
                    type="button"
                    onClick={handleGoToSummary}
                    disabled={isFetchingTranscript}
                    className="btn-primary w-full py-4 px-6 text-center block shadow-glow transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isFetchingTranscript ? (
                      <>
                        <Loader2 className="inline-block w-5 h-5 animate-spin mr-2 align-middle" />
                        Loading summary...
                      </>
                    ) : (
                      'View Learning Summary'
                    )}
                  </button>
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
                      AI Assessment Learning Session • ~5 min
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`flex-grow flex items-center justify-center py-12 h-full ${mode === 'voice' ? 'block' : 'hidden'} ${demoEnded ? 'invisible' : ''}`}>
                <AssessmentVoiceCoach
                  onboardingData={onboardingData}
                  demoEnded={demoEnded}
                  onConversationId={(id) => setVoiceConversationId(id)}
                />
              </div>

              <div className={`flex flex-col flex-grow ${mode === 'text' ? 'block' : 'hidden'}`}>
                <div className="flex-grow flex flex-col overflow-y-auto mb-6 space-y-4 custom-scrollbar px-4 pt-4">
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
                              <span className="text-sm text-white/40">Thinking...</span>
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
                      disabled={!isStarted || isLoading || demoEnded}
                      className="flex-grow bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/30 transition-colors disabled:opacity-50"
                    />
                    <button 
                      type="submit"
                      disabled={!isStarted || !inputValue.trim() || isLoading || demoEnded}
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
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h3 className="font-bold">Learning Focus</h3>
              </div>
              <ul className="space-y-4">
                {[
                  { title: 'Product Knowledge', tip: 'Understand core capabilities, use cases, and the assessment methodology.' },
                  { title: 'Value Articulation', tip: 'Connect features to business outcomes. Lead with impact, not features.' },
                  { title: 'Objection Handling', tip: 'Address common pushback: "we can do this internally", "we\'re not ready", etc.' },
                  { title: 'Competitive Positioning', tip: 'Differentiate from generic consulting and point solutions.' },
                ].map(({ title, tip }) => (
                  <li key={title} className="flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-white/90">{title}</span>
                      <p className="text-xs text-white/60 mt-0.5 leading-snug">{tip}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>

            {demoEnded && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  type="button"
                  onClick={handleGoToSummary}
                  disabled={isFetchingTranscript}
                  className="btn-primary w-full py-4 px-6 text-center block shadow-glow transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed ring-2 ring-white/40 ring-offset-2 ring-offset-transparent"
                >
                  {isFetchingTranscript ? (
                    <>
                      <Loader2 className="inline-block w-5 h-5 animate-spin mr-2 align-middle" />
                      Loading summary...
                    </>
                  ) : (
                    'View Learning Summary'
                  )}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
