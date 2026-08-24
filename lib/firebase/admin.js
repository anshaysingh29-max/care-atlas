'use client';

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { CAREATLAS_STAFF_ROLES } from './roles';

export const CASE_STAGES = Object.freeze([
  { value: 'case_submitted', label: 'Case submitted' },
  { value: 'records_review', label: 'Records review' },
  { value: 'hospital_matching', label: 'Hospital matching' },
  { value: 'treatment_plans', label: 'Treatment plans' },
  { value: 'consultation', label: 'Doctor consultation' },
  { value: 'hospital_selected', label: 'Hospital selected' },
  { value: 'travel_preparation', label: 'Travel preparation' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'follow_up', label: 'Follow-up' }
]);

export const CASE_STATUSES = Object.freeze([
  { value: 'submitted', label: 'Submitted' },
  { value: 'active', label: 'Active' },
  { value: 'waiting_partner', label: 'Waiting for partner' },
  { value: 'awaiting_patient', label: 'Awaiting patient' },
  { value: 'travel_confirmed', label: 'Travel confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]);

export const COORDINATORS = Object.freeze([
  { id: 'coord-sarah-chen', name: 'Sarah Chen', region: 'Europe & GCC' },
  { id: 'coord-amina-rahman', name: 'Amina Rahman', region: 'Africa' },
  { id: 'coord-daniel-thomas', name: 'Daniel Thomas', region: 'GCC & Asia' },
  { id: 'coord-priya-menon', name: 'Priya Menon', region: 'South Asia' }
]);

function requireStaff() {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    const error = new Error('CareAtlas operations sign-in is required.');
    error.code = 'careatlas/admin-auth-required';
    throw error;
  }
  return user;
}

export function isCareAtlasStaffRole(role) {
  return CAREATLAS_STAFF_ROLES.includes(role);
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export function formatAdminTimestamp(value, fallback = 'Just now') {
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

export function stageLabel(value) {
  return CASE_STAGES.find(item => item.value === value)?.label || value || 'Unknown';
}

export function statusLabel(value) {
  return CASE_STATUSES.find(item => item.value === value)?.label || value || 'Unknown';
}

export async function getAdminCases() {
  requireStaff();
  const snapshot = await getDocs(collection(getFirebaseDb(), 'cases'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

export async function getAdminCase(caseId) {
  requireStaff();
  if (!caseId) throw new Error('Missing CareAtlas case ID.');
  const snapshot = await getDoc(doc(getFirebaseDb(), 'cases', caseId));
  if (!snapshot.exists()) {
    const error = new Error('This CareAtlas case could not be found.');
    error.code = 'careatlas/case-not-found';
    throw error;
  }
  return { id: snapshot.id, ...snapshot.data() };
}

export async function getAdminCaseDocuments(caseId) {
  requireStaff();
  const snapshot = await getDocs(collection(getFirebaseDb(), 'caseDocuments'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.caseId === caseId)
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

export async function getAdminPatients() {
  requireStaff();
  const db = getFirebaseDb();
  const [patientSnapshot, cases] = await Promise.all([
    getDocs(collection(db, 'patients')),
    getAdminCases()
  ]);

  const casesByPatient = new Map();
  cases.forEach(item => {
    const rows = casesByPatient.get(item.patientId) || [];
    rows.push(item);
    casesByPatient.set(item.patientId, rows);
  });

  return patientSnapshot.docs.map(item => {
    const profile = { id: item.id, ...item.data() };
    const patientCases = casesByPatient.get(item.id) || [];
    return {
      ...profile,
      cases: patientCases,
      latestCase: patientCases[0] || null
    };
  }).sort((a, b) => timestampMillis(b.latestCase?.updatedAt || b.updatedAt) - timestampMillis(a.latestCase?.updatedAt || a.updatedAt));
}

export async function getAdminDashboardData() {
  const cases = await getAdminCases();
  const activeCases = cases.filter(item => !['completed', 'cancelled'].includes(item.status));
  const unassigned = activeCases.filter(item => !item.coordinatorId).length;
  const matching = activeCases.filter(item => item.currentStage === 'hospital_matching').length;
  const travel = activeCases.filter(item => item.currentStage === 'travel_preparation' || item.status === 'travel_confirmed').length;
  const documents = cases.reduce((sum, item) => sum + (Number(item.documentCount) || 0), 0);

  const stageCounts = CASE_STAGES.map(stage => ({
    ...stage,
    count: activeCases.filter(item => item.currentStage === stage.value).length
  }));

  return {
    cases,
    activeCases: activeCases.length,
    unassigned,
    matching,
    travel,
    documents,
    stageCounts,
    recent: cases.slice(0, 6)
  };
}

export async function updateAdminCaseOperations({
  caseId,
  currentStage,
  status,
  coordinatorId,
  coordinatorName,
  assignedHospitalIds,
  actorRole
}) {
  const user = requireStaff();
  const db = getFirebaseDb();

  const payload = {
    currentStage,
    status,
    coordinatorId: coordinatorId || null,
    coordinatorName: coordinatorName || '',
    assignedHospitalIds: Array.isArray(assignedHospitalIds) ? assignedHospitalIds : [],
    updatedAt: serverTimestamp()
  };

  await updateDoc(doc(db, 'cases', caseId), payload);

  await addDoc(collection(db, 'auditLogs'), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: actorRole || '',
    action: 'case.operations_updated',
    caseId,
    changes: {
      currentStage,
      status,
      coordinatorId: coordinatorId || null,
      coordinatorName: coordinatorName || '',
      assignedHospitalIds: Array.isArray(assignedHospitalIds) ? assignedHospitalIds : []
    },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });

  return getAdminCase(caseId);
}
