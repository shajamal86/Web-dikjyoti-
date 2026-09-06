import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError } from '../firebase/errors';
import { createLiveExamNotificationsForStudents } from './notificationService';
import {
  ExamDocument,
  QuestionSetDocument,
  QuestionItem,
  MediumType,
  SubjectType,
  SubjectDurations,
  OperationType,
  EXAM_SUBJECTS,
} from '../types';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';

/**
 * Creates a new draft exam or updates an existing one
 */
export async function createExamDraft(
  teacherId: string,
  teacherName: string,
  title: string,
  description?: string,
  durations?: Partial<SubjectDurations>
): Promise<ExamDocument> {
  const examId = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const examRef = doc(db, 'exams', examId);

  const newExam: ExamDocument = {
    id: examId,
    teacherId,
    teacherName,
    title: title.trim() || 'Untitled Exam',
    description: description || '',
    status: 'draft',
    subjectDurations: {
      math: durations?.math ?? 15,
      reasoning: durations?.reasoning ?? 15,
      hindi: durations?.hindi ?? 15,
      gk: durations?.gk ?? 15,
    },
    mediums: {
      hindi: {
        enabled: false,
        completedSubjects: [],
        totalQuestions: 0,
      },
      assamese: {
        enabled: false,
        completedSubjects: [],
        totalQuestions: 0,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(examRef, sanitizeForFirestore(newExam));
    return newExam;
  } catch (error) {
    throw handleFirestoreError(error, OperationType.CREATE, `exams/${examId}`);
  }
}

/**
 * Retrieves an exam document by ID
 */
export async function getExam(examId: string): Promise<ExamDocument | null> {
  try {
    const snap = await getDoc(doc(db, 'exams', examId));
    if (!snap.exists()) return null;
    return snap.data() as ExamDocument;
  } catch (error) {
    throw handleFirestoreError(error, OperationType.GET, `exams/${examId}`);
  }
}

/**
 * Lists all exams authored by a teacher
 */
export async function listTeacherExams(teacherId: string): Promise<ExamDocument[]> {
  try {
    const q = query(collection(db, 'exams'), where('teacherId', '==', teacherId));
    const snap = await getDocs(q);
    const exams: ExamDocument[] = [];
    snap.forEach((d) => {
      exams.push(d.data() as ExamDocument);
    });
    // Sort client-side by date descending
    exams.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return exams;
  } catch (error) {
    throw handleFirestoreError(error, OperationType.LIST, 'exams');
  }
}

/**
 * Updates subject durations for an exam
 */
export async function updateSubjectDurations(
  examId: string,
  durations: SubjectDurations
): Promise<void> {
  const examRef = doc(db, 'exams', examId);
  try {
    await updateDoc(examRef, {
      subjectDurations: durations,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `exams/${examId}`);
  }
}

/**
 * Step 1: Save or update password for a specific medium (Hindi or Assamese)
 */
export async function setMediumPassword(
  examId: string,
  medium: MediumType,
  password: string
): Promise<void> {
  const examRef = doc(db, 'exams', examId);
  try {
    const fieldPath = `mediums.${medium}`;
    await updateDoc(examRef, {
      [`${fieldPath}.enabled`]: true,
      [`${fieldPath}.password`]: password.trim(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `exams/${examId}`);
  }
}

/**
 * Fetches the single-document question set for (examId, medium, subject)
 */
export async function getQuestionSet(
  examId: string,
  medium: MediumType,
  subject: SubjectType
): Promise<QuestionSetDocument | null> {
  const setId = `${medium}_${subject}`;
  const setRef = doc(db, 'exams', examId, 'questionSets', setId);
  try {
    const snap = await getDoc(setRef);
    if (!snap.exists()) return null;
    return snap.data() as QuestionSetDocument;
  } catch (error) {
    throw handleFirestoreError(error, OperationType.GET, `exams/${examId}/questionSets/${setId}`);
  }
}

/**
 * Step 3: Appends a question directly to the single QuestionSet document array
 */
export async function appendQuestionToQuestionSet(
  examId: string,
  medium: MediumType,
  subject: SubjectType,
  question: QuestionItem
): Promise<{ questionsCount: number }> {
  const setId = `${medium}_${subject}`;
  const setRef = doc(db, 'exams', examId, 'questionSets', setId);
  const examRef = doc(db, 'exams', examId);

  try {
    // Sanitize question data so no undefined properties reach Firestore
    const cleanQuestion = sanitizeForFirestore<QuestionItem>(question);

    const snap = await getDoc(setRef);
    let newCount = 1;

    if (!snap.exists()) {
      // First question in this subject+medium combination: initialize single document with array
      const newDoc: QuestionSetDocument = {
        id: setId,
        examId,
        medium,
        subject,
        isCompleted: false,
        questionsCount: 1,
        questions: [cleanQuestion],
        updatedAt: new Date().toISOString(),
      };
      await setDoc(setRef, sanitizeForFirestore(newDoc));
    } else {
      // Append to the existing single document array
      const existingData = snap.data() as QuestionSetDocument;
      const currentList = existingData.questions || [];
      const updatedList = [...currentList, cleanQuestion];
      newCount = updatedList.length;

      await setDoc(
        setRef,
        sanitizeForFirestore({
          ...existingData,
          questions: updatedList,
          questionsCount: newCount,
          updatedAt: new Date().toISOString(),
        })
      );
    }

    // Also update total questions on the exam document
    const examSnap = await getDoc(examRef);
    if (examSnap.exists()) {
      const examData = examSnap.data() as ExamDocument;
      const currentTotal = examData.mediums?.[medium]?.totalQuestions || 0;
      await updateDoc(examRef, {
        [`mediums.${medium}.totalQuestions`]: currentTotal + 1,
        updatedAt: new Date().toISOString(),
      });
    }

    return { questionsCount: newCount };
  } catch (error) {
    throw handleFirestoreError(error, OperationType.WRITE, `exams/${examId}/questionSets/${setId}`);
  }
}

/**
 * Deletes a question from the questionSet document array and updates counters.
 */
export async function deleteQuestionFromQuestionSet(
  examId: string,
  medium: MediumType,
  subject: SubjectType,
  questionId: string
): Promise<{ questionsCount: number }> {
  const setId = `${medium}_${subject}`;
  const setRef = doc(db, 'exams', examId, 'questionSets', setId);
  const examRef = doc(db, 'exams', examId);

  try {
    const snap = await getDoc(setRef);
    if (!snap.exists()) return { questionsCount: 0 };

    const data = snap.data() as QuestionSetDocument;
    const filteredQuestions = (data.questions || []).filter((q) => q.id !== questionId);
    // Re-index remaining questions
    const reindexedQuestions = filteredQuestions.map((q, idx) => ({
      ...q,
      questionIndex: idx + 1,
    }));

    await setDoc(
      setRef,
      sanitizeForFirestore({
        ...data,
        questions: reindexedQuestions,
        questionsCount: reindexedQuestions.length,
        updatedAt: new Date().toISOString(),
      })
    );

    // Update total questions on exam document
    const examSnap = await getDoc(examRef);
    if (examSnap.exists()) {
      const examData = examSnap.data() as ExamDocument;
      const currentTotal = Math.max(0, (examData.mediums?.[medium]?.totalQuestions || 1) - 1);
      await updateDoc(examRef, {
        [`mediums.${medium}.totalQuestions`]: currentTotal,
        updatedAt: new Date().toISOString(),
      });
    }

    return { questionsCount: reindexedQuestions.length };
  } catch (error) {
    throw handleFirestoreError(error, OperationType.WRITE, `exams/${examId}/questionSets/${setId}`);
  }
}

/**
 * Step 4: Mark Subject as Complete
 */
export async function markSubjectAsComplete(
  examId: string,
  medium: MediumType,
  subject: SubjectType
): Promise<void> {
  const setId = `${medium}_${subject}`;
  const setRef = doc(db, 'exams', examId, 'questionSets', setId);
  const examRef = doc(db, 'exams', examId);

  try {
    // 1. Mark the questionSet document complete
    await updateDoc(setRef, {
      isCompleted: true,
      updatedAt: new Date().toISOString(),
    });

    // 2. Add subject to completedSubjects on the master exam document
    await updateDoc(examRef, {
      [`mediums.${medium}.completedSubjects`]: arrayUnion(subject),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `exams/${examId}`);
  }
}

/**
 * Publishing: Check if exam qualifies to be marked Live, then update
 * Rule: An exam can only be marked "Live" once every subject, for at least
 * one fully set-up medium, has been explicitly marked complete via Step 4.
 */
export async function publishExam(examId: string): Promise<{ success: boolean; medium: MediumType }> {
  const exam = await getExam(examId);
  if (!exam) throw new Error('Exam not found');

  const hindiCompleted =
    exam.mediums.hindi?.enabled &&
    EXAM_SUBJECTS.every((s) => exam.mediums.hindi?.completedSubjects.includes(s));

  const assameseCompleted =
    exam.mediums.assamese?.enabled &&
    EXAM_SUBJECTS.every((s) => exam.mediums.assamese?.completedSubjects.includes(s));

  if (!hindiCompleted && !assameseCompleted) {
    const missing: string[] = [];
    if (exam.mediums.hindi?.enabled) {
      const pendingHindi = EXAM_SUBJECTS.filter(
        (s) => !exam.mediums.hindi?.completedSubjects.includes(s)
      );
      missing.push(`Hindi pending: ${pendingHindi.join(', ')}`);
    }
    if (exam.mediums.assamese?.enabled) {
      const pendingAssamese = EXAM_SUBJECTS.filter(
        (s) => !exam.mediums.assamese?.completedSubjects.includes(s)
      );
      missing.push(`Assamese pending: ${pendingAssamese.join(', ')}`);
    }

    if (missing.length === 0) {
      throw new Error(
        'Cannot publish exam: At least one medium (Hindi or Assamese) must have all 4 subjects (Math, Reasoning, Hindi, GK) marked complete.'
      );
    } else {
      throw new Error(
        `Cannot publish exam yet. At least one medium must be 100% complete:\n${missing.join(' | ')}`
      );
    }
  }

  const examRef = doc(db, 'exams', examId);
  try {
    await updateDoc(examRef, {
      status: 'live',
      isLive: true,
      updatedAt: new Date().toISOString(),
    });

    // Part 6: Dispatch notification records to all enrolled students
    try {
      await createLiveExamNotificationsForStudents(exam.id, exam.title);
    } catch (notifErr) {
      console.warn('Could not dispatch live exam notifications:', notifErr);
    }

    return {
      success: true,
      medium: hindiCompleted ? 'hindi' : 'assamese',
    };
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `exams/${examId}`);
  }
}

/**
 * Fetches all questionSet documents for an exam across all subjects and mediums
 */
export async function getAllExamQuestionSets(examId: string): Promise<QuestionSetDocument[]> {
  try {
    const questionSetsRef = collection(db, 'exams', examId, 'questionSets');
    const snap = await getDocs(questionSetsRef);
    const sets: QuestionSetDocument[] = [];
    snap.forEach((d) => {
      sets.push(d.data() as QuestionSetDocument);
    });
    return sets;
  } catch (error) {
    throw handleFirestoreError(error, OperationType.LIST, `exams/${examId}/questionSets`);
  }
}

/**
 * Duplicate an existing exam:
 * Copies structure, subject durations, and all question array-documents
 * Resets status to draft and requires new medium passwords before publishing.
 */
export async function duplicateExam(
  sourceExamId: string,
  teacherId: string,
  teacherName: string,
  customTitle?: string
): Promise<ExamDocument> {
  const sourceExam = await getExam(sourceExamId);
  if (!sourceExam) {
    throw new Error('Source examination paper not found');
  }

  // Fetch all existing questionSets from source
  const sourceQuestionSets = await getAllExamQuestionSets(sourceExamId);

  const newExamId = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const title = (customTitle || `${sourceExam.title} (Copy)`).trim();

  // Create new exam draft - mediums require new passwords before being live
  const newExam: ExamDocument = {
    id: newExamId,
    teacherId,
    teacherName,
    title,
    description: sourceExam.description || '',
    status: 'draft',
    subjectDurations: { ...sourceExam.subjectDurations },
    mediums: {
      hindi: {
        enabled: false, // Must be re-enabled with new password
        completedSubjects: sourceExam.mediums?.hindi?.completedSubjects || [],
        totalQuestions: sourceExam.mediums?.hindi?.totalQuestions || 0,
      },
      assamese: {
        enabled: false, // Must be re-enabled with new password
        completedSubjects: sourceExam.mediums?.assamese?.completedSubjects || [],
        totalQuestions: sourceExam.mediums?.assamese?.totalQuestions || 0,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    // 1. Save duplicated master exam document
    await setDoc(doc(db, 'exams', newExamId), sanitizeForFirestore(newExam));

    // 2. Clone all question sets into the new exam subcollection
    for (const qSet of sourceQuestionSets) {
      const clonedSet: QuestionSetDocument = {
        ...qSet,
        id: qSet.id,
        examId: newExamId,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'exams', newExamId, 'questionSets', qSet.id), sanitizeForFirestore(clonedSet));
    }

    return newExam;
  } catch (error) {
    throw handleFirestoreError(error, OperationType.CREATE, `exams/${newExamId}`);
  }
}

/**
 * Delete an exam draft or record along with all its question set documents.
 * NOTE: Student results stored in 'results' collection remain permanently untouched.
 */
export async function deleteExam(examId: string): Promise<void> {
  try {
    // 1. Delete all subcollection question documents
    const qSetsRef = collection(db, 'exams', examId, 'questionSets');
    const snap = await getDocs(qSetsRef);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // 2. Delete the master exam document
    const examRef = doc(db, 'exams', examId);
    await deleteDoc(examRef);
    // Note: Any results tied to examId in 'results' are intentionally preserved
  } catch (error) {
    throw handleFirestoreError(error, OperationType.DELETE, `exams/${examId}`);
  }
}

