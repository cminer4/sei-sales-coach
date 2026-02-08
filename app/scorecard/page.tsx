'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
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
  Mail, 
  Loader2, 
  Download,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

type FlowState = 'EMAIL_COLLECTION' | 'GENERATING' | 'VIEW_SCORECARD';

export default function ScorecardPage() {
  const [state, setState] = useState<FlowState>('EMAIL_COLLECTION');
  const [email, setEmail] = useState('');

  const scores = [
    { category: 'Product Knowledge', score: 85, icon: Zap, color: 'text-blue-400' },
    { category: 'Rapport Building', score: 92, icon: Target, color: 'text-purple-400' },
    { category: 'Communication', score: 78, icon: MessageSquare, color: 'text-green-400' },
    { category: 'Problem Solving', score: 88, icon: Trophy, color: 'text-yellow-400' },
  ];

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setState('GENERATING');
  };

  useEffect(() => {
    if (state === 'GENERATING') {
      const timer = setTimeout(() => {
        setState('VIEW_SCORECARD');
      }, 3000); // 3 second simulation
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <main className="min-h-screen bg-textured-gradient px-6 py-20 flex flex-col items-center">
      <DemoBanner />
      <div className="w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {state === 'EMAIL_COLLECTION' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <Link href="/coach" className="inline-flex items-center text-white/60 hover:text-white mb-12 transition-colors group">
                <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Coach
              </Link>

              <div className="glass-card p-10 text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-4">View Your Results</h1>
                <p className="text-white/60 mb-8">
                  {agentConfig.scorecard.emailPrompt}
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-white/30 transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button type="submit" className="btn-primary w-full py-4 flex items-center justify-center gap-2 group text-lg">
                    {agentConfig.scorecard.generateButton}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
                
                <p className="text-[10px] text-white/30 mt-6 uppercase tracking-widest">
                  By continuing, you agree to our Terms and Privacy Policy.
                </p>
              </div>
            </motion.div>
          )}

          {state === 'GENERATING' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[400px] text-center"
            >
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-2xl border-2 border-white/5 animate-pulse" />
                <Loader2 className="w-12 h-12 text-white absolute inset-0 m-auto animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Analyzing your sales conversation...</h2>
              <p className="text-white/60 max-w-xs mx-auto animate-pulse">
                Our AI is evaluating your sales technique, discovery skills, and objection handling based on proven sales methodologies.
              </p>
              
              <div className="mt-12 w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-full h-full bg-gradient-primary shadow-glow"
                />
              </div>
            </motion.div>
          )}

          {state === 'VIEW_SCORECARD' && (
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
                <p className="text-xl text-white/60">Excellent work! You demonstrated strong product knowledge and rapport building.</p>
                
                <div className="absolute top-0 right-0 hidden md:block">
                  <button className="btn-secondary py-2 px-6 flex items-center gap-2 text-sm">
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {scores.map((s, i) => (
                  <motion.div
                    key={s.category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-6 flex flex-col items-center text-center group hover:border-white/30 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${s.color}`}>
                      <s.icon className="w-6 h-6" />
                    </div>
                    <div className="text-3xl font-bold mb-1">{s.score}%</div>
                    <div className="text-sm font-medium text-white/60 uppercase tracking-wider">{s.category}</div>
                  </motion.div>
                ))}
              </div>

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
                    {[
                      "Strong articulation of value and product fit.",
                      "Authentic rapport and focus on prospect needs.",
                      "Effective use of discovery questions and value selling."
                    ].map((strength, i) => (
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
                    {[
                      "Be more concise when articulating value.",
                      "Ask more discovery questions early on.",
                      "Structure your pitch and next steps more clearly."
                    ].map((area, i) => (
                      <li key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm group hover:bg-white/[0.07] transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                        <p className="text-white/70">{area}</p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t border-white/10">
                <Link href="/coach" className="btn-primary px-12 py-4 text-center">
                  Practice Again
                </Link>
                <button className="btn-secondary px-12 py-4 flex items-center justify-center gap-2 md:hidden">
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
