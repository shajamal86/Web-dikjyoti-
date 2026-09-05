import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  parseAndValidateQuestionsCsv,
  bulkImportQuestionsToExam,
  generateCsvTemplate,
  generateTestSampleCsvWithErrors,
  triggerCsvDownload,
  CSV_COLUMNS,
} from '../../services/csvExamService';
import {
  ExamDocument,
  ValidatedQuestionRow,
  CsvRowError,
  BulkImportSummary,
  SUBJECT_LABELS,
  MEDIUM_LABELS,
} from '../../types';

interface BulkUploadModalProps {
  exam: ExamDocument;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (summary: BulkImportSummary) => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  exam,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [validRows, setValidRows] = useState<ValidatedQuestionRow[]>([]);
  const [errors, setErrors] = useState<CsvRowError[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoMarkComplete, setAutoMarkComplete] = useState(true);
  const [importSummary, setImportSummary] = useState<BulkImportSummary | null>(null);
  const [showDetailedErrors, setShowDetailedErrors] = useState(true);
  const [showColumnHelp, setShowColumnHelp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setFileName(file.name);
    setParsing(true);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);
      try {
        const result = parseAndValidateQuestionsCsv(text);
        setValidRows(result.validRows);
        setErrors(result.errors);
        setTotalRows(result.totalRows);
      } catch (err: any) {
        setErrors([
          {
            rowNumber: 1,
            reason: `Failed to parse file: ${err.message || 'Invalid CSV format'}`,
          },
        ]);
        setValidRows([]);
        setTotalRows(0);
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setErrors([{ rowNumber: 1, reason: 'Failed to read file from filesystem' }]);
      setParsing(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCsvTemplate();
    triggerCsvDownload(template, 'Dikjyoti_Question_Upload_Template.csv');
  };

  const handleDownloadTestDataset = () => {
    const testCsv = generateTestSampleCsvWithErrors();
    triggerCsvDownload(testCsv, 'Dikjyoti_Test_Sample_10Valid_2Broken.csv');
  };

  const handleLoadTestDatasetDirectly = () => {
    const testCsv = generateTestSampleCsvWithErrors();
    setFileName('Dikjyoti_Test_Sample_10Valid_2Broken.csv');
    setCsvContent(testCsv);
    setParsing(true);
    setImportSummary(null);
    setTimeout(() => {
      const result = parseAndValidateQuestionsCsv(testCsv);
      setValidRows(result.validRows);
      setErrors(result.errors);
      setTotalRows(result.totalRows);
      setParsing(false);
    }, 150);
  };

  const handleExecuteImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const summary = await bulkImportQuestionsToExam(exam.id, validRows, {
        autoMarkSubjectsComplete: autoMarkComplete,
      });
      setImportSummary(summary);
      onSuccess(summary);
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const resetUpload = () => {
    setFileName(null);
    setCsvContent(null);
    setValidRows([]);
    setErrors([]);
    setTotalRows(0);
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Group valid rows by Subject & Medium for summary
  const groupedPreview: Record<string, number> = {};
  for (const row of validRows) {
    const k = `${MEDIUM_LABELS[row.medium]} • ${SUBJECT_LABELS[row.subject]}`;
    groupedPreview[k] = (groupedPreview[k] || 0) + 1;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1B2A4A] text-white p-5 sm:p-6 flex items-start justify-between border-b border-[#253963]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Bulk Question Importer</span>
            </div>
            <h2 className="font-serif-heading text-xl font-bold">
              Bulk Upload Questions — {exam.title}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Upload CSV or Excel files with continuous question rows mapped to Math, Reasoning, Hindi, and GK.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-[#1B2A4A]">
          {/* Post-Import Success State */}
          {importSummary ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-serif-heading text-lg font-bold text-emerald-900">
                  Bulk Import Completed Successfully!
                </h3>
                <p className="text-xs text-emerald-800 mt-1">
                  Imported <span className="font-bold">{importSummary.successCount} valid questions</span> into
                  the examination array-documents.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 max-w-lg mx-auto">
                {importSummary.importedGroups.map((grp) => (
                  <div key={`${grp.medium}_${grp.subject}`} className="bg-white p-3 rounded-lg border border-emerald-200 text-center shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 capitalize">
                      {grp.medium} • {SUBJECT_LABELS[grp.subject]}
                    </div>
                    <div className="text-base font-bold text-[#1B2A4A] mt-0.5">
                      +{grp.count} Qs
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">
                      Total: {grp.newTotal} Qs
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold rounded-lg text-slate-700 transition-colors"
                >
                  Upload Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  Done & Return to Exam
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Template & Test Dataset Helpers */}
              <div className="bg-[#F8F7F4] p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-[#1B2A4A] block">Format Guidelines & Sample Datasets</span>
                  <span className="text-[#5A6B82] text-[11px]">
                    16 required columns. Accepts Math, Reasoning, Hindi, GK in Hindi and Assamese.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-semibold text-[#1B2A4A] transition-colors shadow-2xs"
                    title="Download blank template"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Download Blank CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTestDataset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg font-semibold text-amber-900 transition-colors shadow-2xs"
                    title="Download 10-valid + 2-broken row verification file"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-700" />
                    <span>Download Test CSV (10 Valid + 2 Broken)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadTestDatasetDirectly}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B2A4A] hover:bg-[#253963] text-white rounded-lg font-semibold transition-colors shadow-2xs"
                    title="Load the 10-valid + 2-broken sample directly into parser"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Quick Test: Load Sample Batch</span>
                  </button>
                </div>
              </div>

              {/* Column Specification Dropdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowColumnHelp(!showColumnHelp)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-[#1B2A4A] transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
                    View Exact 16-Column Specification & Validation Rules
                  </span>
                  {showColumnHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showColumnHelp && (
                  <div className="p-4 bg-white text-[11px] text-[#5A6B82] space-y-2 border-t border-slate-200">
                    <p className="font-mono text-[10px] bg-slate-100 p-2 rounded border border-slate-200 text-[#1B2A4A] overflow-x-auto whitespace-nowrap">
                      {CSV_COLUMNS.join(', ')}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      <li><strong>Subject:</strong> Exactly one of <code className="text-[#1B2A4A] font-semibold">Math</code>, <code className="text-[#1B2A4A] font-semibold">Reasoning</code>, <code className="text-[#1B2A4A] font-semibold">Hindi</code>, or <code className="text-[#1B2A4A] font-semibold">GK</code></li>
                      <li><strong>Medium:</strong> Exactly <code className="text-[#1B2A4A] font-semibold">Hindi</code> or <code className="text-[#1B2A4A] font-semibold">Assamese</code></li>
                      <li><strong>Question & Options:</strong> All 4 options (OptionA, OptionB, OptionC, OptionD) must be non-empty</li>
                      <li><strong>CorrectOption:</strong> Must be exactly <code className="text-[#1B2A4A] font-semibold">A</code>, <code className="text-[#1B2A4A] font-semibold">B</code>, <code className="text-[#1B2A4A] font-semibold">C</code>, or <code className="text-[#1B2A4A] font-semibold">D</code></li>
                      <li><strong>Marks:</strong> Positive number (e.g. 1, 2, 4)</li>
                      <li><strong>Negative Marking:</strong> If Yes/True, NegativeValue must be positive (e.g. 0.25, 0.5)</li>
                      <li><strong>Image Links:</strong> Optional web URLs for question and individual option diagrams</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Drag and drop upload target */}
              {!fileName ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                    dragOver
                      ? 'border-[#D4AF37] bg-amber-50/50'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#1B2A4A] mb-3 shadow-2xs">
                    <Upload className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                  <h3 className="font-serif-heading font-bold text-base text-[#1B2A4A]">
                    Drag & drop your CSV or Excel file here
                  </h3>
                  <p className="text-xs text-[#5A6B82] mt-1 max-w-md mx-auto">
                    Select a .csv file formatted with the 16 standard question columns. Each valid row will be imported into its proper subject and medium array.
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B2A4A] hover:bg-[#253963] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                    >
                      <FileText className="w-4 h-4 text-[#D4AF37]" />
                      <span>Browse Files</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* File Analysis & Summary Card */
                <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-white shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#1B2A4A]">{fileName}</div>
                        <div className="text-xs text-[#5A6B82]">
                          {totalRows} rows parsed from file
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={resetUpload}
                      className="text-xs text-slate-500 hover:text-red-600 font-medium px-2.5 py-1 rounded hover:bg-slate-100 transition-colors"
                    >
                      Change File
                    </button>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-center">
                      <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Total Rows
                      </div>
                      <div className="text-xl font-bold text-[#1B2A4A] mt-0.5">{totalRows}</div>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                      <div className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Valid Rows
                      </div>
                      <div className="text-xl font-bold text-emerald-800 mt-0.5">
                        {validRows.length}
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg border text-center ${
                      errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 ${
                        errors.length > 0 ? 'text-red-700' : 'text-slate-500'
                      }`}>
                        <AlertCircle className="w-3 h-3" />
                        Rejected Rows
                      </div>
                      <div className={`text-xl font-bold mt-0.5 ${
                        errors.length > 0 ? 'text-red-800' : 'text-slate-700'
                      }`}>
                        {errors.length}
                      </div>
                    </div>
                  </div>

                  {/* Breakdown of Valid Rows by Subject & Medium */}
                  {validRows.length > 0 && (
                    <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 space-y-2">
                      <div className="text-xs font-bold text-[#1B2A4A] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
                        Valid Questions Ready for Import by Category:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(groupedPreview).map(([label, count]) => (
                          <span
                            key={label}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-[#1B2A4A] shadow-2xs"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{label}:</span>
                            <span className="text-emerald-700 font-bold">{count} Qs</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejected Rows Detail Report */}
                  {errors.length > 0 && (
                    <div className="bg-red-50/80 border border-red-200 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span>
                            {errors.length} Row{errors.length > 1 ? 's' : ''} Rejected by Validation:
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowDetailedErrors(!showDetailedErrors)}
                          className="text-[11px] font-medium text-red-700 hover:underline"
                        >
                          {showDetailedErrors ? 'Hide details' : 'Show details'}
                        </button>
                      </div>

                      {showDetailedErrors && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {errors.map((err, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-white/80 p-2 rounded border border-red-200 text-red-800 flex items-start gap-2"
                            >
                              <span className="font-bold shrink-0 bg-red-100 text-red-900 px-1.5 py-0.5 rounded text-[10px]">
                                Row {err.rowNumber}
                              </span>
                              <span className="leading-snug">{err.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-red-700 italic">
                        Note: Rejected rows will NOT be imported. Only the {validRows.length} valid rows will be committed to Firestore.
                      </p>
                    </div>
                  )}

                  {/* Options */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#1B2A4A] select-none">
                      <input
                        type="checkbox"
                        checked={autoMarkComplete}
                        onChange={(e) => setAutoMarkComplete(e.target.checked)}
                        className="w-4 h-4 rounded text-[#1B2A4A] focus:ring-[#D4AF37] border-slate-300"
                      />
                      <span className="font-medium">
                        Automatically mark imported subjects as Complete in the Exam Wizard
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!importSummary && (
          <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={validRows.length === 0 || importing || parsing}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B2A4A] hover:bg-[#253963] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              {importing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Importing {validRows.length} Questions...</span>
                </>
              ) : (
                <>
                  <span>Import {validRows.length} Valid Questions</span>
                  <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
