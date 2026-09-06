import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError } from '../firebase/errors';
import { OperationType, StudentPrivateDetails } from '../types';

/**
 * Validates whether the given string looks like a legitimate mobile telephone number.
 * Supports standard Indian 10-digit mobile numbers (starting with 6, 7, 8, or 9),
 * as well as standard formats with country code (+91, 91, or leading 0).
 */
export function isValidMobileNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  // Remove common format artifacts: spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Standard Indian 10-digit mobile number: ^[6-9]\d{9}$
  const indian10Regex = /^[6-9]\d{9}$/;
  if (indian10Regex.test(cleaned)) return true;

  // Indian number with +91 or 91 or 0 prefix
  const indianPrefixedRegex = /^(\+91|91|0)[6-9]\d{9}$/;
  if (indianPrefixedRegex.test(cleaned)) return true;

  // General 10 to 14 digit international number fallback
  const generalDigitsRegex = /^\+?[0-9]{10,14}$/;
  return generalDigitsRegex.test(cleaned);
}

/**
 * Saves sensitive student registration details into protected storage.
 * Note: These fields are NEVER stored in public directories, leaderboards, or root results.
 * Access is restricted via Firestore Security Rules to the student owner and verified teachers only.
 */
export async function saveStudentPrivateDetails(
  studentId: string,
  details: {
    mobile: string;
    fathersName: string;
    village: string;
    postOffice: string;
  }
): Promise<StudentPrivateDetails> {
  const cleanMobile = details.mobile.trim();
  const cleanFathersName = details.fathersName.trim();
  const cleanVillage = details.village.trim();
  const cleanPostOffice = details.postOffice.trim();

  if (!cleanMobile) {
    throw new Error('Mobile number is required.');
  }
  if (!isValidMobileNumber(cleanMobile)) {
    throw new Error('Please enter a valid 10-digit mobile phone number (e.g. 6002200319).');
  }
  if (!cleanFathersName || cleanFathersName.length < 2) {
    throw new Error("Father's Name is required (at least 2 characters).");
  }
  if (!cleanVillage) {
    throw new Error('Village is required as a separate address field.');
  }
  if (!cleanPostOffice) {
    throw new Error('Post Office (P.O.) is required as a separate address field.');
  }

  const now = new Date().toISOString();
  const payload: StudentPrivateDetails = {
    uid: studentId,
    mobile: cleanMobile,
    fathersName: cleanFathersName,
    village: cleanVillage,
    postOffice: cleanPostOffice,
    createdAt: now,
    updatedAt: now,
  };

  const primaryPath = `users/${studentId}/private/details`;
  try {
    // 1. Write to protected private subcollection
    const privateRef = doc(db, 'users', studentId, 'private', 'details');
    await setDoc(privateRef, payload);

    // 2. Also mirror to root protected collection for flexible querying
    try {
      const fallbackRef = doc(db, 'studentDetails', studentId);
      await setDoc(fallbackRef, payload);
    } catch (e) {
      // Non-blocking fallback
      console.warn('Fallback studentDetails write warning:', e);
    }

    // 3. Mark public user document as profileCompleted = true
    try {
      const userRef = doc(db, 'users', studentId);
      await setDoc(
        userRef,
        {
          profileCompleted: true,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not update profileCompleted flag on users doc:', e);
    }

    // 4. Save synchronous client marker to prevent any modal flicker
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`dikjyoti_profile_completed_${studentId}`, 'true');
      } catch {
        // Ignore quota/storage restrictions
      }
    }

    return payload;
  } catch (error) {
    throw handleFirestoreError(error, OperationType.WRITE, primaryPath);
  }
}

/**
 * Fetches protected student private details.
 * Can only be accessed by that specific student themselves or an authorized faculty/teacher.
 */
export async function getStudentPrivateDetails(
  studentId: string
): Promise<StudentPrivateDetails | null> {
  const path = `users/${studentId}/private/details`;
  try {
    const privateRef = doc(db, 'users', studentId, 'private', 'details');
    const snap = await getDoc(privateRef);
    if (snap.exists()) {
      return snap.data() as StudentPrivateDetails;
    }

    // Check root fallback
    const fallbackRef = doc(db, 'studentDetails', studentId);
    const fallbackSnap = await getDoc(fallbackRef);
    if (fallbackSnap.exists()) {
      return fallbackSnap.data() as StudentPrivateDetails;
    }

    return null;
  } catch (error) {
    console.warn(`Protected details for student ${studentId} not accessible or not found:`, error);
    return null;
  }
}

/**
 * Batch fetches private details for a set of student IDs (used by teachers on roster screen).
 */
export async function getMultipleStudentsPrivateDetails(
  studentIds: string[]
): Promise<Record<string, StudentPrivateDetails>> {
  const map: Record<string, StudentPrivateDetails> = {};
  if (!studentIds || studentIds.length === 0) return map;

  await Promise.all(
    studentIds.map(async (id) => {
      try {
        const details = await getStudentPrivateDetails(id);
        if (details) {
          map[id] = details;
        }
      } catch (e) {
        // Continue for remaining
      }
    })
  );

  return map;
}
