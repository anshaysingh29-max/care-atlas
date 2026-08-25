'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import {
  getAdminCase,
  getAdminCaseConsentState,
  getAdminCaseDocuments,
  getAdminCases,
  isCareAtlasStaffRole
} from './admin';
import { analyzeCoordinatorCase, sortCopilotQueue } from '@/lib/ai/copilot';

async function requireStaffIdentity() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('CareAtlas operations sign-in is required.');
  const db = getFirebaseDb();
  const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
  const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;
  if (!profile || !isCareAtlasStaffRole(profile.role) || profile.status === 'disabled') {
    throw new Error('CareAtlas operations access is required.');
  }
  return { user, profile, db };
}

function groupByCase(rows) {
  const map = new Map();
  rows.forEach(row => {
    const key = row.caseId;
    if (!key) return;
    const current = map.get(key) || [];
    current.push(row);
    map.set(key, current);
  });
  return map;
}

async function loadCollection(name) {
  const snapshot = await getDocs(collection(getFirebaseDb(), name));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

async function loadCollectionSafe(name) {
  try {
    return await loadCollection(name);
  } catch (error) {
    console.warn(`Coordinator Copilot could not load ${name}.`, error);
    return [];
  }
}

async function loadCaseRows(name, caseId) {
  try {
    const snapshot = await getDocs(query(collection(getFirebaseDb(), name), where('caseId', '==', caseId)));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  } catch (error) {
    console.warn(`Coordinator Copilot could not load ${name} for ${caseId}.`, error);
    return [];
  }
}

export async function getCoordinatorCopilotWorkspace() {
  await requireStaffIdentity();
  const [cases, consentStates, treatmentPlans, consultations, travelRequests, hotelBookings] = await Promise.all([
    getAdminCases(),
    loadCollectionSafe('caseConsentStates'),
    loadCollectionSafe('treatmentPlans'),
    loadCollectionSafe('consultations'),
    loadCollectionSafe('travelRequests'),
    loadCollectionSafe('hotelBookings')
  ]);

  const consentByCase = new Map(consentStates.map(row => [row.caseId || row.id, row]));
  const plansByCase = groupByCase(treatmentPlans);
  const consultationsByCase = groupByCase(consultations);
  const travelByCase = groupByCase(travelRequests);
  const staysByCase = groupByCase(hotelBookings);

  const rows = cases.map(caseRecord => {
    const bundle = {
      caseRecord,
      documents: [],
      consent: consentByCase.get(caseRecord.id) || null,
      treatmentPlans: plansByCase.get(caseRecord.id) || [],
      consultations: consultationsByCase.get(caseRecord.id) || [],
      travelRequests: travelByCase.get(caseRecord.id) || [],
      hotelBookings: staysByCase.get(caseRecord.id) || [],
      messages: []
    };
    return { ...bundle, analysis: analyzeCoordinatorCase(bundle) };
  });

  return sortCopilotQueue(rows);
}

export async function getCoordinatorCopilotCase(caseId) {
  await requireStaffIdentity();
  if (!caseId) throw new Error('Missing CareAtlas case ID.');

  const [caseRecord, consent, documents, treatmentPlans, consultations, travelRequests, hotelBookings] = await Promise.all([
    getAdminCase(caseId),
    getAdminCaseConsentState(caseId),
    getAdminCaseDocuments(caseId),
    loadCaseRows('treatmentPlans', caseId),
    loadCaseRows('consultations', caseId),
    loadCaseRows('travelRequests', caseId),
    loadCaseRows('hotelBookings', caseId)
  ]);

  const messages = consent?.careCoordinationMessaging === true
    ? await loadCaseRows('caseMessages', caseId)
    : [];

  const bundle = {
    caseRecord,
    consent,
    documents,
    treatmentPlans,
    consultations,
    travelRequests,
    hotelBookings,
    messages
  };

  return { ...bundle, analysis: analyzeCoordinatorCase(bundle) };
}
