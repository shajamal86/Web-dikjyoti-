import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import { handleFirestoreError } from '../firebase/errors';
import { OperationType, UserProfile, UserRole } from '../types';
import {
  isValidMobileNumber,
  saveStudentPrivateDetails,
  getStudentPrivateDetails,
} from './studentDetailService';

export const TEACHER_SECRET_PASSCODE = 'dikjyoti@.online.exam.sunday@8638';

// Validate email format
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim().toLowerCase());
}

// Test connectivity to Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_health', 'connection'));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('Firestore is running in offline mode.');
      return false;
    }
    // If permission or not found, connection is still live
    return true;
  }
}

// Fetch user profile from Firestore
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      uid,
      displayName: data.displayName || 'User',
      email: data.email || '',
      role: data.role as UserRole,
      isBlocked: Boolean(data.isBlocked),
      profileCompleted: data.profileCompleted !== undefined ? Boolean(data.profileCompleted) : (data.role === 'teacher'),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
      photoURL: data.photoURL,
      provider: data.provider,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Create or ensure user profile document in Firestore
export async function createUserProfileDoc(
  uid: string,
  data: {
    displayName: string;
    email: string;
    role: UserRole;
    provider?: string;
    photoURL?: string;
    profileCompleted?: boolean;
  }
): Promise<UserProfile> {
  const path = `users/${uid}`;
  const now = new Date().toISOString();
  const isCompleted = data.profileCompleted !== undefined 
    ? data.profileCompleted 
    : (data.role === 'teacher');

  const profile: UserProfile = {
    uid,
    displayName: data.displayName,
    email: data.email,
    role: data.role,
    isBlocked: false,
    profileCompleted: isCompleted,
    createdAt: now,
    updatedAt: now,
    provider: data.provider || 'password',
    photoURL: data.photoURL || '',
  };

  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      ...profile,
      serverCreatedAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp(),
    });
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Student Sign Up with Extended Mandatory Fields (Part 6)
export async function registerStudent(
  name: string,
  email: string,
  pass: string,
  confirmPass: string,
  registrationDetails: {
    mobile: string;
    fathersName: string;
    village: string;
    postOffice: string;
  }
): Promise<UserProfile> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanMobile = (registrationDetails?.mobile || '').trim();
  const cleanFathersName = (registrationDetails?.fathersName || '').trim();
  const cleanVillage = (registrationDetails?.village || '').trim();
  const cleanPostOffice = (registrationDetails?.postOffice || '').trim();

  // Strict field-by-field validation with actionable error messages
  if (!cleanName || cleanName.length < 2) {
    throw new Error('Please enter your full legal name (at least 2 characters).');
  }
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    throw new Error('Please provide a valid active email address.');
  }
  if (!cleanMobile) {
    throw new Error('Mobile number is required.');
  }
  if (!isValidMobileNumber(cleanMobile)) {
    throw new Error('Please enter a valid 10-digit mobile phone number (e.g. 6002200319).');
  }
  if (!cleanFathersName || cleanFathersName.length < 2) {
    throw new Error("Father's name is required (at least 2 characters).");
  }
  if (!cleanVillage) {
    throw new Error('Village is required as a distinct address field.');
  }
  if (!cleanPostOffice) {
    throw new Error('Post Office (P.O.) is required as a distinct address field.');
  }
  if (pass.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  if (pass !== confirmPass) {
    throw new Error('Password and Confirm Password do not match.');
  }

  // 1. Create Firebase Auth account
  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const fbUser = userCredential.user;

  // 2. Update Auth display name
  try {
    await updateProfile(fbUser, { displayName: cleanName });
  } catch (e) {
    console.warn('Could not update Auth displayName:', e);
  }

  // 3. Create profile in Firestore with profileCompleted: true
  const profile = await createUserProfileDoc(fbUser.uid, {
    displayName: cleanName,
    email: cleanEmail,
    role: 'student',
    provider: 'password',
    profileCompleted: true,
  });

  // 4. Save sensitive fields to protected storage (separate from public profile)
  await saveStudentPrivateDetails(fbUser.uid, {
    mobile: cleanMobile,
    fathersName: cleanFathersName,
    village: cleanVillage,
    postOffice: cleanPostOffice,
  });

  return profile;
}

// Student Login (Email & Password)
export async function loginStudent(email: string, pass: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    throw new Error('Please provide a valid email address.');
  }
  if (!pass) {
    throw new Error('Please enter your password.');
  }

  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  const fbUser = userCredential.user;

  // Fetch profile
  let profile = await getUserProfile(fbUser.uid);

  // If profile doesn't exist yet, fallback create student profile
  if (!profile) {
    profile = await createUserProfileDoc(fbUser.uid, {
      displayName: fbUser.displayName || 'Student',
      email: cleanEmail,
      role: 'student',
      provider: 'password',
      profileCompleted: false,
    });
  }

  // Check if account is blocked
  if (profile.isBlocked) {
    await signOut(auth);
    throw new Error(
      'Your student account has been suspended or blocked. Please contact the administrator at Dikjyoti.'
    );
  }

  return profile;
}

// Custom error class for unauthorized domain
export class UnauthorizedDomainError extends Error {
  domain: string;
  code: string;
  constructor(domain: string) {
    super(`Google Sign-In requires "${domain}" to be added to Authorized Domains in your Firebase Console.`);
    this.name = 'UnauthorizedDomainError';
    this.code = 'auth/unauthorized-domain';
    this.domain = domain;
  }
}

// Real Google Sign-in for Students
export async function loginWithGoogle(): Promise<UserProfile> {
  let fbUser: FirebaseUser;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    fbUser = result.user;
  } catch (err: any) {
    if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'run.app';
      throw new UnauthorizedDomainError(currentHost);
    }
    throw err;
  }

  let profile = await getUserProfile(fbUser.uid);

  if (!profile) {
    // New Google student user -> created with profileCompleted = false
    // Prompt will immediately present the required one-time profile completion modal
    profile = await createUserProfileDoc(fbUser.uid, {
      displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Student',
      email: fbUser.email || '',
      role: 'student',
      provider: 'google.com',
      photoURL: fbUser.photoURL || undefined,
      profileCompleted: false,
    });
  } else {
    // Existing profile -> verify block status
    if (profile.isBlocked) {
      await signOut(auth);
      throw new Error(
        'Your account has been suspended or blocked. Please contact Dikjyoti administration.'
      );
    }

    // Check if legacy user already has private details saved in Firestore
    if (profile.role === 'student' && !profile.profileCompleted) {
      const existingDetails = await getStudentPrivateDetails(fbUser.uid);
      if (existingDetails?.mobile && existingDetails?.fathersName) {
        profile.profileCompleted = true;
      }
    }
  }

  return profile;
}

// Quick Google Demo / Test Sign-In for preview environments
export async function loginWithGoogleDemo(
  demoEmail = 'student.google@dikjyoti.in',
  demoName = 'Google Student Candidate'
): Promise<UserProfile> {
  const demoPass = 'DikjyotiGoogle2026!';
  let fbUser: FirebaseUser;

  try {
    const cred = await signInWithEmailAndPassword(auth, demoEmail, demoPass);
    fbUser = cred.user;
  } catch (err: any) {
    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/wrong-password'
    ) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
        fbUser = cred.user;
        await updateProfile(fbUser, { displayName: demoName });
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          const retryCred = await signInWithEmailAndPassword(auth, demoEmail, demoPass);
          fbUser = retryCred.user;
        } else {
          throw createErr;
        }
      }
    } else {
      throw err;
    }
  }

  let profile = await getUserProfile(fbUser.uid);
  if (!profile) {
    profile = await createUserProfileDoc(fbUser.uid, {
      displayName: demoName,
      email: demoEmail,
      role: 'student',
      provider: 'google.com',
      profileCompleted: false, // Forces the Part 6 profile completion step!
    });
  }

  return profile;
}

// Teacher Sign Up (Requires Secret Passcode)
export async function registerTeacher(
  name: string,
  email: string,
  pass: string,
  confirmPass: string,
  secretPasscode: string
): Promise<UserProfile> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  // Validate Secret Passcode strictly FIRST
  if (secretPasscode.trim() !== TEACHER_SECRET_PASSCODE) {
    throw new Error(
      'Incorrect Secret Passcode. Teacher account creation is restricted to authorized faculty members only.'
    );
  }

  if (!cleanName) {
    throw new Error('Please enter your full faculty name.');
  }
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    throw new Error('Please provide a valid official email address.');
  }
  if (pass.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  if (pass !== confirmPass) {
    throw new Error('Password and Confirm Password do not match.');
  }

  // Create Firebase Auth account
  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const fbUser = userCredential.user;

  // Update Auth display name
  try {
    await updateProfile(fbUser, { displayName: cleanName });
  } catch (e) {
    console.warn('Could not update Auth displayName:', e);
  }

  // Create profile in Firestore with role 'teacher'
  const profile = await createUserProfileDoc(fbUser.uid, {
    displayName: cleanName,
    email: cleanEmail,
    role: 'teacher',
    provider: 'password',
  });

  return profile;
}

// Teacher Login (Email & Password ONLY - no passcode prompt)
export async function loginTeacher(email: string, pass: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    throw new Error('Please enter a valid teacher email address.');
  }
  if (!pass) {
    throw new Error('Please enter your password.');
  }

  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  const fbUser = userCredential.user;

  // Verify role
  const profile = await getUserProfile(fbUser.uid);

  if (!profile) {
    await signOut(auth);
    throw new Error(
      'No teacher record found for this email. Please register through the Teacher Sign Up page with your secret passcode.'
    );
  }

  if (profile.role !== 'teacher') {
    await signOut(auth);
    throw new Error(
      'This account is registered as a Student. Please log in through the Student Portal.'
    );
  }

  if (profile.isBlocked) {
    await signOut(auth);
    throw new Error(
      'Your faculty account has been locked or suspended. Please contact Dikjyoti administration.'
    );
  }

  return profile;
}

// Sign Out
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
