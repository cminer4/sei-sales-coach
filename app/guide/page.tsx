'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Briefcase, ArrowRight } from 'lucide-react';

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-textured-gradient px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <header className="mb-16">
          <Link href="/" className="text-2xl font-bold tracking-tighter">
            SEI <span className="text-white/60">Internal Tools</span>
          </Link>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Internal Tools
            </h1>
            <p className="text-xl text-white/60 max-w-2xl">
              AI-powered tools for SEI consultants. Practice, prepare, and perform.
            </p>
          </div>

          <div className="grid gap-6 mt-12">
            <Link href="/guide/assessment-builder">
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="glass-card p-8 cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-white/10">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold">AI Assessment Builder</h2>
                      <p className="text-white/60 max-w-md">
                        Turn Discovery findings into structured, client-ready deliverables.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
                </div>
              </motion.div>
            </Link>
            <Link href="/guide/assessment">
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="glass-card p-8 cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-white/10">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold">AI Assessment Coach</h2>
                      <p className="text-white/60 max-w-md">
                        Practice AI/ML maturity assessments with a realistic buyer simulation.
                      </p>
                      <span className="inline-block text-sm text-white/40 bg-white/5 px-3 py-1 rounded-full">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
                </div>
              </motion.div>
            </Link>
          </div>

          <div className="pt-8 border-t border-white/10">
            <Link 
              href="/coach/spin" 
              className="text-white/60 hover:text-white transition-colors text-sm"
            >
              ← Back to SPIN Sales Coach
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
