'use client';

import { motion } from 'framer-motion';
import { Users, Lightbulb, Target } from 'lucide-react';
import { agentConfig } from '@/lib/agentConfig';

const featureIcons = [Users, Lightbulb, Target];

export default function WhatYoullMaster() {
  const features = agentConfig.landing.whatYoullMaster.features.map((f, i) => ({
    ...f,
    icon: featureIcons[i] ?? Users,
  }));

  return (
    <section className="pt-32 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {agentConfig.landing.whatYoullMaster.sectionTitle}
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            {agentConfig.landing.whatYoullMaster.subtitle}
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass-card p-8 hover:-translate-y-1 transition-transform duration-300"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>

              {/* Description */}
              <p className="text-white/70 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
