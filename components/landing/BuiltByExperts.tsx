'use client';

import { motion } from 'framer-motion';
import { agentConfig } from '@/lib/agentConfig';

export default function BuiltByExperts() {
  return (
    <section className="py-24 px-6 bg-sei-red5">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            {agentConfig.landing.builtByExperts.headline}
          </h2>
        </motion.div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left column - Real-World Insight */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-10 rounded-[32px] bg-sei-red4/20 border border-white/10"
          >
            <h3 className="text-2xl font-bold mb-6 text-white">Real-World Insight</h3>

            <p className="text-white/80 leading-relaxed mb-6">
              {agentConfig.landing.builtByExperts.description}
            </p>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-gradient-landing text-xl flex-shrink-0">✓</span>
                <span className="text-white/80">{agentConfig.landing.builtByExperts.credibility}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gradient-landing text-xl flex-shrink-0">✓</span>
                <span className="text-white/80">Informed by diverse hiring perspectives</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gradient-landing text-xl flex-shrink-0">✓</span>
                <span className="text-white/80">Updated with current best practices</span>
              </li>
            </ul>
          </motion.div>

          {/* Right column - Your Success */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="p-10 rounded-[32px] bg-sei-red4/20 border border-white/10"
          >
            <h3 className="text-2xl font-bold mb-6 text-white">Your Success</h3>

            <p className="text-white/80 leading-relaxed mb-6">
              We don't teach scripts or tricks. We help you tell your story authentically, answer thoughtfully, and present your best professional self regardless of the company or role.
            </p>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-gradient-landing text-xl flex-shrink-0">→</span>
                <span className="text-white/80">Practice without pressure</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gradient-landing text-xl flex-shrink-0">→</span>
                <span className="text-white/80">Honest, actionable feedback</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gradient-landing text-xl flex-shrink-0">→</span>
                <span className="text-white/80">Confidence that translates to performance</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
