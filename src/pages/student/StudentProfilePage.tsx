import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { fetchStudentAnalytics } from '../../services/analyticsService';
import { StudentAnalyticsData, MEDIUM_LABELS } from '../../types';
import {
  LogOut,
  FileText,
  ArrowRight,
  RotateCcw,
  Info,
  GraduationCap,
} from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<StudentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = async (isManual = false) => {
    if (!user?.uid) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchStudentAnalytics(user.uid, user.displayName, user.email);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load student analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics(false);
  }, [user?.uid]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const formattedEnrollmentDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Member';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Masthead Profile Card matching purple gradient */}
      <div
        className="text-white p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #3E2072, #5B2E9E)',
        }}
      >
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#F5A8C6] font-extrabold text-2xl shadow-inner">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{user?.displayName}</h1>
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-[#F5A8C6] text-[#3E2072]">
                Student
              </span>
            </div>
            <p className="text-xs text-purple-200 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={() => loadAnalytics(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-xl border border-white/15 transition-colors"
            title="Refresh Analytics"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-[#F5A8C6] ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-500/20 hover:bg-red-500/30 text-xs font-bold text-red-200 hover:text-white rounded-xl border border-red-500/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold tracking-wider text-[#9B93A8] uppercase">
            PERFORMANCE ANALYTICS
          </div>
          <span className="text-[11px] text-[#9B93A8]">Verified evaluations</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Overall Average Score */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#ECE7F5] shadow-xs text-center">
            <div className="text-2xl font-extrabold text-[#3E2072]">
              {analytics ? `${analytics.overallAverageScore}%` : '—'}
            </div>
            <div className="text-[10px] text-[#9B93A8] font-bold uppercase tracking-wider mt-0.5">
              Avg Score
            </div>
          </div>

          {/* Total Exams Attempted */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#ECE7F5] shadow-xs text-center">
            <div className="text-2xl font-extrabold text-[#3E2072]">
              {analytics ? analytics.totalExamsAttempted : '0'}
            </div>
            <div className="text-[10px] text-[#9B93A8] font-bold uppercase tracking-wider mt-0.5">
              Exams Attempted
            </div>
          </div>

          {/* Exams Missed / Pending */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#ECE7F5] shadow-xs text-center">
            <div className="text-2xl font-extrabold text-[#D63031]">
              {analytics ? analytics.totalExamsNotAttempted : '0'}
            </div>
            <div className="text-[10px] text-[#9B93A8] font-bold uppercase tracking-wider mt-0.5">
              Tests Missed
            </div>
          </div>

          {/* Best Score */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#ECE7F5] shadow-xs text-center">
            <div className="text-2xl font-extrabold text-[#5B2E9E]">
              {analytics && analytics.bestScore > 0 ? `${analytics.bestScore}` : '—'}
            </div>
            <div className="text-[10px] text-[#9B93A8] font-bold uppercase tracking-wider mt-0.5">
              Best Score
            </div>
          </div>
        </div>
      </div>

      {/* Date-wise List of Every Exam Taken with Score & Rank */}
      <div className="bg-white rounded-2xl border border-[#ECE7F5] shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#F0EDF7] pb-3">
          <div className="font-bold text-xs sm:text-sm text-[#241748]">
            Exam Score History
          </div>
          {analytics && analytics.examHistory.length > 0 && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-[#FAF6FF] text-[#5B2E9E] rounded-md border border-[#EDE1FA]">
              {analytics.examHistory.length} Record{analytics.examHistory.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#9B93A8]">
            <div className="w-8 h-8 border-3 border-[#3E2072] border-t-[#F5A8C6] rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Loading records...</p>
          </div>
        ) : !analytics || analytics.examHistory.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#FAF6FF] text-[#5B2E9E] flex items-center justify-center mx-auto">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs text-[#9B93A8]">
              No past tests recorded yet.
            </p>
            <div>
              <Link
                to="/student/home"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5B2E9E] hover:bg-[#4d2487] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                <span>Take Live Test</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#F0EDF7]">
            {analytics.examHistory.map((item) => {
              const dateStr = new Date(item.submittedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div key={item.resultId} className="flex items-center justify-between py-2.5 gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-[#9B93A8] font-semibold">{dateStr} · {MEDIUM_LABELS[item.medium]}</div>
                    <div className="font-bold text-[#241748] truncate">{item.examTitle}</div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <div className="font-extrabold text-[#3E2072] text-sm">
                        {item.score}/{item.totalPossibleMarks}
                      </div>
                      <div className="text-[10px] font-bold text-[#5B2E9E]">
                        Rank #{item.rankOnExam}
                      </div>
                    </div>
                    <Link
                      to={`/student/result/${item.resultId}`}
                      className="px-2.5 py-1 bg-[#FAF6FF] hover:bg-[#EDE1FA] text-[#5B2E9E] font-bold text-[11px] rounded-lg transition-colors border border-[#ECE7F5]"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Candidate Credentials & Enrollment Details */}
      <div className="bg-white rounded-2xl border border-[#ECE7F5] shadow-xs p-4 sm:p-5 space-y-3">
        <div className="font-bold text-xs sm:text-sm text-[#241748] border-b border-[#F0EDF7] pb-2">
          Account Information
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-[#FAF9FD] border border-[#ECE7F5]">
            <div className="text-[#9B93A8] text-[10px] font-bold uppercase tracking-wider mb-0.5">Full Name</div>
            <div className="font-bold text-[#241748]">{user?.displayName}</div>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF9FD] border border-[#ECE7F5]">
            <div className="text-[#9B93A8] text-[10px] font-bold uppercase tracking-wider mb-0.5">Registered Email</div>
            <div className="font-bold text-[#241748]">{user?.email}</div>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF9FD] border border-[#ECE7F5]">
            <div className="text-[#9B93A8] text-[10px] font-bold uppercase tracking-wider mb-0.5">Account Enrolled</div>
            <div className="font-bold text-[#241748]">{formattedEnrollmentDate}</div>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF9FD] border border-[#ECE7F5]">
            <div className="text-[#9B93A8] text-[10px] font-bold uppercase tracking-wider mb-0.5">Account Status</div>
            <div className="font-bold text-[#2C9A5B] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2C9A5B]"></span>
              <span>Active Student</span>
            </div>
          </div>
        </div>
      </div>

      {/* About Institute & Contact Card */}
      <div
        className="rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white"
        style={{
          background: 'linear-gradient(135deg, #3E2072, #5B2E9E)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#F5A8C6] shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">
              Dikjyoti Coaching Institute
            </h3>
            <p className="text-[11px] text-purple-200">
              Courses • Coaching Details • Instagram • WhatsApp
            </p>
          </div>
        </div>

        <Link
          to="/about"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5A8C6] hover:bg-[#efa1bf] text-[#3E2072] text-xs font-extrabold transition-all shadow-xs shrink-0"
        >
          <Info className="w-3.5 h-3.5" />
          <span>About Us / Contact</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
