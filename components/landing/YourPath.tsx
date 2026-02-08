'use client';

import { motion } from 'framer-motion';
import { ClipboardList, Lightbulb, Mic, Star, RefreshCw } from 'lucide-react';
import { agentConfig } from '@/lib/agentConfig';

const stepIcons = [ClipboardList, Lightbulb, Mic, RefreshCw, Star];
const steps = agentConfig.landing.yourPath.steps.map((s, i) => ({
  number: i + 1,
  title: s.title,
  description: s.description,
  icon: stepIcons[i] ?? Star,
}));

export default function YourPath() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-black/20">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {agentConfig.landing.yourPath.sectionTitle ?? 'Your Path'}
          </h2>
        </motion.div>

        {/* Steps timeline - desktop */}
        <div className="hidden lg:block relative">
          {/* Progress line */}
          <div className="absolute top-12 left-0 right-0 h-1 bg-gradient-primary opacity-30" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 relative">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="relative"
              >
                {/* Number badge */}
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-primary flex items-center justify-center text-3xl font-bold relative z-10">
                  <step.icon className="w-10 h-10 text-white" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-plum-dark text-sm flex items-center justify-center shadow-lg">
                    {step.number}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-3 text-center">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-white/70 text-sm leading-relaxed text-center">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Steps timeline - mobile & tablet */}
        <div className="lg:hidden space-y-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex gap-6"
            >
              {/* Number/Icon badge */}
              <div className="w-16 h-16 flex-shrink-0 rounded-full bg-gradient-primary flex items-center justify-center relative">
                <step.icon className="w-8 h-8 text-white" />
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-plum-dark text-xs flex items-center justify-center font-bold">
                  {step.number}
                </div>
              </div>

              <div>
                {/* Title */}
                <h3 className="text-lg font-bold mb-2">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-white/70 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
