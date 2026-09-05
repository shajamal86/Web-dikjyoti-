import React, { useState } from 'react';
import { Copy, X, ArrowRight, ShieldAlert, Check } from 'lucide-react';
import { ExamDocument } from '../../types';
import { duplicateExam } from '../../services/examService';

interface DuplicateExamModalProps {
  exam: ExamDocument;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newExam: ExamDocument) => void;
  teacherId: string;
  teacherName: string;
}

export const DuplicateExamModal: React.FC<DuplicateExamModalProps> = ({
  exam,
  isOpen,
  onClose,
  onSuccess,
  teacherId,
  teacherName,
}) => {
  const [newTitle, setNewTitle] = useState(`${exam.title} (Copy)`);
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError('Please provide a title for the duplicated exam');
      return;
    }

    setDuplicating(true);
    setError(null);
    try {
      const duplicated = await duplicateExam(
        exam.id,
        teacherId,
        teacherName,
        newTitle.trim()
      );
      onSuccess(duplicated);
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate exam');
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#1B2A4A] text-white p-5 flex items-start justify-between border-b border-[#253963]">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-1">
              <Copy className="w-4 h-4" />
              <span>Clone Examination</span>
            </div>
            <h2 className="font-serif-heading text-lg font-bold">
              Duplicate Exam Structure & Questions
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleDuplicate} className="p-6 space-y-4 text-[#1B2A4A]">
          <div className="bg-[#F8F7F4] p-3.5 rounded-xl border border-slate-200 text-xs text-[#5A6B82] space-y-2">
            <p className="font-semibold text-[#1B2A4A]">
              What will be copied:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
              <li>Subject durations (Math, Reasoning, Hindi, GK)</li>
              <li>All authored question arrays across both Hindi & Assamese</li>
              <li>Saved as a new <strong>Draft</strong></li>
            </ul>
            <div className="flex items-start gap-1.5 text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px] mt-2">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Medium passwords will be reset. You must configure new medium passwords before this duplicate can be published live.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Title for Duplicated Exam
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#D4AF37] outline-hidden font-medium text-[#1B2A4A]"
              placeholder="e.g. State Mock Test 2"
              required
            />
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={duplicating || !newTitle.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B2A4A] hover:bg-[#253963] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              {duplicating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Duplicating...</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Create Duplicate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
