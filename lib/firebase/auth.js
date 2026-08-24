'use client';

import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { USER_ROLES } from './roles';

export async function registerPatient({ name, email, password, country }) {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = credential.user;

  try {
    if (name?.trim()) {
      await updateProfile(user, { displayName: name.trim() });
    }

    const base = {
      userId: user.uid,
      email: user.email,
      displayName: name?.trim() || '',
      country: country?.trim() || '',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', user.uid), {
      ...base,
      role: USER_ROLES.PATIENT
    });
    batch.set(doc(db, 'patients', user.uid), base);
    await batch.commit();

    return user;
  } catch (error) {
    try {
      await deleteUser(user);
    } catch (rollbackError) {
      console.error('Could not roll back Firebase Auth user after profile creation failed.', rollbackError);
    }
    throw error;
  }
}

export async function signInPatient({ email, password }) {
  const credential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password
  );
  return credential.user;
}

export async function resetPatientPassword(email) {
  if (!email?.trim()) {
    const error = new Error('Enter your email address first.');
    error.code = 'careatlas/email-required';
    throw error;
  }
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

export async function signOutCurrentUser() {
  await signOut(getFirebaseAuth());
}

export function subscribeToAuthState(callback) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function friendlyAuthError(error) {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'An account already exists for this email. Sign in instead.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/user-not-found': 'The email or password is incorrect.',
    'auth/wrong-password': 'The email or password is incorrect.',
    'auth/weak-password': 'Use a stronger password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait a little and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'careatlas/email-required': 'Enter your email address first.'
  };
  return messages[code] || error?.message || 'Something went wrong. Please try again.';
}
