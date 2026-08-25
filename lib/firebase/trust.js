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
  where,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { getPatientCases } from './cases';
import { getPatientHotelBookings } from './hotel';
import { hospitals } from '@/lib/data';

export const REVIEW_TARGET_TYPES = Object.freeze(['hospital', 'hotel', 'careatlas']);
export const PATIENT_OUTCOMES = Object.freeze([
  ['much_better', 'Much better'],
  ['better', 'Better'],
  ['same', 'About the same'],
  ['worse', 'Worse'],
  ['prefer_not_to_say', 'Prefer not to say']
]);
export const COMPLAINT_CATEGORIES = Object.freeze([
  'Communication',
  'Hospital experience',
  'Accommodation',
  'Travel support',
  'Billing or charges',
  'Privacy or consent',
  'Other'
]);

function clean(value, max = 600) {
  return String(value || '').trim().slice(0, max);
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

function requireUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Patient sign-in is required.');
  return user;
}

function reviewId(parts) {
  return parts.map(part => clean(part, 100).replace(/[^a-zA-Z0-9_-]/g, '-')).filter(Boolean).join('__');
}

export function formatTrustDate(value, fallback = '—') {
  const millis = timestampMillis(value);
  if (!millis) return fallback;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(millis));
}

export function outcomeLabel(value) {
  return PATIENT_OUTCOMES.find(([key]) => key === value)?.[1] || 'Not shared';
}

export async function getPatientReviewEligibility() {
  const user = requireUser();
  const [cases, bookings] = await Promise.all([
    getPatientCases(user.uid),
    getPatientHotelBookings()
  ]);

  const eligibleCases = cases.filter(item => ['treatment', 'follow_up'].includes(item.currentStage));
  const hospitalOptions = [];
  eligibleCases.forEach(careCase => {
    (careCase.assignedHospitalIds || []).forEach(hospitalId => {
      const hospital = hospitals.find(item => item.slug === hospitalId);
      hospitalOptions.push({
        key: reviewId(['review', careCase.id, 'hospital', hospitalId]),
        targetType: 'hospital',
        targetId: hospitalId,
        targetName: hospital?.name || hospitalId,
        caseId: careCase.id,
        caseNumber: careCase.caseNumber || '',
        treatmentName: careCase.treatmentName || 'Treatment journey',
        bookingId: ''
      });
    });
  });

  const hotelOptions = bookings
    .filter(item => item.status === 'completed')
    .map(item => ({
      key: reviewId(['review', item.id, 'hotel', item.hotelId]),
      targetType: 'hotel',
      targetId: item.hotelId,
      targetName: item.hotelName || 'CareAtlas Stay Partner',
      caseId: item.caseId,
      caseNumber: item.caseNumber || '',
      treatmentName: item.treatmentName || 'Medical travel stay',
      bookingId: item.id
    }));

  const careAtlasOptions = eligibleCases.map(careCase => ({
    key: reviewId(['review', careCase.id, 'careatlas']),
    targetType: 'careatlas',
    targetId: 'careatlas',
    targetName: 'CareAtlas coordination',
    caseId: careCase.id,
    caseNumber: careCase.caseNumber || '',
    treatmentName: careCase.treatmentName || 'Treatment journey',
    bookingId: ''
  }));

  return [...hospitalOptions, ...hotelOptions, ...careAtlasOptions];
}

export async function getPatientReviews() {
  const user = requireUser();
  const snapshot = await getDocs(query(collection(getFirebaseDb(), 'experienceReviews'), where('patientId', '==', user.uid)));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

export async function savePatientReview({ option, rating, title, body, outcome, wouldRecommend }) {
  const user = requireUser();
  if (!option || !REVIEW_TARGET_TYPES.includes(option.targetType)) throw new Error('Choose an eligible CareAtlas experience.');
  const numericRating = Math.round(Number(rating));
  if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) throw new Error('Choose a rating from 1 to 5.');
  if (!clean(body, 1600)) throw new Error('Add a short review before submitting.');
  if (!PATIENT_OUTCOMES.some(([key]) => key === outcome)) throw new Error('Choose a patient-reported outcome option.');

  const db = getFirebaseDb();
  const ref = doc(db, 'experienceReviews', option.key);
  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().patientId !== user.uid) throw new Error('Review access denied.');
  if (existing.exists() && existing.data().status !== 'pending_review') throw new Error('This review is already moderated and can no longer be edited.');

  const payload = {
    reviewId: option.key,
    patientId: user.uid,
    caseId: option.caseId,
    caseNumber: option.caseNumber,
    bookingId: option.bookingId || '',
    targetType: option.targetType,
    targetId: option.targetId,
    targetName: option.targetName,
    treatmentName: option.treatmentName || '',
    rating: numericRating,
    title: clean(title, 140),
    body: clean(body, 1600),
    patientReportedOutcome: outcome,
    wouldRecommend: Boolean(wouldRecommend),
    verifiedJourney: true,
    status: 'pending_review',
    publishedAt: null,
    source: 'patient_web',
    updatedAt: serverTimestamp()
  };
  if (!existing.exists()) payload.createdAt = serverTimestamp();
  await setDoc(ref, payload, { merge: true });
  return option.key;
}


export async function getPatientConcernTargets() {
  const user = requireUser();
  const [cases, bookings] = await Promise.all([getPatientCases(user.uid), getPatientHotelBookings()]);
  const targets = [];
  cases.forEach(careCase => {
    targets.push({
      key: reviewId(['concern', careCase.id, 'careatlas']),
      targetType: 'careatlas', targetId: 'careatlas', targetName: 'CareAtlas coordination',
      caseId: careCase.id, caseNumber: careCase.caseNumber || '', bookingId: ''
    });
    (careCase.assignedHospitalIds || []).forEach(hospitalId => {
      const hospital = hospitals.find(item => item.slug === hospitalId);
      targets.push({
        key: reviewId(['concern', careCase.id, 'hospital', hospitalId]),
        targetType: 'hospital', targetId: hospitalId, targetName: hospital?.name || hospitalId,
        caseId: careCase.id, caseNumber: careCase.caseNumber || '', bookingId: ''
      });
    });
  });
  bookings.forEach(item => targets.push({
    key: reviewId(['concern', item.caseId, 'hotel', item.hotelId, item.id]),
    targetType: 'hotel', targetId: item.hotelId, targetName: item.hotelName || 'CareAtlas Stay Partner',
    caseId: item.caseId, caseNumber: item.caseNumber || '', bookingId: item.id
  }));
  return targets;
}

export async function getPatientConcerns() {
  const user = requireUser();
  const snapshot = await getDocs(query(collection(getFirebaseDb(), 'patientConcerns'), where('patientId', '==', user.uid)));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

export async function createPatientConcern({ target, category, subject, description }) {
  const user = requireUser();
  if (!target || !['careatlas', 'hospital', 'hotel'].includes(target.targetType)) throw new Error('Choose what this concern is about.');
  if (!COMPLAINT_CATEGORIES.includes(category)) throw new Error('Choose a valid concern category.');
  if (!clean(subject, 160) || !clean(description, 1800)) throw new Error('Add a subject and description.');
  const db = getFirebaseDb();
  const caseSnapshot = await getDoc(doc(db, 'cases', target.caseId));
  if (!caseSnapshot.exists() || caseSnapshot.data().patientId !== user.uid) throw new Error('Choose one of your CareAtlas journeys.');
  const careCase = caseSnapshot.data();
  const ref = doc(collection(db, 'patientConcerns'));
  await setDoc(ref, {
    concernId: ref.id,
    patientId: user.uid,
    caseId: target.caseId,
    caseNumber: careCase.caseNumber || '',
    bookingId: target.bookingId || '',
    targetType: target.targetType,
    targetId: target.targetId,
    targetName: target.targetName,
    category,
    subject: clean(subject, 160),
    description: clean(description, 1800),
    status: 'open',
    assignedTo: '',
    resolutionSummary: '',
    source: 'patient_web',
    resolvedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function getPublishedProviderReviews(targetType, targetId) {
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'publishedExperienceReviews'),
    where('targetType', '==', targetType),
    where('targetId', '==', targetId),
    where('status', '==', 'published')
  ));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.publishedAt || b.createdAt) - timestampMillis(a.publishedAt || a.createdAt));
}

export async function getReviewResponses(reviewIds = []) {
  const db = getFirebaseDb();
  const rows = await Promise.all(reviewIds.map(async id => {
    const snapshot = await getDoc(doc(db, 'reviewResponses', id));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }));
  return rows.filter(Boolean);
}

export async function saveProviderReviewResponse({ reviewId, responseText, providerType, providerId, providerName }) {
  const user = requireUser();
  if (!['hospital', 'hotel'].includes(providerType)) throw new Error('Provider response type is invalid.');
  if (!clean(responseText, 1200)) throw new Error('Add a response before saving.');
  const db = getFirebaseDb();
  const [reviewSnapshot, userSnapshot] = await Promise.all([
    getDoc(doc(db, 'publishedExperienceReviews', reviewId)),
    getDoc(doc(db, 'users', user.uid))
  ]);
  if (!reviewSnapshot.exists()) throw new Error('Review not found.');
  const review = reviewSnapshot.data();
  if (review.status !== 'published' || review.targetType !== providerType || review.targetId !== providerId) {
    throw new Error('This review is not available for your response.');
  }
  const ref = doc(db, 'reviewResponses', reviewId);
  const existing = await getDoc(ref);
  const payload = {
    reviewId,
    providerType,
    providerId,
    providerName: clean(providerName, 180),
    responseText: clean(responseText, 1200),
    respondedBy: user.uid,
    source: providerType === 'hospital' ? 'hospital_web' : 'hotel_web',
    updatedAt: serverTimestamp()
  };
  if (!existing.exists()) payload.createdAt = serverTimestamp();
  const batch = writeBatch(db);
  batch.set(ref, payload, { merge: true });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: userSnapshot.exists() ? userSnapshot.data().role : (providerType === 'hotel' ? 'hotel_partner' : ''),
    action: 'trust.provider_response_saved',
    entityType: 'reviewResponse',
    entityId: reviewId,
    reviewId,
    ...(providerType === 'hospital' ? { hospitalId: providerId } : { hotelId: providerId }),
    source: providerType === 'hospital' ? 'hospital_web' : 'hotel_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}
