import Papa from 'papaparse';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError } from '../firebase/errors';
import {
  ExamDocument,
  QuestionSetDocument,
  QuestionItem,
  MediumType,
  SubjectType,
  EXAM_SUBJECTS,
  SUBJECT_LABELS,
  EXAM_MEDIUMS,
  MEDIUM_LABELS,
  OptionKey,
  RawCsvQuestionRow,
  ValidatedQuestionRow,
  CsvRowError,
  CsvValidationResult,
  BulkImportSummary,
  OperationType,
} from '../types';
import { getAllExamQuestionSets } from './examService';

export const CSV_COLUMNS = [
  'Subject',
  'Medium',
  'Question',
  'OptionA',
  'OptionB',
  'OptionC',
  'OptionD',
  'CorrectOption',
  'Marks',
  'NegativeMarking',
  'NegativeValue',
  'QuestionImageLink',
  'OptionA_ImageLink',
  'OptionB_ImageLink',
  'OptionC_ImageLink',
  'OptionD_ImageLink',
] as const;

/**
 * Normalizes subject string to canonical SubjectType
 */
export function normalizeSubject(raw: string | undefined): SubjectType | null {
  if (!raw) return null;
  const val = raw.trim().toLowerCase();
  if (val === 'math' || val === 'mathematics' || val === 'maths') return 'math';
  if (val === 'reasoning' || val === 'mental ability') return 'reasoning';
  if (val === 'hindi') return 'hindi';
  if (val === 'gk' || val === 'general knowledge' || val === 'general studies') return 'gk';
  return null;
}

/**
 * Normalizes medium string to canonical MediumType
 */
export function normalizeMedium(raw: string | undefined): MediumType | null {
  if (!raw) return null;
  const val = raw.trim().toLowerCase();
  if (val === 'hindi') return 'hindi';
  if (val === 'assamese' || val === 'asamiya') return 'assamese';
  return null;
}

/**
 * Normalizes correct option string to 'a' | 'b' | 'c' | 'd'
 */
export function normalizeCorrectOption(raw: string | undefined): OptionKey | null {
  if (!raw) return null;
  const val = raw.trim().toLowerCase();
  if (val === 'a' || val === '1' || val === 'option a') return 'a';
  if (val === 'b' || val === '2' || val === 'option b') return 'b';
  if (val === 'c' || val === '3' || val === 'option c') return 'c';
  if (val === 'd' || val === '4' || val === 'option d') return 'd';
  return null;
}

/**
 * Parses and validates CSV string content against strict examination rules
 */
export function parseAndValidateQuestionsCsv(csvContent: string): CsvValidationResult {
  const parsed = Papa.parse<RawCsvQuestionRow>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const validRows: ValidatedQuestionRow[] = [];
  const errors: CsvRowError[] = [];

  const rawData = parsed.data || [];

  rawData.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 for 0-index, +1 for header row
    const rowErrors: string[] = [];

    // 1. Validate Subject
    const subject = normalizeSubject(row.Subject);
    if (!subject) {
      rowErrors.push(
        `Subject must be exactly one of Math, Reasoning, Hindi, or GK (got "${row.Subject ?? ''}")`
      );
    }

    // 2. Validate Medium
    const medium = normalizeMedium(row.Medium);
    if (!medium) {
      rowErrors.push(
        `Medium must be exactly Hindi or Assamese (got "${row.Medium ?? ''}")`
      );
    }

    // 3. Validate Question and 4 options
    const questionText = (row.Question || '').trim();
    if (!questionText) {
      rowErrors.push('Missing Question text');
    }

    const optionA = (row.OptionA || '').trim();
    if (!optionA) {
      rowErrors.push('Missing Option A');
    }

    const optionB = (row.OptionB || '').trim();
    if (!optionB) {
      rowErrors.push('Missing Option B');
    }

    const optionC = (row.OptionC || '').trim();
    if (!optionC) {
      rowErrors.push('Missing Option C');
    }

    const optionD = (row.OptionD || '').trim();
    if (!optionD) {
      rowErrors.push('Missing Option D');
    }

    // 4. Validate CorrectOption
    const correctOption = normalizeCorrectOption(row.CorrectOption);
    if (!correctOption) {
      rowErrors.push(
        `CorrectOption must be exactly A, B, C, or D (got "${row.CorrectOption ?? ''}")`
      );
    }

    // 5. Validate Marks
    const marksNum = Number(row.Marks);
    if (isNaN(marksNum) || marksNum <= 0) {
      rowErrors.push(`Marks must be a positive number (got "${row.Marks ?? ''}")`);
    }

    // 6. Validate Negative Marking
    let hasNegative = false;
    let negValue = 0;
    if (row.NegativeMarking !== undefined && row.NegativeMarking !== null) {
      const negStr = String(row.NegativeMarking).trim().toLowerCase();
      if (['true', 'yes', '1', 'y'].includes(negStr)) {
        hasNegative = true;
        const parsedNeg = Number(row.NegativeValue);
        if (isNaN(parsedNeg) || parsedNeg <= 0) {
          rowErrors.push(
            `NegativeValue must be a positive number when NegativeMarking is enabled (got "${row.NegativeValue ?? ''}")`
          );
        } else {
          negValue = parsedNeg;
        }
      }
    }

    if (rowErrors.length > 0) {
      errors.push({
        rowNumber,
        reason: rowErrors.join('; '),
        raw: row,
      });
    } else if (subject && medium && correctOption) {
      validRows.push({
        rowNumber,
        subject,
        medium,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        marks: marksNum,
        hasNegativeMarking: hasNegative,
        negativeMarks: negValue,
        questionImageUrl: (row.QuestionImageLink || '').trim() || undefined,
        optionA_ImageUrl: (row.OptionA_ImageLink || '').trim() || undefined,
        optionB_ImageUrl: (row.OptionB_ImageLink || '').trim() || undefined,
        optionC_ImageUrl: (row.OptionC_ImageLink || '').trim() || undefined,
        optionD_ImageUrl: (row.OptionD_ImageLink || '').trim() || undefined,
      });
    }
  });

  return {
    totalRows: rawData.length,
    validRows,
    errors,
  };
}

/**
 * Bulk imports validated questions into their designated (exam, subject, medium)
 * Firestore array-documents. Updates master exam question counters and progress tracking.
 */
export async function bulkImportQuestionsToExam(
  examId: string,
  validRows: ValidatedQuestionRow[],
  options: {
    autoMarkSubjectsComplete?: boolean;
  } = {}
): Promise<BulkImportSummary> {
  const examRef = doc(db, 'exams', examId);
  const examSnap = await getDoc(examRef);
  if (!examSnap.exists()) {
    throw new Error('Target examination paper not found');
  }
  const examData = examSnap.data() as ExamDocument;

  // Group valid rows by set ID `${medium}_${subject}`
  const groups: Record<
    string,
    {
      medium: MediumType;
      subject: SubjectType;
      rows: ValidatedQuestionRow[];
    }
  > = {};

  for (const row of validRows) {
    const key = `${row.medium}_${row.subject}`;
    if (!groups[key]) {
      groups[key] = {
        medium: row.medium,
        subject: row.subject,
        rows: [],
      };
    }
    groups[key].rows.push(row);
  }

  const importedGroups: {
    medium: MediumType;
    subject: SubjectType;
    count: number;
    newTotal: number;
  }[] = [];

  const mediumTotalIncrements: Record<MediumType, number> = {
    hindi: 0,
    assamese: 0,
  };

  const subjectsToMarkComplete: { medium: MediumType; subject: SubjectType }[] = [];

  // Import into each questionSet document
  for (const [key, group] of Object.entries(groups)) {
    const setRef = doc(db, 'exams', examId, 'questionSets', key);
    const existingSnap = await getDoc(setRef);

    let currentQuestions: QuestionItem[] = [];
    let isAlreadyComplete = false;

    if (existingSnap.exists()) {
      const data = existingSnap.data() as QuestionSetDocument;
      currentQuestions = data.questions || [];
      isAlreadyComplete = data.isCompleted || false;
    }

    const startIndex = currentQuestions.length;
    const newItems: QuestionItem[] = group.rows.map((r, i) => ({
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${startIndex + i + 1}`,
      questionIndex: startIndex + i + 1,
      text: r.questionText,
      imageUrl: r.questionImageUrl,
      options: {
        a: { text: r.optionA, imageUrl: r.optionA_ImageUrl },
        b: { text: r.optionB, imageUrl: r.optionB_ImageUrl },
        c: { text: r.optionC, imageUrl: r.optionC_ImageUrl },
        d: { text: r.optionD, imageUrl: r.optionD_ImageUrl },
      },
      correctOption: r.correctOption,
      marks: r.marks,
      hasNegativeMarking: r.hasNegativeMarking,
      negativeMarks: r.negativeMarks,
      createdAt: new Date().toISOString(),
    }));

    const shouldMarkComplete =
      options.autoMarkSubjectsComplete || isAlreadyComplete;

    const mergedQuestions = [...currentQuestions, ...newItems];

    const setDocData: QuestionSetDocument = {
      id: key,
      examId,
      medium: group.medium,
      subject: group.subject,
      isCompleted: shouldMarkComplete,
      questionsCount: mergedQuestions.length,
      questions: mergedQuestions,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(setRef, setDocData);

    mediumTotalIncrements[group.medium] += newItems.length;

    importedGroups.push({
      medium: group.medium,
      subject: group.subject,
      count: newItems.length,
      newTotal: mergedQuestions.length,
    });

    if (options.autoMarkSubjectsComplete) {
      subjectsToMarkComplete.push({
        medium: group.medium,
        subject: group.subject,
      });
    }
  }

  // Update master exam totals and completedSubjects
  const currentHindiTotal = examData.mediums?.hindi?.totalQuestions || 0;
  const currentAssamTotal = examData.mediums?.assamese?.totalQuestions || 0;

  const updatePayload: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (mediumTotalIncrements.hindi > 0) {
    updatePayload['mediums.hindi.totalQuestions'] =
      currentHindiTotal + mediumTotalIncrements.hindi;
  }
  if (mediumTotalIncrements.assamese > 0) {
    updatePayload['mediums.assamese.totalQuestions'] =
      currentAssamTotal + mediumTotalIncrements.assamese;
  }

  // Update completed subjects if autoMark complete was enabled
  for (const item of subjectsToMarkComplete) {
    updatePayload[`mediums.${item.medium}.completedSubjects`] = arrayUnion(
      item.subject
    );
  }

  await updateDoc(examRef, updatePayload);

  return {
    examId,
    totalProcessed: validRows.length,
    successCount: validRows.length,
    failureCount: 0,
    errors: [],
    importedGroups,
  };
}

/**
 * Generates and downloads a genuine CSV file from an exam's questions.
 * Exact same column format as bulk upload.
 */
export async function exportExamQuestionsToCsv(
  examId: string,
  options: {
    medium?: MediumType | 'all';
    subject?: SubjectType | 'all';
    examTitle?: string;
  } = {}
): Promise<{ csvContent: string; filename: string; totalExported: number }> {
  const allSets = await getAllExamQuestionSets(examId);

  // Filter based on options
  const filteredSets = allSets.filter((set) => {
    if (options.medium && options.medium !== 'all' && set.medium !== options.medium) {
      return false;
    }
    if (options.subject && options.subject !== 'all' && set.subject !== options.subject) {
      return false;
    }
    return true;
  });

  const exportRows: RawCsvQuestionRow[] = [];

  for (const set of filteredSets) {
    const subjectLabel = SUBJECT_LABELS[set.subject] || set.subject;
    const mediumLabel = MEDIUM_LABELS[set.medium] || set.medium;

    for (const q of set.questions || []) {
      exportRows.push({
        Subject: subjectLabel,
        Medium: mediumLabel,
        Question: q.text,
        OptionA: q.options?.a?.text || '',
        OptionB: q.options?.b?.text || '',
        OptionC: q.options?.c?.text || '',
        OptionD: q.options?.d?.text || '',
        CorrectOption: (q.correctOption || 'A').toUpperCase(),
        Marks: q.marks ?? 1,
        NegativeMarking: q.hasNegativeMarking ? 'Yes' : 'No',
        NegativeValue: q.hasNegativeMarking ? q.negativeMarks ?? 0 : 0,
        QuestionImageLink: q.imageUrl || '',
        OptionA_ImageLink: q.options?.a?.imageUrl || '',
        OptionB_ImageLink: q.options?.b?.imageUrl || '',
        OptionC_ImageLink: q.options?.c?.imageUrl || '',
        OptionD_ImageLink: q.options?.d?.imageUrl || '',
      });
    }
  }

  // Convert to CSV with UTF-8 BOM so Excel displays Devanagari and Assamese script cleanly
  const csvBody = Papa.unparse(exportRows, {
    columns: CSV_COLUMNS as unknown as string[],
    quotes: true,
    header: true,
  });

  const csvWithBom = '\uFEFF' + csvBody;

  const safeTitle = (options.examTitle || 'Exam')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Dikjyoti_${safeTitle}_Questions_${timestamp}.csv`;

  return {
    csvContent: csvWithBom,
    filename,
    totalExported: exportRows.length,
  };
}

/**
 * Triggers a native browser download of a CSV file
 */
export function triggerCsvDownload(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an official blank CSV Template with column headers and 1 sample row
 */
export function generateCsvTemplate(): string {
  const sampleRows: RawCsvQuestionRow[] = [
    {
      Subject: 'Math',
      Medium: 'Hindi',
      Question: 'यदि a + b = 10 और a - b = 4 है, तो ab का मान क्या होगा?',
      OptionA: '21',
      OptionB: '24',
      OptionC: '25',
      OptionD: '16',
      CorrectOption: 'A',
      Marks: 2,
      NegativeMarking: 'Yes',
      NegativeValue: 0.5,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
  ];

  const csv = Papa.unparse(sampleRows, {
    columns: CSV_COLUMNS as unknown as string[],
    quotes: true,
    header: true,
  });

  return '\uFEFF' + csv;
}

/**
 * Generates the specific test verification dataset required by prompt:
 * "Prepare a real CSV file with 10 valid rows and 2 intentionally broken rows"
 * - 10 Valid Rows across Math, Reasoning, Hindi, GK in Hindi and Assamese
 * - Row 11 (Broken): Missing Option C
 * - Row 12 (Broken): CorrectOption is "X" instead of A/B/C/D
 */
export function generateTestSampleCsvWithErrors(): string {
  const rows: RawCsvQuestionRow[] = [
    // 1. Math (Hindi) - Valid
    {
      Subject: 'Math',
      Medium: 'Hindi',
      Question: 'एक वृत्त की त्रिज्या 14 सेमी है। इसका क्षेत्रफल क्या होगा? (π = 22/7)',
      OptionA: '616 वर्ग सेमी',
      OptionB: '308 वर्ग सेमी',
      OptionC: '154 वर्ग सेमी',
      OptionD: '88 वर्ग सेमी',
      CorrectOption: 'A',
      Marks: 2,
      NegativeMarking: 'Yes',
      NegativeValue: 0.5,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
    // 2. Math (Hindi) - Valid
    {
      Subject: 'Math',
      Medium: 'Hindi',
      Question: 'यदि किसी वस्तु का क्रय मूल्य ₹400 और विक्रय मूल्य ₹500 है, तो लाभ प्रतिशत क्या होगा?',
      OptionA: '20%',
      OptionB: '25%',
      OptionC: '15%',
      OptionD: '30%',
      CorrectOption: 'B',
      Marks: 2,
      NegativeMarking: 'Yes',
      NegativeValue: 0.5,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
    // 3. Reasoning (Hindi) - Valid
    {
      Subject: 'Reasoning',
      Medium: 'Hindi',
      Question: 'श्रृंखला को पूरा करें: 2, 6, 12, 20, 30, ?',
      OptionA: '40',
      OptionB: '42',
      OptionC: '44',
      OptionD: '48',
      CorrectOption: 'B',
      Marks: 2,
      NegativeMarking: 'Yes',
      NegativeValue: 0.5,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
    // 4. Reasoning (Hindi) - Valid
    {
      Subject: 'Reasoning',
      Medium: 'Hindi',
      Question: 'जिस प्रकार "पुस्तक" का संबंध "ज्ञान" से है, उसी प्रकार "भोजन" का संबंध किससे है?',
      OptionA: 'रसोई',
      OptionB: 'ऊर्जा',
      OptionC: 'प्यास',
      OptionD: 'फल',
      CorrectOption: 'B',
      Marks: 2,
      NegativeMarking: 'No',
      NegativeValue: 0,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
    // 5. Hindi (Hindi) - Valid
    {
      Subject: 'Hindi',
      Medium: 'Hindi',
      Question: '"अमृत" का सही पर्यायवाची शब्द कौन-सा है?',
      OptionA: 'सुधा',
      OptionB: 'गरल',
      OptionC: 'वारि',
      OptionD: 'पावक',
      CorrectOption: 'A',
      Marks: 1,
      NegativeMarking: 'Yes',
      NegativeValue: 0.25,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
    // 6. GK (Hindi) - Valid
    {
      Subject: 'GK',
      Medium: 'Hindi',
      Question: 'काजीरंगा राष्ट्रीय उद्यान किस भारतीय राज्य में स्थित है?',
      OptionA: 'असम',
      OptionB: 'मेघालय',
      OptionC: 'पश्चिम बंगाल',
      OptionD: 'बिहार',
      CorrectOption: 'A',
      Marks: 1,
      NegativeMarking: 'Yes',
      NegativeValue: 0.25,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
    // 7. Math (Assamese) - Valid
    {
      Subject: 'Math',
      Medium: 'Assamese',
      Question: 'প্ৰথম ১০টা স্বাভাবিক সংখ্যাৰ গড় কিমান?',
      OptionA: '৫.৫',
      OptionB: '৫',
      OptionC: '৬',
      OptionD: '১০',
      CorrectOption: 'A',
      Marks: 2,
      NegativeMarking: 'Yes',
      NegativeValue: 0.5,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
    // 8. Reasoning (Assamese) - Valid
    {
      Subject: 'Reasoning',
      Medium: 'Assamese',
      Question: 'অনুপস্থিত সংখ্যাটো নিৰ্ণয় কৰক: ৩, ৯, ২৭, ৮১, ?',
      OptionA: '১৬২',
      OptionB: '২৪৩',
      OptionC: '১৮৯',
      OptionD: '৩২৪',
      CorrectOption: 'B',
      Marks: 2,
      NegativeMarking: 'Yes',
      NegativeValue: 0.5,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
    // 9. Hindi (Assamese) - Valid
    {
      Subject: 'Hindi',
      Medium: 'Assamese',
      Question: '"সূৰ্য্য" শব্দৰ সমাৰ্থক শব্দ তলৰ কোনটো?',
      OptionA: 'ভাস্কৰ',
      OptionB: 'শশী',
      OptionC: 'অম্বু',
      OptionD: 'পৱন',
      CorrectOption: 'A',
      Marks: 1,
      NegativeMarking: 'No',
      NegativeValue: 0,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
    // 10. GK (Assamese) - Valid
    {
      Subject: 'GK',
      Medium: 'Assamese',
      Question: 'অসমৰ ৰাজধানী চহৰখনৰ নাম কি?',
      OptionA: 'গুৱাহাটী',
      OptionB: 'দিশপুৰ',
      OptionC: 'যোৰহাট',
      OptionD: 'শিলচৰ',
      CorrectOption: 'B',
      Marks: 1,
      NegativeMarking: 'Yes',
      NegativeValue: 0.25,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
    // 11. BROKEN ROW #1: Missing Option C (Row index in CSV = 12)
    {
      Subject: 'Math',
      Medium: 'Hindi',
      Question: 'त्रिकोणमिति में sin(90°) का मान क्या है?',
      OptionA: '0',
      OptionB: '1',
      OptionC: '', // INTENTIONALLY BROKEN: Empty Option C
      OptionD: '1/2',
      CorrectOption: 'B',
      Marks: 2,
      NegativeMarking: 'No',
      NegativeValue: 0,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
    // 12. BROKEN ROW #2: Invalid CorrectOption 'X' (Row index in CSV = 13)
    {
      Subject: 'GK',
      Medium: 'Hindi',
      Question: 'भारत का राष्ट्रीय जलीय जीव कौन सा है?',
      OptionA: 'गंगा डॉल्फ़िन',
      OptionB: 'मगरमच्छ',
      OptionC: 'कछुआ',
      OptionD: 'ब्लू व्हेल',
      CorrectOption: 'X', // INTENTIONALLY BROKEN: 'X' is not A, B, C, or D
      Marks: 1,
      NegativeMarking: 'Yes',
      NegativeValue: 0.25,
      QuestionImageLink: '',
      OptionA_ImageLink: '',
      OptionB_ImageLink: '',
      OptionC_ImageLink: '',
      OptionD_ImageLink: '',
    },
  ];

  const csv = Papa.unparse(rows, {
    columns: CSV_COLUMNS as unknown as string[],
    quotes: true,
    header: true,
  });

  return '\uFEFF' + csv;
}
