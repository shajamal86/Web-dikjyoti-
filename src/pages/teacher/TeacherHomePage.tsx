import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listTeacherExams } from '../../services/examService';
import { ExamDocument } from '../../types';
import {
  FileSpreadsheet,
  Radio,
  Users,
  BarChart3,
  TrendingUp,
  PlusCircle,
  Megaphone,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  RefreshCw,
  Search,
  Sparkles,
  School,
  ArrowRight,
  Download,
  Upload,
  Copy,
  Trash2,
} from 'lucide-react';
import { BulkUploadModal } from '../../components/teacher/BulkUploadModal';
import { ExportCsvModal } from '../../components/teacher/ExportCsvModal';
import { DuplicateExamModal } from '../../components/teacher/DuplicateExamModal';
import { DeleteExamModal } from '../../components/teacher/DeleteExamModal';

export const TeacherHomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Tab: 'dashboard' vs 'exams'
  const isExamsView = location.search.includes('view=exams');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'exams'>(
    isExamsView ? 'exams' : 'dashboard'
  );

  useEffect(() => {
    if (location.search.includes('view=exams')) {
      setActiveTab('exams');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.search]);

  // Exam list filter
  const [examStatusFilter, setExamStatusFilter] = useState<'all' | 'live' | 'draft'>('all');

  // Modals state
  const [bulkUploadExam, setBulkUploadExam] = useState<ExamDocument | null>(null);
  const [exportExam, setExportExam] = useState<ExamDocument | null>(null);
  const [duplicateExamTarget, setDuplicateExamTarget] = useState<ExamDocument | null>(null);
  const [deleteExamTarget, setDeleteExamTarget] = useState<ExamDocument | null>(null);

  // Quick feedback toast
  const [bannerToast, setBannerToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadExams();
  }, [user]);

  const loadExams = async (isManual = false) => {
    if (!user) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const list = await listTeacherExams(user.uid);
      setExams(list);
    } catch (err: any) {
      console.error('Error fetching teacher exams:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setBannerToast({ message, type });
    setTimeout(() => setBannerToast(null), 4000);
  };

  const activeCount = exams.filter((e) => e.status === 'live').length;
  const draftCount = exams.filter((e) => e.status === 'draft').length;

  const filteredExams = exams.filter((exam) => {
    if (examStatusFilter === 'live' && exam.status !== 'live') return false;
    if (examStatusFilter === 'draft' && exam.status !== 'draft') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        exam.title.toLowerCase().includes(q) ||
        (exam.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const teacherName = user?.displayName || 'Sir Jamal';

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {bannerToast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-xs transition-all ${
            bannerToast.type === 'success'
              ? 'bg-[#E6F9F0] border-[#16A34A]/20 text-[#16A34A]'
              : 'bg-[#E8F0FE] border-[#2F6FED]/20 text-[#1D4FC4]'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{bannerToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerToast(null)}
            className="font-bold text-sm leading-none opacity-60 hover:opacity-100"
          >
            Close
          </button>
        </div>
      )}

      {/* Top Segmented Tabs: Dashboard / Exams */}
      <div className="flex items-center justify-between gap-4 border-b border-[#EEF1F6] pb-3">
        <div className="flex items-center bg-[#EEF1F6] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white text-[#2F6FED] shadow-xs'
                : 'text-[#8A94A6] hover:text-[#1F2A44]'
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'exams'
                ? 'bg-white text-[#2F6FED] shadow-xs'
                : 'text-[#8A94A6] hover:text-[#1F2A44]'
            }`}
          >
            <span>Exams</span>
            <span className="text-[10px] bg-[#2F6FED]/10 text-[#2F6FED] px-1.5 py-0.5 rounded-full font-extrabold">
              {exams.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadExams(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EEF1F6] rounded-xl text-xs font-semibold text-[#2F6FED] hover:bg-[#F5F7FB] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/teacher/create-exam"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Exam</span>
          </Link>
        </div>
      </div>

      {/* ================= TAB 1: DASHBOARD VIEW ================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* WELCOME BANNER WITH PRIMARY CREATE EXAM CTA */}
          <div className="bg-gradient-to-r from-[#EAF1FF] via-[#F1F6FF] to-[#F7FAFF] rounded-2xl p-6 sm:p-7 border border-[#D5E3FF] flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
            <div>
              <div className="text-sm font-semibold text-[#1F2A44] mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#2F6FED]" />
                <span>Good Morning,</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D4FC4] tracking-tight">
                {teacherName}!
              </h1>
              <p className="text-xs sm:text-[13px] text-[#5A6478] mt-1.5">
                Manage your examination papers, review submissions, and author new bilingual tests.
              </p>
            </div>

            {/* Prominently Positioned Primary Action Hub */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 md:pt-0">
              <Link
                to="/teacher/create-exam"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-98"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Exam</span>
              </Link>
              <Link
                to="/teacher/csv"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-[#F5F7FB] text-[#1F2A44] border border-[#EEF1F6] text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-[#2F6FED]" />
                <span>Bulk CSV Upload</span>
              </Link>
            </div>
          </div>

          {/* 5 STAT CARDS matching mockup */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Total Exams */}
            <div className="bg-white rounded-[14px] p-4 border border-[#EEF1F6] flex items-center gap-3 shadow-xs">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-[19px] font-extrabold text-[#1F2A44] leading-tight">
                  {loading ? '...' : exams.length || 14}
                </div>
                <div className="text-[11px] font-semibold text-[#8A94A6] mt-0.5">
                  Total Exams
                </div>
              </div>
            </div>

            {/* 2. Live Now */}
            <div className="bg-white rounded-[14px] p-4 border border-[#EEF1F6] flex items-center gap-3 shadow-xs">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-[#E6F9F0] text-[#16A34A] flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-[19px] font-extrabold text-[#1F2A44] leading-tight">
                  {loading ? '...' : activeCount || 1}
                </div>
                <div className="text-[11px] font-semibold text-[#8A94A6] mt-0.5">
                  Live Now
                </div>
              </div>
            </div>

            {/* 3. Total Students */}
            <div className="bg-white rounded-[14px] p-4 border border-[#EEF1F6] flex items-center gap-3 shadow-xs">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-[#F1EAFE] text-[#8B5CF6] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-[19px] font-extrabold text-[#1F2A44] leading-tight">
                  238
                </div>
                <div className="text-[11px] font-semibold text-[#8A94A6] mt-0.5">
                  Total Students
                </div>
              </div>
            </div>

            {/* 4. Avg Score */}
            <div className="bg-white rounded-[14px] p-4 border border-[#EEF1F6] flex items-center gap-3 shadow-xs">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-[#FFF4E0] text-[#F59E0B] flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-[19px] font-extrabold text-[#1F2A44] leading-tight">
                  138.4
                </div>
                <div className="text-[11px] font-semibold text-[#8A94A6] mt-0.5">
                  Avg Score
                </div>
              </div>
            </div>

            {/* 5. This Week Attempts */}
            <div className="bg-white rounded-[14px] p-4 border border-[#EEF1F6] flex items-center gap-3 shadow-xs col-span-2 sm:col-span-1">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-[#FDE8ED] text-[#EF4477] flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-[19px] font-extrabold text-[#1F2A44] leading-tight">
                  212
                </div>
                <div className="text-[11px] font-semibold text-[#8A94A6] mt-0.5">
                  This Week Attempts
                </div>
              </div>
            </div>
          </div>

          {/* TWO COLUMN: RECENT EXAMS + NOTICE BOARD */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4.5">
            {/* Panel Left: Recent Exams */}
            <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#EEF1F6]">
                <h3 className="text-[15px] font-bold text-[#1F2A44]">Recent Exams</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('exams')}
                  className="text-xs font-bold text-[#2F6FED] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EEF1F6]">
                      <th className="py-2.5 px-2 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                        Exam
                      </th>
                      <th className="py-2.5 px-2 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                        Attempted
                      </th>
                      <th className="py-2.5 px-2 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                        Average
                      </th>
                      <th className="py-2.5 px-2 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF1F6] text-xs">
                    <tr>
                      <td className="py-3 px-2 font-semibold text-[#1F2A44]">Sunday Mock — 7 Sept</td>
                      <td className="py-3 px-2 text-[#8A94A6]">212</td>
                      <td className="py-3 px-2 font-bold text-[#1F2A44]">138.4</td>
                      <td className="py-3 px-2">
                        <span className="bg-[#E6F9F0] text-[#16A34A] px-2 py-0.5 rounded-md font-bold text-[11px]">
                          Live
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2 font-semibold text-[#1F2A44]">Sunday Mock — 31 Aug</td>
                      <td className="py-3 px-2 text-[#8A94A6]">208</td>
                      <td className="py-3 px-2 font-bold text-[#1F2A44]">135.2</td>
                      <td className="py-3 px-2">
                        <span className="bg-[#FFF4E0] text-[#F59E0B] px-2 py-0.5 rounded-md font-bold text-[11px]">
                          Closed
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel Right: Notice Board */}
            <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EEF1F6]">
                  <h3 className="text-[15px] font-bold text-[#1F2A44]">Notice Board</h3>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center shrink-0">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1F2A44] leading-snug">
                        14 Sept exam still in Draft
                      </div>
                      <div className="text-[11px] text-[#8A94A6] mt-0.5">2 subjects pending</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-[34px] h-[34px] rounded-[9px] bg-[#F1EAFE] text-[#8B5CF6] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1F2A44] leading-snug">
                        6 new students registered
                      </div>
                      <div className="text-[11px] text-[#8A94A6] mt-0.5">This week</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#EEF1F6]">
                <Link
                  to="/teacher/create-exam"
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create New Exam</span>
                </Link>
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: CALENDAR + QUICK ACCESS + DONUT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
            {/* Card 1: Exam Calendar */}
            <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs">
              <div className="pb-3 mb-3 border-b border-[#EEF1F6]">
                <h3 className="text-[14px] font-bold text-[#1F2A44]">Exam Calendar</h3>
              </div>
              <div className="text-center font-bold text-xs text-[#1F2A44] mb-2">
                September 2026
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                <div className="text-[10px] font-bold text-[#8A94A6] pb-1">Mon</div>
                <div className="text-[10px] font-bold text-[#8A94A6] pb-1">Tue</div>
                <div className="text-[10px] font-bold text-[#8A94A6] pb-1">Wed</div>
                <div className="text-[10px] font-bold text-[#8A94A6] pb-1">Thu</div>
                <div className="text-[10px] font-bold text-[#8A94A6] pb-1">Fri</div>
                <div className="text-[10px] font-bold text-[#8A94A6] pb-1">Sat</div>
                <div className="text-[10px] font-bold text-[#8A94A6] pb-1">Sun</div>

                <div className="text-xs py-1.5 rounded text-[#CBD1DE]">31</div>
                <div className="text-xs py-1.5 rounded text-[#1F2A44]">1</div>
                <div className="text-xs py-1.5 rounded text-[#1F2A44]">2</div>
                <div className="text-xs py-1.5 rounded text-[#1F2A44]">3</div>
                <div className="text-xs py-1.5 rounded text-[#1F2A44]">4</div>
                <div className="text-xs py-1.5 rounded text-[#1F2A44]">5</div>
                <div className="text-xs py-1.5 rounded bg-[#2F6FED] text-white font-bold">6</div>

                <div className="text-xs py-1.5 rounded text-[#1F2A44]">7</div>
                <div className="text-xs py-1.5 rounded text-[#1F2A44]">8</div>
                <div className="text-xs py-1.5 rounded text-[#1F2A44]">9</div>
                <div className="text-xs py-1.5 rounded text-[#1F2A44]">10</div>
                <div className="text-xs py-1.5 rounded text-[#1F2A44]">11</div>
                <div className="text-xs py-1.5 rounded text-[#1F2A44]">12</div>
                <div className="text-xs py-1.5 rounded text-[#1F2A44]">13</div>
              </div>
            </div>

            {/* Card 2: Quick Access */}
            <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs">
              <div className="pb-3 mb-3 border-b border-[#EEF1F6]">
                <h3 className="text-[14px] font-bold text-[#1F2A44]">Quick Access</h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/teacher/create-exam"
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-[#E8F0FE] text-center hover:bg-[#DCE9FD] border border-[#2F6FED]/20 transition-all shadow-2xs group"
                >
                  <div className="w-[36px] h-[36px] rounded-[10px] bg-[#2F6FED] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#1D4FC4]">Create Exam</span>
                </Link>

                <Link
                  to="/teacher/csv"
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-[#F5F7FB] text-center hover:bg-[#EEF1F6] transition-colors"
                >
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E6F9F0] text-[#16A34A] flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#1F2A44]">CSV Import</span>
                </Link>

                <Link
                  to="/teacher/students"
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-[#F5F7FB] text-center hover:bg-[#EEF1F6] transition-colors"
                >
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#F1EAFE] text-[#8B5CF6] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#1F2A44]">Students</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveTab('exams')}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-[#F5F7FB] text-center hover:bg-[#EEF1F6] transition-colors"
                >
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#FFF4E0] text-[#F59E0B] flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#1F2A44]">All Exams</span>
                </button>
              </div>
            </div>

            {/* Card 3: Score Distribution Donut */}
            <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs">
              <div className="pb-3 mb-2 border-b border-[#EEF1F6]">
                <h3 className="text-[14px] font-bold text-[#1F2A44]">Score Distribution</h3>
              </div>

              <div className="flex flex-col items-center pt-2">
                <div
                  className="w-[130px] h-[130px] rounded-full relative flex items-center justify-center"
                  style={{
                    background:
                      'conic-gradient(#16A34A 0% 60%, #2F6FED 60% 80%, #F59E0B 80% 92%, #EF4477 92% 100%)',
                  }}
                >
                  <div className="absolute inset-[17px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-lg font-extrabold text-[#1F2A44]">138</span>
                    <span className="text-[9px] font-bold text-[#8A94A6]">AVG</span>
                  </div>
                </div>

                <div className="w-full space-y-1.5 mt-4 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#5A6478]">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                      <span>Excellent (150+)</span>
                    </span>
                    <span className="font-bold text-[#1F2A44]">60%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#5A6478]">
                      <span className="w-2 h-2 rounded-full bg-[#2F6FED]" />
                      <span>Good (120-150)</span>
                    </span>
                    <span className="font-bold text-[#1F2A44]">20%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#5A6478]">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      <span>Average (90-120)</span>
                    </span>
                    <span className="font-bold text-[#1F2A44]">12%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#5A6478]">
                      <span className="w-2 h-2 rounded-full bg-[#EF4477]" />
                      <span>Needs Work (&lt;90)</span>
                    </span>
                    <span className="font-bold text-[#1F2A44]">8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: EXAMS MANAGEMENT VIEW ================= */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#1F2A44]">Exams</h2>
              <p className="text-xs text-[#8A94A6] mt-0.5">
                Manage every exam you've created
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter pills */}
              <div className="flex items-center gap-1 bg-[#EEF1F6] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setExamStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    examStatusFilter === 'all'
                      ? 'bg-white text-[#2F6FED] shadow-xs'
                      : 'text-[#8A94A6] hover:text-[#1F2A44]'
                  }`}
                >
                  All ({exams.length})
                </button>
                <button
                  type="button"
                  onClick={() => setExamStatusFilter('live')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    examStatusFilter === 'live'
                      ? 'bg-white text-[#16A34A] shadow-xs'
                      : 'text-[#8A94A6] hover:text-[#1F2A44]'
                  }`}
                >
                  Live ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setExamStatusFilter('draft')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    examStatusFilter === 'draft'
                      ? 'bg-white text-[#F59E0B] shadow-xs'
                      : 'text-[#8A94A6] hover:text-[#1F2A44]'
                  }`}
                >
                  Drafts ({draftCount})
                </button>
              </div>

              <Link
                to="/teacher/create-exam"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Exam</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-[14px] border border-[#EEF1F6] shadow-xs">
              <RefreshCw className="w-7 h-7 animate-spin text-[#2F6FED] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#1F2A44]">Loading Exams...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-[14px] border border-[#EEF1F6] shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F2A44]">No Exams Found</h3>
                <p className="text-xs text-[#8A94A6] mt-1">
                  {exams.length === 0
                    ? 'Get started by creating your first online mock test.'
                    : 'No exams match the selected filter.'}
                </p>
              </div>
              <div>
                <Link
                  to="/teacher/create-exam"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2F6FED] text-white text-xs font-bold rounded-xl"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create First Exam</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExams.map((exam) => {
                const totalQ =
                  (exam.mediums?.hindi?.totalQuestions || 0) +
                  (exam.mediums?.assamese?.totalQuestions || 0);

                return (
                  <div
                    key={exam.id}
                    className="bg-white rounded-[14px] border border-[#EEF1F6] p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:border-[#2F6FED]/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm sm:text-[15px] text-[#1F2A44] leading-snug">
                          {exam.title}
                        </h4>
                        <div className="text-xs text-[#8A94A6] mt-1">
                          {totalQ} questions · Hindi + Assamese · {exam.attemptCount || 0} attempted
                        </div>
                      </div>

                      {exam.status === 'live' ? (
                        <span className="bg-[#E6F9F0] text-[#16A34A] font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                          LIVE
                        </span>
                      ) : (
                        <span className="bg-[#FFF4E0] text-[#F59E0B] font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                          DRAFT
                        </span>
                      )}
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-[#EEF1F6] flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/teacher/create-exam?examId=${exam.id}`}
                          className="px-3.5 py-1.5 bg-white border border-[#EEF1F6] text-[#1F2A44] font-bold text-xs rounded-xl hover:bg-[#F5F7FB] transition-colors"
                        >
                          {exam.status === 'live' ? 'Edit Exam' : 'Resume'}
                        </Link>
                        <Link
                          to={`/teacher/analytics?examId=${exam.id}`}
                          className="px-3.5 py-1.5 bg-white border border-[#EEF1F6] text-[#2F6FED] font-bold text-xs rounded-xl hover:bg-[#E8F0FE] transition-colors"
                        >
                          Analytics
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExportExam(exam)}
                          className="p-2 text-[#5A6478] hover:text-[#1F2A44] hover:bg-[#F5F7FB] rounded-lg transition-colors"
                          title="Export Questions as CSV"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkUploadExam(exam)}
                          className="p-2 text-[#5A6478] hover:text-[#1F2A44] hover:bg-[#F5F7FB] rounded-lg transition-colors"
                          title="Bulk Import CSV"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDuplicateExamTarget(exam)}
                          className="p-2 text-[#5A6478] hover:text-[#1F2A44] hover:bg-[#F5F7FB] rounded-lg transition-colors"
                          title="Duplicate Exam"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteExamTarget(exam)}
                          className="p-2 text-[#EF4477] hover:bg-[#FDE8ED] rounded-lg transition-colors"
                          title="Delete Exam"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {bulkUploadExam && (
        <BulkUploadModal
          exam={bulkUploadExam}
          isOpen={Boolean(bulkUploadExam)}
          onClose={() => setBulkUploadExam(null)}
          onSuccess={() => {
            setBulkUploadExam(null);
            loadExams();
            showToast('Bulk upload completed successfully!');
          }}
        />
      )}

      {exportExam && (
        <ExportCsvModal
          exam={exportExam}
          isOpen={Boolean(exportExam)}
          onClose={() => setExportExam(null)}
        />
      )}

      {duplicateExamTarget && (
        <DuplicateExamModal
          exam={duplicateExamTarget}
          isOpen={Boolean(duplicateExamTarget)}
          onClose={() => setDuplicateExamTarget(null)}
          onSuccess={() => {
            setDuplicateExamTarget(null);
            loadExams();
            showToast('Exam cloned successfully!');
          }}
        />
      )}

      {deleteExamTarget && (
        <DeleteExamModal
          exam={deleteExamTarget}
          isOpen={Boolean(deleteExamTarget)}
          onClose={() => setDeleteExamTarget(null)}
          onSuccess={() => {
            setDeleteExamTarget(null);
            loadExams();
            showToast('Exam deleted successfully.');
          }}
        />
      )}
    </div>
  );
};
