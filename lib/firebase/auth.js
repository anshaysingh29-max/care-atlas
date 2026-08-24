'use client';

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { USER_ROLES } from './roles';

/**
 * Foundation helper for Phase 6B.
 * Creates a Firebase Auth account plus matching user/patient Firestore documents.
 * This function is intentionally not wired to the UI until Phase 6B.
 */
export async function registerPatient({ name, email, password, country }) {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  if (name) {
    await updateProfile(user, { displayName: name });
  }

  const base = {
    userId: user.uid,
    email: user.email,
    displayName: name || '',
    country: country || '',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, 'users', user.uid), {
    ...base,
    role: USER_ROLES.PATIENT
  });

  await setDoc(doc(db, 'patients', user.uid), base);

  return user;
}

export async function signInPatient({ email, password }) {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

export async function signOutCurrentUser() {
  await signOut(getFirebaseAuth());
}

export function subscribeToAuthState(callback) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
