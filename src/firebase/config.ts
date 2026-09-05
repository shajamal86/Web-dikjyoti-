import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyA5kidBvi0FcLPrntMrZ20AiMc1cLyXPG4",
  authDomain: "web-dikjyoti-test.firebaseapp.com",
  projectId: "web-dikjyoti-test",
  storageBucket: "web-dikjyoti-test.firebasestorage.app",
  messagingSenderId: "713357898437",
  appId: "1:713357898437:web:0e558786f412d14e0bb6ac"
};

// Initialize Firebase App instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with Offline Persistence enabled
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  // If already initialized or cache setup fails (e.g. unsupported in specific env)
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
