import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ExamResultDocument, MEDIUM_LABELS } from '../../types';
import { fetchStudentHistory } from '../../services/studentExamService';
import {
  History,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  ArrowRight,
  Award,
  TrendingUp,
  Percent,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<ExamResultDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const records = await fetchStudentHistory(user.uid);
      setHistory(records);
    } catch (err) {
      console.error('Failed to load student history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user?.uid]);

  const totalAttempted = history.length;
  const averageScore =
    totalAttempted > 0
      ? Math.round(
          history.reduce((acc, curr) => acc + (curr.totalScore || 0), 0) / totalAttempted
        )
      : 0;
  const bestScore =
    totalAttempted > 0
      ? Math.max(...history.map((h) => h.totalScore || 0))
      : 0;
  const averagePercentage =
    totalAttempted > 0
      ? Math.round(
          history.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalAttempted
        )
      : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Top Header */}
      <div>
        <div className="text-[11px] font-bold tracking-wider text-[#9B93A8] uppercase">
          YOUR ATTEMPTS
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#241748] tracking-tight">
          Exam History
        </h1>
      </div>

      {/* 4 Stat Boxes matching mockup .grid-2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-2xl p-3 border border-[#ECE7F5] text-center shadow-xs">
          <div className="text-xl sm:text-2xl font-extrabold text-[#3E2072]">{totalAttempted}</div>
          <div className="text-[10px] text-[#9B93A8] font-bold uppercase tracking-wider mt-0.5">
            Total Exams
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#ECE7F5] text-center shadow-xs">
          <div className="text-xl sm:text-2xl font-extrabold text-[#3E2072]">{averageScore}</div>
          <div className="text-[10px] text-[#9B93A8] font-bold uppercase tracking-wider mt-0.5">
            Avg Score
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#ECE7F5] text-center shadow-xs">
          <div className="text-xl sm:text-2xl font-extrabold text-[#3E2072]">{bestScore}</div>
          <div className="text-[10px] text-[#9B93A8] font-bold uppercase tracking-wider mt-0.5">
            Best Score
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#ECE7F5] text-center shadow-xs">
          <div className="text-xl sm:text-2xl font-extrabold text-[#5B2E9E]">{averagePercentage}%</div>
          <div className="text-[10px] text-[#9B93A8] font-bold uppercase tracking-wider mt-0.5">
            Avg Accuracy
          </div>
        </div>
      </div>

      {/* Past Exam Attempts Label */}
      <div className="text-xs font-bold text-[#9B93A8] pt-2 uppercase tracking-wider">
        PAST EXAM ATTEMPTS
      </div>

      {/* Scorecards List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#ECE7F5] p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-[#3E2072] border-t-[#F5A8C6] rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-[#9B93A8]">Loading your past attempts...</p>
        </div>
      ) : history.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-[#ECE7F5] p-8 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#EDE1FA] text-[#5B2E9E] mx-auto flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#241748]">
            No Examinations Attempted Yet
          </h3>
          <p className="text-xs text-[#9B93A8] max-w-sm mx-auto leading-relaxed">
            You haven't completed any tests yet. Take a live test to see your scorecards and performance breakdown here.
          </p>
          <div>
            <Link
              to="/student/home"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5B2E9E] hover:bg-[#4d2487] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <span>Explore Live Tests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((record) => {
            const submittedDate = new Date(record.submittedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Link
                key={record.id}
                to={`/student/result/${record.id}`}
                className="block bg-white rounded-2xl p-3.5 border border-[#ECE7F5] hover:border-[#9B6FE0] shadow-xs transition-all hover:bg-[#FAF9FD]"
              >
                <div className="flex justify-between items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-[#9B93A8] uppercase tracking-wider font-semibold">
                      {submittedDate} · {MEDIUM_LABELS[record.medium]}
                    </div>
                    <div className="font-bold text-xs sm:text-[13px] text-[#241748] truncate mt-0.5">
                      {record.examTitle}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-sm text-[#3E2072]">
                      {record.totalScore}/{record.totalPossibleMarks}
                    </div>
                    <div className="text-[10px] text-[#5B2E9E] font-bold">
                      {record.percentage}% Acc
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
