import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExamResultDocument, SUBJECT_LABELS, MEDIUM_LABELS, EXAM_SUBJECTS } from '../../types';
import { getExamResult } from '../../services/studentExamService';
import { AdsterraAdBanner } from '../../components/common/AdsterraAdBanner';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Printer,
  ArrowLeft,
  FileText,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Percent,
  Check,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

export const StudentResultPage: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const [result, setResult] = useState<ExamResultDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  useEffect(() => {
    if (!resultId) return;

    const loadResult = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getExamResult(resultId);
        if (!data) {
          setError('Scorecard record not found.');
        } else {
          setResult(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load evaluation scorecard.');
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [resultId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#1B2A4A] border-t-[#D4AF37] rounded-full animate-spin"></div>
        <h2 className="text-base font-serif-heading font-bold text-[#1B2A4A]">
          Retrieving Official Scorecard...
        </h2>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold font-serif-heading text-[#1B2A4A]">
          Scorecard Unavailable
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
        <div className="pt-2">
          <Link
            to="/student/home"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B2A4A] text-white text-xs font-semibold rounded-lg hover:bg-[#253963]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Student Home</span>
          </Link>
        </div>
      </div>
    );
  }

  const [showSolutions, setShowSolutions] = useState(false);

  // Filter review questions by subject tab if selected
  const filteredQuestions =
    selectedSubjectFilter === 'all'
      ? result.questionsReview || []
      : (result.questionsReview || []).filter((q) => q.subject === selectedSubjectFilter);

  const totalCorrect = EXAM_SUBJECTS.reduce((acc, subj) => acc + (result.subjectBreakdown[subj]?.correctCount || 0), 0);
  const totalIncorrect = EXAM_SUBJECTS.reduce((acc, subj) => acc + (result.subjectBreakdown[subj]?.incorrectCount || 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/student/home"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#5B2E9E] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Live Tests</span>
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ECE7F5] bg-white text-xs font-bold text-[#5B2E9E] hover:bg-[#EDE1FA]/50 transition-colors print:hidden"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>
      </div>

      {/* Hero Score Card matching mockup .score-card */}
      <div
        className="rounded-2xl text-white p-5 text-center shadow-xs"
        style={{
          background: 'linear-gradient(145deg, #3E2072, #5B2E9E)',
        }}
      >
        <div className="text-[11px] opacity-80 font-bold uppercase tracking-wider">
          {result.examTitle} · RESULT
        </div>
        <div className="text-4xl sm:text-5xl font-extrabold my-2 leading-none">
          {result.totalScore}
          <span className="text-lg font-semibold opacity-80">/{result.totalPossibleMarks}</span>
        </div>
        <div className="text-xs font-bold text-[#F5A8C6] mt-1">
          Accuracy: {result.accuracy}% · {result.studentName}
        </div>
      </div>

      {/* Subject Scores Card matching mockup .row pattern */}
      <div className="bg-white rounded-2xl p-4 border border-[#ECE7F5] shadow-xs">
        <div className="font-extrabold text-xs text-[#9B93A8] mb-2 tracking-wider uppercase">
          SUBJECT SCORES
        </div>
        <div className="divide-y divide-[#F0EDF7]">
          {EXAM_SUBJECTS.map((subj) => {
            const data = result.subjectBreakdown[subj];
            if (!data) return null;
            return (
              <div key={subj} className="flex items-center justify-between py-2 text-xs">
                <span className="font-medium text-[#241748]">
                  {SUBJECT_LABELS[subj]} ({data.correctCount}/{data.correctCount + data.incorrectCount + data.unattemptedCount})
                </span>
                <b className="font-extrabold text-[#3E2072] text-sm">
                  {data.obtainedMarks.toFixed(1)} pts
                </b>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid-2 Stat Box matching mockup */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-[#ECE7F5] text-center shadow-xs">
          <div className="text-2xl font-extrabold text-[#2C9A5B]">
            {totalCorrect}
          </div>
          <div className="text-[10px] text-[#9B93A8] font-bold mt-0.5 uppercase tracking-wider">
            Correct
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-[#ECE7F5] text-center shadow-xs">
          <div className="text-2xl font-extrabold text-[#D63031]">
            {totalIncorrect}
          </div>
          <div className="text-[10px] text-[#9B93A8] font-bold mt-0.5 uppercase tracking-wider">
            Incorrect
          </div>
        </div>
      </div>

      {/* Action Buttons matching mockup */}
      <div className="flex gap-2.5">
        <button
          onClick={() => setShowSolutions(!showSolutions)}
          className="flex-1 py-2.5 px-4 bg-[#5B2E9E] hover:bg-[#4d2487] text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
        >
          {showSolutions ? 'Hide Solutions' : 'View Solutions'}
        </button>
        <Link
          to="/student/leaderboard"
          className="flex-1 py-2.5 px-4 bg-[#F5A8C6] hover:bg-[#efa1bf] text-[#3E2072] font-extrabold text-xs rounded-xl transition-colors text-center shadow-xs flex items-center justify-center"
        >
          Leaderboard
        </Link>
      </div>

      {/* Adsterra 300x250 Ad Banner */}
      <div className="py-2 flex justify-center">
        <AdsterraAdBanner />
      </div>

      {/* Detailed Solutions Section */}
      {showSolutions && (
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#241748]">
              Solutions & Answer Key
            </h3>
            {/* Subject Tabs */}
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => setSelectedSubjectFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  selectedSubjectFilter === 'all'
                    ? 'bg-[#3E2072] text-white'
                    : 'bg-white border border-[#ECE7F5] text-[#9B93A8]'
                }`}
              >
                All
              </button>
              {EXAM_SUBJECTS.map((subj) => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubjectFilter(subj)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    selectedSubjectFilter === subj
                      ? 'bg-[#3E2072] text-white'
                      : 'bg-white border border-[#ECE7F5] text-[#9B93A8]'
                  }`}
                >
                  {SUBJECT_LABELS[subj]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredQuestions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="bg-white rounded-2xl border border-[#ECE7F5] p-4 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#F0EDF7]">
                  <span className="font-bold text-[#5B2E9E]">
                    Q. {q.questionIndex || idx + 1} · {SUBJECT_LABELS[q.subject]}
                  </span>
                  <span className="text-[11px] font-bold text-[#2C9A5B] bg-[#E3F7EA] px-2 py-0.5 rounded-md">
                    Correct: Option {q.correctOption?.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-[#241748] leading-relaxed">
                  {q.text}
                </p>

                {q.imageUrl && (
                  <div className="p-2 border border-[#ECE7F5] rounded-xl bg-[#FAF9FD] inline-block">
                    <img
                      src={q.imageUrl}
                      alt={`Q${q.questionIndex}`}
                      className="max-h-48 object-contain rounded"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {(['a', 'b', 'c', 'd'] as const).map((optKey) => {
                    const opt = q.options[optKey];
                    if (!opt) return null;
                    const isCorrect = q.correctOption?.toLowerCase() === optKey;

                    return (
                      <div
                        key={optKey}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                          isCorrect
                            ? 'border-[#2C9A5B] bg-[#E3F7EA]/50 text-[#196b3d] font-bold'
                            : 'border-[#ECE7F5] bg-[#FAF9FD] text-[#241748]'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] ${
                            isCorrect
                              ? 'bg-[#2C9A5B] text-white'
                              : 'bg-white border border-[#ECE7F5] text-[#9B93A8]'
                          }`}
                        >
                          {optKey.toUpperCase()}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
