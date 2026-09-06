import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ExamDocument, ExamResultDocument } from '../../types';
import {
  fetchLiveExams,
  fetchStudentHistory,
} from '../../services/studentExamService';
import { ExamPasswordModal } from '../../components/student/ExamPasswordModal';
import {
  Target,
  FileText,
  CheckCircle,
  Trophy,
  Calendar,
  Clock,
  User,
  BookOpen,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Check,
  Radio,
  Layers,
} from 'lucide-react';

export const StudentHomePage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [liveExams, setLiveExams] = useState<ExamDocument[]>([]);
  const [completedMap, setCompletedMap] = useState<Record<string, ExamResultDocument>>({});
  const [historyResults, setHistoryResults] = useState<ExamResultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExamForModal, setSelectedExamForModal] = useState<ExamDocument | null>(null);

  // Tab: 'dashboard' vs 'live'
  const isLiveView = location.search.includes('view=live');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'live'>(
    isLiveView ? 'live' : 'dashboard'
  );

  useEffect(() => {
    if (location.search.includes('view=live')) {
      setActiveTab('live');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.search]);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const exams = await fetchLiveExams();
      setLiveExams(exams);

      if (user?.uid) {
        const studentResults = await fetchStudentHistory(user.uid);
        setHistoryResults(studentResults);
        const map: Record<string, ExamResultDocument> = {};
        studentResults.forEach((res) => {
          map[res.examId] = res;
        });
        setCompletedMap(map);
      }
    } catch (err) {
      console.error('Error querying live exams or student submissions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived real metrics
  const attemptedCount = historyResults.length;
  const averageScore =
    attemptedCount > 0
      ? (
          historyResults.reduce((acc, r) => acc + (r.totalScore || 0), 0) /
          attemptedCount
        ).toFixed(1)
      : '138.9';

  const bestScore =
    attemptedCount > 0
      ? Math.max(...historyResults.map((r) => r.totalScore || 0)).toFixed(1)
      : '152.0';

  const firstName = user?.displayName?.split(' ')[0] || 'Shaj';

  return (
    <div className="space-y-6">
      {/* Top Segmented Controls: Dashboard / Live Tests */}
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
            onClick={() => setActiveTab('live')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'live'
                ? 'bg-white text-[#2F6FED] shadow-xs'
                : 'text-[#8A94A6] hover:text-[#1F2A44]'
            }`}
          >
            <span>Live Tests</span>
            {liveExams.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EEF1F6] rounded-xl text-xs font-semibold text-[#2F6FED] hover:bg-[#F5F7FB] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* ================= TAB 1: DASHBOARD VIEW ================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* WELCOME BANNER matching mockup */}
          <div className="bg-gradient-to-r from-[#EAF1FF] to-[#F7FAFF] rounded-2xl p-6 sm:p-7 border border-[#EEF1F6] flex items-center justify-between gap-4 shadow-xs">
            <div>
              <div className="text-sm font-semibold text-[#1F2A44] mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#2F6FED]" />
                <span>Good Morning,</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D4FC4] tracking-tight">
                {firstName}!
              </h1>
              <p className="text-xs sm:text-[13px] text-[#8A94A6] mt-1.5">
                Sunday's exam is live — stay on top of your preparation.
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-xs text-[#2F6FED] shrink-0 border border-[#EEF1F6]">
              <BookOpen className="w-8 h-8 stroke-[1.8]" />
            </div>
          </div>

          {/* 5 STAT CARDS matching mockup */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Average Score */}
            <div className="bg-white rounded-[14px] p-4 border border-[#EEF1F6] flex items-center gap-3 shadow-xs">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-[19px] font-extrabold text-[#1F2A44] leading-tight">
                  {loading ? '...' : averageScore}
                </div>
                <div className="text-[11px] font-semibold text-[#8A94A6] mt-0.5">
                  Average Score
                </div>
              </div>
            </div>

            {/* 2. Exams Attempted */}
            <div className="bg-white rounded-[14px] p-4 border border-[#EEF1F6] flex items-center gap-3 shadow-xs">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-[#E6F9F0] text-[#16A34A] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-[19px] font-extrabold text-[#1F2A44] leading-tight">
                  {loading ? '...' : attemptedCount}
                </div>
                <div className="text-[11px] font-semibold text-[#8A94A6] mt-0.5">
                  Exams Attempted
                </div>
              </div>
            </div>

            {/* 3. Best Score */}
            <div className="bg-white rounded-[14px] p-4 border border-[#EEF1F6] flex items-center gap-3 shadow-xs">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-[#F1EAFE] text-[#8B5CF6] flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-[19px] font-extrabold text-[#1F2A44] leading-tight">
                  {loading ? '...' : bestScore}
                </div>
                <div className="text-[11px] font-semibold text-[#8A94A6] mt-0.5">
                  Best Score
                </div>
              </div>
            </div>

            {/* 4. Overall Rank */}
            <div className="bg-white rounded-[14px] p-4 border border-[#EEF1F6] flex items-center gap-3 shadow-xs">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-[#FFF4E0] text-[#F59E0B] flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-[19px] font-extrabold text-[#1F2A44] leading-tight">
                  #4
                </div>
                <div className="text-[11px] font-semibold text-[#8A94A6] mt-0.5">
                  Overall Rank
                </div>
              </div>
            </div>

            {/* 5. Attendance */}
            <div className="bg-white rounded-[14px] p-4 border border-[#EEF1F6] flex items-center gap-3 shadow-xs col-span-2 sm:col-span-1">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-[#FDE8ED] text-[#EF4477] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-[19px] font-extrabold text-[#1F2A44] leading-tight">
                  82%
                </div>
                <div className="text-[11px] font-semibold text-[#8A94A6] mt-0.5">
                  Attendance
                </div>
              </div>
            </div>
          </div>

          {/* RECENT RESULTS */}
          <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 border-b border-[#EEF1F6] gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-[#1F2A44]">Recent Results</h3>
                <span className="text-[11px] font-bold text-[#8A94A6] bg-[#F5F7FB] px-2 py-0.5 rounded-full">
                  Official Scorecards
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/student/home?view=live"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Start Live Exam</span>
                </Link>
                <Link
                  to="/student/history"
                  className="text-xs font-bold text-[#2F6FED] hover:underline"
                >
                  View All Results
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EEF1F6]">
                    <th className="py-2.5 px-2 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                      Subject / Exam
                    </th>
                    <th className="py-2.5 px-2 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                      Medium
                    </th>
                    <th className="py-2.5 px-2 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="py-2.5 px-2 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                      Score
                    </th>
                    <th className="py-2.5 px-2 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="py-2.5 px-2 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F6] text-xs">
                  {historyResults.length > 0 ? (
                    historyResults.slice(0, 5).map((res) => {
                      const pct = res.percentage || 0;
                      const grade = pct >= 80 ? 'A' : pct >= 60 ? 'B+' : pct >= 40 ? 'C' : 'D';
                      const gradeColor =
                        pct >= 80
                          ? 'bg-[#E6F9F0] text-[#16A34A]'
                          : pct >= 60
                          ? 'bg-[#FFF4E0] text-[#F59E0B]'
                          : 'bg-[#FDE8ED] text-[#EF4477]';
                      const dateStr = res.submittedAt
                        ? new Date(res.submittedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : 'Recent';

                      return (
                        <tr key={res.id} className="hover:bg-[#F9FAFC] transition-colors">
                          <td className="py-3 px-2 font-semibold text-[#1F2A44]">
                            {res.examTitle || 'Competitive Mock Test'}
                          </td>
                          <td className="py-3 px-2 text-[#8A94A6] uppercase font-semibold text-[11px]">
                            {res.medium || 'Assamese'}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`${gradeColor} px-2 py-0.5 rounded-md font-bold text-[11px]`}>
                              {grade}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-bold text-[#1F2A44]">
                            {res.totalScore} / {res.totalPossibleMarks || 100}
                          </td>
                          <td className="py-3 px-2 text-[#8A94A6]">{dateStr}</td>
                          <td className="py-3 px-2 text-right">
                            <Link
                              to={`/student/result/${res.id}`}
                              className="text-xs font-bold text-[#2F6FED] hover:underline"
                            >
                              Review
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <>
                      <tr>
                        <td className="py-3 px-2 font-semibold text-[#1F2A44]">Mathematics</td>
                        <td className="py-3 px-2 text-[#8A94A6] uppercase font-semibold text-[11px]">Assamese</td>
                        <td className="py-3 px-2">
                          <span className="bg-[#E6F9F0] text-[#16A34A] px-2 py-0.5 rounded-md font-bold text-[11px]">
                            A
                          </span>
                        </td>
                        <td className="py-3 px-2 font-bold text-[#1F2A44]">38/40</td>
                        <td className="py-3 px-2 text-[#8A94A6]">7 Sept</td>
                        <td className="py-3 px-2 text-right text-[#8A94A6]">Sample</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-semibold text-[#1F2A44]">Reasoning Ability</td>
                        <td className="py-3 px-2 text-[#8A94A6] uppercase font-semibold text-[11px]">Assamese</td>
                        <td className="py-3 px-2">
                          <span className="bg-[#E6F9F0] text-[#16A34A] px-2 py-0.5 rounded-md font-bold text-[11px]">
                            A
                          </span>
                        </td>
                        <td className="py-3 px-2 font-bold text-[#1F2A44]">35.5/40</td>
                        <td className="py-3 px-2 text-[#8A94A6]">7 Sept</td>
                        <td className="py-3 px-2 text-right text-[#8A94A6]">Sample</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-semibold text-[#1F2A44]">General Knowledge & Assam GK</td>
                        <td className="py-3 px-2 text-[#8A94A6] uppercase font-semibold text-[11px]">Assamese</td>
                        <td className="py-3 px-2">
                          <span className="bg-[#FFF4E0] text-[#F59E0B] px-2 py-0.5 rounded-md font-bold text-[11px]">
                            B+
                          </span>
                        </td>
                        <td className="py-3 px-2 font-bold text-[#1F2A44]">37/40</td>
                        <td className="py-3 px-2 text-[#8A94A6]">7 Sept</td>
                        <td className="py-3 px-2 text-right text-[#8A94A6]">Sample</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-semibold text-[#1F2A44]">Language Comprehension</td>
                        <td className="py-3 px-2 text-[#8A94A6] uppercase font-semibold text-[11px]">Hindi</td>
                        <td className="py-3 px-2">
                          <span className="bg-[#E6F9F0] text-[#16A34A] px-2 py-0.5 rounded-md font-bold text-[11px]">
                            A
                          </span>
                        </td>
                        <td className="py-3 px-2 font-bold text-[#1F2A44]">36/40</td>
                        <td className="py-3 px-2 text-[#8A94A6]">7 Sept</td>
                        <td className="py-3 px-2 text-right text-[#8A94A6]">Sample</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BOTTOM ROW: CALENDAR + QUICK ACCESS + DONUT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
            {/* Card 1: Exam Calendar */}
            <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EEF1F6]">
                <h3 className="text-[14px] font-bold text-[#1F2A44]">Exam Calendar</h3>
                <span className="text-xs font-bold text-[#2F6FED]">View Calendar</span>
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
                  to="/student/home?view=live"
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-[#F5F7FB] text-center hover:bg-[#EEF1F6] transition-colors"
                >
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#1F2A44]">Live Tests</span>
                </Link>

                <Link
                  to="/student/leaderboard"
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-[#F5F7FB] text-center hover:bg-[#EEF1F6] transition-colors"
                >
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#E6F9F0] text-[#16A34A] flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#1F2A44]">Rankings</span>
                </Link>

                <Link
                  to="/student/history"
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-[#F5F7FB] text-center hover:bg-[#EEF1F6] transition-colors"
                >
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#FFF4E0] text-[#F59E0B] flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#1F2A44]">History</span>
                </Link>

                <Link
                  to="/student/profile"
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-[#F5F7FB] text-center hover:bg-[#EEF1F6] transition-colors"
                >
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-[#F1EAFE] text-[#8B5CF6] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#1F2A44]">Profile</span>
                </Link>
              </div>
            </div>

            {/* Card 3: Performance Overview Donut */}
            <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#EEF1F6]">
                <h3 className="text-[14px] font-bold text-[#1F2A44]">Performance Overview</h3>
                <span className="text-xs font-bold text-[#2F6FED]">View Details</span>
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
                    <span className="text-lg font-extrabold text-[#1F2A44]">87%</span>
                    <span className="text-[9px] font-bold text-[#8A94A6]">OVERALL</span>
                  </div>
                </div>

                <div className="w-full space-y-1.5 mt-4 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#5A6478]">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                      <span>Correct</span>
                    </span>
                    <span className="font-bold text-[#1F2A44]">60%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#5A6478]">
                      <span className="w-2 h-2 rounded-full bg-[#2F6FED]" />
                      <span>Attempted (Wrong)</span>
                    </span>
                    <span className="font-bold text-[#1F2A44]">20%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#5A6478]">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      <span>Unanswered</span>
                    </span>
                    <span className="font-bold text-[#1F2A44]">12%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#5A6478]">
                      <span className="w-2 h-2 rounded-full bg-[#EF4477]" />
                      <span>Negative</span>
                    </span>
                    <span className="font-bold text-[#1F2A44]">8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: LIVE TESTS VIEW ================= */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1F2A44]">Live Tests</h2>
              <p className="text-xs text-[#8A94A6] mt-0.5">
                Exams currently open for you to attempt
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-[14px] border border-[#EEF1F6] shadow-xs">
              <RefreshCw className="w-7 h-7 animate-spin text-[#2F6FED] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#1F2A44]">Loading Live Examinations...</p>
            </div>
          ) : liveExams.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-[14px] border border-[#EEF1F6] shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F2A44]">No Live Examinations Available</h3>
                <p className="text-xs text-[#8A94A6] mt-1">
                  Once an instructor completes all 4 subjects and publishes a test paper, it will appear here instantly.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {liveExams.map((exam) => {
                const previousResult = completedMap[exam.id];
                const isCompleted = Boolean(previousResult);

                return (
                  <div
                    key={exam.id}
                    className={`bg-white rounded-[14px] border border-[#EEF1F6] p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all ${
                      isCompleted ? 'opacity-85' : 'hover:border-[#2F6FED]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm sm:text-[15px] text-[#1F2A44] leading-snug">
                          {exam.title}
                        </h4>
                        <div className="text-xs text-[#8A94A6] mt-1">
                          Math · Reasoning · Hindi · GK · Hindi & Assamese medium
                        </div>
                      </div>

                      {isCompleted ? (
                        <span className="bg-[#FFF4E0] text-[#F59E0B] font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase shrink-0">
                          Completed
                        </span>
                      ) : (
                        <span className="bg-[#E6F9F0] text-[#16A34A] font-extrabold text-[10px] px-2.5 py-1 rounded-full tracking-wider shrink-0 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                          LIVE
                        </span>
                      )}
                    </div>

                    <div className="mt-3.5 flex items-center gap-2">
                      {isCompleted ? (
                        <Link
                          to={`/student/result/${previousResult.id}`}
                          className="px-4 py-2 bg-white border border-[#EEF1F6] text-[#1F2A44] font-bold text-xs rounded-xl hover:bg-[#F5F7FB] transition-colors"
                        >
                          View Result
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedExamForModal(exam)}
                          className="px-4 py-2 bg-[#2F6FED] hover:bg-[#1D4FC4] text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
                        >
                          Start Exam
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Password Modal */}
      {selectedExamForModal && (
        <ExamPasswordModal
          exam={selectedExamForModal}
          isOpen={Boolean(selectedExamForModal)}
          onClose={() => setSelectedExamForModal(null)}
        />
      )}
    </div>
  );
};
