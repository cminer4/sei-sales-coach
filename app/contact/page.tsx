'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, MapPin, Globe } from 'lucide-react';

export default function ContactPage() {
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
          <h1 className="text-4xl font-bold mb-8">Contact Us</h1>
          
          <div className="space-y-12 text-white/80 leading-relaxed text-lg">
            <p>
              Have questions about the SEI Sales Agent Platform? We'd love to hear from you.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Headquarters</h3>
                    <p className="text-white/60">Systems Evolution, Inc.<br />215 Park Avenue South, 11th Floor<br />New York, NY 10003<br />(646) 493-9756</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Website</h3>
                    <a href="https://sei.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gradient-red transition-colors">
                      sei.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="text-xl font-bold mb-6 text-white text-center">Ready to Get Started?</h3>
                <p className="text-sm text-white/60 mb-8 text-center">
                  If you're looking to try the platform right now, head back to our setup page.
                </p>
                <Link href="/setup" className="btn-primary w-full block text-center">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
