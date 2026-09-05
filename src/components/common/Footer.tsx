import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#3E2072] text-[#C9B8EE] border-t border-[#5B2E9E] mt-auto py-5 px-4 sm:px-6 lg:px-8 mb-16 md:mb-0">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        {/* Brand Name & Tagline */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#5B2E9E] border border-[#F5A8C6]/30 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="19" stroke="#F5A8C6" strokeWidth="2.2" />
              <path d="M20 9 L20 31 M11 20 L29 20" stroke="#F5A8C6" strokeWidth="2.4" />
              <circle cx="20" cy="20" r="5" fill="#F5A8C6" />
            </svg>
          </div>
          <div>
            <span className="font-brand-display font-bold text-white tracking-wider text-sm">
              DIKJYOTI
            </span>
            <span className="text-[#C9B8EE] ml-1.5 hidden sm:inline text-xs">
              Digital Examination Platform
            </span>
          </div>
        </div>

        {/* Essential Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-slate-200">
          <Link
            to="/about"
            className="inline-flex items-center gap-1.5 hover:text-[#F5A8C6] transition-colors font-medium text-xs"
          >
            <Info className="w-3.5 h-3.5 text-[#F5A8C6]" />
            <span>About Us / Contact</span>
          </Link>
          <a
            href="tel:6002200319"
            className="inline-flex items-center gap-1.5 hover:text-[#F5A8C6] transition-colors text-xs"
          >
            <Phone className="w-3.5 h-3.5 text-[#F5A8C6]" />
            <span>6002200319</span>
          </a>
        </div>

        {/* Copyright */}
        <div className="text-[#9B93A8] text-[11px] text-center sm:text-right">
          <p>© {new Date().getFullYear()} Dikjyoti Coaching Institute. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

