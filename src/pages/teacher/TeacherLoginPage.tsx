import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginTeacher } from '../../services/authService';
import {
  Award,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const TeacherLoginPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirection if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'teacher') {
        const from = (location.state as any)?.from?.pathname || '/teacher/home';
        navigate(from, { replace: true });
      } else {
        navigate('/student/home', { replace: true });
      }
    }
  }, [user, authLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      await loginTeacher(email, password);
      navigate('/teacher/home', { replace: true });
    } catch (err: any) {
      console.error('Teacher login error:', err);
      let message = err.message || 'Failed to sign in to Teacher Portal.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        message =
          'No matching teacher credentials found. Please verify your email or register via Teacher Sign Up.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Access temporarily limited due to multiple attempts. Please try again shortly.';
      }
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#1B2A4A]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-medium text-[#5A6B82]">Verifying faculty credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#1B2A4A]/15 rounded-xl shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#1B2A4A] px-6 py-7 text-white text-center relative border-b border-[#253963]">
            <div className="w-12 h-12 rounded-lg bg-[#24375F] border border-[#D4AF37]/50 mx-auto flex items-center justify-center text-[#D4AF37] mb-3 shadow-inner">
              <Award className="w-6 h-6" />
            </div>
            <h1 className="font-serif-heading text-2xl font-bold text-white tracking-wide">
              Teacher & Admin Portal
            </h1>
            <p className="text-xs text-[#A0AEC0] mt-1">
              Faculty login for exam authoring, candidate management & analytics
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1B2A4A] mb-1.5">
                  Official Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@dikjyoti.org"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#F8F7F4] border border-slate-300 rounded-lg text-[#1B2A4A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1B2A4A] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-[#F8F7F4] border border-slate-300 rounded-lg text-[#1B2A4A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#D4AF37] hover:bg-[#c4a12f] text-[#1B2A4A] text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-60"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-[#1B2A4A]/30 border-t-[#1B2A4A] rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Enter Teacher Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-3 text-xs text-center">
              <p className="text-[#5A6B82]">
                New teacher or need to register?{' '}
                <Link
                  to="/teacher/signup"
                  className="font-bold text-[#1B2A4A] hover:text-[#D4AF37] underline transition-colors"
                >
                  Faculty Sign-Up (Passcode)
                </Link>
              </p>

              <p className="text-slate-400">
                Are you a candidate or student?{' '}
                <Link
                  to="/student/login"
                  className="font-semibold text-[#5A6B82] hover:text-[#1B2A4A] transition-colors"
                >
                  Student Portal →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
