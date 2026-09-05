import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registerTeacher, TEACHER_SECRET_PASSCODE } from '../../services/authService';
import {
  Award,
  User,
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

export const TeacherSignupPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secretPasscode, setSecretPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirection if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'teacher') {
        navigate('/teacher/home', { replace: true });
      } else {
        navigate('/student/home', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Strict validation of passcode before performing any actions
    if (secretPasscode.trim() !== TEACHER_SECRET_PASSCODE) {
      setErrorMessage(
        'Incorrect Secret Passcode. Teacher account registration is restricted to authorized faculty members only.'
      );
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Please enter your full faculty name.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid official email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await registerTeacher(name, email, password, confirmPassword, secretPasscode);
      navigate('/teacher/home', { replace: true });
    } catch (err: any) {
      console.error('Teacher sign-up error:', err);
      let msg = err.message || 'Failed to create teacher account.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please log in through the Teacher Login portal.';
      }
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#ECE7F5] rounded-2xl shadow-xs overflow-hidden">
          {/* Header Banner */}
          <div
            className="px-6 py-7 text-white text-center relative"
            style={{ background: 'linear-gradient(135deg, #3E2072, #5B2E9E)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-white/10 mx-auto flex items-center justify-center text-[#F5A8C6] mb-3 shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
              Teacher & Faculty Sign-Up
            </h1>
            <p className="text-xs text-[#F5A8C6] mt-1 font-medium">
              One-Time Faculty Registration • Passcode Protected
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {/* Notice about one-time passcode */}
            <div className="p-3 bg-[#FAF6FF] border border-[#EDE1FA] rounded-xl text-[#5B2E9E] text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-[#5B2E9E] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Teacher registration requires an administrative <strong>Secret Passcode</strong>. This
                code is only required once during sign-up; subsequent logins will use your email and
                password.
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="leading-relaxed font-medium">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Faculty Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Prof. / Dr. / Instructor Name"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Official Email Address
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
                    placeholder="faculty@dikjyoti.org"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Secret Passcode Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#241748] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#5B2E9E]" />
                    <span>Secret Passcode</span>
                  </label>
                  <span className="text-[10px] text-[#5B2E9E] font-bold bg-[#EDE1FA] px-2 py-0.5 rounded-full">
                    Required
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5B2E9E]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    required
                    value={secretPasscode}
                    onChange={(e) => setSecretPasscode(e.target.value)}
                    placeholder="Enter official teacher passcode"
                    className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border-2 border-[#F5A8C6] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9B93A8] hover:text-[#241748] focus:outline-none"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Account Password <span className="text-[#9B93A8] font-normal">(min 6 characters)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
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

              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#3E2072] hover:bg-[#341b60] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Register Teacher Account</span>
                      <ArrowRight className="w-4 h-4 text-[#F5A8C6]" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-[#F0EDF7] text-center text-xs space-y-2">
              <p className="text-[#6B5E82]">
                Already registered with your passcode?{' '}
                <Link
                  to="/teacher/login"
                  className="font-bold text-[#5B2E9E] hover:text-[#3E2072] underline transition-colors"
                >
                  Teacher Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
