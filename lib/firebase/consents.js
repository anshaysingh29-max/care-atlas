'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';

export const CONSENT_VERSION = '2026-08-24-v1';

export const CONSENT_DEFINITIONS = Object.freeze([
  {
    key: 'medicalDataProcessing',
    type: 'medical_data_processing',
    title: 'Medical data processing',
    text: 'I authorize CareAtlas to process the medical information and documents I provide for coordinating my treatment request.'
  },
  {
    key: 'hospitalSharing',
    type: 'hospital_sharing',
    title: 'Sharing with assigned hospitals',
    text: 'I authorize CareAtlas to make my case information and uploaded medical documents available to hospitals that CareAtlas assigns to this case.'
  },
  {
    key: 'careCoordinationMessaging',
    type: 'care_coordination_messaging',
    title: 'Care coordination messaging',
    text: 'I agree to receive and send case-related messages through CareAtlas with the CareAtlas operations team and hospitals assigned to this case.'
  }
]);

function requirePatient() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Patient sign-in is required to manage consent.');
  return user;
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export function formatConsentTimestamp(value, fallback = 'Not recorded') {
  const millis = timestampMillis(value);
  if (!millis) return fallback;
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(millis));
}

export function hasMedicalDataConsent(state) {
  return Boolean(state?.medicalDataProcessing);
}

export function hasHospitalSharingConsent(state) {
  return Boolean(state?.medicalDataProcessing && state?.hospitalSharing);
}

export function hasMessagingConsent(state) {
  return Boolean(state?.careCoordinationMessaging);
}

export async function getPatientCaseConsentState(caseId, patientId = '') {
  const user = requirePatient();
  if (patientId && patientId !== user.uid) throw new Error('You can only load your own consent settings.');
  if (!caseId) return null;

  const snapshot = await getDoc(doc(getFirebaseDb(), 'caseConsentStates', caseId));
  if (!snapshot.exists()) return null;
  const state = { id: snapshot.id, ...snapshot.data() };
  if (state.patientId !== user.uid) throw new Error('This consent record belongs to another patient.');
  return state;
}

export async function getPatientConsentEvents(patientId = '') {
  const user = requirePatient();
  const ownerId = patientId || user.uid;
  if (ownerId !== user.uid) throw new Error('You can only load your own consent history.');

  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'consents'),
    where('patientId', '==', ownerId)
  ));

  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

export async function savePatientCaseConsents({ caseId, decisions }) {
  const user = requirePatient();
  if (!caseId) throw new Error('Choose a CareAtlas case before saving consent.');

  const db = getFirebaseDb();
  const caseSnapshot = await getDoc(doc(db, 'cases', caseId));
  if (!caseSnapshot.exists() || caseSnapshot.data().patientId !== user.uid) {
    throw new Error('This CareAtlas case does not belong to the signed-in patient.');
  }

  const stateRef = doc(db, 'caseConsentStates', caseId);
  const currentSnapshot = await getDoc(stateRef);
  const current = currentSnapshot.exists() ? currentSnapshot.data() : {};
  const batch = writeBatch(db);
  const nextState = {
    caseId,
    patientId: user.uid,
    version: CONSENT_VERSION,
    medicalDataProcessing: Boolean(decisions?.medicalDataProcessing),
    hospitalSharing: Boolean(decisions?.hospitalSharing),
    careCoordinationMessaging: Boolean(decisions?.careCoordinationMessaging),
    updatedAt: serverTimestamp()
  };

  if (!currentSnapshot.exists()) nextState.createdAt = serverTimestamp();
  batch.set(stateRef, nextState, { merge: true });

  CONSENT_DEFINITIONS.forEach(definition => {
    const next = Boolean(nextState[definition.key]);
    const previous = Boolean(current[definition.key]);
    if (currentSnapshot.exists() && previous === next) return;

    const eventRef = doc(collection(db, 'consents'));
    batch.set(eventRef, {
      patientId: user.uid,
      caseId,
      consentType: definition.type,
      decision: next ? 'accepted' : (currentSnapshot.exists() && previous ? 'withdrawn' : 'declined'),
      version: CONSENT_VERSION,
      consentText: definition.text,
      source: 'patient_web',
      createdAt: serverTimestamp()
    });
  });

  await batch.commit();
  return getPatientCaseConsentState(caseId);
}
