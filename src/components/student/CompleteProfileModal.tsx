import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  saveStudentPrivateDetails,
  isValidMobileNumber,
  getStudentPrivateDetails,
} from '../../services/studentDetailService';
import {
  Phone,
  User,
  Home,
  Mail,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Lock,
} from 'lucide-react';

export const CompleteProfileModal: React.FC = () => {
  const { user, refreshProfile } = useAuth();

  const [mobile, setMobile] = useState('');
  const [fathersName, setFathersName] = useState('');
  const [village, setVillage] = useState('');
  const [postOffice, setPostOffice] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && user?.uid) {
      return localStorage.getItem(`dikjyoti_profile_completed_${user.uid}`) === 'true';
    }
    return false;
  });

  // Verify in Firestore if details were previously submitted on another session/device
  useEffect(() => {
    if (!user || user.role !== 'student' || user.profileCompleted || alreadyCompleted) {
      return;
    }

    let isMounted = true;
    getStudentPrivateDetails(user.uid)
      .then((existing) => {
        if (isMounted && existing && existing.mobile) {
          setAlreadyCompleted(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem(`dikjyoti_profile_completed_${user.uid}`, 'true');
          }
          refreshProfile().catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.profileCompleted, alreadyCompleted, refreshProfile]);

  // Only render for signed-in students who have not completed their profile
  if (!user || user.role !== 'student' || user.profileCompleted || alreadyCompleted) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMobile = mobile.trim();
    const cleanFathersName = fathersName.trim();
    const cleanVillage = village.trim();
    const cleanPostOffice = postOffice.trim();

    if (!cleanMobile) {
      setError('Please enter your active mobile phone number.');
      return;
    }
    if (!isValidMobileNumber(cleanMobile)) {
      setError('Please enter a valid 10-digit mobile number (e.g. 6002200319).');
      return;
    }
    if (!cleanFathersName || cleanFathersName.length < 2) {
      setError("Please enter your father's full name (at least 2 characters).");
      return;
    }
    if (!cleanVillage) {
      setError('Please enter your Village name.');
      return;
    }
    if (!cleanPostOffice) {
      setError('Please enter your Post Office (P.O.) name.');
      return;
    }

    setLoading(true);
    try {
      await saveStudentPrivateDetails(user.uid, {
        mobile: cleanMobile,
        fathersName: cleanFathersName,
        village: cleanVillage,
        postOffice: cleanPostOffice,
      });

      setAlreadyCompleted(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`dikjyoti_profile_completed_${user.uid}`, 'true');
      }

      // Synchronize auth state so profileCompleted becomes true
      await refreshProfile();
    } catch (err: any) {
      setError(err?.message || 'Failed to save your details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="complete-profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#241748]/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in"
    >
      <div
        id="complete-profile-modal-card"
        className="w-full max-w-lg bg-white rounded-2xl border border-[#ECE7F5] shadow-2xl overflow-hidden my-8"
      >
        {/* Header with Android Purple Gradient */}
        <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #3E2072, #5B2E9E)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#F5A8C6]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">
                Complete Your Profile
              </h2>
              <p className="text-xs text-purple-200 mt-0.5">
                Required one-time setup for online test registration
              </p>
            </div>
          </div>
          <div className="mt-4 bg-white/10 rounded-xl p-3 border border-white/15 text-xs text-purple-100 leading-relaxed">
            Welcome, <span className="font-bold text-[#F5A8C6]">{user.displayName}</span>! To ensure authentic participation in the Dikjyoti Online Test series, please provide your contact and residential address once.
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#241748] mb-1.5">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9B93A8]">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="complete-profile-mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 6002200319"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#ECE7F5] rounded-xl text-sm text-[#241748] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                disabled={loading}
                required
              />
            </div>
            <p className="text-[11px] text-[#9B93A8] mt-1">
              Must be a 10-digit number for test updates and result alerts.
            </p>
          </div>

          {/* Father's Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#241748] mb-1.5">
              Father's Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9B93A8]">
                <User className="w-4 h-4" />
              </div>
              <input
                id="complete-profile-fathers-name"
                type="text"
                value={fathersName}
                onChange={(e) => setFathersName(e.target.value)}
                placeholder="Full name of your father"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#ECE7F5] rounded-xl text-sm text-[#241748] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Address (Village & P.O. as separate fields) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Village */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#241748] mb-1.5">
                Village <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9B93A8]">
                  <Home className="w-4 h-4" />
                </div>
                <input
                  id="complete-profile-village"
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Bilasipara"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#ECE7F5] rounded-xl text-sm text-[#241748] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Post Office (P.O.) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#241748] mb-1.5">
                P.O. (Post Office) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9B93A8]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="complete-profile-po"
                  type="text"
                  value={postOffice}
                  onChange={(e) => setPostOffice(e.target.value)}
                  placeholder="e.g. Bilasipara P.O."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#ECE7F5] rounded-xl text-sm text-[#241748] focus:outline-none focus:ring-2 focus:ring-[#5B2E9E] focus:border-transparent transition-all"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 bg-[#FAF6FF] border border-[#EDE1FA] rounded-xl flex items-start gap-2.5 text-[11px] text-[#5B2E9E] leading-relaxed">
            <Lock className="w-4 h-4 text-[#5B2E9E] shrink-0 mt-0.5" />
            <span>
              <strong>Privacy Guaranteed:</strong> Your details are stored securely in protected records. Only verified Dikjyoti instructors can view them.
            </span>
          </div>

          {/* Submit Action */}
          <button
            id="complete-profile-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-[#5B2E9E] hover:bg-[#4d2487] text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving Registration...
              </span>
            ) : (
              <>
                <span>Save & Continue to Portal</span>
                <ArrowRight className="w-4 h-4 text-[#F5A8C6]" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
