'use client';

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { HOSPITAL_ROLES, USER_ROLES } from './roles';
import { hospitals } from '../data';

export const CONSULTATION_STATUSES = Object.freeze([
  { value: 'proposed', label: 'Proposed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]);

export const CONSULTATION_MODES = Object.freeze([
  { value: 'video', label: 'Video consultation' },
  { value: 'phone', label: 'Phone consultation' },
  { value: 'in_person', label: 'In-person consultation' }
]);

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export function formatHospitalTimestamp(value, fallback = 'Just now') {
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

export function isHospitalUserRole(role) {
  return HOSPITAL_ROLES.includes(role);
}

export function canHospitalSubmitPlans(role) {
  return role === USER_ROLES.HOSPITAL_ADMIN || role === USER_ROLES.HOSPITAL_DOCTOR;
}

export function getHospitalCatalogueProfile(hospitalId) {
  return hospitals.find(item => item.slug === hospitalId) || null;
}

async function getSignedInHospitalIdentity(expectedHospitalId = '') {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    const error = new Error('Hospital partner sign-in is required.');
    error.code = 'careatlas/hospital-auth-required';
    throw error;
  }

  const snapshot = await getDoc(doc(getFirebaseDb(), 'users', user.uid));
  if (!snapshot.exists()) {
    const error = new Error('This account is not provisioned for the CareAtlas hospital portal.');
    error.code = 'careatlas/hospital-profile-missing';
    throw error;
  }

  const profile = { id: snapshot.id, ...snapshot.data() };
  if (!isHospitalUserRole(profile.role) || !profile.hospitalId || profile.status === 'disabled') {
    const error = new Error('This account does not have active hospital partner access.');
    error.code = 'careatlas/hospital-access-denied';
    throw error;
  }

  if (expectedHospitalId && profile.hospitalId !== expectedHospitalId) {
    const error = new Error('This account cannot access another hospital workspace.');
    error.code = 'careatlas/hospital-mismatch';
    throw error;
  }

  return { user, profile };
}

export async function signInHospital({ email, password }) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);

  try {
    const snapshot = await getDoc(doc(getFirebaseDb(), 'users', credential.user.uid));
    if (!snapshot.exists()) throw new Error('Hospital access has not been provisioned for this account.');

    const profile = { id: snapshot.id, ...snapshot.data() };
    if (!isHospitalUserRole(profile.role) || !profile.hospitalId || profile.status === 'disabled') {
      throw new Error('This account is not an active CareAtlas hospital partner user.');
    }

    return { user: credential.user, profile };
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

export async function getHospitalCases(hospitalId) {
  const { profile } = await getSignedInHospitalIdentity(hospitalId);
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'cases'),
    where('assignedHospitalIds', 'array-contains', profile.hospitalId)
  ));

  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

export async function getHospitalCase(caseId, hospitalId) {
  const { profile } = await getSignedInHospitalIdentity(hospitalId);
  if (!caseId) throw new Error('Missing CareAtlas case ID.');

  const snapshot = await getDoc(doc(getFirebaseDb(), 'cases', caseId));
  if (!snapshot.exists()) throw new Error('This assigned CareAtlas case could not be found.');

  const record = { id: snapshot.id, ...snapshot.data() };
  const assigned = Array.isArray(record.assignedHospitalIds) ? record.assignedHospitalIds : [];
  if (!assigned.includes(profile.hospitalId)) {
    throw new Error('This case has not been assigned to your hospital.');
  }
  return record;
}

export async function getHospitalCaseDocuments(caseId, hospitalId) {
  await getHospitalCase(caseId, hospitalId);
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'caseDocuments'),
    where('caseId', '==', caseId)
  ));

  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

export async function getHospitalTreatmentPlans(hospitalId) {
  const { profile } = await getSignedInHospitalIdentity(hospitalId);
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'treatmentPlans'),
    where('hospitalId', '==', profile.hospitalId)
  ));

  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

export async function getPatientTreatmentPlans(patientId) {
  const user = getFirebaseAuth().currentUser;
  if (!user || user.uid !== patientId) throw new Error('Patient sign-in is required.');

  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'treatmentPlans'),
    where('patientId', '==', patientId)
  ));

  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

function createPlanNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TP-${yy}${mm}${dd}-${random}`;
}

export async function createHospitalTreatmentPlan({ hospitalId, caseId, form }) {
  const { user, profile } = await getSignedInHospitalIdentity(hospitalId);
  if (!canHospitalSubmitPlans(profile.role)) {
    throw new Error('Only hospital admins and doctors can submit treatment plans.');
  }

  const caseRecord = await getHospitalCase(caseId, profile.hospitalId);
  const hospital = getHospitalCatalogueProfile(profile.hospitalId);
  const db = getFirebaseDb();
  const planRef = doc(collection(db, 'treatmentPlans'));
  const auditRef = doc(collection(db, 'auditLogs'));
  const planNumber = createPlanNumber();

  const payload = {
    planNumber,
    caseId: caseRecord.id,
    caseNumber: caseRecord.caseNumber || '',
    patientId: caseRecord.patientId,
    patientName: caseRecord.patientName || '',
    treatmentName: caseRecord.treatmentName || '',
    hospitalId: profile.hospitalId,
    hospitalName: hospital?.name || profile.hospitalName || profile.hospitalId,
    createdBy: user.uid,
    createdByName: profile.displayName || user.email || '',
    procedure: form.procedure.trim(),
    consultantName: form.consultantName.trim(),
    consultantSpecialty: form.consultantSpecialty.trim(),
    treatmentSummary: form.treatmentSummary.trim(),
    estimatedCost: Number(form.estimatedCost) || 0,
    currency: form.currency || 'USD',
    estimatedStay: form.estimatedStay.trim(),
    inclusions: form.inclusions.trim(),
    exclusions: form.exclusions.trim(),
    notes: form.notes.trim(),
    validityDays: Number(form.validityDays) || 30,
    status: 'submitted',
    source: 'hospital_web',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const batch = writeBatch(db);
  batch.set(planRef, payload);
  batch.set(auditRef, {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    hospitalId: profile.hospitalId,
    action: 'treatment_plan.submitted',
    caseId: caseRecord.id,
    entityId: planRef.id,
    source: 'hospital_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();

  return { id: planRef.id, ...payload };
}

export async function getHospitalConsultations(hospitalId) {
  const { profile } = await getSignedInHospitalIdentity(hospitalId);
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'consultations'),
    where('hospitalId', '==', profile.hospitalId)
  ));

  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => `${b.scheduledDate || ''}${b.scheduledTime || ''}`.localeCompare(`${a.scheduledDate || ''}${a.scheduledTime || ''}`));
}

export async function createHospitalConsultation({ hospitalId, caseId, form }) {
  const { user, profile } = await getSignedInHospitalIdentity(hospitalId);
  const caseRecord = await getHospitalCase(caseId, profile.hospitalId);
  const hospital = getHospitalCatalogueProfile(profile.hospitalId);
  const db = getFirebaseDb();
  const consultationRef = doc(collection(db, 'consultations'));
  const auditRef = doc(collection(db, 'auditLogs'));

  const payload = {
    caseId: caseRecord.id,
    caseNumber: caseRecord.caseNumber || '',
    patientId: caseRecord.patientId,
    patientName: caseRecord.patientName || '',
    hospitalId: profile.hospitalId,
    hospitalName: hospital?.name || profile.hospitalName || profile.hospitalId,
    createdBy: user.uid,
    createdByName: profile.displayName || user.email || '',
    doctorName: form.doctorName.trim(),
    doctorSpecialty: form.doctorSpecialty.trim(),
    scheduledDate: form.scheduledDate,
    scheduledTime: form.scheduledTime,
    timezone: form.timezone || 'UTC',
    mode: form.mode || 'video',
    meetingNote: form.meetingNote.trim(),
    status: 'proposed',
    source: 'hospital_web',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const batch = writeBatch(db);
  batch.set(consultationRef, payload);
  batch.set(auditRef, {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    hospitalId: profile.hospitalId,
    action: 'consultation.proposed',
    caseId: caseRecord.id,
    entityId: consultationRef.id,
    source: 'hospital_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();

  return { id: consultationRef.id, ...payload };
}

export async function updateHospitalConsultationStatus({ hospitalId, consultationId, status }) {
  const { user, profile } = await getSignedInHospitalIdentity(hospitalId);
  if (!CONSULTATION_STATUSES.some(item => item.value === status)) throw new Error('Invalid consultation status.');

  const db = getFirebaseDb();
  const consultationRef = doc(db, 'consultations', consultationId);
  const snapshot = await getDoc(consultationRef);
  if (!snapshot.exists()) throw new Error('Consultation not found.');
  const current = snapshot.data();
  if (current.hospitalId !== profile.hospitalId) throw new Error('This consultation belongs to another hospital.');

  await updateDoc(consultationRef, { status, updatedAt: serverTimestamp() });
  await addDoc(collection(db, 'auditLogs'), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    hospitalId: profile.hospitalId,
    action: 'consultation.status_updated',
    caseId: current.caseId || '',
    entityId: consultationId,
    changes: { status },
    source: 'hospital_web',
    createdAt: serverTimestamp()
  });
}

export async function getHospitalDashboardData(hospitalId) {
  const [cases, plans, consultations] = await Promise.all([
    getHospitalCases(hospitalId),
    getHospitalTreatmentPlans(hospitalId),
    getHospitalConsultations(hospitalId)
  ]);

  const planCaseIds = new Set(plans.map(item => item.caseId));
  const needsPlan = cases.filter(item => !planCaseIds.has(item.id) && !['completed', 'cancelled'].includes(item.status)).length;
  const activeConsultations = consultations.filter(item => !['completed', 'cancelled'].includes(item.status)).length;

  return {
    cases,
    plans,
    consultations,
    assignedCases: cases.length,
    needsPlan,
    activeConsultations,
    submittedPlans: plans.length,
    recentCases: cases.slice(0, 5)
  };
}
