'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mic } from 'lucide-react';
import { agentConfig } from '@/lib/agentConfig';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background gradient glow */}
      <div className="absolute inset-0 bg-gradient-radial from-gradient-red/20 via-gradient-purple/20 to-transparent opacity-50 pointer-events-none" />

      {/* Main Content - Takes up remaining space and centers its content */}
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 pt-24 pb-24">
        <div className="max-w-5xl mx-auto text-center">
          {/* Small badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <span className="text-gradient-red text-base font-semibold tracking-wider uppercase">
              {agentConfig.landing.hero.badge}
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-white"
          >
            {agentConfig.landing.hero.headline}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            {agentConfig.landing.hero.subheadline}
          </motion.p>

          {/* CTAs – same width, side by side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-row gap-4 justify-center items-center"
          >
            <Link
              href="/setup"
              className="flex-1 max-w-[240px] text-center btn-primary"
            >
              {agentConfig.landing.hero.primaryCta ?? 'Get Started'}
            </Link>
            {agentConfig.landing.hero.secondaryCta && (
              <a
                href={agentConfig.landing.hero.secondaryCtaHref ?? '#'}
                className="flex-1 max-w-[240px] text-center px-8 py-4 rounded-xl border border-white/40 text-white font-semibold hover:border-white/80 transition-colors bg-transparent"
              >
                {agentConfig.landing.hero.secondaryCta}
              </a>
            )}
          </motion.div>

          {/* Chat preview mockup – decorative */}
          <div className="max-w-2xl mx-auto mt-8 mb-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="text-left">
                <div className="flex items-center gap-1 mb-1">
                  <Mic className="w-3 h-3 text-white/40" />
                  <p className="text-xs text-white/40">AI Coach</p>
                </div>
                <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm text-white/80 text-left">
                  Tell me about your prospect's main challenge.
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/15 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%] ml-auto text-sm text-white/90">
                  They're struggling with long sales cycles and getting executive buy-in...
                </div>
              </div>
              <div className="text-left">
                <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm text-white/80 text-left">
                  How does your solution specifically address the executive buy-in challenge?
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <div className="flex gap-1 items-center">
                  {[3, 5, 8, 6, 4, 7, 3].map((h, index) => (
                    <div
                      key={index}
                      className="w-1 rounded-full bg-white/30"
                      style={{ height: `${h * 0.25}rem`, animation: 'waveform 1.2s ease-in-out infinite', animationDelay: `${index * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-white/40 italic">Listening...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative z-10 bg-black/30 backdrop-blur-sm border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="mb-8">
            <span className="text-white/60 text-base font-semibold tracking-widest uppercase">
              Built on Real Experience
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {agentConfig.landing.hero.stats.map((stat, i) => (
              <div key={stat.label} className={i === 1 ? 'md:border-l md:border-r border-white/10 px-4' : ''}>
                <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">
                  {stat.value}
                </div>
                <div className="text-white/60 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
