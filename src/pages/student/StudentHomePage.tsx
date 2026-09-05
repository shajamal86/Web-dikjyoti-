import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ExamDocument, ExamResultDocument } from '../../types';
import {
  fetchLiveExams,
  fetchStudentHistory,
} from '../../services/studentExamService';
import { ExamPasswordModal } from '../../components/student/ExamPasswordModal';
import {
  BookOpen,
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  Globe,
  RefreshCw,
  Lock,
  Layers,
  Check,
} from 'lucide-react';

export const StudentHomePage: React.FC = () => {
  const { user } = useAuth();
  const [liveExams, setLiveExams] = useState<ExamDocument[]>([]);
  const [completedMap, setCompletedMap] = useState<Record<string, ExamResultDocument>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExamForModal, setSelectedExamForModal] = useState<ExamDocument | null>(null);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch live exams fresh from Firestore
      const exams = await fetchLiveExams();
      setLiveExams(exams);

      // 2. Fetch student's completed results to determine completed vs new exams
      if (user?.uid) {
        const studentResults = await fetchStudentHistory(user.uid);
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

  const attemptedCount = Object.keys(completedMap).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Header matching mockup who & ttl */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold tracking-wider text-[#9B93A8] uppercase">
            STUDENT: {user?.displayName || 'ASPIRANT'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#241748] tracking-tight mt-0.5">
            Live Tests
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#ECE7F5] text-xs font-bold text-[#5B2E9E] hover:bg-[#EDE1FA]/50 transition-colors shadow-xs"
            title="Refresh live exam roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh List'}</span>
          </button>
          <Link
            to="/student/history"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B2E9E] hover:bg-[#4d2487] text-xs font-bold text-white transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>History</span>
          </Link>
        </div>
      </div>

      {/* Start.io Sponsored Announcement Banner */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#ECE7F5] shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-[#D1467B] tracking-wider">AD · START.IO</span>
          <span className="text-[9px] text-[#9B93A8]">App ID: 208573210</span>
        </div>
        <div className="text-xs sm:text-sm font-bold text-[#5B2E9E] mt-1">
          ⚡ Dikjyoti Physical Academy & Coaching | Batch Admissions Open
        </div>
        <p className="text-[11px] text-[#9B93A8] mt-0.5 leading-snug">
          Join offline physical training batches with ex-defense instructors in Assam. High success rates for SSC-GD, Assam Police & Agniveer.
        </p>
      </div>

      {/* Quick Metric Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#ECE7F5] shadow-xs">
          <div className="text-[10px] font-bold text-[#9B93A8] uppercase tracking-wider">
            Live Tests
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#3E2072] mt-0.5">
            {loading ? '...' : `${liveExams.length}`}
          </div>
          <div className="text-[10px] text-[#2C9A5B] mt-0.5 flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3 h-3" /> Ready to attempt
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#ECE7F5] shadow-xs">
          <div className="text-[10px] font-bold text-[#9B93A8] uppercase tracking-wider">
            Completed
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#3E2072] mt-0.5">
            {attemptedCount}
          </div>
          <div className="text-[10px] text-[#9B93A8] mt-0.5">Evaluated & archived</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#ECE7F5] shadow-xs">
          <div className="text-[10px] font-bold text-[#9B93A8] uppercase tracking-wider">
            Mediums
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[#3E2072] mt-1">
            Hindi • Assamese
          </div>
          <div className="text-[10px] text-[#9B93A8] mt-0.5">Passcode secured</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#ECE7F5] shadow-xs">
          <div className="text-[10px] font-bold text-[#9B93A8] uppercase tracking-wider">
            Subjects
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[#5B2E9E] mt-1">
            Math · Res · Hin · GK
          </div>
          <div className="text-[10px] text-[#9B93A8] mt-0.5">4 Sections timed</div>
        </div>
      </div>

      {/* Live Tests Section */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#ECE7F5] shadow-xs">
            <RefreshCw className="w-8 h-8 animate-spin text-[#5B2E9E] mx-auto mb-3" />
            <p className="text-sm font-bold text-[#241748]">Loading Live Examinations...</p>
            <p className="text-xs text-[#9B93A8] mt-1">Connecting directly to test servers</p>
          </div>
        ) : liveExams.length === 0 ? (
          /* Honest Empty State */
          <div className="p-12 text-center bg-white rounded-2xl border border-[#ECE7F5] shadow-xs space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#EDE1FA] text-[#5B2E9E] flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-bold text-[#241748]">
                No Live Examinations Available
              </h3>
              <p className="text-xs text-[#9B93A8] mt-1.5 leading-relaxed">
                There are currently no active tests published by the faculty. Once an instructor completes all 4 subjects and publishes a test paper, it will appear here instantly.
              </p>
            </div>
            <div className="pt-1">
              <button
                onClick={() => loadData(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#5B2E9E] hover:bg-[#4d2487] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Again for Live Tests</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveExams.map((exam) => {
              const totalDuration =
                (exam.subjectDurations?.math || 15) +
                (exam.subjectDurations?.reasoning || 15) +
                (exam.subjectDurations?.hindi || 15) +
                (exam.subjectDurations?.gk || 15);

              const availableMediums: string[] = [];
              if (exam.mediums?.hindi?.enabled) availableMediums.push('Hindi');
              if (exam.mediums?.assamese?.enabled) availableMediums.push('Assamese');

              const previousResult = completedMap[exam.id];
              const isCompleted = Boolean(previousResult);

              return (
                <div
                  key={exam.id}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm ${
                    isCompleted
                      ? 'border-[#ECE7F5] bg-[#FAF9FD]'
                      : 'border-[#ECE7F5]'
                  }`}
                >
                  <div>
                    {/* Top Row: Title & Live Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm sm:text-[15px] text-[#241748] leading-snug line-clamp-2">
                          {exam.title}
                        </h3>
                        <div className="text-[11px] text-[#9B93A8] mt-0.5">
                          80 Questions · {totalDuration} Mins · 160 Marks
                        </div>
                      </div>
                      {isCompleted ? (
                        <span className="bg-[#F0EDF7] text-[#9B93A8] font-bold text-[10px] px-2.5 py-1 rounded-md shrink-0">
                          DONE
                        </span>
                      ) : (
                        <span className="bg-[#E3F7EA] text-[#2C9A5B] font-extrabold text-[10px] px-2 py-0.5 rounded-md tracking-wider shrink-0 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2C9A5B]"></span>
                          LIVE
                        </span>
                      )}
                    </div>

                    {/* Subject Tags Strip matching mockup */}
                    <div className="mt-2.5 text-[11px] text-[#5B2E9E] font-semibold">
                      Math · Reasoning · Hindi · GK
                    </div>

                    {/* Details list */}
                    <div className="mt-3 pt-2.5 border-t border-[#ECE7F5] space-y-1.5 text-xs text-[#9B93A8]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-[#9B6FE0]" />
                          Mediums:
                        </span>
                        <span className="font-bold text-[#241748]">
                          {availableMediums.join(' & ') || 'Hindi'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#9B6FE0]" />
                          Sections:
                        </span>
                        <span className="font-medium text-[#241748]">
                          M({exam.subjectDurations?.math}m) R({exam.subjectDurations?.reasoning}m) H({exam.subjectDurations?.hindi}m) GK({exam.subjectDurations?.gk}m)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action CTA buttons matching mockup */}
                  <div className="mt-4 pt-3 border-t border-[#ECE7F5]">
                    {isCompleted ? (
                      <div className="space-y-2">
                        <div className="py-1 px-2 bg-[#E3F7EA] rounded-xl text-center">
                          <span className="text-[11px] text-[#2C9A5B] font-bold">
                            Score: {previousResult.totalScore} / {previousResult.totalPossibleMarks} ({previousResult.percentage}%)
                          </span>
                        </div>
                        <Link
                          to={`/student/result/${previousResult.id}`}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 border-[1.5px] border-[#9B6FE0] text-[#5B2E9E] hover:bg-[#FAF6FF] text-xs font-bold rounded-xl transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Result</span>
                        </Link>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedExamForModal(exam)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#5B2E9E] hover:bg-[#4d2487] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                      >
                        <Lock className="w-3.5 h-3.5 text-[#F5A8C6]" />
                        <span>Start Exam</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Candidate Regulations Banner */}
      <div className="bg-[#FAF6FF] border border-[#ECE7F5] rounded-2xl p-4 text-xs text-[#241748] flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#5B2E9E] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-[#3E2072]">Important Examination Regulations:</p>
          <ul className="list-disc list-inside text-[#9B93A8] space-y-0.5 leading-relaxed text-[11px]">
            <li><strong>Subject Timers are Real-Time:</strong> Timers are anchored to real wall-clock time. If you close your tab or lose connection, time continues counting down.</li>
            <li><strong>Strict Sequence:</strong> Order is fixed: Math → Reasoning → Hindi → GK. Once a subject timer expires or is submitted, it locks permanently.</li>
            <li><strong>Automatic Synchronization:</strong> Answer selections are saved immediately to ensure responses are preserved across any network interruption.</li>
          </ul>
        </div>
      </div>

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
