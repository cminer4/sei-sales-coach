'use client';

import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { agentConfig } from '@/lib/agentConfig';
import DemoBanner from '@/components/DemoBanner';
import {
  ChevronLeft,
  Trophy,
  Target,
  MessageSquare,
  Zap,
  Star,
  TrendingUp,
  Loader2,
  Download,
  CheckCircle2,
} from 'lucide-react';

const VALID_SESSION_TYPES = ['outreach_15', 'outreach_30', 'discovery_15', 'discovery_30'] as const;

/** API scorecard shape per lib/scoringPrompts.ts */
type ApiScorecard = {
  headline: string;
  scores: {
    situation: { score: number; commentary: string };
    problem: { score: number; commentary: string };
    implication: { score: number; commentary: string };
    need_payoff: { score: number; commentary: string };
    overall: number;
  };
  strengths?: string[];
  growth_areas?: string[];
};

type ScorecardState = 'no_data' | 'loading' | 'success' | 'error';

const SPIN_LABELS: { key: keyof ApiScorecard['scores']; label: string; icon: typeof Zap }[] = [
  { key: 'situation', label: 'Situation', icon: Target },
  { key: 'problem', label: 'Problem', icon: MessageSquare },
  { key: 'implication', label: 'Implication', icon: Zap },
  { key: 'need_payoff', label: 'Need-Payoff', icon: Trophy },
];

/** Count-up from 0 to target percentage over ~600ms for polish (NFR-003). */
function AnimatedPercentage({ target, duration = 0.6 }: { target: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    controlsRef.current = animate(count, target, { duration, ease: 'easeOut' });
    return () => controlsRef.current?.stop();
  }, [count, target, duration]);

  useEffect(() => {
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => unsub();
  }, [rounded]);

  return <>{display}%</>;
}

/** SPIN scorecard — reads session data from localStorage, calls scoring API, renders real results. */
export default function SpinScorecardPage() {
  const [state, setState] = useState<ScorecardState>('loading');
  const [scorecard, setScorecard] = useState<ApiScorecard | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Client-only: read localStorage and either show no_data or start API request
  useEffect(() => {
    const sessionType = typeof window !== 'undefined' ? window.localStorage.getItem('spinSessionType') : null;
    const transcript = typeof window !== 'undefined' ? window.localStorage.getItem('spinTranscript') : null;

    const hasValidTranscript = transcript != null && transcript.trim().length > 0;
    const validSessionTypes = VALID_SESSION_TYPES as unknown as string[];
    const normalizedSessionType =
      sessionType && validSessionTypes.includes(sessionType) ? sessionType : 'outreach_15';

    if (!sessionType || !hasValidTranscript) {
      setState('no_data');
      return;
    }

    setState('loading');
    fetch('/api/score-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcript.trim(), sessionType: normalizedSessionType }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body) => {
            throw new Error((body && body.error) || `Scoring failed (${res.status})`);
          });
        }
        return res.json();
      })
      .then((data: unknown) => {
        const s = data as ApiScorecard;
        if (!s?.headline || !s?.scores) throw new Error('Invalid scorecard response');
        setScorecard(s);
        setState('success');
      })
      .catch((err: Error) => {
        setErrorMessage(err?.message || 'Scoring failed. Please try again.');
        setState('error');
      });
  }, []);

  const handleRetry = () => {
    setState('loading');
    setErrorMessage('');
    const sessionType = typeof window !== 'undefined' ? window.localStorage.getItem('spinSessionType') : null;
    const transcript = typeof window !== 'undefined' ? window.localStorage.getItem('spinTranscript') : null;
    const validSessionTypes = VALID_SESSION_TYPES as unknown as string[];
    const normalizedSessionType =
      sessionType && validSessionTypes.includes(sessionType) ? sessionType : 'outreach_15';
    if (!transcript?.trim()) {
      setState('no_data');
      return;
    }
    fetch('/api/score-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcript.trim(), sessionType: normalizedSessionType }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((body) => { throw new Error((body && body.error) || String(res.status)); });
        return res.json();
      })
      .then((data: unknown) => {
        const s = data as ApiScorecard;
        if (!s?.headline || !s?.scores) throw new Error('Invalid scorecard response');
        setScorecard(s);
        setState('success');
      })
      .catch((err: Error) => {
        setErrorMessage(err?.message || 'Scoring failed. Please try again.');
        setState('error');
      });
  };

  return (
    <main className="min-h-screen bg-textured-gradient px-6 py-20 flex flex-col items-center">
      <DemoBanner />
      <div className="w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {state === 'no_data' && (
            <motion.div
              key="no_data"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto text-center"
            >
              <Link href="/coach/spin" className="inline-flex items-center text-white/60 hover:text-white mb-12 transition-colors group">
                <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Coach
              </Link>
              <div className="glass-card p-10">
                <p className="text-xl text-white/90 mb-6">No session data found. Please complete a session first.</p>
                <Link href="/coach/spin" className="btn-primary w-full py-4 block text-center">
                  Start a session
                </Link>
              </div>
            </motion.div>
          )}

          {state === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <Link href="/coach/spin" className="inline-flex items-center text-white/60 hover:text-white mb-12 transition-colors group">
                <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Coach
              </Link>
              <header className="mb-12 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-green-500/10 border border-green-500/20 mb-4"
                >
                  <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                  <span className="text-xs font-bold tracking-widest uppercase text-green-400">Analysis Complete</span>
                </motion.div>
                <h1 className="text-5xl font-bold mb-4">{agentConfig.scorecard.title}</h1>
                <p className="text-xl text-white/60">Analysing your session...</p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 opacity-50">
                {SPIN_LABELS.map(({ label }, i) => (
                  <div
                    key={label}
                    className="glass-card p-6 flex flex-col items-center text-center opacity-70"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 mb-4" />
                    <div className="text-3xl font-bold mb-1 text-white/40">—%</div>
                    <div className="text-sm font-medium text-white/40 uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>
              <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden mx-auto">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="w-full h-full bg-gradient-primary shadow-glow"
                />
              </div>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto text-center"
            >
              <Link href="/coach/spin" className="inline-flex items-center text-white/60 hover:text-white mb-12 transition-colors group">
                <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Coach
              </Link>
              <div className="glass-card p-10">
                <p className="text-xl text-white/90 mb-6">{errorMessage}</p>
                <div className="flex flex-col gap-3">
                  <button type="button" onClick={handleRetry} className="btn-primary w-full py-4">
                    Try again
                  </button>
                  <Link href="/coach/spin" className="btn-secondary w-full py-4 block text-center">
                    Start a session
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'success' && scorecard && (
            <motion.div
              key="scorecard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full"
            >
              <Link href="/" className="inline-flex items-center text-white/60 hover:text-white mb-12 transition-colors group">
                <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Link>

              <header className="mb-12 text-center relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-green-500/10 border border-green-500/20 mb-4"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-bold tracking-widest uppercase text-green-400">Analysis Complete</span>
                </motion.div>
                <h1 className="text-5xl font-bold mb-4">{agentConfig.scorecard.title}</h1>
                <p className="text-xl text-white/60">{scorecard.headline}</p>
                <div className="absolute top-0 right-0 hidden md:block">
                  <button type="button" className="btn-secondary py-2 px-6 flex items-center gap-2 text-sm">
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {SPIN_LABELS.map(({ key, label, icon: Icon }, i) => {
                  const dim = scorecard.scores[key];
                  if (dim && typeof dim === 'object' && 'score' in dim && 'commentary' in dim) {
                    const pct = Math.round((dim.score / 5) * 100);
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-6 flex flex-col items-center text-center group hover:border-white/30 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 text-white/80">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="text-3xl font-bold mb-1">
                          <AnimatedPercentage target={pct} />
                        </div>
                        <div className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">{label}</div>
                        <p className="text-sm text-white/70 text-left w-full">{dim.commentary}</p>
                      </motion.div>
                    );
                  }
                  return null;
                })}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card p-6 mb-12 text-center"
              >
                <div className="text-sm font-medium text-white/60 uppercase tracking-wider mb-2">Overall Score</div>
                <div className="text-4xl font-bold">
                  <AnimatedPercentage
                    target={Math.round(((typeof scorecard.scores.overall === 'number' ? scorecard.scores.overall : 0) / 5) * 100)}
                    duration={0.8}
                  />
                </div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="lg:col-span-2 glass-card p-8"
                >
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-yellow-500">
                    <Star className="w-6 h-6" />
                    Key Strengths
                  </h3>
                  <ul className="space-y-4">
                    {(scorecard.strengths && scorecard.strengths.length > 0
                      ? scorecard.strengths
                      : ['No strengths data returned.']
                    ).map((strength, i) => (
                      <li key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 group hover:bg-white/[0.07] transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                        <p className="text-white/80">{strength}</p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="glass-card p-8"
                >
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
                    <TrendingUp className="w-6 h-6" />
                    Growth Areas
                  </h3>
                  <ul className="space-y-4">
                    {(scorecard.growth_areas && scorecard.growth_areas.length > 0
                      ? scorecard.growth_areas
                      : ['No growth areas data returned.']
                    ).map((area, i) => (
                      <li key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm group hover:bg-white/[0.07] transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                        <p className="text-white/70">{area}</p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t border-white/10">
                <Link href="/coach/spin" className="btn-primary px-12 py-4 text-center">
                  Practice Again
                </Link>
                <button type="button" className="btn-secondary px-12 py-4 flex items-center justify-center gap-2 md:hidden">
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
                <Link href="/" className="btn-secondary px-12 py-4 text-center">
                  Return to Home
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
