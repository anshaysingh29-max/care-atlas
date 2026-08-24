'use client';

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';

function requireUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    const error = new Error('Please sign in before creating or viewing a CareAtlas case.');
    error.code = 'careatlas/auth-required';
    throw error;
  }
  return user;
}

function createCaseNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CA-${yy}${mm}${dd}-${random}`;
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export async function createPatientCase({ form, treatmentName }) {
  const user = requireUser();
  const db = getFirebaseDb();
  const caseNumber = createCaseNumber();

  const casePayload = {
    caseNumber,
    patientId: user.uid,
    patientName: form.name || user.displayName || '',
    patientEmail: user.email || form.email || '',
    patientCountry: form.country || '',
    patientAge: form.age ? Number(form.age) : null,
    patientGender: form.gender || '',
    patientPhone: form.phone || '',
    patientLanguage: form.language || 'English',

    treatmentSlug: form.treatment,
    treatmentName: treatmentName || form.treatment,
    diagnosis: form.diagnosis.trim(),
    urgency: form.urgency,

    preferredDestinationSlugs: form.preferredDestinations || [],
    budget: form.budget || '',
    companions: form.companions || '',
    travelAssistance: {
      visa: Boolean(form.visa),
      accommodation: Boolean(form.accommodation),
      airportPickup: Boolean(form.airportPickup)
    },

    status: 'submitted',
    currentStage: 'case_submitted',
    assignedHospitalIds: [],
    coordinatorId: null,
    documentCount: 0,
    source: 'web',
    submittedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const caseRef = await addDoc(collection(db, 'cases'), casePayload);

  await setDoc(doc(db, 'patients', user.uid), {
    userId: user.uid,
    email: user.email || form.email || '',
    displayName: form.name || user.displayName || '',
    country: form.country || '',
    age: form.age ? Number(form.age) : null,
    gender: form.gender || '',
    phone: form.phone || '',
    preferredLanguage: form.language || 'English',
    updatedAt: serverTimestamp()
  }, { merge: true });

  return {
    id: caseRef.id,
    caseNumber,
    ...casePayload
  };
}

export async function getPatientCases(patientId) {
  const user = requireUser();
  const ownerId = patientId || user.uid;

  if (ownerId !== user.uid) {
    throw new Error('You can only load your own CareAtlas cases.');
  }

  const db = getFirebaseDb();
  const casesQuery = query(
    collection(db, 'cases'),
    where('patientId', '==', ownerId)
  );

  const snapshot = await getDocs(casesQuery);
  return snapshot.docs
    .map(caseDoc => ({ id: caseDoc.id, ...caseDoc.data() }))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

export function formatFirebaseTimestamp(value, fallback = 'Just now') {
  const millis = timestampMillis(value);
  if (!millis) return fallback;
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(millis));
}
