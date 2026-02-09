'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, ExternalLink } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-textured-gradient px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center text-white/60 hover:text-white mb-12 transition-colors group">
          <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12"
        >
          <h1 className="text-4xl font-bold mb-8">About</h1>
          
          <div className="space-y-8 text-white/80 leading-relaxed text-lg">
            <p className="text-white font-medium text-xl">
              SEI designs and delivers innovative AI solutions that help clients build better businesses.
            </p>
            
            <p>
              For over three decades, SEI has combined deep industry expertise with cutting-edge technology to create tools and platforms that drive real outcomes. We focus on understanding what makes organizations succeed and embedding that knowledge into intelligent solutions our clients can use every day.
            </p>

            <p>
              Our approach is simple: we start with your data, your methodology, and your goals, then build AI that works the way your team already does, only faster and at scale.
            </p>

            <p>
              If you'd like to learn more about how we work and what we do, visit{' '}
              <a 
                href="https://www.sei.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white hover:text-gradient-red transition-colors inline-flex items-center gap-1 font-semibold"
              >
                sei.com <ExternalLink className="w-4 h-4" />
              </a>.
            </p>

            <div className="pt-8 text-center sm:text-left">
              <Link href="/contact" className="btn-primary inline-block">
                Contact Us
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
