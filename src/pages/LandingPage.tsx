import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdsterraAdBanner } from '../components/common/AdsterraAdBanner';
import {
  GraduationCap,
  BookOpen,
  Award,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Phone,
  KeyRound,
  Users,
  ChevronRight,
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-9 h-9 border-3 border-[#3E2072]/20 border-t-[#5B2E9E] rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-semibold text-[#6B5E82]">Checking active login session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] py-8 sm:py-12 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col justify-center">
      {/* Title & Institutional Masthead */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6FF] border border-[#ECE7F5] text-[#5B2E9E] text-xs font-bold uppercase tracking-wider mb-3">
          <GraduationCap className="w-4 h-4 text-[#F5A8C6]" />
          <span>Competitive Examination Portal</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#241748] tracking-tight leading-tight">
          Dikjyoti Online Test
        </h1>

        <p className="mt-3 text-xs sm:text-sm text-[#6B5E82] leading-relaxed max-w-xl mx-auto">
          Assam's trusted testing & ranking platform for competitive examinations. Choose your role below to log in or create an account.
        </p>
      </div>

      {/* Role Selection Gateways — Side-by-Side Student & Teacher Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto w-full">
        {/* Student Gateway Card */}
        <div className="bg-white border-2 border-[#ECE7F5] hover:border-[#5B2E9E] rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5A8C6]/15 rounded-bl-full pointer-events-none"></div>

          <div>
            <div className="w-12 h-12 rounded-xl bg-[#3E2072] text-[#F5A8C6] flex items-center justify-center mb-4 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#241748]">
                Student Portal
              </h2>
              <span className="text-[11px] font-bold text-[#5B2E9E] bg-[#FAF6FF] border border-[#EDE1FA] px-2.5 py-0.5 rounded-full">
                Examinee
              </span>
            </div>

            <p className="text-xs text-[#6B5E82] leading-relaxed mb-5">
              Take live timed examinations, review detailed solutions with subject breakdowns, and track your state merit ranking.
            </p>

            <ul className="space-y-2 text-xs text-[#241748] mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Timed exam countdown with automatic submission</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Instant scorecards and verified answer key reviews</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Real-time statewide leaderboard & performance analysis</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#F0EDF7]">
            <Link
              to="/student/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#3E2072] hover:bg-[#341b60] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-xs"
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

        {/* Teacher / Faculty Gateway Card */}
        <div className="bg-white border-2 border-[#ECE7F5] hover:border-[#5B2E9E] rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#5B2E9E]/10 rounded-bl-full pointer-events-none"></div>

          <div>
            <div className="w-12 h-12 rounded-xl bg-[#5B2E9E] text-[#F5A8C6] flex items-center justify-center mb-4 shadow-xs">
              <Award className="w-6 h-6" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#241748]">
                Teacher Portal
              </h2>
              <span className="text-[11px] font-bold text-[#3E2072] bg-[#F5A8C6]/40 border border-[#F5A8C6]/60 px-2.5 py-0.5 rounded-full">
                Faculty / Admin
              </span>
            </div>

            <p className="text-xs text-[#6B5E82] leading-relaxed mb-5">
              Author question papers, configure timers, publish mock tests, manage candidate registrations, and analyze exam results.
            </p>

            <ul className="space-y-2 text-xs text-[#241748] mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Create & manage 4-subject exam papers (MCQs)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Candidate directory with parent phone numbers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2C9A5B] shrink-0" />
                <span>Exam score analytics, rankings & Excel/CSV export</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#F0EDF7]">
            <Link
              to="/teacher/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#5B2E9E] hover:bg-[#4d2586] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-xs"
            >
              <Users className="w-4 h-4 text-[#F5A8C6]" />
              <span>Sign In as Teacher</span>
              <ArrowRight className="w-4 h-4 text-[#F5A8C6] ml-auto" />
            </Link>

            <Link
              to="/teacher/signup"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#FAF6FF] hover:bg-[#EDE1FA] text-[#5B2E9E] border border-[#ECE7F5] text-xs font-bold rounded-xl transition-colors text-center"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#5B2E9E]" />
              <span>Faculty Sign-Up (Passcode Protected)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Coaching Institute & Helpline Banner */}
      <div className="mt-8 max-w-4xl mx-auto w-full bg-gradient-to-r from-[#FAF6FF] to-white border border-[#ECE7F5] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B2E9E] bg-[#EDE1FA] px-2.5 py-0.5 rounded-full">
              Dikjyoti Coaching Institute
            </span>
            <span className="text-xs text-[#2C9A5B] font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#2C9A5B] animate-pulse"></span>
              Admissions Open
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-[#241748]">
            Physical Classroom Coaching + Weekly Mobile Tests
          </h3>
          <p className="text-xs text-[#6B5E82]">
            Courses: SSC-GD, Assam Police (AB/UB, SI), Agniveer, ADRE, Forest Guard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href="tel:6002200319"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#ECE7F5] text-xs font-bold text-[#241748] hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Phone className="w-3.5 h-3.5 text-[#5B2E9E]" />
            <span>Call: 6002200319</span>
          </a>

          <a
            href="https://whatsapp.com/channel/0029Vb7I1544o7qTcRE9g338"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2C9A5B] hover:bg-[#25824c] text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Channel</span>
          </a>

          <Link
            to="/about"
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#EDE1FA] hover:bg-[#d8c5f0] text-[#5B2E9E] text-xs font-bold transition-colors"
          >
            <span>Details & Location</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Adsterra 300x250 Ad Banner */}
      <div className="mt-8 flex justify-center">
        <AdsterraAdBanner />
      </div>

      {/* Trust & Verification Badges */}
      <div className="mt-8 pt-6 border-t border-[#ECE7F5] grid grid-cols-1 sm:grid-cols-3 gap-3 text-center max-w-4xl mx-auto w-full">
        <div className="p-2">
          <ShieldCheck className="w-5 h-5 text-[#5B2E9E] mx-auto mb-1" />
          <h4 className="text-xs font-bold text-[#241748]">Anti-Cheating Protection</h4>
          <p className="text-[11px] text-[#9B93A8] mt-0.5">Tab switch & screen capture monitoring</p>
        </div>
        <div className="p-2">
          <Clock className="w-5 h-5 text-[#5B2E9E] mx-auto mb-1" />
          <h4 className="text-xs font-bold text-[#241748]">Strict Section Timers</h4>
          <p className="text-[11px] text-[#9B93A8] mt-0.5">Automated submission upon expiration</p>
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
