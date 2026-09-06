import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listTeacherExams, getAllExamQuestionSets } from '../../services/examService';
import {
  parseAndValidateQuestionsCsv,
  importValidatedQuestionsToExam,
  exportExamQuestionsToCsv,
  triggerCsvDownload,
  generateQuestionCsvTemplate,
  generateSampleCsvWithIntentionalErrors,
  CSV_COLUMNS,
} from '../../services/csvExamService';
import {
  ExamDocument,
  MediumType,
  SubjectType,
  EXAM_SUBJECTS,
  SUBJECT_LABELS,
  EXAM_MEDIUMS,
  MEDIUM_LABELS,
  QuestionSetDocument,
  CsvValidationResult,
} from '../../types';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  HelpCircle,
  RefreshCw,
  Layers,
  ArrowRight,
  Database,
  Info,
} from 'lucide-react';

export const TeacherCsvPage: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [loadingExams, setLoadingExams] = useState<boolean>(true);

  // Import State
  const [importTargetExamId, setImportTargetExamId] = useState<string>('');
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Export State
  const [exportTargetExamId, setExportTargetExamId] = useState<string>('');
  const [exportMedium, setExportMedium] = useState<MediumType | 'all'>('all');
  const [exportSubject, setExportSubject] = useState<SubjectType | 'all'>('all');
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportQuestionSets, setExportQuestionSets] = useState<QuestionSetDocument[]>([]);
  const [loadingExportSets, setLoadingExportSets] = useState<boolean>(false);

  // Load teacher exams
  const loadExams = async () => {
    if (!user?.uid) return;
    setLoadingExams(true);
    try {
      const data = await listTeacherExams(user.uid);
      setExams(data);
      if (data.length > 0) {
        setImportTargetExamId(data[0].id);
        setExportTargetExamId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load teacher exams:', err);
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, [user?.uid]);

  // Load question count when export exam changes
  useEffect(() => {
    if (!exportTargetExamId) {
      setExportQuestionSets([]);
      return;
    }
    setLoadingExportSets(true);
    setExportSuccess(null);
    getAllExamQuestionSets(exportTargetExamId)
      .then((sets) => setExportQuestionSets(sets))
      .catch((err) => console.error('Failed to fetch export sets:', err))
      .finally(() => setLoadingExportSets(false));
  }, [exportTargetExamId]);

  // Handle CSV file selection
  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && !file.type.includes('text/')) {
      setImportError('Please upload a valid .csv file.');
      return;
    }
    setFileName(file.name);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);
      const result = parseAndValidateQuestionsCsv(text);
      setValidationResult(result);
    };
    reader.onerror = () => {
      setImportError('Failed to read CSV file.');
    };
    reader.readAsText(file);
  };

  const handleDragDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!importTargetExamId) {
      setImportError('Please select a target examination to import questions into.');
      return;
    }
    if (!validationResult || validationResult.validQuestions.length === 0) {
      setImportError('No valid questions found to import.');
      return;
    }

    setImporting(true);
    setImportError(null);
    try {
      const res = await importValidatedQuestionsToExam(
        importTargetExamId,
        validationResult.validQuestions
      );
      setImportSuccess(
        `Successfully imported ${res.successCount} questions across ${res.importedGroups.length} subject-medium sets!`
      );
      setCsvContent(null);
      setFileName(null);
      setValidationResult(null);
      // Refresh question sets if same exam selected for export
      if (exportTargetExamId === importTargetExamId) {
        const sets = await getAllExamQuestionSets(importTargetExamId);
        setExportQuestionSets(sets);
      }
    } catch (err: any) {
      setImportError(err.message || 'An error occurred during CSV question import.');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    if (!exportTargetExamId) return;
    const examDoc = exams.find((e) => e.id === exportTargetExamId);
    if (!examDoc) return;

    setExporting(true);
    try {
      const { csvContent, filename, totalExported } = await exportExamQuestionsToCsv(
        exportTargetExamId,
        {
          examTitle: examDoc.title,
          medium: exportMedium,
          subject: exportSubject,
        }
      );
      if (totalExported === 0) {
        setExportSuccess('Note: 0 questions matched the chosen filters.');
      } else {
        triggerCsvDownload(csvContent, filename);
        setExportSuccess(`Exported ${totalExported} questions to ${filename}!`);
      }
    } catch (err: any) {
      alert(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = generateQuestionCsvTemplate();
    triggerCsvDownload(csv, 'Dikjyoti_Question_Upload_Template.csv');
  };

  const handleDownloadTestSample = () => {
    const csv = generateSampleCsvWithIntentionalErrors();
    triggerCsvDownload(csv, 'Dikjyoti_Verification_10Valid_2Broken.csv');
  };

  const selectedExportExam = exams.find((e) => e.id === exportTargetExamId);

  // Compute total questions in export target
  const exportQuestionCount = exportQuestionSets.reduce((acc, s) => {
    if (exportMedium !== 'all' && s.medium !== exportMedium) return acc;
    if (exportSubject !== 'all' && s.subject !== exportSubject) return acc;
    return acc + (s.questions?.length || 0);
  }, 0);

  return (
    <div className="space-y-5">
      {/* Page Head matching mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#EEF1F6]">
        <div>
          <h2 className="text-xl font-bold text-[#1F2A44]">CSV Import</h2>
          <p className="text-xs text-[#8A94A6] mt-0.5">
            Bulk-upload questions to an exam
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EEF1F6] rounded-xl text-xs font-semibold text-[#2F6FED] hover:bg-[#F5F7FB] transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Blank Template</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadTestSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EEF1F6] rounded-xl text-xs font-semibold text-[#1F2A44] hover:bg-[#F5F7FB] transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#2F6FED]" />
            <span>Test Sample CSV</span>
          </button>
        </div>
      </div>

      {loadingExams ? (
        <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-12 text-center shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-[#2F6FED] mx-auto mb-2" />
          <p className="text-xs font-bold text-[#1F2A44]">Loading teacher exams...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-10 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#1F2A44]">No Exams Available Yet</h3>
          <p className="text-xs text-[#8A94A6] max-w-md mx-auto">
            Please create an exam first using the Create Exam wizard before importing or exporting questions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* SECTION A: CSV IMPORT */}
          <div className="bg-white rounded-[14px] border border-[#EEF1F6] p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F6]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[9px] bg-[#E8F0FE] text-[#2F6FED] flex items-center justify-center font-bold">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1F2A44]">Upload Question CSV</h3>
                    <p className="text-[11px] text-[#8A94A6]">
                      Format: subject, medium, q_no, question, optA, optB, optC, optD, answer, marks
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#2F6FED]">
                  16 COLUMNS
                </span>
              </div>

              {/* Target Exam Selection */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#1F2A44]">
                  Target Exam:
                </label>
                <select
                  value={importTargetExamId}
                  onChange={(e) => setImportTargetExamId(e.target.value)}
                  className="w-full p-2 bg-[#F5F7FB] border border-[#EEF1F6] rounded-xl text-xs font-semibold text-[#1F2A44] focus:outline-none focus:border-[#2F6FED]"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Drag and Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDragDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-[12px] text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-[#2F6FED] bg-[#E8F0FE]/50'
                    : 'border-[#EEF1F6] hover:border-[#2F6FED]/50 bg-[#F5F7FB]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-10 h-10 rounded-full bg-white shadow-xs text-[#5B2E9E] flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-[#241748]">
                  {fileName ? fileName : 'Click to browse or drag & drop CSV file'}
                </div>
                <p className="text-[11px] text-[#9B93A8] mt-1">
                  Standard format with 16 columns (subject, medium, questionText, optionA-D, correctOption, marks...)
                </p>
              </div>

              {/* Status alerts */}
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{importSuccess}</span>
                </div>
              )}

              {/* Validation Summary if parsed */}
              {validationResult && (
                <div className="p-3.5 bg-[#FAF6FF] border border-[#ECE7F5] rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#241748]">
                    <span>CSV Analysis:</span>
                    <span>{validationResult.totalRows} Total Rows</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                      <div className="text-base font-extrabold">{validationResult.validQuestions.length}</div>
                      <div className="text-[10px] uppercase tracking-wider font-bold">Valid Questions</div>
                    </div>
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                      <div className="text-base font-extrabold">{validationResult.invalidRows.length}</div>
                      <div className="text-[10px] uppercase tracking-wider font-bold">Skipped / Broken</div>
                    </div>
                  </div>

                  {validationResult.invalidRows.length > 0 && (
                    <div className="mt-2 text-[11px] text-amber-900 bg-amber-50/50 p-2 rounded-lg border border-amber-200">
                      <div className="font-bold flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Invalid Rows Details:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5">
                        {validationResult.invalidRows.slice(0, 3).map((inv, idx) => (
                          <li key={idx}>
                            Row {inv.rowNumber}: {inv.reasons.join(', ')}
                          </li>
                        ))}
                        {validationResult.invalidRows.length > 3 && (
                          <li>+{validationResult.invalidRows.length - 3} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={handleImport}
              disabled={importing || !validationResult || validationResult.validQuestions.length === 0}
              className="w-full py-2.5 px-4 bg-[#5B2E9E] hover:bg-[#4d2487] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#F5A8C6]" />
                  <span>Importing Questions...</span>
                </>
              ) : (
                <>
                  <span>Import {validationResult ? validationResult.validQuestions.length : 0} Valid Questions</span>
                  <ArrowRight className="w-4 h-4 text-[#F5A8C6]" />
                </>
              )}
            </button>
          </div>

          {/* SECTION B: CSV EXPORT */}
          <div className="bg-white rounded-2xl border border-[#ECE7F5] p-5 sm:p-6 shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE7F5]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FAF6FF] text-[#5B2E9E] flex items-center justify-center font-bold">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-[#241748]">Export Questions</h2>
                    <p className="text-[11px] text-[#9B93A8]">Download standard CSV spreadsheet</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#FAF6FF] text-[#5B2E9E] border border-[#ECE7F5]">
                  UTF-8 BOM
                </span>
              </div>

              {/* Target Exam Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#241748]">
                  Select Exam:
                </label>
                <select
                  value={exportTargetExamId}
                  onChange={(e) => setExportTargetExamId(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-xs font-semibold text-[#241748] focus:outline-none focus:border-[#5B2E9E]"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#241748]">
                    Medium:
                  </label>
                  <select
                    value={exportMedium}
                    onChange={(e) => setExportMedium(e.target.value as any)}
                    className="w-full p-2.5 bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-xs font-semibold text-[#241748] focus:outline-none focus:border-[#5B2E9E]"
                  >
                    <option value="all">All Mediums</option>
                    <option value="hindi">Hindi</option>
                    <option value="assamese">Assamese</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#241748]">
                    Subject:
                  </label>
                  <select
                    value={exportSubject}
                    onChange={(e) => setExportSubject(e.target.value as any)}
                    className="w-full p-2.5 bg-[#FAF9FD] border border-[#ECE7F5] rounded-xl text-xs font-semibold text-[#241748] focus:outline-none focus:border-[#5B2E9E]"
                  >
                    <option value="all">All Subjects</option>
                    <option value="math">Mathematics</option>
                    <option value="reasoning">Reasoning</option>
                    <option value="hindi">Hindi / Grammar</option>
                    <option value="gk">General Knowledge</option>
                  </select>
                </div>
              </div>

              {/* Export Preview Card */}
              <div className="p-4 bg-[#FAF6FF] border border-[#ECE7F5] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#241748]">Exportable Questions:</span>
                  <span className="text-sm font-extrabold text-[#5B2E9E]">
                    {loadingExportSets ? '...' : `${exportQuestionCount} Questions`}
                  </span>
                </div>

                <div className="text-[11px] text-[#9B93A8] leading-relaxed">
                  Generated file is fully compatible with Microsoft Excel, Google Sheets, and the Android offline quiz parser. UTF-8 BOM encoding preserves Assamese and Hindi characters accurately.
                </div>
              </div>

              {exportSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{exportSuccess}</span>
                </div>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={handleExport}
              disabled={exporting || loadingExportSets || exportQuestionCount === 0}
              className="w-full py-2.5 px-4 bg-[#3E2072] hover:bg-[#5B2E9E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#F5A8C6]" />
                  <span>Generating CSV...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-[#F5A8C6]" />
                  <span>Download {exportQuestionCount} Questions CSV</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Format reference footer */}
      <div className="bg-white rounded-2xl border border-[#ECE7F5] p-5 text-xs text-[#9B93A8] space-y-2">
        <div className="font-bold text-[#241748] flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#5B2E9E]" />
          <span>16 Standard CSV Columns Specification</span>
        </div>
        <p className="leading-relaxed">
          Columns required: <code className="text-[#3E2072] font-semibold bg-[#FAF9FD] px-1.5 py-0.5 rounded border border-[#ECE7F5]">subject</code>, <code className="text-[#3E2072] font-semibold bg-[#FAF9FD] px-1.5 py-0.5 rounded border border-[#ECE7F5]">medium</code>, <code className="text-[#3E2072] font-semibold bg-[#FAF9FD] px-1.5 py-0.5 rounded border border-[#ECE7F5]">questionText</code>, <code className="text-[#3E2072] font-semibold bg-[#FAF9FD] px-1.5 py-0.5 rounded border border-[#ECE7F5]">optionA</code>, <code className="text-[#3E2072] font-semibold bg-[#FAF9FD] px-1.5 py-0.5 rounded border border-[#ECE7F5]">optionB</code>, <code className="text-[#3E2072] font-semibold bg-[#FAF9FD] px-1.5 py-0.5 rounded border border-[#ECE7F5]">optionC</code>, <code className="text-[#3E2072] font-semibold bg-[#FAF9FD] px-1.5 py-0.5 rounded border border-[#ECE7F5]">optionD</code>, <code className="text-[#3E2072] font-semibold bg-[#FAF9FD] px-1.5 py-0.5 rounded border border-[#ECE7F5]">correctOption</code>, <code className="text-[#3E2072] font-semibold bg-[#FAF9FD] px-1.5 py-0.5 rounded border border-[#ECE7F5]">marks</code>, <code className="text-[#3E2072] font-semibold bg-[#FAF9FD] px-1.5 py-0.5 rounded border border-[#ECE7F5]">negativeMarks</code>, plus explanation, solutionStep1-3, topic, and difficulty.
        </p>
      </div>
    </div>
  );
};
