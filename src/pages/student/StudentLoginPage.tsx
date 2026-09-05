import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginStudent, loginWithGoogle, loginWithGoogleDemo, UnauthorizedDomainError } from '../../services/authService';
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  BookOpen,
  Copy,
  Check,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const StudentLoginPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Redirection if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'teacher') {
        navigate('/teacher/home', { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname || '/student/home';
        navigate(from, { replace: true });
      }
    }
  }, [user, authLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUnauthorizedDomain(null);
    setSubmitting(true);

    try {
      const profile = await loginStudent(email, password);
      if (profile.role === 'teacher') {
        navigate('/teacher/home', { replace: true });
      } else {
        navigate('/student/home', { replace: true });
      }
    } catch (err: any) {
      console.error('Student login error:', err);
      let message = err.message || 'Failed to sign in. Please verify your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        message = 'Invalid email address or password. Please check your details or sign up.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Access temporarily disabled due to many failed attempts. Please try again in a few moments.';
      }
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setUnauthorizedDomain(null);
    setGoogleSubmitting(true);

    try {
      const profile = await loginWithGoogle();
      if (profile.role === 'teacher') {
        navigate('/teacher/home', { replace: true });
      } else {
        navigate('/student/home', { replace: true });
      }
    } catch (err: any) {
      if (err instanceof UnauthorizedDomainError || err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        const host = window.location.hostname;
        setUnauthorizedDomain(host);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Google sign-in popup was closed before completing.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else {
        console.error('Google Sign-in error:', err);
        setErrorMessage(err.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleGoogleDemoSignIn = async () => {
    setErrorMessage(null);
    setDemoSubmitting(true);

    try {
      const profile = await loginWithGoogleDemo();
      if (profile.role === 'teacher') {
        navigate('/teacher/home', { replace: true });
      } else {
        navigate('/student/home', { replace: true });
      }
    } catch (err: any) {
      console.error('Google preview sign-in error:', err);
      setErrorMessage(err.message || 'Failed to connect preview account.');
    } finally {
      setDemoSubmitting(false);
    }
  };

  const handleCopyDomain = () => {
    if (unauthorizedDomain) {
      navigator.clipboard.writeText(unauthorizedDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#3E2072]/20 border-t-[#F5A8C6] rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-medium text-[#9B93A8]">Verifying active credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white border border-[#ECE7F5] rounded-2xl shadow-xs overflow-hidden">
          {/* Header Banner */}
          <div
            className="px-6 py-7 text-white text-center relative"
            style={{ background: 'linear-gradient(135deg, #3E2072, #5B2E9E)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-white/10 mx-auto flex items-center justify-center text-[#F5A8C6] mb-3 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
              Student Login
            </h1>
            <p className="text-xs text-purple-200 mt-1">
              Sign in to take timed tests, view rankings and track progress
            </p>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Domain Authorization Guidance Box */}
            {unauthorizedDomain && (
              <div
                id="unauthorized-domain-banner"
                className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-[#241748] text-xs space-y-3 shadow-xs"
              >
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <h2 className="font-bold text-amber-900 text-sm">
                      Firebase Domain Authorization Required
                    </h2>
                    <p className="text-amber-800 leading-relaxed text-xs">
                      Firebase Auth restricts Google popup sign-in until this environment's domain is added to your project's authorized domains list.
                    </p>
                  </div>
                </div>

                {/* Domain Pill & Copy */}
                <div className="bg-white border border-amber-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div className="font-mono text-[11px] text-slate-800 break-all select-all font-medium">
                    {unauthorizedDomain}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDomain}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-[11px] transition-colors shrink-0"
                    title="Copy domain to clipboard"
                  >
                    {copiedDomain ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Instant Action in Preview */}
                <div className="pt-2 border-t border-amber-200/80 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleGoogleDemoSignIn}
                    disabled={demoSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-[#5B2E9E] hover:bg-[#4d2487] text-white rounded-xl font-bold text-xs transition-colors shadow-xs"
                  >
                    {demoSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[#F5A8C6]" />
                    )}
                    <span>Sign In with Instant Demo Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="leading-relaxed font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleSubmitting || submitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-[#FAF6FF] text-[#241748] border border-[#ECE7F5] rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-xs disabled:opacity-60"
            >
              {googleSubmitting ? (
                <div className="w-4 h-4 border-2 border-[#3E2072]/20 border-t-[#3E2072] rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.02h3.87c2.26-2.09 3.67-5.17 3.67-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.02c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.12C3.33 21.43 7.39 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l3.99-3.12z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.33 2.57 1.28 6.61l3.99 3.12c.95-2.85 3.6-4.98 6.73-4.98z"
                  />
                </svg>
              )}
              <span>{googleSubmitting ? 'Connecting with Google...' : 'Sign in with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#F0EDF7] w-full"></div>
              <span className="bg-white px-3 text-[10px] text-[#9B93A8] uppercase tracking-wider font-bold shrink-0">
                or sign in with email
              </span>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9B93A8] hover:text-[#241748] focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || googleSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#3E2072] hover:bg-[#341b60] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-xs disabled:opacity-60"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Enter Student Portal</span>
                    <ArrowRight className="w-4 h-4 text-[#F5A8C6]" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Navigation */}
            <div className="pt-4 border-t border-[#F0EDF7] flex flex-col items-center gap-2.5 text-xs text-center">
              <p className="text-[#6B5E82]">
                Don't have an account yet?{' '}
                <Link
                  to="/student/signup"
                  className="font-bold text-[#5B2E9E] hover:text-[#3E2072] underline transition-colors"
                >
                  Create Student Account
                </Link>
              </p>

              <p className="text-[#9B93A8] text-[11px]">
                Need help or coaching details?{' '}
                <Link
                  to="/about"
                  className="font-semibold text-[#5B2E9E] hover:text-[#3E2072] underline transition-colors"
                >
                  About Dikjyoti & Helpline
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
