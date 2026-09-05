import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchLeaderboard,
  fetchExamLeaderboard,
  fetchExamSubjectAnalytics,
} from '../../services/analyticsService';
import {
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  LeaderboardEntry,
  ExamLeaderboardEntry,
  ExamAnalyticsSummary,
  ExamDocument,
  SUBJECT_LABELS,
  EXAM_SUBJECTS,
  MEDIUM_LABELS,
  SubjectType,
} from '../../types';
import { StudentProfileModal } from '../../components/common/StudentProfileModal';
import {
  BarChart3,
  Trophy,
  Medal,
  Award,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
  RotateCcw,
  Search,
  Sparkles,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

export const TeacherAnalyticsPage: React.FC = () => {
  const { user } = useAuth();

  // Mode: 'all-time' or 'exam-specific'
  const [activeTab, setActiveTab] = useState<'all-time' | 'exam-specific'>('all-time');

  // Exams list for dropdown
  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // All-time Leaderboard state
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');

  // Exam-specific analytics state
  const [examSummary, setExamSummary] = useState<ExamAnalyticsSummary | null>(null);
  const [examLeaderboard, setExamLeaderboard] = useState<ExamLeaderboardEntry[]>([]);
  const [examLoading, setExamLoading] = useState(false);
  const [examSearch, setExamSearch] = useState('');

  // Student Profile Modal Drill-down state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Initial Load: Load exams and all-time leaderboard
  useEffect(() => {
    loadAllTimeLeaderboard();
    loadExamsList();
  }, []);

  const loadExamsList = async () => {
    try {
      const snap = await getDocs(collection(db, 'exams'));
      const list: ExamDocument[] = [];
      snap.forEach((d) => {
        list.push(d.data() as ExamDocument);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExams(list);
      if (list.length > 0 && !selectedExamId) {
        setSelectedExamId(list[0].id);
      }
    } catch (e) {
      console.warn('Error loading exams list for analytics:', e);
    }
  };

  const loadAllTimeLeaderboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLeaderboardLoading(true);

    try {
      const data = await fetchLeaderboard(isManual);
      setLeaderboardEntries(data.entries);
    } catch (e) {
      console.error('Error fetching all-time leaderboard for teacher:', e);
    } finally {
      setLeaderboardLoading(false);
      setRefreshing(false);
    }
  };

  // 2. Load exam-specific data whenever selectedExamId changes
  useEffect(() => {
    if (selectedExamId) {
      loadExamSpecificData(selectedExamId);
    }
  }, [selectedExamId]);

  const loadExamSpecificData = async (examId: string) => {
    setExamLoading(true);
    try {
      const currentExam = exams.find((e) => e.id === examId);
      const title = currentExam?.title || 'Examination';

      const [summary, ranking] = await Promise.all([
        fetchExamSubjectAnalytics(examId, title),
        fetchExamLeaderboard(examId),
      ]);

      setExamSummary(summary);
      setExamLeaderboard(ranking);
    } catch (e) {
      console.error('Error fetching exam specific analytics:', e);
    } finally {
      setExamLoading(false);
    }
  };

  const openStudentDossier = (studentId: string, name: string, email = '') => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(name);
    setSelectedStudentEmail(email);
    setIsModalOpen(true);
  };

  // Top 3 for All-Time Podium
  const top1 = leaderboardEntries[0];
  const top2 = leaderboardEntries[1];
  const top3 = leaderboardEntries[2];

  // Filtered lists
  const filteredAllTime = leaderboardEntries.filter((e) =>
    e.studentName.toLowerCase().includes(leaderboardSearch.toLowerCase())
  );

  const filteredExamRankings = examLeaderboard.filter((e) =>
    e.studentName.toLowerCase().includes(examSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Masthead Banner */}
      <div className="bg-[#1B2A4A] text-white p-6 sm:p-8 rounded-2xl border border-[#253963] shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-semibold tracking-wider uppercase mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>Faculty Intelligence & Assessment Portal</span>
            </div>
            <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold">
              Examination Analytics & Leaderboards
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Inspect candidate merit standings, drill down into individual examinee histories, and
              analyze subject-wise performance metrics across tests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'all-time') loadAllTimeLeaderboard(true);
                else if (selectedExamId) loadExamSpecificData(selectedExamId);
              }}
              disabled={leaderboardLoading || refreshing || examLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#24375F] hover:bg-[#2c4273] text-slate-200 hover:text-white rounded-lg border border-[#3b548c] text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#D4AF37] ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh Standings'}</span>
            </button>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('all-time')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all-time'
                ? 'bg-[#D4AF37] text-[#1B2A4A] shadow-xs'
                : 'bg-[#253963] text-slate-300 hover:text-white hover:bg-[#2c4375]'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>All-Time State Leaderboard</span>
          </button>

          <button
            onClick={() => setActiveTab('exam-specific')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'exam-specific'
                ? 'bg-[#D4AF37] text-[#1B2A4A] shadow-xs'
                : 'bg-[#253963] text-slate-300 hover:text-white hover:bg-[#2c4375]'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Exam & Subject Analytics</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL-TIME LEADERBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'all-time' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {leaderboardLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
              <div className="w-10 h-10 border-3 border-[#1B2A4A] border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-500">Loading statewide merit standings...</p>
            </div>
          ) : leaderboardEntries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A]">
                No Candidate Results Recorded Yet
              </h3>
              <p className="text-xs text-[#5A6B82] max-w-md mx-auto mt-1">
                Once students submit exams, rankings and cumulative totals will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Podium Highlights */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif-heading text-lg font-bold text-[#1B2A4A] flex items-center gap-2">
                    <Medal className="w-5 h-5 text-[#D4AF37]" />
                    <span>State Podium Standings (Top 3 Candidates)</span>
                  </h2>
                  <span className="text-xs text-[#5A6B82]">Tap candidate to open profile dossier</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Silver #2 */}
                  {top2 && (
                    <div
                      onClick={() => openStudentDossier(top2.studentId, top2.studentName, top2.studentEmail)}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
                          <Medal className="w-5 h-5 text-slate-500" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                          Silver Medal • #2
                        </span>
                      </div>

                      <div className="my-4">
                        <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A] group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                          {top2.studentName}
                        </h3>
                        <div className="text-2xl font-bold text-[#1B2A4A] mt-1">
                          {top2.totalScore} <span className="text-xs font-normal text-[#5A6B82]">pts total</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-[#5A6B82] uppercase">Exams Taken</span>
                          <div className="font-bold text-[#1B2A4A]">{top2.examsAttempted}</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#5A6B82] uppercase">Avg Percentage</span>
                          <div className="font-bold text-emerald-700">{top2.averagePercentage}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gold #1 */}
                  {top1 && (
                    <div
                      onClick={() => openStudentDossier(top1.studentId, top1.studentName, top1.studentEmail)}
                      className="bg-white rounded-2xl border-2 border-[#D4AF37] p-6 shadow-md flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow group order-first md:order-none bg-gradient-to-b from-amber-50/40 to-white"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F5D77F] to-[#D4AF37] border-2 border-white flex items-center justify-center text-[#1B2A4A] shadow-md">
                          <Trophy className="w-6 h-6 text-[#1B2A4A]" />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#D4AF37]/20 text-[#8c7014] border border-[#D4AF37]/50">
                          Gold Medal • State #1
                        </span>
                      </div>

                      <div className="my-4">
                        <h3 className="font-serif-heading text-xl font-bold text-[#1B2A4A] group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                          {top1.studentName}
                        </h3>
                        <div className="text-3xl font-extrabold text-[#1B2A4A] mt-1">
                          {top1.totalScore} <span className="text-xs font-semibold text-[#5A6B82]">pts total</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-amber-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-[#5A6B82] uppercase">Exams Taken</span>
                          <div className="font-bold text-[#1B2A4A]">{top1.examsAttempted}</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#5A6B82] uppercase">Avg Percentage</span>
                          <div className="font-bold text-emerald-700">{top1.averagePercentage}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bronze #3 */}
                  {top3 && (
                    <div
                      onClick={() => openStudentDossier(top3.studentId, top3.studentName, top3.studentEmail)}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-800">
                          <Medal className="w-5 h-5 text-amber-700" />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
                          Bronze Medal • #3
                        </span>
                      </div>

                      <div className="my-4">
                        <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A] group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                          {top3.studentName}
                        </h3>
                        <div className="text-2xl font-bold text-[#1B2A4A] mt-1">
                          {top3.totalScore} <span className="text-xs font-normal text-[#5A6B82]">pts total</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-[#5A6B82] uppercase">Exams Taken</span>
                          <div className="font-bold text-[#1B2A4A]">{top3.examsAttempted}</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#5A6B82] uppercase">Avg Percentage</span>
                          <div className="font-bold text-emerald-700">{top3.averagePercentage}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Full Ranked Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A]">
                      Full Candidate Rankings ({leaderboardEntries.length})
                    </h3>
                    <p className="text-xs text-[#5A6B82]">
                      Click any candidate row or name to view their full examination dossier and history
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={leaderboardSearch}
                      onChange={(e) => setLeaderboardSearch(e.target.value)}
                      placeholder="Search candidate name..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F7F4] border border-slate-200 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#F8F7F4] text-[#1B2A4A] font-semibold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-3.5 px-4 text-center w-16">Rank</th>
                        <th className="py-3.5 px-4">Candidate Name</th>
                        <th className="py-3.5 px-4 text-center">Exams Attempted</th>
                        <th className="py-3.5 px-4">Total Marks</th>
                        <th className="py-3.5 px-4">Avg Score</th>
                        <th className="py-3.5 px-4">Highest Score</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAllTime.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                            No candidate found matching "{leaderboardSearch}".
                          </td>
                        </tr>
                      ) : (
                        filteredAllTime.map((row) => (
                          <tr
                            key={row.studentId}
                            onClick={() => openStudentDossier(row.studentId, row.studentName, row.studentEmail)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 px-4 text-center font-bold">
                              <span
                                className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs ${
                                  row.rank === 1
                                    ? 'bg-[#D4AF37] text-[#1B2A4A] font-black'
                                    : row.rank === 2
                                    ? 'bg-slate-200 text-slate-800'
                                    : row.rank === 3
                                    ? 'bg-amber-200 text-amber-900'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {row.rank}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-[#1B2A4A] group-hover:text-[#D4AF37] transition-colors">
                                {row.studentName}
                              </div>
                              {row.studentEmail && (
                                <div className="text-[11px] text-slate-400">{row.studentEmail}</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                              {row.examsAttempted}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#1B2A4A]">
                              {row.totalScore} pts
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-emerald-700">
                              {row.averagePercentage}%
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              <span className="font-medium text-[#1B2A4A]">{row.bestScore} pts</span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="text-xs font-semibold text-[#1B2A4A] group-hover:text-[#D4AF37] transition-colors inline-flex items-center gap-1">
                                <span>Inspect Dossier</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXAM-SPECIFIC & SUBJECT-WISE ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'exam-specific' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Exam Selector Control */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1B2A4A] uppercase tracking-wider mb-1">
                  Select Examination Paper
                </label>
                <p className="text-xs text-[#5A6B82]">
                  Filter candidate ranking and view subject discrimination metrics for a specific test
                </p>
              </div>

              <div className="sm:w-80">
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full text-xs font-medium bg-[#F8F7F4] border border-slate-200 rounded-lg p-2.5 text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                >
                  {exams.length === 0 ? (
                    <option value="">No exams created yet</option>
                  ) : (
                    exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} ({ex.status.toUpperCase()})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {examLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
              <div className="w-10 h-10 border-3 border-[#1B2A4A] border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-500">Evaluating examination metrics...</p>
            </div>
          ) : !examSummary || examSummary.totalSubmissions === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A]">
                No Candidate Submissions for This Examination
              </h3>
              <p className="text-xs text-[#5A6B82] max-w-md mx-auto mt-1">
                No examinees have submitted results for this test yet. Once students take this paper,
                subject performance and rankings will populate automatically.
              </p>
            </div>
          ) : (
            <>
              {/* Exam Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-semibold text-[#5A6B82] uppercase tracking-wider">
                    Total Submissions
                  </div>
                  <div className="text-3xl font-extrabold text-[#1B2A4A] mt-2">
                    {examSummary.totalSubmissions}
                  </div>
                  <p className="text-[11px] text-[#5A6B82] mt-1">Examinees evaluated</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-semibold text-[#5A6B82] uppercase tracking-wider">
                    Batch Mean Score
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-700 mt-2">
                    {examSummary.averagePercentage}%
                  </div>
                  <p className="text-[11px] text-[#5A6B82] mt-1">Overall percentage average</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-semibold text-[#5A6B82] uppercase tracking-wider">
                    Highest Mark Achieved
                  </div>
                  <div className="text-3xl font-extrabold text-[#1B2A4A] mt-2">
                    {examSummary.highestScore} pts
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">Top score in batch</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-semibold text-[#5A6B82] uppercase tracking-wider">
                    Lowest Mark Achieved
                  </div>
                  <div className="text-3xl font-extrabold text-slate-700 mt-2">
                    {examSummary.lowestScore} pts
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Batch lower boundary</p>
                </div>
              </div>

              {/* Subject-Wise Analytics Breakdown */}
              <div className="space-y-3">
                <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
                  <span>Subject-Wise Performance Breakdown (4 Fixed Subjects)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {EXAM_SUBJECTS.map((subj) => {
                    const stats = examSummary.subjectStats[subj];
                    return (
                      <div
                        key={subj}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="font-serif-heading font-bold text-base text-[#1B2A4A]">
                            {SUBJECT_LABELS[subj]}
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {stats.attemptsCount} Papers
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[#5A6B82]">Subject Average:</span>
                            <span className="font-bold text-[#1B2A4A] text-sm">
                              {stats.averageScore} pts
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#5A6B82]">Highest Score:</span>
                            <span className="font-bold text-emerald-700">
                              {stats.highestScore} pts
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#5A6B82]">Lowest Score:</span>
                            <span className="font-bold text-slate-700">
                              {stats.lowestScore} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Exam Specific Leaderboard */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A]">
                      Exam Merit Standings ({examLeaderboard.length} Examinees)
                    </h3>
                    <p className="text-xs text-[#5A6B82]">
                      Ranked performance on this specific examination paper
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={examSearch}
                      onChange={(e) => setExamSearch(e.target.value)}
                      placeholder="Search candidate name..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F7F4] border border-slate-200 rounded-lg text-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#F8F7F4] text-[#1B2A4A] font-semibold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4 text-center w-16">Rank</th>
                        <th className="py-3 px-4">Candidate Name</th>
                        <th className="py-3 px-4">Medium</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4">Percentage</th>
                        <th className="py-3 px-4">Accuracy</th>
                        <th className="py-3 px-4">Submitted At</th>
                        <th className="py-3 px-4 text-right">Dossier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExamRankings.map((row) => (
                        <tr
                          key={row.studentId}
                          onClick={() => openStudentDossier(row.studentId, row.studentName, row.studentEmail)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4 text-center font-bold">
                            <span
                              className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs ${
                                row.rank === 1
                                  ? 'bg-[#D4AF37] text-[#1B2A4A] font-bold'
                                  : row.rank === 2
                                  ? 'bg-slate-200 text-slate-800 font-bold'
                                  : row.rank === 3
                                  ? 'bg-amber-200 text-amber-900 font-bold'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {row.rank}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#1B2A4A] group-hover:text-[#D4AF37] transition-colors">
                              {row.studentName}
                            </div>
                            {row.studentEmail && (
                              <div className="text-[11px] text-slate-400">{row.studentEmail}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              {MEDIUM_LABELS[row.medium]}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-[#1B2A4A]">
                            {row.score} / {row.totalPossibleMarks}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-700">
                            {row.percentage}%
                          </td>
                          <td className="py-3 px-4 text-blue-700 font-medium">
                            {row.accuracy}%
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-xs">
                            {new Date(row.submittedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-xs font-semibold text-[#1B2A4A] group-hover:text-[#D4AF37] transition-colors inline-flex items-center gap-1">
                              <span>Profile</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Reusable Student Profile Modal for Drill-Down */}
      <StudentProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studentId={selectedStudentId}
        studentNameFallback={selectedStudentName}
        studentEmailFallback={selectedStudentEmail}
      />
    </div>
  );
};
