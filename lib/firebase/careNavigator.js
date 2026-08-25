'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { safeMatchSnapshot, MATCH_ALGORITHM_VERSION } from '@/lib/ai/matching';

function requireUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sign in to save your CareAtlas shortlist.');
  return user;
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export function formatNavigatorDate(value, fallback = '—') {
  const millis = timestampMillis(value);
  if (!millis) return fallback;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(millis));
}

export async function getNavigatorProfile() {
  const user = requireUser();
  const snapshot = await getDoc(doc(getFirebaseDb(), 'careNavigatorProfiles', user.uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function saveNavigatorShortlist(input) {
  const user = requireUser();
  const db = getFirebaseDb();
  const safe = safeMatchSnapshot(input);
  const profileRef = doc(db, 'careNavigatorProfiles', user.uid);
  const profileSnapshot = await getDoc(profileRef);
  const matchRef = doc(collection(db, 'careMatchRuns'));

  const profilePayload = {
    patientId: user.uid,
    ...safe,
    source: 'patient_web',
    updatedAt: serverTimestamp()
  };
  if (!profileSnapshot.exists()) profilePayload.createdAt = serverTimestamp();

  await setDoc(profileRef, profilePayload, { merge: true });
  await setDoc(matchRef, {
    matchRunId: matchRef.id,
    patientId: user.uid,
    ...safe,
    source: 'patient_web',
    createdAt: serverTimestamp()
  });

  return { profileId: user.uid, matchRunId: matchRef.id, algorithmVersion: MATCH_ALGORITHM_VERSION };
}

export async function getMyMatchRuns() {
  const user = requireUser();
  const snapshot = await getDocs(query(collection(getFirebaseDb(), 'careMatchRuns'), where('patientId', '==', user.uid)));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

export async function getAdminMatchRuns() {
  const snapshot = await getDocs(collection(getFirebaseDb(), 'careMatchRuns'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
    .slice(0, 120);
}
