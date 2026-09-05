import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listTeacherExams } from '../../services/examService';
import { ExamDocument } from '../../types';
import {
  BookOpen,
  PlusCircle,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Globe,
  Trash2,
  Upload,
  Download,
  Copy,
  FileSpreadsheet,
  Filter,
  Sparkles,
  Layers,
  Search,
} from 'lucide-react';
import { BulkUploadModal } from '../../components/teacher/BulkUploadModal';
import { ExportCsvModal } from '../../components/teacher/ExportCsvModal';
import { DuplicateExamModal } from '../../components/teacher/DuplicateExamModal';
import { DeleteExamModal } from '../../components/teacher/DeleteExamModal';
import {
  generateTestSampleCsvWithErrors,
  triggerCsvDownload,
} from '../../services/csvExamService';

export const TeacherHomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'drafts' | 'live'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [bulkUploadExam, setBulkUploadExam] = useState<ExamDocument | null>(null);
  const [exportExam, setExportExam] = useState<ExamDocument | null>(null);
  const [duplicateExamTarget, setDuplicateExamTarget] = useState<ExamDocument | null>(null);
  const [deleteExamTarget, setDeleteExamTarget] = useState<ExamDocument | null>(null);

  // Quick feedback toast
  const [bannerToast, setBannerToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadExams();
  }, [user]);

  const loadExams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await listTeacherExams(user.uid);
      setExams(list);
    } catch (err) {
      console.error('Error fetching teacher exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setBannerToast({ message, type });
    setTimeout(() => setBannerToast(null), 5000);
  };

  const activeCount = exams.filter((e) => e.status === 'live').length;
  const draftCount = exams.filter((e) => e.status === 'draft').length;
  const totalQuestionsSum = exams.reduce(
    (acc, curr) =>
      acc + (curr.mediums?.hindi?.totalQuestions || 0) + (curr.mediums?.assamese?.totalQuestions || 0),
    0
  );

  // Filtered list based on active tab and search query
  const filteredExams = exams.filter((exam) => {
    if (activeTab === 'drafts' && exam.status !== 'draft') return false;
    if (activeTab === 'live' && exam.status !== 'live') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return exam.title.toLowerCase().includes(q) || (exam.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleDownloadVerificationSample = () => {
    const sample = generateTestSampleCsvWithErrors();
    triggerCsvDownload(sample, 'Dikjyoti_Verification_10Valid_2Broken.csv');
    showToast('Downloaded sample CSV (10 valid + 2 broken rows) for verification testing.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Feedback */}
      {bannerToast && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-sm transition-all ${
            bannerToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{bannerToast.message}</span>
          </div>
          <button
            onClick={() => setBannerToast(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Teacher Masthead */}
      <div className="bg-[#1B2A4A] text-white p-6 sm:p-8 rounded-xl border border-[#253963] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-semibold tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Faculty Examination Portal</span>
          </div>
          <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold">
            Welcome, {user?.displayName || 'Teacher'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Create 4-subject exam papers (Math, Reasoning, Hindi, GK), import bulk question spreadsheets, export CSV backups, and manage drafts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={handleDownloadVerificationSample}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#253963] hover:bg-[#2e477c] text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-[#D4AF37]/30 shadow-xs"
            title="Download test CSV with 10 valid and 2 broken rows to test validation"
          >
            <Download className="w-4 h-4 text-[#D4AF37]" />
            <span>Sample Test CSV</span>
          </button>

          <Link
            to="/teacher/create-exam"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c4a12f] text-[#1B2A4A] text-xs font-bold rounded-lg transition-colors shadow-sm self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Exam Wizard</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-[#5A6B82] uppercase tracking-wider">
            Total Exams
          </div>
          <div className="text-2xl font-bold text-[#1B2A4A] mt-1">{exams.length} Papers</div>
          <div className="text-[11px] text-[#D4AF37] mt-1 font-medium">
            {activeCount} Live • {draftCount} Drafts
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-[#5A6B82] uppercase tracking-wider">
            Questions Authored
          </div>
          <div className="text-2xl font-bold text-[#1B2A4A] mt-1">{totalQuestionsSum} Qs</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">Array-document storage</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-[#5A6B82] uppercase tracking-wider">
            Bulk CSV Tools
          </div>
          <div className="text-2xl font-bold text-[#1B2A4A] mt-1">Ready</div>
          <div className="text-[11px] text-slate-400 mt-1">Upload & Export enabled</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-[#5A6B82] uppercase tracking-wider">
            Student Data Integrity
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">Guaranteed</div>
          <div className="text-[11px] text-slate-400 mt-1">Results preserved on delete</div>
        </div>
      </div>

      {/* Exam Papers Table with Draft Filter Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-serif-heading text-lg font-bold text-[#1B2A4A]">
                Managed Examination Papers
              </h2>
              <p className="text-xs text-[#5A6B82]">
                Resume in-progress drafts, import bulk spreadsheets, export question papers, or duplicate structures
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadExams}
                className="text-xs font-semibold text-[#1B2A4A] hover:text-[#D4AF37] px-3 py-1.5 bg-[#F8F7F4] rounded-lg border border-slate-200 transition-colors shadow-2xs"
              >
                Refresh List
              </button>
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Draft list tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-[#1B2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-[#1B2A4A]'
                }`}
              >
                All Papers ({exams.length})
              </button>

              <button
                onClick={() => setActiveTab('drafts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'drafts'
                    ? 'bg-amber-100 text-amber-900 shadow-xs'
                    : 'text-slate-600 hover:text-amber-900'
                }`}
              >
                <span>Drafts in Progress</span>
                <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px]">
                  {draftCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('live')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'live'
                    ? 'bg-emerald-100 text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-emerald-900'
                }`}
              >
                <span>Published Live</span>
                <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-full text-[10px]">
                  {activeCount}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exams by title..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#D4AF37] outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F8F7F4] text-[#1B2A4A] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Exam Title & Details</th>
                <th className="py-3 px-4">Durations</th>
                <th className="py-3 px-4">Medium Progress</th>
                <th className="py-3 px-4">Questions</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <div className="w-6 h-6 border-2 border-[#1B2A4A]/20 border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-2"></div>
                    Loading examination directory...
                  </td>
                </tr>
              ) : filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">
                      {activeTab === 'drafts'
                        ? 'No active draft papers found.'
                        : activeTab === 'live'
                        ? 'No live exams published yet.'
                        : 'No exams found.'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      Create a new exam or load our verification test batch.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Link
                        to="/teacher/create-exam"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B2A4A] text-white text-xs font-semibold rounded-lg shadow-sm"
                      >
                        <PlusCircle className="w-4 h-4 text-[#D4AF37]" />
                        <span>Start New Exam Wizard</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam) => {
                  const hindiComp = exam.mediums?.hindi?.completedSubjects?.length || 0;
                  const assamComp = exam.mediums?.assamese?.completedSubjects?.length || 0;
                  const totalQ =
                    (exam.mediums?.hindi?.totalQuestions || 0) +
                    (exam.mediums?.assamese?.totalQuestions || 0);

                  const totalDuration =
                    (exam.subjectDurations?.math || 15) +
                    (exam.subjectDurations?.reasoning || 15) +
                    (exam.subjectDurations?.hindi || 15) +
                    (exam.subjectDurations?.gk || 15);

                  const isDraft = exam.status === 'draft';

                  return (
                    <tr key={exam.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1B2A4A] flex items-center gap-1.5">
                          <span>{exam.title}</span>
                          {isDraft && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Draft in progress" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Created {new Date(exam.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        <span className="font-semibold text-[#1B2A4A]">{totalDuration} mins</span>
                        <div className="text-[10px] text-slate-400">
                          M:{exam.subjectDurations?.math}m, R:{exam.subjectDurations?.reasoning}m, H:
                          {exam.subjectDurations?.hindi}m, GK:{exam.subjectDurations?.gk}m
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${hindiComp === 4 ? 'bg-emerald-600' : 'bg-blue-600'}`}></span>
                            <span className="text-[#1B2A4A]">Hindi: {hindiComp}/4 complete</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${assamComp === 4 ? 'bg-emerald-600' : 'bg-indigo-600'}`}></span>
                            <span className="text-[#1B2A4A]">Assamese: {assamComp}/4 complete</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#1B2A4A]">{totalQ} Qs</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            exam.status === 'live'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {exam.status === 'live' ? 'Live Exam' : 'Saved Draft'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Resume / Manage Wizard Button */}
                          <Link
                            to={`/teacher/create-exam?examId=${exam.id}`}
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-2xs ${
                              isDraft
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-[#1B2A4A] hover:bg-[#253963] text-white'
                            }`}
                            title={isDraft ? 'Resume Guided Creation Wizard' : 'Manage Exam'}
                          >
                            <span>{isDraft ? 'Resume Wizard' : 'Manage'}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                          </Link>

                          {/* Bulk CSV Upload */}
                          <button
                            onClick={() => setBulkUploadExam(exam)}
                            className="p-1.5 text-[#1B2A4A] hover:text-[#D4AF37] hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                            title="Bulk CSV Upload"
                          >
                            <Upload className="w-4 h-4" />
                          </button>

                          {/* Export CSV */}
                          <button
                            onClick={() => setExportExam(exam)}
                            className="p-1.5 text-[#1B2A4A] hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                            title="Export Questions as CSV"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Duplicate Exam */}
                          <button
                            onClick={() => setDuplicateExamTarget(exam)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                            title="Duplicate Exam"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete Exam */}
                          <button
                            onClick={() => setDeleteExamTarget(exam)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors border border-slate-200"
                            title="Delete Exam (Keeps student results safe)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {bulkUploadExam && (
        <BulkUploadModal
          exam={bulkUploadExam}
          isOpen={!!bulkUploadExam}
          onClose={() => setBulkUploadExam(null)}
          onSuccess={(summary) => {
            loadExams();
            showToast(
              `Successfully imported ${summary.successCount} questions into "${bulkUploadExam.title}".`
            );
          }}
        />
      )}

      {/* Export Questions CSV Modal */}
      {exportExam && (
        <ExportCsvModal
          exam={exportExam}
          isOpen={!!exportExam}
          onClose={() => setExportExam(null)}
        />
      )}

      {/* Duplicate Exam Modal */}
      {duplicateExamTarget && user && (
        <DuplicateExamModal
          exam={duplicateExamTarget}
          isOpen={!!duplicateExamTarget}
          teacherId={user.uid}
          teacherName={user.displayName || 'Teacher'}
          onClose={() => setDuplicateExamTarget(null)}
          onSuccess={(newExam) => {
            setDuplicateExamTarget(null);
            loadExams();
            showToast(`Exam duplicated as "${newExam.title}". Ready in drafts.`);
            // Jump directly to the wizard for the duplicate
            navigate(`/teacher/create-exam?examId=${newExam.id}`);
          }}
        />
      )}

      {/* Delete Exam Modal */}
      {deleteExamTarget && (
        <DeleteExamModal
          exam={deleteExamTarget}
          isOpen={!!deleteExamTarget}
          onClose={() => setDeleteExamTarget(null)}
          onSuccess={(deletedId) => {
            setDeleteExamTarget(null);
            setExams((prev) => prev.filter((e) => e.id !== deletedId));
            showToast('Exam and its question documents were deleted. Student result history is preserved.');
          }}
        />
      )}
    </div>
  );
};
