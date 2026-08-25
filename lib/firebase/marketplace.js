'use client';

import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from './client';
import { CORE_SPECIALTIES } from '@/lib/specialties';
import { hospitals as demoHospitals, treatments as demoTreatments } from '@/lib/data';

function millis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export async function getMarketplaceSpecialties() {
  try {
    const snapshot = await getDocs(collection(getFirebaseDb(), 'specialties'));
    const remote = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    if (!remote.length) return CORE_SPECIALTIES;
    const byId = new Map(CORE_SPECIALTIES.map(item => [item.id, item]));
    remote.forEach(item => {
      if (item.status === 'archived') byId.delete(item.id);
      else byId.set(item.id, { ...byId.get(item.id), ...item });
    });
    return [...byId.values()].sort((a, b) => (Boolean(b.featured) - Boolean(a.featured)) || String(a.name).localeCompare(String(b.name)));
  } catch {
    return CORE_SPECIALTIES;
  }
}

export async function getPublishedHospitals() {
  try {
    const snapshot = await getDocs(collection(getFirebaseDb(), 'hospitals'));
    return snapshot.docs
      .map(item => ({ id: item.id, ...item.data(), firestoreManaged: true }))
      .filter(item => item.marketplaceStatus === 'published' && item.status !== 'suspended')
      .sort((a, b) => millis(b.publishedAt || b.updatedAt) - millis(a.publishedAt || a.updatedAt));
  } catch {
    return [];
  }
}

export async function getPublishedHospital(hospitalId) {
  if (!hospitalId) return null;
  const snapshot = await getDoc(doc(getFirebaseDb(), 'hospitals', hospitalId));
  if (!snapshot.exists()) return null;
  const data = { id: snapshot.id, ...snapshot.data(), firestoreManaged: true };
  return data.marketplaceStatus === 'published' && data.status !== 'suspended' ? data : null;
}

function normalizeCareTerm(value) {
  return String(value || '').toLowerCase()
    .replace(/orthopaedics/g, 'orthopedics')
    .replace(/fertility|ivf/g, 'fertility')
    .replace(/cancer care/g, 'oncology')
    .replace(/neurology & orthopedics/g, 'spine neurology orthopedics');
}

export function demoHospitalsForSpecialty(specialtyName) {
  const needle = normalizeCareTerm(specialtyName);
  return demoHospitals.filter(h => (h.specialties || []).some(name => { const term = normalizeCareTerm(name); return term.includes(needle) || needle.includes(term); }));
}

export function demoTreatmentsForSpecialty(specialtyName) {
  const needle = normalizeCareTerm(specialtyName);
  return demoTreatments.filter(t => { const term = normalizeCareTerm(t.category); return term.includes(needle) || needle.includes(term); });
}
