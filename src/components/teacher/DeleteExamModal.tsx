import React, { useState } from 'react';
import { Trash2, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { ExamDocument } from '../../types';
import { deleteExam } from '../../services/examService';

interface DeleteExamModalProps {
  exam: ExamDocument;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedExamId: string) => void;
}

export const DeleteExamModal: React.FC<DeleteExamModalProps> = ({
  exam,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteExam(exam.id);
      onSuccess(exam.id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete exam');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-red-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-800 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="font-serif-heading text-lg font-bold">
                Delete Examination Paper
              </h2>
              <span className="text-[11px] text-red-200">
                Permanent exam removal
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-red-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-[#1B2A4A]">
          <p className="text-xs text-slate-700 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-[#1B2A4A]">"{exam.title}"</strong>?
          </p>

          {/* Student Results Safety Guarantee Notice */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1.5 text-xs text-emerald-900">
            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Student Result History Preserved:</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              All question documents in this exam will be removed from Firestore. However,{' '}
              <strong>all historical examinee results and rankings remain permanently intact</strong>{' '}
              in student gradebooks.
            </p>
          </div>

          <p className="text-[11px] text-slate-500">
            Status: <span className="font-semibold text-slate-700">{exam.status === 'live' ? 'Live Exam' : 'Draft'}</span> • Created on {new Date(exam.createdAt).toLocaleDateString()}
          </p>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Exam & Questions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
