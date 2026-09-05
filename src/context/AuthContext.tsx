import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserProfile, logoutUser, testFirestoreConnection } from '../services/authService';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial test connection check
    testFirestoreConnection().catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const profile = await getUserProfile(fbUser.uid);
          if (profile) {
            if (profile.isBlocked) {
              await logoutUser();
              setUser(null);
              setFirebaseUser(null);
              setError(
                'Your account has been suspended or blocked by Dikjyoti administrator.'
              );
            } else {
              setUser(profile);
              setError(null);
            }
          } else {
            // Profile doc might be created during the registration call itself,
            // or if missing we retain placeholder until created
            setUser({
              uid: fbUser.uid,
              displayName: fbUser.displayName || 'User',
              email: fbUser.email || '',
              role: 'student',
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err: any) {
          console.error('Failed to load user profile on auth state change:', err);
          setError('Failed to synchronize user session from cloud database.');
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!auth.currentUser) return null;
    try {
      const p = await getUserProfile(auth.currentUser.uid);
      if (p) {
        if (p.isBlocked) {
          await logoutUser();
          setUser(null);
          setFirebaseUser(null);
          setError('Your account has been suspended or blocked.');
          return null;
        }
        setUser(p);
        return p;
      }
      return null;
    } catch (err) {
      console.error('Error refreshing profile:', err);
      return null;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setFirebaseUser(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        error,
        setError,
        logout,
        refreshProfile,
        isOnline,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
