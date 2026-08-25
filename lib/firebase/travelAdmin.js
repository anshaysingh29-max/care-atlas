'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { getAdminCases, isCareAtlasStaffRole } from './admin';
import { TRAVEL_REQUEST_STATUSES, travelRequestLabel } from './travel';

export const ITINERARY_EVENT_TYPES = Object.freeze([
  'flight',
  'airport_pickup',
  'hotel_checkin',
  'hotel_checkout',
  'hospital_visit',
  'consultation',
  'treatment',
  'local_transport',
  'custom'
]);

export const ITINERARY_EVENT_STATUSES = Object.freeze(['planned', 'confirmed', 'completed', 'cancelled']);

function clean(value, max = 240) {
  return String(value || '').trim().slice(0, max);
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

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

export async function getAdminTravelRequests() {
  await requireStaffIdentity();
  const snapshot = await getDocs(collection(getFirebaseDb(), 'travelRequests'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

export async function getAdminTravelProfiles() {
  await requireStaffIdentity();
  const snapshot = await getDocs(collection(getFirebaseDb(), 'travelProfiles'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function getAdminItineraryEvents() {
  await requireStaffIdentity();
  const snapshot = await getDocs(collection(getFirebaseDb(), 'travelItineraryEvents'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => `${a.eventDate || '9999'}${a.eventTime || ''}`.localeCompare(`${b.eventDate || '9999'}${b.eventTime || ''}`));
}

export async function getAdminTravelDashboard() {
  const [requests, profiles, events, cases] = await Promise.all([
    getAdminTravelRequests(),
    getAdminTravelProfiles(),
    getAdminItineraryEvents(),
    getAdminCases()
  ]);
  const openRequests = requests.filter(item => !['completed', 'declined', 'cancelled'].includes(item.status));
  return {
    requests,
    profiles,
    events,
    cases,
    openRequests: openRequests.length,
    visaRequests: openRequests.filter(item => item.requestType === 'visa_assistance').length,
    transportRequests: openRequests.filter(item => ['airport_pickup', 'local_transport'].includes(item.requestType)).length,
    flightRequests: openRequests.filter(item => item.requestType === 'flight_assistance').length
  };
}

export async function updateAdminTravelRequest({
  requestId,
  status,
  providerName,
  confirmationReference,
  estimatedAmount,
  currency,
  adminNote,
  destinationCountry,
  originCity,
  destinationCity,
  travelDate,
  travelTime,
  arrivalAirport,
  arrivalDate,
  arrivalTime,
  airline,
  flightNumber
}) {
  const { user, profile, db } = await requireStaffIdentity();
  if (!TRAVEL_REQUEST_STATUSES.includes(status)) throw new Error('Choose a valid travel request status.');
  const requestRef = doc(db, 'travelRequests', requestId);
  const snapshot = await getDoc(requestRef);
  if (!snapshot.exists()) throw new Error('Travel request not found.');
  const current = snapshot.data();

  const payload = {
    status,
    providerName: clean(providerName, 140),
    confirmationReference: clean(confirmationReference, 120),
    estimatedAmount: estimatedAmount === '' || estimatedAmount === null || estimatedAmount === undefined
      ? null
      : Math.max(0, Math.round(asNumber(estimatedAmount) * 100) / 100),
    currency: clean(currency, 8).toUpperCase() || 'INR',
    adminNote: clean(adminNote, 800),
    destinationCountry: clean(destinationCountry ?? current.destinationCountry, 100),
    originCity: clean(originCity ?? current.originCity, 100),
    destinationCity: clean(destinationCity ?? current.destinationCity, 100),
    travelDate: clean(travelDate ?? current.travelDate, 20),
    travelTime: clean(travelTime ?? current.travelTime, 10),
    arrivalAirport: clean(arrivalAirport ?? current.arrivalAirport, 120),
    arrivalDate: clean(arrivalDate ?? current.arrivalDate, 20),
    arrivalTime: clean(arrivalTime ?? current.arrivalTime, 10),
    airline: clean(airline ?? current.airline, 100),
    flightNumber: clean(flightNumber ?? current.flightNumber, 40),
    updatedAt: serverTimestamp()
  };
  if (status === 'arranged' || status === 'confirmed') payload.arrangedAt = serverTimestamp();
  if (status === 'completed') payload.completedAt = serverTimestamp();

  const batch = writeBatch(db);
  batch.update(requestRef, payload);
  batch.set(doc(collection(db, 'notifications')), {
    recipientId: current.patientId,
    patientId: current.patientId,
    caseId: current.caseId,
    type: 'travel_update',
    title: `${travelRequestLabel(current.requestType)} updated`,
    body: `Your request is now ${status.replaceAll('_', ' ')}${payload.adminNote ? ` · ${payload.adminNote.slice(0, 120)}` : ''}.`,
    createdBy: user.uid,
    createdByRole: profile.role,
    source: 'admin_web',
    readAt: null,
    createdAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'travel.request_updated',
    caseId: current.caseId,
    entityType: 'travelRequest',
    entityId: requestId,
    changes: { status, providerName: payload.providerName, confirmationReference: payload.confirmationReference },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function createAdminItineraryEvent({
  caseId,
  eventType,
  title,
  eventDate,
  eventTime,
  location,
  note,
  status
}) {
  const { user, profile, db } = await requireStaffIdentity();
  if (!ITINERARY_EVENT_TYPES.includes(eventType)) throw new Error('Choose a valid itinerary event type.');
  if (!ITINERARY_EVENT_STATUSES.includes(status)) throw new Error('Choose a valid itinerary status.');
  if (!clean(title, 160)) throw new Error('Itinerary title is required.');
  if (!eventDate) throw new Error('Itinerary date is required.');

  const caseSnapshot = await getDoc(doc(db, 'cases', caseId));
  if (!caseSnapshot.exists()) throw new Error('CareAtlas case not found.');
  const careCase = caseSnapshot.data();
  const ref = doc(collection(db, 'travelItineraryEvents'));
  const payload = {
    eventId: ref.id,
    caseId,
    caseNumber: careCase.caseNumber || '',
    patientId: careCase.patientId,
    eventType,
    title: clean(title, 160),
    eventDate: clean(eventDate, 20),
    eventTime: clean(eventTime, 10),
    location: clean(location, 220),
    note: clean(note, 800),
    status,
    createdBy: user.uid,
    createdByRole: profile.role,
    source: 'admin_web',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const batch = writeBatch(db);
  batch.set(ref, payload);
  batch.set(doc(collection(db, 'notifications')), {
    recipientId: careCase.patientId,
    patientId: careCase.patientId,
    caseId,
    type: 'itinerary_update',
    title: 'Travel itinerary updated',
    body: `${payload.title} · ${payload.eventDate}${payload.eventTime ? ` at ${payload.eventTime}` : ''}`,
    createdBy: user.uid,
    createdByRole: profile.role,
    source: 'admin_web',
    readAt: null,
    createdAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'travel.itinerary_event_created',
    caseId,
    entityType: 'travelItineraryEvent',
    entityId: ref.id,
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
  return ref.id;
}

export async function updateAdminItineraryEvent({
  eventId,
  eventType,
  title,
  eventDate,
  eventTime,
  location,
  note,
  status
}) {
  const { user, profile, db } = await requireStaffIdentity();
  if (!ITINERARY_EVENT_TYPES.includes(eventType)) throw new Error('Choose a valid itinerary event type.');
  if (!ITINERARY_EVENT_STATUSES.includes(status)) throw new Error('Choose a valid itinerary status.');
  const ref = doc(db, 'travelItineraryEvents', eventId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Itinerary event not found.');
  const current = snapshot.data();
  const payload = {
    eventType,
    title: clean(title, 160),
    eventDate: clean(eventDate, 20),
    eventTime: clean(eventTime, 10),
    location: clean(location, 220),
    note: clean(note, 800),
    status,
    updatedAt: serverTimestamp()
  };
  const batch = writeBatch(db);
  batch.update(ref, payload);
  batch.set(doc(collection(db, 'notifications')), {
    recipientId: current.patientId,
    patientId: current.patientId,
    caseId: current.caseId,
    type: 'itinerary_update',
    title: 'Travel itinerary updated',
    body: `${payload.title} · ${payload.eventDate}${payload.eventTime ? ` at ${payload.eventTime}` : ''}`,
    createdBy: user.uid,
    createdByRole: profile.role,
    source: 'admin_web',
    readAt: null,
    createdAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'travel.itinerary_event_updated',
    caseId: current.caseId,
    entityType: 'travelItineraryEvent',
    entityId: eventId,
    changes: { status, eventDate: payload.eventDate, eventTime: payload.eventTime },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}
