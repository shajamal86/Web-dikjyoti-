import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registerStudent } from '../../services/authService';
import { isValidMobileNumber } from '../../services/studentDetailService';
import {
  BookOpen,
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Home,
  ShieldCheck,
} from 'lucide-react';

export const StudentSignupPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [fathersName, setFathersName] = useState('');
  const [village, setVillage] = useState('');
  const [postOffice, setPostOffice] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    // Client-side validation checks
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage('Please enter your full legal name (at least 2 characters).');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid active email address.');
      return;
    }
    const cleanMobile = mobile.trim();
    if (!cleanMobile) {
      setErrorMessage('Please enter your mobile phone number.');
      return;
    }
    if (!isValidMobileNumber(cleanMobile)) {
      setErrorMessage('Please enter a valid 10-digit mobile number (e.g. 6002200319).');
      return;
    }
    if (!fathersName.trim() || fathersName.trim().length < 2) {
      setErrorMessage("Please enter your father's full name (at least 2 characters).");
      return;
    }
    if (!village.trim()) {
      setErrorMessage('Please enter your Village name.');
      return;
    }
    if (!postOffice.trim()) {
      setErrorMessage('Please enter your Post Office (P.O.) name.');
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
      await registerStudent(name, email, password, confirmPassword, {
        mobile: cleanMobile,
        fathersName: fathersName.trim(),
        village: village.trim(),
        postOffice: postOffice.trim(),
      });
      // Navigate directly to student home
      navigate('/student/home', { replace: true });
    } catch (err: any) {
      console.error('Student registration error:', err);
      let msg = err.message || 'Failed to create student account.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'The password is too weak. Please use at least 6 characters with mixed letters and numbers.';
      }
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-lg">
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
              Create Student Account
            </h1>
            <p className="text-xs text-purple-200 mt-1">
              Enroll to access live test papers, review scores, and earn your merit rank
            </p>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="leading-relaxed font-medium">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="student-signup-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="student-signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="student-signup-mobile"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 6002200319"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#9B93A8] mt-1 font-medium">
                  10-digit mobile number for exam alerts and communication
                </p>
              </div>

              {/* Father's Name */}
              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Father's Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="student-signup-fathers-name"
                    type="text"
                    required
                    value={fathersName}
                    onChange={(e) => setFathersName(e.target.value)}
                    placeholder="e.g. Shri Ramesh Sharma"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Address: P.O. and Village as separate fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Village */}
                <div>
                  <label className="block text-xs font-bold text-[#241748] mb-1.5">
                    Village <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                      <Home className="w-4 h-4" />
                    </div>
                    <input
                      id="student-signup-village"
                      type="text"
                      required
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="e.g. Rampur"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Post Office (P.O.) */}
                <div>
                  <label className="block text-xs font-bold text-[#241748] mb-1.5">
                    P.O. (Post Office) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="student-signup-po"
                      type="text"
                      required
                      value={postOffice}
                      onChange={(e) => setPostOffice(e.target.value)}
                      placeholder="e.g. Rampur P.O."
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-[#241748] placeholder-[#B5AFBF] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Password <span className="text-[#9B93A8] font-normal">(min 6 characters) *</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="student-signup-password"
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

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-[#241748] mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B93A8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="student-signup-confirm-password"
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

              {/* Privacy protection notice */}
              <div className="p-3 bg-[#FAF6FF] border border-[#EDE1FA] rounded-xl flex items-start gap-2 text-[11px] text-[#5B2E9E] leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#5B2E9E] shrink-0 mt-0.5" />
                <span>
                  <strong>Data Privacy:</strong> Your mobile number, father's name, village, and P.O. are securely isolated. They are never published on the public leaderboards and are only visible to authorized Dikjyoti faculty.
                </span>
              </div>

              <div className="pt-2">
                <button
                  id="student-signup-submit-btn"
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#3E2072] hover:bg-[#341b60] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4 text-[#F5A8C6]" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-[#F0EDF7] text-center text-xs space-y-2">
              <p className="text-[#6B5E82]">
                Already registered as a student?{' '}
                <Link
                  to="/student/login"
                  className="font-bold text-[#5B2E9E] hover:text-[#3E2072] underline transition-colors"
                >
                  Sign In to Portal
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

