import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExamDocument, MediumType, MEDIUM_LABELS } from '../../types';
import { verifyExamPassword } from '../../services/studentExamService';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Languages,
  X,
} from 'lucide-react';

interface ExamPasswordModalProps {
  exam: ExamDocument;
  isOpen: boolean;
  onClose: () => void;
}

export const ExamPasswordModal: React.FC<ExamPasswordModalProps> = ({
  exam,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  // Get only enabled mediums
  const availableMediums: MediumType[] = [];
  if (exam.mediums.hindi?.enabled) availableMediums.push('hindi');
  if (exam.mediums.assamese?.enabled) availableMediums.push('assamese');

  const [selectedMedium, setSelectedMedium] = useState<MediumType>(
    availableMediums[0] || 'hindi'
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the password provided for this medium.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyExamPassword(exam.id, selectedMedium, password.trim());
      if (!res.success) {
        setError(res.error || 'Incorrect password. Please verify the code and try again.');
        setLoading(false);
        return;
      }

      // Success: proceed to the timed exam page with selected medium
      navigate(`/student/exam/${exam.id}?medium=${selectedMedium}`);
    } catch (err: any) {
      setError(err.message || 'Server validation error. Please try again.');
      setLoading(false);
    }
  };

  const totalMinutes =
    (exam.subjectDurations?.math || 15) +
    (exam.subjectDurations?.reasoning || 15) +
    (exam.subjectDurations?.hindi || 15) +
    (exam.subjectDurations?.gk || 15);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-[#1B2A4A] p-6 text-white relative">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37] tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Entry Verification</span>
          </div>
          <h2 className="text-xl font-bold font-serif-heading text-white line-clamp-1">
            {exam.title}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Choose your examination language medium and input the access passcode.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Exam Summary Info */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 text-[#D4AF37]" />
              <span>Total Duration: <strong>{totalMinutes} mins</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Languages className="w-4 h-4 text-[#D4AF37]" />
              <span>4 Fixed Subjects</span>
            </div>
          </div>

          {/* Medium Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
              1. Select Test Medium
            </label>
            {availableMediums.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                No mediums are currently configured for this examination.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableMediums.map((med) => {
                  const isSelected = selectedMedium === med;
                  return (
                    <button
                      type="button"
                      key={med}
                      onClick={() => {
                        setSelectedMedium(med);
                        setError(null);
                      }}
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-[#1B2A4A] bg-[#1B2A4A]/5 ring-2 ring-[#1B2A4A]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-[#1B2A4A]">
                          {MEDIUM_LABELS[med]}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {med === 'hindi' ? 'हिंदी माध्यम' : 'অসমীয়া মাধ্যম'}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#1B2A4A]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
              2. Enter Medium Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={`Enter passcode for ${MEDIUM_LABELS[selectedMedium]}`}
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent text-sm bg-white"
                autoComplete="off"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Obtain the medium-specific password from your designated invigilator or course instructor.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || availableMediums.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span>Validating Passcode...</span>
                </>
              ) : (
                <span>Unlock & Begin Exam</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
