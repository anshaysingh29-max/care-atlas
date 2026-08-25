'use client';

import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';

export const PARTNER_LEAD_STATUSES = Object.freeze([
  ['new', 'New'],
  ['contacted', 'Contacted'],
  ['qualified', 'Qualified'],
  ['converted', 'Converted to case'],
  ['closed', 'Closed']
]);

function millis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

function clean(value, max = 160) {
  return String(value || '').trim().slice(0, max);
}

export async function createPartnerLead({
  firstName,
  country,
  treatmentInterest,
  contactMethod,
  contactValue,
  contactConsent,
  notes,
  campaign
}) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Partner sign-in is required.');
  if (!contactConsent) throw new Error('Confirm that this person agreed to be contacted by CareAtlas.');
  if (!clean(firstName, 80)) throw new Error('Enter the person’s first name or preferred name.');
  if (!clean(contactValue, 160)) throw new Error('Enter a contact email, phone number or messaging handle.');

  const ref = await addDoc(collection(getFirebaseDb(), 'partnerLeads'), {
    partnerId: user.uid,
    firstName: clean(firstName, 80),
    country: clean(country, 80),
    treatmentInterest: clean(treatmentInterest, 120),
    contactMethod: clean(contactMethod, 32) || 'phone',
    contactValue: clean(contactValue, 160),
    contactConsent: true,
    notes: clean(notes, 500),
    campaign: clean(campaign, 48).toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
    status: 'new',
    source: 'partner_web',
    convertedCaseId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function getPartnerLeads() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Partner sign-in is required.');
  const snapshot = await getDocs(
    query(collection(getFirebaseDb(), 'partnerLeads'), where('partnerId', '==', user.uid))
  );
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => millis(b.updatedAt || b.createdAt) - millis(a.updatedAt || a.createdAt));
}

export function partnerLeadStatusLabel(value) {
  return PARTNER_LEAD_STATUSES.find(([key]) => key === value)?.[1] || value || 'New';
}
