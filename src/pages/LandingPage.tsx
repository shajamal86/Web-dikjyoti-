import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  BookOpen,
  Award,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  Phone,
  MessageSquare,
  KeyRound,
  Users,
  ChevronRight,
  Sparkles,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import { MonetagBannerAd } from '../components/common/MonetagBannerAd';
import { useMonetagRouteTrigger } from '../hooks/useMonetagRouteTrigger';

export const LandingPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { adKey, transitionCount } = useMonetagRouteTrigger();

  // If already authenticated, direct the user strictly to their own portal
  // (Prevents cross-role access once logged in)
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'teacher') {
        navigate('/teacher/home', { replace: true });
      } else {
        navigate('/student/home', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const scrollToGateway = () => {
    const el = document.getElementById('auth-gateway');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FB]">
        <div className="w-10 h-10 border-3 border-[#EEF1F6] border-t-[#2F6FED] rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-semibold text-[#8A94A6]">Verifying Dikjyoti session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#1F2A44] flex flex-col justify-between">
      {/* ============ LANDING NAVBAR ============ */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#EEF1F6] px-4 sm:px-6 lg:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-[#2F6FED] flex items-center justify-center text-white shadow-xs">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 10 12 5 2 10l10 5 10-5Z" />
                <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base leading-tight text-[#1F2A44] tracking-tight">
                Dikjyoti
              </span>
              <span className="text-[10px] font-bold text-[#8A94A6] uppercase tracking-wider">
                Online Test Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/about"
              className="text-xs font-semibold text-[#5A6478] hover:text-[#1F2A44] px-3 py-1.5 rounded-lg transition-colors hidden sm:inline"
            >
              About Coaching
            </Link>

            <button
              type="button"
              onClick={scrollToGateway}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ============ HERO SECTION ============ */}
      <section className="px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-12 sm:pb-16 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F0FE] border border-[#C7D6FA] text-[#2F6FED] text-xs font-bold uppercase tracking-wider mb-6">
          <GraduationCap className="w-4 h-4" />
          <span>Assam Competitive Examination System</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1F2A44] tracking-tight leading-tight max-w-4xl mx-auto">
          Master Assam Govt Exams with Precision Mock Tests
        </h1>

        <p className="mt-4 text-sm sm:text-base text-[#5A6478] leading-relaxed max-w-2xl mx-auto">
          Take real timed examinations with bilingual questions in Assamese & English, anti-cheating proctoring, instant scorecards, and statewide merit rankings for ADRE, Assam Police, APSC, and SSC-GD.
        </p>

        {/* Hero Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={scrollToGateway}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-sm font-bold shadow-md transition-all"
          >
            <span>Start Preparation / Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="tel:6002200319"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white border border-[#EEF1F6] hover:bg-[#F5F7FB] text-[#1F2A44] text-sm font-bold shadow-2xs transition-all"
          >
            <Phone className="w-4 h-4 text-[#2F6FED]" />
            <span>Helpline: 6002200319</span>
          </a>
        </div>

        {/* Supported Examinations Badges */}
        <div className="mt-8 flex items-center justify-center flex-wrap gap-2 text-xs">
          <span className="text-[#8A94A6] font-semibold mr-1">Targeted Exams:</span>
          {['ADRE 2.0 (Grade III & IV)', 'Assam Police SI / Constable', 'APSC Prelims', 'SSC-GD 2026', 'TET / Forest Guard'].map((badge) => (
            <span
              key={badge}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#EEF1F6] text-[#1F2A44] font-semibold text-[11px] shadow-2xs"
            >
              {badge}
            </span>
          ))}
        </div>
      </section>

      {/* ============ AUTHENTICATION GATEWAY (ROLE SELECTION) ============ */}
      <section id="auth-gateway" className="px-4 sm:px-6 lg:px-8 py-10 max-w-5xl mx-auto w-full scroll-mt-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2A44] tracking-tight">
            Choose Your Portal to Get Started
          </h2>
          <p className="text-xs sm:text-sm text-[#8A94A6] mt-1.5 max-w-md mx-auto">
            Select your role below to enter Dikjyoti. Authentication gives you full access to your personalized portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* STUDENT GATEWAY CARD */}
          <div className="bg-white rounded-[16px] border-2 border-[#EEF1F6] hover:border-[#2F6FED] p-6 sm:p-7 shadow-xs flex flex-col justify-between transition-all duration-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#E8F0FE]/50 rounded-bl-full pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-[12px] bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6" />
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-extrabold text-[#1F2A44]">
                  Student Portal
                </h3>
                <span className="text-[11px] font-bold text-[#2F6FED] bg-[#E8F0FE] px-2.5 py-0.5 rounded-full">
                  Examinee
                </span>
              </div>

              <p className="text-xs text-[#5A6478] leading-relaxed mb-5">
                Take live timed mock tests, review full solutions with subject breakdowns, track your statewide merit ranking, and analyze mistakes.
              </p>

              <ul className="space-y-2.5 text-xs text-[#1F2A44] mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0E9347] shrink-0" />
                  <span>Timed exams with strict auto-submit timers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0E9347] shrink-0" />
                  <span>Instant verified answer key & solution reviews</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0E9347] shrink-0" />
                  <span>Real-time statewide merit leaderboard & rank</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-[#EEF1F6]">
              <Link
                to="/student/login"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-xs"
              >
                <span>Login as Student</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/student/signup"
                className="w-full flex items-center justify-center py-2.5 px-4 bg-[#F5F7FB] hover:bg-[#E8F0FE] text-[#2F6FED] border border-[#EEF1F6] text-xs font-bold rounded-xl transition-colors text-center"
              >
                New Student? Register Free
              </Link>
            </div>
          </div>

          {/* TEACHER / FACULTY GATEWAY CARD */}
          <div className="bg-white rounded-[16px] border-2 border-[#EEF1F6] hover:border-[#2F6FED] p-6 sm:p-7 shadow-xs flex flex-col justify-between transition-all duration-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#F4EEFE]/60 rounded-bl-full pointer-events-none" />

            <div>
              <div className="w-12 h-12 rounded-[12px] bg-[#F4EEFE] text-[#7C3AED] flex items-center justify-center mb-4">
                <Award className="w-6 h-6" />
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-extrabold text-[#1F2A44]">
                  Teacher Portal
                </h3>
                <span className="text-[11px] font-bold text-[#7C3AED] bg-[#F4EEFE] px-2.5 py-0.5 rounded-full">
                  Faculty / Admin
                </span>
              </div>

              <p className="text-xs text-[#5A6478] leading-relaxed mb-5">
                Author exam papers across 4 subjects, bulk upload questions via standard 16-column CSV, manage candidate admissions, and inspect analytics.
              </p>

              <ul className="space-y-2.5 text-xs text-[#1F2A44] mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0E9347] shrink-0" />
                  <span>Exam authoring wizard with draft autosave</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0E9347] shrink-0" />
                  <span>16-column CSV spreadsheet import & export</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0E9347] shrink-0" />
                  <span>Candidate roster management & score distribution</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-[#EEF1F6]">
              <Link
                to="/teacher/login"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1F2A44] hover:bg-[#141c2e] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-xs"
              >
                <Users className="w-4 h-4" />
                <span>Login as Teacher</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Link>

              <Link
                to="/teacher/signup"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#F5F7FB] hover:bg-[#EEF1F6] text-[#1F2A44] border border-[#EEF1F6] text-xs font-bold rounded-xl transition-colors text-center"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Faculty Sign-Up (Passcode Required)</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PLATFORM HIGHLIGHTS ============ */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs text-center">
            <div className="w-10 h-10 rounded-full bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1F2A44]">Anti-Cheat Monitoring</h4>
            <p className="text-xs text-[#8A94A6] mt-1">
              Multi-strike proctoring detects tab switching or app window blurring during active tests.
            </p>
          </div>

          <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs text-center">
            <div className="w-10 h-10 rounded-full bg-[#E8F8EE] text-[#0E9347] flex items-center justify-center mx-auto mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1F2A44]">Strict Timed Exams</h4>
            <p className="text-xs text-[#8A94A6] mt-1">
              Sectional timers and automated submission when time expires just like the actual exams.
            </p>
          </div>

          <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs text-center">
            <div className="w-10 h-10 rounded-full bg-[#F4EEFE] text-[#7C3AED] flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#1F2A44]">State Merit Leaderboards</h4>
            <p className="text-xs text-[#8A94A6] mt-1">
              Instant candidate standing comparison across thousands of applicants in Assam.
            </p>
          </div>
        </div>
      </section>

      {/* ============ COACHING INSTITUTE HELPLINE BANNER ============ */}
      <section className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full">
        <div className="bg-white rounded-[16px] border border-[#EEF1F6] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F6FED] bg-[#E8F0FE] px-2.5 py-0.5 rounded-full">
                Dikjyoti Coaching Institute
              </span>
              <span className="text-xs text-[#0E9347] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#0E9347] animate-pulse" />
                Bahmura, Assam
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1F2A44]">
              Physical Classroom Batches + Weekly Mobile Tests
            </h3>
            <p className="text-xs text-[#5A6478] mt-0.5">
              Comprehensive coaching for SSC-GD, Assam Police (SI/Constable), ADRE & Defense exams.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="tel:6002200319"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F7FB] border border-[#EEF1F6] text-xs font-bold text-[#1F2A44] hover:bg-[#EEF1F6] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#2F6FED]" />
              <span>Call: 6002200319</span>
            </a>

            <a
              href="https://whatsapp.com/channel/0029Vb7I1544o7qTcRE9g338"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0E9347] hover:bg-[#0b7437] text-white text-xs font-bold transition-colors shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Channel</span>
            </a>

            <Link
              to="/about"
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#E8F0FE] text-[#2F6FED] text-xs font-bold hover:bg-[#d5e4fc] transition-colors"
            >
              <span>Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic Ad Placement with Route Remount Trigger */}
      <MonetagBannerAd key={adKey} refreshTrigger={transitionCount} />

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-[#EEF1F6] bg-white py-6 px-4 sm:px-6 mt-8 text-center">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8A94A6]">
          <p>© {new Date().getFullYear()} Dikjyoti Online Test Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-[#1F2A44] transition-colors font-medium">
              About Coaching
            </Link>
            <a href="tel:6002200319" className="hover:text-[#1F2A44] transition-colors font-medium">
              Helpline: 6002200319
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
