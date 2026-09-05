import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  BookOpen,
  Building,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Automatic login: if session already exists, skip role selection and route to dashboard
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'teacher') {
        navigate('/teacher/home', { replace: true });
      } else {
        navigate('/student/home', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-9 h-9 border-3 border-[#3E2072]/20 border-t-[#F5A8C6] rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-semibold text-[#9B93A8]">Checking active session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] py-8 sm:py-12 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col justify-center">
      {/* Title & Institutional Masthead */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6FF] border border-[#ECE7F5] text-[#5B2E9E] text-xs font-bold uppercase tracking-wider mb-3">
          <GraduationCap className="w-4 h-4 text-[#F5A8C6]" />
          <span>Competitive Examination Portal</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#241748] tracking-tight leading-tight">
          Dikjyoti Online Test
        </h1>

        <p className="mt-3 text-sm sm:text-base text-[#6B5E82] leading-relaxed">
          Assam's trusted online testing & live ranking platform for competitive government examinations. Take timed tests, compare state ranks, and access institute updates.
        </p>
      </div>

      {/* Role Selection Gateways */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto w-full">
        {/* Student Gateway Card */}
        <div className="bg-white border border-[#ECE7F5] hover:border-[#5B2E9E]/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5A8C6]/10 rounded-bl-full pointer-events-none"></div>

          <div>
            <div className="w-12 h-12 rounded-xl bg-[#3E2072] text-[#F5A8C6] flex items-center justify-center mb-4 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-extrabold text-[#241748]">
                Student Portal
              </h2>
              <span className="text-[11px] font-bold text-[#5B2E9E] bg-[#FAF6FF] border border-[#EDE1FA] px-2.5 py-0.5 rounded-full">
                Examinee
              </span>
            </div>

            <p className="text-xs text-[#6B5E82] leading-relaxed mb-5">
              Take live weekly examinations, review verified answer keys with explanations, and check your rank on the statewide leaderboard.
            </p>

            <ul className="space-y-2 text-xs text-[#241748] mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Timed exam countdown with automatic submission</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Instant scorecards and detailed solutions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Real-time leaderboard & subject performance</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#F0EDF7]">
            <Link
              to="/student/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#3E2072] hover:bg-[#341b60] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <span>Sign In as Student</span>
              <ArrowRight className="w-4 h-4 text-[#F5A8C6]" />
            </Link>

            <Link
              to="/student/signup"
              className="w-full flex items-center justify-center py-2.5 px-4 bg-[#FAF6FF] hover:bg-[#EDE1FA] text-[#5B2E9E] border border-[#ECE7F5] text-xs font-bold rounded-xl transition-colors text-center"
            >
              New Student? Create Account
            </Link>
          </div>
        </div>

        {/* About Academy & Coaching Details Card */}
        <div className="bg-white border border-[#ECE7F5] hover:border-[#5B2E9E]/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#5B2E9E]/5 rounded-bl-full pointer-events-none"></div>

          <div>
            <div className="w-12 h-12 rounded-xl bg-[#5B2E9E] text-[#F5A8C6] flex items-center justify-center mb-4 shadow-xs">
              <Building className="w-6 h-6" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-extrabold text-[#241748]">
                Coaching & Courses
              </h2>
              <span className="text-[11px] font-bold text-[#3E2072] bg-[#F5A8C6]/30 border border-[#F5A8C6]/50 px-2.5 py-0.5 rounded-full">
                Institute
              </span>
            </div>

            <p className="text-xs text-[#6B5E82] leading-relaxed mb-5">
              Explore courses offered by Dikjyoti Coaching Institute (SSC-GD, Assam Police, Agniveer, ADRE, Forest Guard) and connect with faculty.
            </p>

            <ul className="space-y-2 text-xs text-[#241748] mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Daily morning physical classes & weekly online tests</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Official WhatsApp channel for daily exam updates</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Follow teacher & institute Instagram handles</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#F0EDF7]">
            <Link
              to="/about"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#F5A8C6] hover:bg-[#efa1bf] text-[#3E2072] text-xs font-extrabold rounded-xl transition-colors shadow-xs"
            >
              <span>About Us / Contact Helpline</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="https://whatsapp.com/channel/0029Vb7I1544o7qTcRE9g338"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FAF6FF] hover:bg-[#EDE1FA] text-[#2C9A5B] border border-[#ECE7F5] text-xs font-bold rounded-xl transition-colors text-center"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#2C9A5B]" />
              <span>Official WhatsApp Channel</span>
            </a>
          </div>
        </div>
      </div>

      {/* Trust & Verification Badges */}
      <div className="mt-10 pt-6 border-t border-[#ECE7F5] grid grid-cols-1 sm:grid-cols-3 gap-3 text-center max-w-3xl mx-auto w-full">
        <div className="p-2">
          <ShieldCheck className="w-5 h-5 text-[#5B2E9E] mx-auto mb-1" />
          <h4 className="text-xs font-bold text-[#241748]">Verified Evaluation</h4>
          <p className="text-[11px] text-[#9B93A8] mt-0.5">Secure automated score grading</p>
        </div>
        <div className="p-2">
          <Clock className="w-5 h-5 text-[#5B2E9E] mx-auto mb-1" />
          <h4 className="text-xs font-bold text-[#241748]">Timed Examinations</h4>
          <p className="text-[11px] text-[#9B93A8] mt-0.5">Strict timer with offline recovery</p>
        </div>
        <div className="p-2">
          <GraduationCap className="w-5 h-5 text-[#5B2E9E] mx-auto mb-1" />
          <h4 className="text-xs font-bold text-[#241748]">State Merit Leaderboard</h4>
          <p className="text-[11px] text-[#9B93A8] mt-0.5">Real-time ranks and peer comparison</p>
        </div>
      </div>
    </div>
  );
};
