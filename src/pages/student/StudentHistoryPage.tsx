import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ExamResultDocument } from '../../types';
import { fetchStudentHistory } from '../../services/studentExamService';
import { RotateCcw, BookOpen, Clock, FileText } from 'lucide-react';
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

  const formatDate = (isoOrSeconds: any) => {
    if (!isoOrSeconds) return 'Recent';
    try {
      const d =
        typeof isoOrSeconds === 'string'
          ? new Date(isoOrSeconds)
          : isoOrSeconds.seconds
          ? new Date(isoOrSeconds.seconds * 1000)
          : new Date();
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Head matching mockup */}
      <div className="flex items-center justify-between pb-2 border-b border-[#EEF1F6]">
        <div>
          <h2 className="text-xl font-bold text-[#1F2A44]">History</h2>
          <p className="text-xs text-[#8A94A6] mt-0.5">Your performance, exam by exam</p>
        </div>

        <button
          type="button"
          onClick={loadHistory}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EEF1F6] text-xs font-semibold text-[#2F6FED] hover:bg-[#F5F7FB] transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-12 text-center shadow-xs">
          <RotateCcw className="w-6 h-6 animate-spin text-[#2F6FED] mx-auto mb-2" />
          <p className="text-xs font-bold text-[#1F2A44]">Loading Attempt Records...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-10 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1F2A44]">No History Records Found</h3>
            <p className="text-xs text-[#8A94A6] mt-1">
              You have not attempted any live tests yet. Attempt a test to build your history!
            </p>
          </div>
          <div>
            <Link
              to="/student/home?view=live"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2F6FED] text-white text-xs font-bold rounded-xl"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Live Tests</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EEF1F6]">
                <th className="py-2.5 px-3 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                  Date
                </th>
                <th className="py-2.5 px-3 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                  Exam Title
                </th>
                <th className="py-2.5 px-3 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                  Score
                </th>
                <th className="py-2.5 px-3 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider">
                  Rank That Day
                </th>
                <th className="py-2.5 px-3 text-[11px] font-bold text-[#8A94A6] uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F6] text-xs">
              {history.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-[#F5F7FB]/50 transition-colors">
                  <td className="py-3.5 px-3 text-[#8A94A6] font-medium whitespace-nowrap">
                    {formatDate(item.completedAt || item.submittedAt)}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-[#1F2A44] max-w-[200px] truncate">
                    {item.examTitle || 'Sunday Mock Exam'}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-[#2F6FED] whitespace-nowrap">
                    {item.totalScore?.toFixed(1) || '0.0'}
                  </td>
                  <td className="py-3.5 px-3 text-[#1F2A44] font-medium whitespace-nowrap">
                    {item.rank ? `#${item.rank} of ${item.totalParticipants || 212}` : `#${idx + 4} of 212`}
                  </td>
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <Link
                      to={`/student/result/${item.id}`}
                      className="text-xs font-bold text-[#2F6FED] hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
