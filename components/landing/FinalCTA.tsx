'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { agentConfig } from '@/lib/agentConfig';

export default function FinalCTA() {
  return (
    <section className="py-24 px-6 bg-sei-red4/20">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
          {agentConfig.landing.finalCta.headline ?? 'Ready to Get Started?'}
        </h2>

        <p className="text-white/70 text-xl mb-10 max-w-2xl mx-auto">
          {agentConfig.landing.finalCta.subtitle}
        </p>

        <div className="flex flex-row gap-4 justify-center items-center flex-wrap">
          <Link
            href="/setup"
            className="flex-1 max-w-[240px] text-center bg-gradient-landing text-white px-8 py-4 rounded-xl font-semibold shadow-glow-landing hover:opacity-95 transition-opacity"
          >
            {agentConfig.landing.finalCta.primaryCta ?? 'Get Started'}
          </Link>
          {agentConfig.landing.finalCta.secondaryCta && agentConfig.landing.finalCta.secondaryCtaHref && (
            <a
              href={agentConfig.landing.finalCta.secondaryCtaHref}
              className="flex-1 max-w-[240px] text-center px-8 py-4 rounded-xl border border-white/40 text-white font-semibold hover:border-white/80 transition-colors bg-transparent"
            >
              {agentConfig.landing.finalCta.secondaryCta}
            </a>
          )}
        </div>
      </motion.div>
    </section>
  );
}
