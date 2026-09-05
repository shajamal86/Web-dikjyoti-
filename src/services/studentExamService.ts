import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  ExamDocument,
  ExamResultDocument,
  StudentExamSession,
  MediumType,
  SubjectType,
  SubjectDurations,
  OptionKey,
  EXAM_SUBJECTS,
} from '../types';

/**
 * Fetches all exams currently marked Live in Firestore.
 * Always pulls fresh data from Firestore.
 */
export async function fetchLiveExams(): Promise<ExamDocument[]> {
  try {
    // Check both status == 'live' and isLive == true for robust compatibility
    const q1 = query(collection(db, 'exams'), where('status', '==', 'live'));
    const snap1 = await getDocs(q1);

    const examMap = new Map<string, ExamDocument>();
    snap1.forEach((d) => {
      const data = d.data() as ExamDocument;
      examMap.set(data.id, data);
    });

    // Also check isLive == true
    try {
      const q2 = query(collection(db, 'exams'), where('isLive', '==', true));
      const snap2 = await getDocs(q2);
      snap2.forEach((d) => {
        const data = d.data() as ExamDocument;
        examMap.set(data.id, data);
      });
    } catch {
      // If composite index or field is not indexed, fallback to q1 results
    }

    const exams = Array.from(examMap.values());
    // Sort descending by creation date
    exams.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return exams;
  } catch (error) {
    console.error('Error fetching live exams:', error);
    throw error;
  }
}

/**
 * Checks whether a student has already submitted a result for a given exam.
 * Returns the existing result document if submitted, otherwise null.
 */
export async function checkStudentExamCompleted(
  studentId: string,
  examId: string
): Promise<ExamResultDocument | null> {
  if (!studentId || !examId) return null;
  try {
    const q = query(
      collection(db, 'results'),
      where('examId', '==', examId),
      where('studentId', '==', studentId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as ExamResultDocument;
    }
    return null;
  } catch (error) {
    console.warn('Error checking existing exam submission:', error);
    return null;
  }
}

/**
 * Fetches all completed results for a student across all exams.
 */
export async function fetchStudentHistory(studentId: string): Promise<ExamResultDocument[]> {
  if (!studentId) return [];
  try {
    const q = query(collection(db, 'results'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    const results: ExamResultDocument[] = [];
    snap.forEach((d) => {
      results.push(d.data() as ExamResultDocument);
    });
    results.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return results;
  } catch (error) {
    console.error('Error fetching student history:', error);
    return [];
  }
}

/**
 * Validates a medium's password server-side through a secure backend route.
 * Browser never directly reads or inspects the password value.
 */
export async function verifyExamPassword(
  examId: string,
  medium: MediumType,
  password: string
): Promise<{ success: boolean; error?: string; examTitle?: string; subjectDurations?: SubjectDurations }> {
  try {
    const response = await fetch('/api/exams/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, medium, password }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Password verification failed. Please try again.',
      };
    }

    return {
      success: true,
      examTitle: data.examTitle,
      subjectDurations: data.subjectDurations,
    };
  } catch (err: any) {
    console.error('Server password check error:', err);
    return {
      success: false,
      error: 'Network connection failed while verifying password. Please check your internet connection.',
    };
  }
}

/**
 * Key for localStorage session backup
 */
function getStorageKey(studentId: string, examId: string, medium: MediumType): string {
  return `dikjyoti_exam_session_${studentId}_${examId}_${medium}`;
}

/**
 * Loads or initializes an active student exam session.
 * Reconciles with real elapsed wall-clock time so closing/reopening the browser
 * or losing connection never resets the clock.
 */
export async function initializeOrRestoreSession(
  studentId: string,
  studentName: string,
  exam: ExamDocument,
  medium: MediumType
): Promise<{ session: StudentExamSession; isExpired: boolean }> {
  const sessionId = `${studentId}_${exam.id}_${medium}`;
  const storageKey = getStorageKey(studentId, exam.id, medium);

  let session: StudentExamSession | null = null;

  // 1. Try local storage first for fastest retrieval
  try {
    const localRaw = localStorage.getItem(storageKey);
    if (localRaw) {
      session = JSON.parse(localRaw) as StudentExamSession;
    }
  } catch (e) {
    console.warn('Could not read from local storage:', e);
  }

  // 2. If not found locally, query Firestore examSessions collection
  if (!session) {
    try {
      const snap = await getDoc(doc(db, 'examSessions', sessionId));
      if (snap.exists()) {
        session = snap.data() as StudentExamSession;
      }
    } catch (e) {
      console.warn('Could not read session from Firestore:', e);
    }
  }

  const now = Date.now();

  // 3. If brand new session, initialize it
  if (!session) {
    session = {
      sessionId,
      studentId,
      studentName,
      examId: exam.id,
      examTitle: exam.title,
      medium,
      currentSubject: 'math',
      subjectStartTimes: {
        math: now,
        reasoning: 0,
        hindi: 0,
        gk: 0,
      },
      completedSubjects: [],
      answers: {},
      markedForReview: {},
      lastSavedAt: now,
      isSubmitted: false,
    };

    // Save initial state
    try {
      localStorage.setItem(storageKey, JSON.stringify(session));
      await setDoc(doc(db, 'examSessions', sessionId), session);
    } catch (e) {
      console.warn('Initial session write failed:', e);
    }

    return { session, isExpired: false };
  }

  // 4. Reconcile elapsed real time against configured durations
  // Check if current subject's time has expired while the student was away
  let currentSubj = session.currentSubject;
  let isAllExpired = false;

  while (currentSubj) {
    const startTime = session.subjectStartTimes[currentSubj];
    const durationMins = exam.subjectDurations[currentSubj] || 15;
    const durationMs = durationMins * 60 * 1000;

    // If this subject was never started, start it now
    if (!startTime || startTime === 0) {
      session.subjectStartTimes[currentSubj] = now;
      break;
    }

    const elapsedMs = now - startTime;
    if (elapsedMs < durationMs) {
      // Still has remaining time in current subject!
      break;
    } else {
      // Time fully elapsed while away! Mark completed and advance
      if (!session.completedSubjects.includes(currentSubj)) {
        session.completedSubjects.push(currentSubj);
      }
      const nextSubjIndex = EXAM_SUBJECTS.indexOf(currentSubj) + 1;
      if (nextSubjIndex < EXAM_SUBJECTS.length) {
        currentSubj = EXAM_SUBJECTS[nextSubjIndex];
        session.currentSubject = currentSubj;
        // Start the next subject's full window starting now!
        session.subjectStartTimes[currentSubj] = now;
      } else {
        // Last subject has expired
        isAllExpired = true;
        break;
      }
    }
  }

  session.lastSavedAt = now;
  try {
    localStorage.setItem(storageKey, JSON.stringify(session));
    await setDoc(doc(db, 'examSessions', sessionId), session);
  } catch (e) {
    console.warn('Session sync on restore failed:', e);
  }

  return { session, isExpired: isAllExpired };
}

/**
 * Automatically retries an asynchronous Firestore or network operation
 * with exponential backoff before surfacing any error to the user.
 */
export async function withAutoRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delayMs = 500
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err) {
      attempt++;
      if (attempt >= retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(1.5, attempt - 1)));
    }
  }
}

/**
 * Securely retrieves question sets for an exam without correctOption exposed.
 * Uses server endpoint with automatic retry.
 */
export async function fetchStrippedExamQuestions(
  examId: string,
  medium: MediumType
): Promise<Record<SubjectType, any[]>> {
  return await withAutoRetry(async () => {
    try {
      const res = await fetch(`/api/exams/${examId}/questions?medium=${medium}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.questions) {
          return data.questions as Record<SubjectType, any[]>;
        }
      }
    } catch (apiErr) {
      console.warn('Backend stripped questions endpoint error, checking fallback:', apiErr);
    }

    // Direct Firestore fallback (e.g. if testing offline or in emulator)
    const setsMap: Record<SubjectType, any[]> = {
      math: [],
      reasoning: [],
      hindi: [],
      gk: [],
    };

    for (const subj of EXAM_SUBJECTS) {
      const setId = `${medium}_${subj}`;
      const snap = await getDoc(doc(db, 'exams', examId, 'examQuestions', setId));
      if (snap.exists() && snap.data()?.questions) {
        setsMap[subj] = snap.data()?.questions;
      } else {
        const oldSnap = await getDoc(doc(db, 'exams', examId, 'questionSets', setId));
        if (oldSnap.exists() && oldSnap.data()?.questions) {
          setsMap[subj] = oldSnap.data()?.questions;
        }
      }
    }
    return setsMap;
  }, 3, 500);
}

/**
 * Batched sync of in-memory answers and session state to Firestore and localStorage.
 */
export async function syncSessionState(session: StudentExamSession): Promise<void> {
  const storageKey = getStorageKey(session.studentId, session.examId, session.medium);
  const now = Date.now();
  const updatedSession = { ...session, lastSavedAt: now };

  // 1. Synchronous localStorage write - answers are NEVER lost even if connection dies
  try {
    localStorage.setItem(storageKey, JSON.stringify(updatedSession));
  } catch (e) {
    console.warn('LocalStorage write failed:', e);
  }

  // 2. Asynchronous batched write to Firestore with auto-retry
  try {
    await withAutoRetry(async () => {
      const sessionRef = doc(db, 'examSessions', session.sessionId);
      await setDoc(sessionRef, updatedSession, { merge: true });
    }, 3, 400);
  } catch (e) {
    console.warn('Firestore batched session sync failed (offline persistence holds write):', e);
  }
}

/**
 * Submits the student's exam paper to the server for evaluation and scoring.
 * Never calculates score in the browser!
 */
export async function submitExamPaper(payload: {
  examId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  medium: MediumType;
  answers: Record<string, OptionKey>;
}): Promise<{ success: boolean; result: ExamResultDocument; alreadySubmitted?: boolean }> {
  try {
    const res = await fetch('/api/exams/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Server error occurred during exam scoring.');
    }

    // Clean up local session storage upon successful submission
    try {
      const storageKey = getStorageKey(payload.studentId, payload.examId, payload.medium);
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }

    return {
      success: true,
      result: data.result as ExamResultDocument,
      alreadySubmitted: data.alreadySubmitted,
    };
  } catch (error: any) {
    console.error('Exam submission error:', error);
    throw error;
  }
}

/**
 * Fetches a single exam result by ID.
 */
export async function getExamResult(resultId: string): Promise<ExamResultDocument | null> {
  try {
    const snap = await getDoc(doc(db, 'results', resultId));
    if (!snap.exists()) return null;
    return snap.data() as ExamResultDocument;
  } catch (error) {
    console.error('Error fetching exam result:', error);
    return null;
  }
}
