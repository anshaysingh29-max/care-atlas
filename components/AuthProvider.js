'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured, missingFirebaseConfig } from '@/lib/firebase/client';
import { signOutCurrentUser, subscribeToAuthState } from '@/lib/firebase/auth';
import { initializeCareAtlasAppCheck } from '@/lib/firebase/appCheck';

const AuthContext = createContext(null);

async function loadProfiles(authUser) {
  const db = getFirebaseDb();
  const [userSnapshot, patientSnapshot, partnerSnapshot, hotelSnapshot] = await Promise.all([
    getDoc(doc(db, 'users', authUser.uid)),
    getDoc(doc(db, 'patients', authUser.uid)),
    getDoc(doc(db, 'partners', authUser.uid)),
    getDoc(doc(db, 'hotels', authUser.uid))
  ]);
  return {
    userProfile: userSnapshot.exists() ? { id: userSnapshot.id, ...userSnapshot.data() } : null,
    patientProfile: patientSnapshot.exists() ? { id: patientSnapshot.id, ...patientSnapshot.data() } : null,
    partnerProfile: partnerSnapshot.exists() ? { id: partnerSnapshot.id, ...partnerSnapshot.data() } : null,
    hotelProfile: hotelSnapshot.exists() ? { id: hotelSnapshot.id, ...hotelSnapshot.data() } : null
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [hotelProfile, setHotelProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const clearProfiles = useCallback(() => {
    setUserProfile(null);
    setPatientProfile(null);
    setPartnerProfile(null);
    setHotelProfile(null);
  }, []);

  const applyProfiles = useCallback(profiles => {
    setUserProfile(profiles.userProfile);
    setPatientProfile(profiles.patientProfile);
    setPartnerProfile(profiles.partnerProfile);
    setHotelProfile(profiles.hotelProfile);
  }, []);

  const refreshProfile = useCallback(async (targetUser) => {
    const authUser = targetUser || user;
    if (!authUser || !isFirebaseConfigured) {
      clearProfiles();
      return;
    }

    try {
      applyProfiles(await loadProfiles(authUser));
      setError('');
    } catch (profileError) {
      console.error('Unable to load CareAtlas profile', profileError);
      setError('We could not load your CareAtlas profile. Please refresh and try again.');
    }
  }, [user, clearProfiles, applyProfiles]);

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
        clearProfiles();
        setLoading(false);
        setError('');
        return;
      }

      try {
        const profiles = await loadProfiles(authUser);
        if (!active) return;
        applyProfiles(profiles);
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
  }, [clearProfiles, applyProfiles]);

  const logout = useCallback(async () => {
    await signOutCurrentUser();
    setUser(null);
    clearProfiles();
  }, [clearProfiles]);

  const value = useMemo(() => ({
    user,
    userProfile,
    patientProfile,
    partnerProfile,
    hotelProfile,
    loading,
    error,
    firebaseConfigured: isFirebaseConfigured,
    refreshProfile,
    logout
  }), [user, userProfile, patientProfile, partnerProfile, hotelProfile, loading, error, refreshProfile, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
