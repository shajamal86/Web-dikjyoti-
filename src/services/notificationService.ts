import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError } from '../firebase/errors';
import { AppNotification, OperationType } from '../types';

/**
 * Creates persistent notification records for all enrolled students when an exam is marked Live.
 * Each student receives their own private copy in `/users/{studentId}/notifications/{notifId}`,
 * ensuring that when a student deletes a notification, it permanently deletes only their document
 * without altering any other student's notification history.
 */
export async function createLiveExamNotificationsForStudents(
  examId: string,
  examTitle: string
): Promise<number> {
  try {
    // 1. Fetch all enrolled students
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const studentsSnap = await getDocs(studentsQuery);

    if (studentsSnap.empty) {
      console.log('No enrolled students found to dispatch notifications.');
      return 0;
    }

    const now = new Date().toISOString();
    let sentCount = 0;

    // 2. Dispatch a separate document per student
    const promises = studentsSnap.docs.map(async (studentDoc) => {
      const studentId = studentDoc.id;
      const notifId = `notif_${examId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const notifRef = doc(db, 'users', studentId, 'notifications', notifId);

      const notification: AppNotification = {
        id: notifId,
        studentId,
        examId,
        title: `New Exam Live: ${examTitle}`,
        message: `The standardized test "${examTitle}" is now live on the portal. Attempt all sections (Math, Reasoning, Hindi, GK) before the submission window concludes.`,
        createdAt: now,
        read: false,
        type: 'exam_live',
      };

      try {
        await setDoc(notifRef, notification);
        sentCount++;
      } catch (err) {
        console.warn(`Could not send notification to student ${studentId}:`, err);
      }
    });

    await Promise.all(promises);
    return sentCount;
  } catch (error) {
    console.error('Error dispatching live exam notifications:', error);
    return 0;
  }
}

/**
 * Retrieves all notifications for a specific student, sorted newest first.
 */
export async function getStudentNotifications(studentId: string): Promise<AppNotification[]> {
  const path = `users/${studentId}/notifications`;
  try {
    const notifsRef = collection(db, 'users', studentId, 'notifications');
    const snap = await getDocs(notifsRef);
    const list: AppNotification[] = [];

    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        studentId,
        examId: data.examId || '',
        title: data.title || 'Notification',
        message: data.message || '',
        createdAt: data.createdAt || new Date().toISOString(),
        read: Boolean(data.read),
        type: data.type || 'exam_live',
      });
    });

    // Sort chronologically descending (newest first)
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (error) {
    throw handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Permanently deletes a specific notification document from Firestore.
 * Conforms strictly to Part 6 requirement:
 * "this must permanently remove that specific notification document from Firestore (not just hide it locally),
 * confirmed by it not reappearing if the browser is closed and reopened, and it must not affect any other
 * student's copy of that same notification."
 */
export async function deleteStudentNotification(
  studentId: string,
  notificationId: string
): Promise<void> {
  const path = `users/${studentId}/notifications/${notificationId}`;
  try {
    const notifRef = doc(db, 'users', studentId, 'notifications', notificationId);
    await deleteDoc(notifRef);
  } catch (error) {
    throw handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Permanently deletes all notification documents for this student from Firestore.
 */
export async function clearAllStudentNotifications(studentId: string): Promise<number> {
  const path = `users/${studentId}/notifications`;
  try {
    const notifsRef = collection(db, 'users', studentId, 'notifications');
    const snap = await getDocs(notifsRef);
    let deleted = 0;

    const deletions = snap.docs.map(async (d) => {
      await deleteDoc(d.ref);
      deleted++;
    });

    await Promise.all(deletions);
    return deleted;
  } catch (error) {
    throw handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Marks a notification as read
 */
export async function markNotificationAsRead(
  studentId: string,
  notificationId: string
): Promise<void> {
  try {
    const notifRef = doc(db, 'users', studentId, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Could not mark notification read:', error);
  }
}
