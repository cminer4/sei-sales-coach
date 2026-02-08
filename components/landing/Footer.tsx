import Link from 'next/link';
import { agentConfig } from '@/lib/agentConfig';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-12 md:gap-32 mb-12">
          {/* SEI Logo / Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4">{agentConfig.landing.footer.brandName}</h3>
            <p className="text-white/60 text-sm">
              215 Park Avenue South, 11th Floor<br />
              New York, NY 10003
            </p>
            <p className="text-white/60 text-sm mt-2">(646) 493-9756</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-white/70 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white/70 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/70 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/70 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 pt-8 text-center text-white/60 text-sm">
          © 2026 Systems Evolution, Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
