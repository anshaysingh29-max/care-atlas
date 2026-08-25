'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { buildBusinessIntelligenceWorkspace } from '@/lib/bi/revenue';

const FINANCE_STATUSES = ['forecast', 'invoiced', 'received', 'refunded', 'cancelled'];
const CURRENCIES = ['USD', 'INR', 'EUR', 'AED', 'THB', 'TRY', 'GBP'];

function clean(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function money(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(Math.max(0, parsed) * 100) / 100 : 0;
}

function normalizeCurrency(value) {
  const currency = clean(value || 'USD', 8).toUpperCase();
  return currency || 'USD';
}

async function requireAdminIdentity() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('CareAtlas admin sign-in is required.');
  const db = getFirebaseDb();
  const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
  const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;
  if (!profile || !['careatlas_admin', 'super_admin'].includes(profile.role) || profile.status === 'disabled') {
    throw new Error('CareAtlas admin access is required for financial intelligence.');
  }
  return { user, profile, db };
}

async function collectionRows(db, name) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export function businessFinanceStatuses() {
  return [...FINANCE_STATUSES];
}

export function businessFinanceCurrencies() {
  return [...CURRENCIES];
}

export async function getBusinessIntelligenceWorkspace({ currency = 'USD' } = {}) {
  const { db } = await requireAdminIdentity();
  const [
    cases,
    hospitals,
    hospitalCommercials,
    treatmentPlans,
    consultations,
    caseFinancials,
    commissions,
    referrals,
    partners,
    hotels,
    hotelBookings
  ] = await Promise.all([
    collectionRows(db, 'cases'),
    collectionRows(db, 'hospitals'),
    collectionRows(db, 'hospitalCommercials'),
    collectionRows(db, 'treatmentPlans'),
    collectionRows(db, 'consultations'),
    collectionRows(db, 'caseFinancials'),
    collectionRows(db, 'commissions'),
    collectionRows(db, 'referrals'),
    collectionRows(db, 'partners'),
    collectionRows(db, 'hotels'),
    collectionRows(db, 'hotelBookings')
  ]);

  return buildBusinessIntelligenceWorkspace({
    cases,
    hospitals,
    hospitalCommercials,
    treatmentPlans,
    consultations,
    caseFinancials,
    commissions,
    referrals,
    partners,
    hotels,
    hotelBookings,
    currency
  });
}

export async function getAdminCaseFinancial(caseId) {
  const { db } = await requireAdminIdentity();
  if (!caseId) throw new Error('Missing CareAtlas case ID.');
  const snapshot = await getDoc(doc(db, 'caseFinancials', caseId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function saveAdminCaseFinancial({
  caseId,
  status,
  hospitalId,
  currency,
  treatmentValue,
  careAtlasRevenue,
  directCost,
  eventDate,
  note
}) {
  const { user, profile, db } = await requireAdminIdentity();
  if (!caseId) throw new Error('Missing CareAtlas case ID.');
  if (!FINANCE_STATUSES.includes(status)) throw new Error('Choose a valid finance status.');

  const caseSnapshot = await getDoc(doc(db, 'cases', caseId));
  if (!caseSnapshot.exists()) throw new Error('CareAtlas case not found.');
  const careCase = { id: caseSnapshot.id, ...caseSnapshot.data() };

  const normalizedHospitalId = clean(hospitalId, 160);
  if (['invoiced', 'received'].includes(status) && !normalizedHospitalId) {
    throw new Error('Choose the hospital responsible for recognized CareAtlas revenue.');
  }

  let hospital = null;
  if (normalizedHospitalId) {
    const hospitalSnapshot = await getDoc(doc(db, 'hospitals', normalizedHospitalId));
    hospital = hospitalSnapshot.exists() ? { id: hospitalSnapshot.id, ...hospitalSnapshot.data() } : null;
    const assigned = Array.isArray(careCase.assignedHospitalIds) ? careCase.assignedHospitalIds : [];
    if (assigned.length && !assigned.includes(normalizedHospitalId)) {
      throw new Error('Finance attribution must use a hospital assigned to this case.');
    }
  }

  const normalizedCurrency = normalizeCurrency(currency);
  const value = money(treatmentValue);
  const revenue = money(careAtlasRevenue);
  const cost = money(directCost);
  if (['invoiced', 'received'].includes(status) && revenue <= 0) {
    throw new Error('Enter the actual CareAtlas revenue for an invoiced or received case.');
  }

  const ref = doc(db, 'caseFinancials', caseId);
  const existing = await getDoc(ref);
  const payload = {
    caseId,
    caseNumber: clean(careCase.caseNumber, 80),
    patientCountry: clean(careCase.patientCountry, 120),
    treatmentName: clean(careCase.treatmentName || careCase.treatmentSlug, 180),
    hospitalId: normalizedHospitalId,
    hospitalName: clean(hospital?.name || normalizedHospitalId, 180),
    destinationCountry: clean(hospital?.country, 120),
    status,
    currency: normalizedCurrency,
    treatmentValue: value,
    careAtlasRevenue: revenue,
    directCost: cost,
    eventDate: clean(eventDate, 20),
    note: clean(note, 1000),
    source: 'admin_finance',
    updatedBy: user.uid,
    updatedAt: serverTimestamp()
  };
  if (!existing.exists()) {
    payload.createdBy = user.uid;
    payload.createdAt = serverTimestamp();
  }

  const batch = writeBatch(db);
  batch.set(ref, payload, { merge: true });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: existing.exists() ? 'case_finance.updated' : 'case_finance.created',
    entityType: 'caseFinancial',
    entityId: caseId,
    caseId,
    changes: {
      status,
      hospitalId: normalizedHospitalId,
      currency: normalizedCurrency,
      treatmentValue: value,
      careAtlasRevenue: revenue,
      directCost: cost,
      eventDate: clean(eventDate, 20)
    },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();

  return { id: caseId, ...payload };
}
