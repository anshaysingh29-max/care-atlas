'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';

export const TRAVEL_REQUEST_TYPES = Object.freeze([
  { value: 'visa_assistance', label: 'Visa assistance' },
  { value: 'flight_assistance', label: 'Flight assistance' },
  { value: 'airport_pickup', label: 'Airport pickup' },
  { value: 'local_transport', label: 'Local transport' }
]);

export const TRAVEL_REQUEST_STATUSES = Object.freeze([
  'requested',
  'in_review',
  'documents_needed',
  'arranged',
  'confirmed',
  'completed',
  'declined',
  'cancelled'
]);

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

function requireUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sign in to your CareAtlas patient account to continue.');
  return user;
}

function patientAlias(name, email) {
  const source = clean(name || email?.split('@')[0] || 'Patient', 120);
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CareAtlas patient';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

async function requireOwnedCase(caseId) {
  const user = requireUser();
  if (!caseId) throw new Error('Choose a CareAtlas treatment case first.');
  const snapshot = await getDoc(doc(getFirebaseDb(), 'cases', caseId));
  if (!snapshot.exists() || snapshot.data().patientId !== user.uid) {
    throw new Error('Choose one of your own CareAtlas treatment cases.');
  }
  return { user, caseRecord: { id: snapshot.id, ...snapshot.data() } };
}

export function travelRequestLabel(type) {
  return TRAVEL_REQUEST_TYPES.find(item => item.value === type)?.label || String(type || 'Travel request').replaceAll('_', ' ');
}

export function formatTravelDate(value, fallback = '—') {
  if (!value) return fallback;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

export function formatTravelTimestamp(value, fallback = 'Just now') {
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

export function formatTravelMoney(value, currency = 'INR') {
  const amount = asNumber(value);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${currency || 'INR'} ${amount.toLocaleString('en-IN')}`;
  }
}

export async function getPatientTravelProfile(caseId) {
  const { user } = await requireOwnedCase(caseId);
  const snapshot = await getDoc(doc(getFirebaseDb(), 'travelProfiles', caseId));
  if (!snapshot.exists()) return null;
  const profile = snapshot.data();
  if (profile.patientId !== user.uid) throw new Error('Travel profile access denied.');
  return { id: snapshot.id, ...profile };
}

export async function savePatientTravelProfile({
  caseId,
  homeCity,
  destinationCountry,
  passportReady,
  companionCount,
  mobilitySupport,
  notes
}) {
  const { user, caseRecord } = await requireOwnedCase(caseId);
  const db = getFirebaseDb();
  const ref = doc(db, 'travelProfiles', caseId);
  const current = await getDoc(ref);
  const payload = {
    caseId,
    caseNumber: caseRecord.caseNumber || '',
    patientId: user.uid,
    patientAlias: patientAlias(caseRecord.patientName || user.displayName, user.email),
    homeCity: clean(homeCity, 100),
    destinationCountry: clean(destinationCountry, 100),
    passportReady: Boolean(passportReady),
    companionCount: Math.min(10, Math.max(0, Math.round(asNumber(companionCount)))),
    mobilitySupport: Boolean(mobilitySupport),
    notes: clean(notes, 700),
    updatedAt: serverTimestamp()
  };
  if (!current.exists()) {
    payload.source = 'patient_web';
    payload.createdAt = serverTimestamp();
  }
  await setDoc(ref, payload, { merge: true });
  return caseId;
}

export async function getPatientTravelRequests(caseId = '') {
  const user = requireUser();
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'travelRequests'),
    where('patientId', '==', user.uid)
  ));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => !caseId || item.caseId === caseId)
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

export async function createPatientTravelRequest({
  caseId,
  requestType,
  destinationCountry,
  originCity,
  destinationCity,
  travelDate,
  travelTime,
  arrivalAirport,
  arrivalDate,
  arrivalTime,
  departureDate,
  airline,
  flightNumber,
  passengers,
  mobilitySupport,
  note
}) {
  const { user, caseRecord } = await requireOwnedCase(caseId);
  if (!TRAVEL_REQUEST_TYPES.some(item => item.value === requestType)) throw new Error('Choose a valid travel service.');

  const destination = clean(destinationCountry, 100);
  const origin = clean(originCity, 100);
  const destinationCityValue = clean(destinationCity, 100);
  const airport = clean(arrivalAirport, 120);
  const date = clean(travelDate, 20);
  const arrival = clean(arrivalDate, 20);

  if (requestType === 'visa_assistance' && !destination) throw new Error('Add the destination country for visa assistance.');
  if (requestType === 'flight_assistance' && (!origin || !destinationCityValue || !date)) throw new Error('Add origin, destination city and preferred travel date.');
  if (requestType === 'airport_pickup' && (!airport || !arrival)) throw new Error('Add your arrival airport and arrival date.');
  if (requestType === 'local_transport' && (!origin || !destinationCityValue || !date)) throw new Error('Add pickup location, destination and travel date.');

  const db = getFirebaseDb();
  const ref = doc(collection(db, 'travelRequests'));
  await setDoc(ref, {
    requestId: ref.id,
    caseId,
    caseNumber: caseRecord.caseNumber || '',
    patientId: user.uid,
    patientAlias: patientAlias(caseRecord.patientName || user.displayName, user.email),
    requestType,
    destinationCountry: destination,
    originCity: origin,
    destinationCity: destinationCityValue,
    travelDate: date,
    travelTime: clean(travelTime, 10),
    arrivalAirport: airport,
    arrivalDate: arrival,
    arrivalTime: clean(arrivalTime, 10),
    departureDate: clean(departureDate, 20),
    airline: clean(airline, 100),
    flightNumber: clean(flightNumber, 40),
    passengers: Math.min(12, Math.max(1, Math.round(asNumber(passengers, 1)))),
    mobilitySupport: Boolean(mobilitySupport),
    note: clean(note, 600),
    status: 'requested',
    providerName: '',
    confirmationReference: '',
    estimatedAmount: null,
    currency: 'INR',
    adminNote: '',
    source: 'patient_web',
    cancelledAt: null,
    arrangedAt: null,
    completedAt: null,
    requestedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function cancelPatientTravelRequest(requestId) {
  const user = requireUser();
  const db = getFirebaseDb();
  const ref = doc(db, 'travelRequests', requestId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists() || snapshot.data().patientId !== user.uid) throw new Error('Travel request not found.');
  if (!['requested', 'in_review', 'documents_needed'].includes(snapshot.data().status)) {
    throw new Error('Contact CareAtlas to change a travel service that is already arranged.');
  }
  await updateDoc(ref, {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

function pushIfDate(events, event) {
  if (!event.eventDate) return;
  events.push(event);
}

export async function getPatientTravelItinerary(caseId) {
  const { user } = await requireOwnedCase(caseId);
  const db = getFirebaseDb();
  const [customSnapshot, staySnapshot, consultationSnapshot, requestSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'travelItineraryEvents'), where('patientId', '==', user.uid))),
    getDocs(query(collection(db, 'hotelBookings'), where('patientId', '==', user.uid))),
    getDocs(query(collection(db, 'consultations'), where('patientId', '==', user.uid))),
    getDocs(query(collection(db, 'travelRequests'), where('patientId', '==', user.uid)))
  ]);

  const events = customSnapshot.docs
    .map(item => ({ id: item.id, ...item.data(), sourceType: 'careatlas' }))
    .filter(item => item.caseId === caseId && item.status !== 'cancelled');

  staySnapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.caseId === caseId && ['confirmed', 'checked_in', 'completed'].includes(item.status))
    .forEach(item => {
      pushIfDate(events, {
        id: `hotel-in-${item.id}`,
        caseId,
        eventType: 'hotel_checkin',
        title: `Check in · ${item.hotelName}`,
        eventDate: item.checkInDate,
        eventTime: '',
        location: item.hotelName,
        note: item.roomName || '',
        status: 'confirmed',
        sourceType: 'stay'
      });
      pushIfDate(events, {
        id: `hotel-out-${item.id}`,
        caseId,
        eventType: 'hotel_checkout',
        title: `Check out · ${item.hotelName}`,
        eventDate: item.checkOutDate,
        eventTime: '',
        location: item.hotelName,
        note: '',
        status: 'confirmed',
        sourceType: 'stay'
      });
    });

  consultationSnapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.caseId === caseId && item.status !== 'cancelled')
    .forEach(item => pushIfDate(events, {
      id: `consult-${item.id}`,
      caseId,
      eventType: 'consultation',
      title: `${item.doctorName || 'Doctor'} consultation`,
      eventDate: item.scheduledDate,
      eventTime: item.scheduledTime || '',
      location: item.mode === 'in_person' ? (item.hospitalName || 'Assigned hospital') : `${String(item.mode || 'video').replaceAll('_', ' ')} consultation`,
      note: item.doctorSpecialty || '',
      status: item.status === 'completed' ? 'completed' : 'confirmed',
      sourceType: 'consultation'
    }));

  requestSnapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.caseId === caseId && ['arranged', 'confirmed', 'completed'].includes(item.status))
    .forEach(item => {
      if (item.requestType === 'flight_assistance') {
        pushIfDate(events, {
          id: `flight-${item.id}`,
          caseId,
          eventType: 'flight',
          title: item.flightNumber ? `Flight ${item.flightNumber}` : 'Travel flight',
          eventDate: item.travelDate,
          eventTime: item.travelTime || '',
          location: [item.originCity, item.destinationCity].filter(Boolean).join(' → '),
          note: [item.airline, item.confirmationReference].filter(Boolean).join(' · '),
          status: item.status === 'completed' ? 'completed' : 'confirmed',
          sourceType: 'travel_request'
        });
      }
      if (item.requestType === 'airport_pickup') {
        pushIfDate(events, {
          id: `pickup-${item.id}`,
          caseId,
          eventType: 'airport_pickup',
          title: 'Airport pickup',
          eventDate: item.arrivalDate,
          eventTime: item.arrivalTime || '',
          location: item.arrivalAirport,
          note: [item.providerName, item.confirmationReference].filter(Boolean).join(' · '),
          status: item.status === 'completed' ? 'completed' : 'confirmed',
          sourceType: 'travel_request'
        });
      }
      if (item.requestType === 'local_transport') {
        pushIfDate(events, {
          id: `transport-${item.id}`,
          caseId,
          eventType: 'local_transport',
          title: 'Local transport',
          eventDate: item.travelDate,
          eventTime: item.travelTime || '',
          location: [item.originCity, item.destinationCity].filter(Boolean).join(' → '),
          note: [item.providerName, item.confirmationReference].filter(Boolean).join(' · '),
          status: item.status === 'completed' ? 'completed' : 'confirmed',
          sourceType: 'travel_request'
        });
      }
    });

  return events.sort((a, b) => `${a.eventDate || '9999'}${a.eventTime || ''}`.localeCompare(`${b.eventDate || '9999'}${b.eventTime || ''}`));
}
