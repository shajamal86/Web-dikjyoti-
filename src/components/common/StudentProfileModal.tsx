import React, { useState, useEffect } from 'react';
import { fetchStudentAnalytics } from '../../services/analyticsService';
import { getStudentPrivateDetails } from '../../services/studentDetailService';
import { StudentAnalyticsData, StudentPrivateDetails, MEDIUM_LABELS } from '../../types';
import {
  X,
  User,
  Mail,
  Award,
  TrendingUp,
  Clock,
  Sparkles,
  AlertCircle,
  FileText,
  Calendar,
  Key,
  Phone,
  Home,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  studentNameFallback?: string;
  studentEmailFallback?: string;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentNameFallback = 'Student',
  studentEmailFallback = '',
}) => {
  const [data, setData] = useState<StudentAnalyticsData | null>(null);
  const [privateDetails, setPrivateDetails] = useState<StudentPrivateDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      loadStudentData(studentId);
    } else {
      setData(null);
      setPrivateDetails(null);
    }
  }, [isOpen, studentId]);

  const loadStudentData = async (id: string) => {
    setLoading(true);
    try {
      const [analytics, details] = await Promise.all([
        fetchStudentAnalytics(id, studentNameFallback, studentEmailFallback),
        getStudentPrivateDetails(id),
      ]);
      setData(analytics);
      setPrivateDetails(details);
    } catch (err) {
      console.error('Error fetching student modal data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#1B2A4A] text-white p-5 sm:p-6 flex items-center justify-between border-b border-[#253963]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#253963] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] font-bold text-xl">
              {(data?.studentName || studentNameFallback).charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-heading text-lg sm:text-xl font-bold">
                  {data?.studentName || studentNameFallback}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                  Candidate Dossier
                </span>
              </div>
              <p className="text-xs text-slate-300">{data?.studentEmail || studentEmailFallback}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#253963] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-[#1B2A4A] border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs">Fetching candidate analytics records from database...</p>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Unable to load student profile.
            </div>
          ) : (
            <>
              {/* SECTION: Student Registration & Personal Details (Part 6) */}
              {/* Visually separated with dedicated border and headers from performance data */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#1B2A4A]/10 text-[#1B2A4A] flex items-center justify-center">
                      <User className="w-4 h-4 text-[#1B2A4A]" />
                    </div>
                    <div>
                      <h4 className="font-serif-heading font-bold text-[#1B2A4A] text-sm">
                        Candidate Registration Details
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Official contact and residential address submitted during registration
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Confidential Faculty Record
                  </span>
                </div>

                {privateDetails ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                    {/* Mobile Number */}
                    <div className="p-3 rounded-xl bg-[#F8F7F4] border border-slate-200/80">
                      <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                        <Phone className="w-3.5 h-3.5 text-[#1B2A4A]" />
                        <span>Mobile Number</span>
                      </div>
                      <a
                        href={`tel:${privateDetails.mobile}`}
                        className="text-sm font-bold text-[#1B2A4A] hover:text-[#D4AF37] hover:underline flex items-center gap-1"
                      >
                        {privateDetails.mobile}
                      </a>
                      <span className="text-[10px] text-slate-400">Click to dial candidate</span>
                    </div>

                    {/* Father's Name */}
                    <div className="p-3 rounded-xl bg-[#F8F7F4] border border-slate-200/80">
                      <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                        <User className="w-3.5 h-3.5 text-[#1B2A4A]" />
                        <span>Father's Name</span>
                      </div>
                      <div className="text-sm font-bold text-[#1B2A4A] truncate">
                        {privateDetails.fathersName}
                      </div>
                      <span className="text-[10px] text-slate-400">Guardian identity</span>
                    </div>

                    {/* Village */}
                    <div className="p-3 rounded-xl bg-[#F8F7F4] border border-slate-200/80">
                      <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                        <Home className="w-3.5 h-3.5 text-[#1B2A4A]" />
                        <span>Village</span>
                      </div>
                      <div className="text-sm font-bold text-[#1B2A4A] truncate">
                        {privateDetails.village}
                      </div>
                      <span className="text-[10px] text-slate-400">Residential village</span>
                    </div>

                    {/* Post Office (P.O.) */}
                    <div className="p-3 rounded-xl bg-[#F8F7F4] border border-slate-200/80">
                      <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                        <Building className="w-3.5 h-3.5 text-[#1B2A4A]" />
                        <span>P.O. (Post Office)</span>
                      </div>
                      <div className="text-sm font-bold text-[#1B2A4A] truncate">
                        {privateDetails.postOffice}
                      </div>
                      <span className="text-[10px] text-slate-400">Postal delivery division</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/70 text-xs text-amber-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Extended details pending: This student has not yet entered their mobile number, father's name, or village/P.O.
                    </span>
                  </div>
                )}
              </div>

              {/* SECTION: Performance & Marks Data */}
              <div className="flex items-center justify-between pt-2">
                <h4 className="font-serif-heading font-bold text-[#1B2A4A] text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#D4AF37]" />
                  <span>Performance & Examination Marks</span>
                </h4>
                <span className="text-xs text-slate-500">Live aggregate statistics</span>
              </div>

              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Exams Attempted */}
                <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-[#5A6B82] flex items-center justify-between">
                    <span>Exams Attempted</span>
                    <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </div>
                  <div className="text-2xl font-bold text-[#1B2A4A] mt-1">
                    {data.totalExamsAttempted}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Submitted papers</div>
                </div>

                {/* Average Score */}
                <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-[#5A6B82] flex items-center justify-between">
                    <span>Average Score</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    {data.overallAverageScore}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {data.totalScoreObtained} pts obtained
                  </div>
                </div>

                {/* Best Score */}
                <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-[#5A6B82] flex items-center justify-between">
                    <span>Best Score</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </div>
                  <div className="text-2xl font-bold text-[#1B2A4A] mt-1">
                    {data.bestScore > 0 ? `${data.bestScore} pts` : '—'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[140px]">
                    {data.bestExamTitle}
                  </div>
                </div>

                {/* Missed / Pending Exams */}
                <div className="p-4 rounded-xl bg-[#F8F7F4] border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-[#5A6B82] flex items-center justify-between">
                    <span>Live Tests Missed</span>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-amber-800 mt-1">
                    {data.totalExamsNotAttempted}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">From published tests</div>
                </div>
              </div>

              {/* Date-wise History Table */}
              <div className="space-y-3">
                <h4 className="font-serif-heading font-bold text-[#1B2A4A] text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D4AF37]" />
                  <span>Complete Examination History ({data.examHistory.length})</span>
                </h4>

                {data.examHistory.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    This candidate has not attempted any live tests yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8F7F4] text-[#1B2A4A] font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Date Submitted</th>
                          <th className="py-2.5 px-3">Exam Paper</th>
                          <th className="py-2.5 px-3">Medium</th>
                          <th className="py-2.5 px-3">Score</th>
                          <th className="py-2.5 px-3">Percentage</th>
                          <th className="py-2.5 px-3">Rank on Paper</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.examHistory.map((item) => (
                          <tr key={item.resultId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                              {new Date(item.submittedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-[#1B2A4A]">
                              {item.examTitle}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px]">
                                {MEDIUM_LABELS[item.medium]}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[#1B2A4A]">
                              {item.score} / {item.totalPossibleMarks}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-emerald-700">
                              {item.percentage}%
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
                                Rank #{item.rankOnExam} of {item.totalParticipantsOnExam}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* UID info footer */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Firebase Student UID: {data.studentId}</span>
                <span>System Verified</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#F8F7F4] px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
