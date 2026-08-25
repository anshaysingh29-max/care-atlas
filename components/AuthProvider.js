'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured, missingFirebaseConfig } from '@/lib/firebase/client';
import { signOutCurrentUser, subscribeToAuthState } from '@/lib/firebase/auth';
import { initializeCareAtlasAppCheck } from '@/lib/firebase/appCheck';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshProfile = useCallback(async (targetUser) => {
    const authUser = targetUser || user;
    if (!authUser || !isFirebaseConfigured) {
      setUserProfile(null);
      setPatientProfile(null);
      return;
    }

    try {
      const db = getFirebaseDb();
      const [userSnapshot, patientSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', authUser.uid)),
        getDoc(doc(db, 'patients', authUser.uid))
      ]);

      setUserProfile(userSnapshot.exists() ? { id: userSnapshot.id, ...userSnapshot.data() } : null);
      setPatientProfile(patientSnapshot.exists() ? { id: patientSnapshot.id, ...patientSnapshot.data() } : null);
      setError('');
    } catch (profileError) {
      console.error('Unable to load CareAtlas profile', profileError);
      setError('We could not load your CareAtlas profile. Please refresh and try again.');
    }
  }, [user]);

  useEffect(() => {
    try {
      initializeCareAtlasAppCheck();
    } catch (appCheckError) {
      console.error('Unable to initialize CareAtlas App Check.', appCheckError);
    }

    if (!isFirebaseConfigured) {
      setLoading(false);
      setError(`Firebase configuration is incomplete: ${missingFirebaseConfig.join(', ')}`);
      return undefined;
    }

    let active = true;
    const unsubscribe = subscribeToAuthState(async authUser => {
      if (!active) return;
      setUser(authUser || null);

      if (!authUser) {
        setUserProfile(null);
        setPatientProfile(null);
        setLoading(false);
        setError('');
        return;
      }

      try {
        const db = getFirebaseDb();
        const [userSnapshot, patientSnapshot] = await Promise.all([
          getDoc(doc(db, 'users', authUser.uid)),
          getDoc(doc(db, 'patients', authUser.uid))
        ]);

        if (!active) return;
        setUserProfile(userSnapshot.exists() ? { id: userSnapshot.id, ...userSnapshot.data() } : null);
        setPatientProfile(patientSnapshot.exists() ? { id: patientSnapshot.id, ...patientSnapshot.data() } : null);
        setError('');
      } catch (profileError) {
        console.error('Unable to load CareAtlas profile', profileError);
        if (active) setError('We could not load your CareAtlas profile. Please refresh and try again.');
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const logout = useCallback(async () => {
    await signOutCurrentUser();
    setUser(null);
    setUserProfile(null);
    setPatientProfile(null);
  }, []);

  const value = useMemo(() => ({
    user,
    userProfile,
    patientProfile,
    loading,
    error,
    firebaseConfigured: isFirebaseConfigured,
    refreshProfile,
    logout
  }), [user, userProfile, patientProfile, loading, error, refreshProfile, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
