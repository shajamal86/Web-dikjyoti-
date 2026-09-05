import React, { useState, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  X,
  Filter,
  CheckCircle2,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ExamDocument,
  MediumType,
  SubjectType,
  EXAM_SUBJECTS,
  SUBJECT_LABELS,
  EXAM_MEDIUMS,
  MEDIUM_LABELS,
  QuestionSetDocument,
} from '../../types';
import { getAllExamQuestionSets } from '../../services/examService';
import {
  exportExamQuestionsToCsv,
  triggerCsvDownload,
  CSV_COLUMNS,
} from '../../services/csvExamService';

interface ExportCsvModalProps {
  exam: ExamDocument;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({
  exam,
  isOpen,
  onClose,
}) => {
  const [selectedMedium, setSelectedMedium] = useState<MediumType | 'all'>('all');
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [allQuestionSets, setAllQuestionSets] = useState<QuestionSetDocument[]>([]);
  const [exporting, setExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadQuestionSets();
  }, [isOpen, exam.id]);

  const loadQuestionSets = async () => {
    setLoading(true);
    setDownloadSuccess(false);
    try {
      const sets = await getAllExamQuestionSets(exam.id);
      setAllQuestionSets(sets);
    } catch (err) {
      console.error('Failed to load question sets for export:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter question sets based on selection
  const filteredSets = allQuestionSets.filter((set) => {
    if (selectedMedium !== 'all' && set.medium !== selectedMedium) return false;
    if (selectedSubject !== 'all' && set.subject !== selectedSubject) return false;
    return true;
  });

  const matchingQuestionsCount = filteredSets.reduce(
    (acc, curr) => acc + (curr.questions?.length || 0),
    0
  );

  const totalQuestionsInExam = allQuestionSets.reduce(
    (acc, curr) => acc + (curr.questions?.length || 0),
    0
  );

  const handleExport = async () => {
    if (matchingQuestionsCount === 0) return;
    setExporting(true);
    try {
      const { csvContent, filename, totalExported } = await exportExamQuestionsToCsv(
        exam.id,
        {
          medium: selectedMedium,
          subject: selectedSubject,
          examTitle: exam.title,
        }
      );
      triggerCsvDownload(csvContent, filename);
      setDownloadSuccess(true);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#1B2A4A] text-white p-5 sm:p-6 flex items-start justify-between border-b border-[#253963]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Question Paper Export</span>
            </div>
            <h2 className="font-serif-heading text-xl font-bold">
              Export Questions to CSV
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Export all or filtered questions from <span className="font-semibold text-white">"{exam.title}"</span> in standard 16-column format.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-[#1B2A4A]">
          {/* Format compatibility badge */}
          <div className="bg-[#F8F7F4] p-4 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-[#1B2A4A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Full Cross-Platform Compatibility</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              The downloaded CSV uses the exact same 16-column schema (<code className="text-[#1B2A4A] font-semibold">Subject, Medium, Question, OptionA-D, CorrectOption, Marks, NegativeMarking, Images</code>) and UTF-8 BOM encoding. It is 100% compatible for re-importing into this website, the Dikjyoti Android app, or archiving offline.
            </p>
          </div>

          {/* Filter Options */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Filter Scope</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Medium
                </label>
                <select
                  value={selectedMedium}
                  onChange={(e) => setSelectedMedium(e.target.value as any)}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#D4AF37] outline-hidden"
                >
                  <option value="all">All Mediums (Hindi & Assamese)</option>
                  <option value="hindi">Hindi Only</option>
                  <option value="assamese">Assamese Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value as any)}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#D4AF37] outline-hidden"
                >
                  <option value="all">All Subjects (Math, Reasoning, Hindi, GK)</option>
                  {EXAM_SUBJECTS.map((sub) => (
                    <option key={sub} value={sub}>
                      {SUBJECT_LABELS[sub]} Only
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Question Count Metrics */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1B2A4A] text-[#D4AF37] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  Questions to be Exported
                </div>
                <div className="text-xl font-bold text-[#1B2A4A]">
                  {loading ? 'Counting...' : `${matchingQuestionsCount} Questions`}
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              Total in Exam: <span className="font-semibold text-slate-700">{totalQuestionsInExam} Qs</span>
            </div>
          </div>

          {downloadSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                CSV file downloaded successfully! It can be opened in Excel or re-uploaded anytime.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            disabled={matchingQuestionsCount === 0 || exporting || loading}
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B2A4A] hover:bg-[#253963] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            {exporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>Generating CSV...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-[#D4AF37]" />
                <span>Download CSV ({matchingQuestionsCount} Qs)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
