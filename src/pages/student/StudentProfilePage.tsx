import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchStudentAnalytics } from '../../services/analyticsService';
import { StudentAnalyticsData } from '../../types';
import {
  LogOut,
  RotateCcw,
  User,
  Phone,
  MapPin,
  Globe,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
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

  const studentName = user?.displayName || 'Shajidur Rahman';
  const initial = studentName.charAt(0).toUpperCase() || 'S';
  const studentPhone = user?.phoneNumber || '+91 98765 43210';
  const studentDistrict = (user as any)?.district || 'Kamrup (Metro)';
  const studentMedium = (user as any)?.medium || 'Hindi / Assamese';
  const targetExam = 'ADRE Grade 3 & 4';

  return (
    <div className="space-y-5">
      {/* Page Head matching mockup */}
      <div className="flex items-center justify-between pb-2 border-b border-[#EEF1F6]">
        <div>
          <h2 className="text-xl font-bold text-[#1F2A44]">My Profile</h2>
          <p className="text-xs text-[#8A94A6] mt-0.5">Your student registration and details</p>
        </div>

        <button
          type="button"
          onClick={() => loadAnalytics(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EEF1F6] text-xs font-semibold text-[#2F6FED] hover:bg-[#F5F7FB] transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Main Profile Panel */}
      <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#2F6FED] text-white flex items-center justify-center text-2xl font-extrabold shrink-0 shadow-xs">
            {initial}
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#1F2A44] leading-tight">
              {studentName}
            </h3>
            <p className="text-xs font-semibold text-[#8A94A6] mt-1">
              Student ID: #DK-2026-084
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-[#EEF1F6]">
          <div className="p-3 rounded-xl bg-[#F5F7FB] flex items-center gap-3">
            <Phone className="w-4 h-4 text-[#2F6FED] shrink-0" />
            <div>
              <span className="text-[#8A94A6] block text-[11px]">Phone</span>
              <b className="text-[#1F2A44]">{studentPhone}</b>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F7FB] flex items-center gap-3">
            <MapPin className="w-4 h-4 text-[#16A34A] shrink-0" />
            <div>
              <span className="text-[#8A94A6] block text-[11px]">District</span>
              <b className="text-[#1F2A44]">{studentDistrict}</b>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F7FB] flex items-center gap-3">
            <Globe className="w-4 h-4 text-[#8B5CF6] shrink-0" />
            <div>
              <span className="text-[#8A94A6] block text-[11px]">Medium</span>
              <b className="text-[#1F2A44]">{studentMedium}</b>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F7FB] flex items-center gap-3">
            <Award className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <div>
              <span className="text-[#8A94A6] block text-[11px]">Target Exam</span>
              <b className="text-[#1F2A44]">{targetExam}</b>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-[#8A94A6]">
            Signed in with: <b className="text-[#1F2A44]">{user?.email || studentPhone}</b>
          </span>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FDE8ED] hover:bg-[#FDE8ED]/80 text-[#EF4477] font-bold text-xs rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
