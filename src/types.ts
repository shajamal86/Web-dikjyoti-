export type UserRole = 'student' | 'teacher';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  isBlocked?: boolean;
  profileCompleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  phoneNumber?: string;
  photoURL?: string;
  provider?: string;
}

export interface AuthState {
  user: UserProfile | null;
  firebaseUser: any | null;
  loading: boolean;
  error: string | null;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// ==========================================
// EXAM ARCHITECTURE & WIZARD TYPES (PART 2)
// ==========================================

// Fixed 4 subjects in exact mandatory order
export const EXAM_SUBJECTS = ['math', 'reasoning', 'hindi', 'gk'] as const;
export type SubjectType = (typeof EXAM_SUBJECTS)[number];

export const SUBJECT_LABELS: Record<SubjectType, string> = {
  math: 'Math',
  reasoning: 'Reasoning',
  hindi: 'Hindi',
  gk: 'GK',
};

// Two supported mediums
export const EXAM_MEDIUMS = ['hindi', 'assamese'] as const;
export type MediumType = (typeof EXAM_MEDIUMS)[number];

export const MEDIUM_LABELS: Record<MediumType, string> = {
  hindi: 'Hindi',
  assamese: 'Assamese',
};

export type OptionKey = 'a' | 'b' | 'c' | 'd';

export interface QuestionOption {
  text: string;
  imageUrl?: string;
}

export interface QuestionItem {
  id: string;
  questionIndex: number;
  text: string;
  imageUrl?: string;
  options: {
    a: QuestionOption;
    b: QuestionOption;
    c: QuestionOption;
    d: QuestionOption;
  };
  correctOption: OptionKey;
  marks: number;
  hasNegativeMarking: boolean;
  negativeMarks: number;
  createdAt: string;
}

// Single-document question storage for (examId, medium, subject)
export interface QuestionSetDocument {
  id: string; // e.g. `${medium}_${subject}`
  examId: string;
  medium: MediumType;
  subject: SubjectType;
  isCompleted: boolean;
  questionsCount: number;
  questions: QuestionItem[];
  updatedAt: string;
}

export interface ExamMediumConfig {
  enabled: boolean;
  password?: string;
  completedSubjects: SubjectType[];
  totalQuestions: number;
}

export interface SubjectDurations {
  math: number;
  reasoning: number;
  hindi: number;
  gk: number;
}

export interface ExamDocument {
  id: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description?: string;
  status: 'draft' | 'live';
  isLive?: boolean;
  subjectDurations: SubjectDurations;
  mediums: {
    hindi?: ExamMediumConfig;
    assamese?: ExamMediumConfig;
  };
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// CSV BULK UPLOAD & EXPORT TYPES (PART 3)
// ==========================================

export interface RawCsvQuestionRow {
  Subject?: string;
  Medium?: string;
  Question?: string;
  OptionA?: string;
  OptionB?: string;
  OptionC?: string;
  OptionD?: string;
  CorrectOption?: string;
  Marks?: string | number;
  NegativeMarking?: string | boolean;
  NegativeValue?: string | number;
  QuestionImageLink?: string;
  OptionA_ImageLink?: string;
  OptionB_ImageLink?: string;
  OptionC_ImageLink?: string;
  OptionD_ImageLink?: string;
  [key: string]: any;
}

export interface ValidatedQuestionRow {
  rowNumber: number;
  subject: SubjectType;
  medium: MediumType;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: OptionKey;
  marks: number;
  hasNegativeMarking: boolean;
  negativeMarks: number;
  questionImageUrl?: string;
  optionA_ImageUrl?: string;
  optionB_ImageUrl?: string;
  optionC_ImageUrl?: string;
  optionD_ImageUrl?: string;
}

export interface CsvRowError {
  rowNumber: number;
  reason: string;
  raw?: any;
}

export interface CsvValidationResult {
  totalRows: number;
  validRows: ValidatedQuestionRow[];
  errors: CsvRowError[];
}

export interface BulkImportSummary {
  examId: string;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: CsvRowError[];
  importedGroups: {
    medium: MediumType;
    subject: SubjectType;
    count: number;
    newTotal: number;
  }[];
}

// ==========================================
// STUDENT EXAM TAKING & SCORING (PART 4)
// ==========================================

export interface SubjectScoreBreakdown {
  subject: SubjectType;
  obtainedMarks: number;
  totalMarks: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  totalQuestions: number;
}

export interface QuestionReviewItem {
  id: string;
  questionIndex: number;
  subject: SubjectType;
  text: string;
  imageUrl?: string;
  options: {
    a: QuestionOption;
    b: QuestionOption;
    c: QuestionOption;
    d: QuestionOption;
  };
  correctOption: OptionKey;
  marks: number;
  hasNegativeMarking: boolean;
  negativeMarks: number;
}

export interface ExamResultDocument {
  id: string; // e.g. `res_${studentId}_${examId}`
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  medium: MediumType;
  totalScore: number;
  totalPossibleMarks: number;
  percentage: number;
  accuracy: number;
  subjectBreakdown: Record<SubjectType, SubjectScoreBreakdown>;
  questionsReview: QuestionReviewItem[];
  submittedAt: string;
  timeSpentSeconds?: number;
  status?: 'submitted' | 'in_progress' | string;
  submissionReason?: string;
}

export interface StudentExamSession {
  sessionId: string; // `${studentId}_${examId}_${medium}`
  studentId: string;
  studentName?: string;
  examId: string;
  examTitle?: string;
  medium: MediumType;
  currentSubject: SubjectType;
  subjectStartTimes: Record<SubjectType, number>; // epoch ms
  completedSubjects: SubjectType[];
  answers: Record<string, OptionKey>; // questionId -> chosen option ('a'|'b'|'c'|'d')
  markedForReview: Record<string, boolean>; // questionId -> boolean
  lastSavedAt: number; // epoch ms
  isSubmitted: boolean;
  status?: 'submitted' | 'in_progress' | string;
  submissionReason?: string;
  securityViolations?: number;
}

// ==========================================
// LEADERBOARD & ANALYTICS TYPES (PART 5)
// ==========================================

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  totalScore: number;
  totalPossibleMarks: number;
  examsAttempted: number;
  averagePercentage: number;
  bestScore: number;
  bestExamTitle?: string;
  lastActiveAt?: string;
}

export interface ExamLeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  examId: string;
  examTitle: string;
  score: number;
  totalPossibleMarks: number;
  percentage: number;
  accuracy: number;
  submittedAt: string;
  medium: MediumType;
}

export interface StudentExamHistoryItem {
  examId: string;
  examTitle: string;
  score: number;
  totalPossibleMarks: number;
  percentage: number;
  accuracy: number;
  submittedAt: string;
  rankOnExam: number;
  totalParticipantsOnExam: number;
  medium: MediumType;
  resultId: string;
}

export interface StudentAnalyticsData {
  studentId: string;
  studentName: string;
  studentEmail: string;
  totalExamsAttempted: number;
  totalExamsNotAttempted: number;
  overallAverageScore: number; // average percentage
  totalScoreObtained: number;
  totalMarksPossible: number;
  bestScore: number;
  bestExamTitle: string;
  examHistory: StudentExamHistoryItem[];
}

export interface SubjectAnalyticsStats {
  subject: SubjectType;
  attemptsCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalPossibleMarks: number;
}

export interface ExamAnalyticsSummary {
  examId: string;
  examTitle: string;
  totalSubmissions: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  subjectStats: Record<SubjectType, SubjectAnalyticsStats>;
}

// ==========================================
// REGISTRATION DETAILS & NOTIFICATIONS (PART 6)
// ==========================================

export interface StudentPrivateDetails {
  uid: string;
  mobile: string;
  fathersName: string;
  village: string;
  postOffice: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  studentId: string;
  examId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: 'exam_live' | 'announcement';
}

