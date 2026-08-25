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
import { hospitals as hospitalCatalogue } from '@/lib/data';

function millis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

function clean(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function requireAdminUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('CareAtlas operations sign-in is required.');
  return user;
}

async function actorRole(db, uid) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data().role : '';
}

export function hotelHospitalOptions() {
  return hospitalCatalogue.map(item => ({
    id: item.slug,
    name: item.name,
    city: item.city,
    country: item.country
  }));
}

export async function getAdminHotels() {
  const snapshot = await getDocs(collection(getFirebaseDb(), 'hotels'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => millis(b.updatedAt || b.createdAt) - millis(a.updatedAt || a.createdAt));
}

export async function reviewHotelApplication({
  hotelId,
  status,
  commissionRatePct,
  nearbyHospitalIds,
  reviewNote
}) {
  const user = requireAdminUser();
  const db = getFirebaseDb();
  const role = await actorRole(db, user.uid);
  if (!['careatlas_admin', 'super_admin'].includes(role)) throw new Error('Admin access is required to review hotel partners.');
  if (!['approved', 'needs_correction', 'rejected', 'suspended'].includes(status)) throw new Error('Choose a valid review status.');

  const rate = Math.min(40, Math.max(0, Number(commissionRatePct) || 0));
  if (status === 'approved' && rate <= 0) throw new Error('Set the CareAtlas booking commission before approval.');

  const ref = doc(db, 'hotels', hotelId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Hotel application not found.');

  const batch = writeBatch(db);
  batch.update(ref, {
    status,
    commissionModel: 'booking_revenue_share',
    commissionRatePct: rate,
    nearbyHospitalIds: Array.from(new Set((nearbyHospitalIds || []).map(item => clean(item, 120)).filter(Boolean))).slice(0, 20),
    reviewNote: clean(reviewNote, 1000),
    reviewedBy: user.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorRole: role,
    action: `hotel.partner_${status}`,
    entityType: 'hotel',
    entityId: hotelId,
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function getAdminHotelBookings() {
  const snapshot = await getDocs(collection(getFirebaseDb(), 'hotelBookings'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => millis(b.updatedAt || b.createdAt) - millis(a.updatedAt || a.createdAt));
}

export async function updateAdminHotelBooking({
  bookingId,
  status,
  settlementStatus,
  settlementReference,
  operationsNote
}) {
  const user = requireAdminUser();
  const db = getFirebaseDb();
  const role = await actorRole(db, user.uid);
  if (!['careatlas_coordinator', 'careatlas_operations', 'careatlas_admin', 'super_admin'].includes(role)) {
    throw new Error('CareAtlas operations access is required.');
  }

  const ref = doc(db, 'hotelBookings', bookingId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Hotel booking not found.');

  const payload = {
    operationsNote: clean(operationsNote, 1000),
    updatedAt: serverTimestamp()
  };
  if (status) payload.status = status;
  if (settlementStatus) payload.settlementStatus = settlementStatus;
  if (settlementReference !== undefined) payload.settlementReference = clean(settlementReference, 160);
  if (settlementStatus === 'paid') payload.settledAt = serverTimestamp();

  const batch = writeBatch(db);
  batch.update(ref, payload);
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorRole: role,
    action: settlementStatus === 'paid' ? 'hotel.settlement_paid' : 'hotel.booking_operations_updated',
    entityType: 'hotelBooking',
    entityId: bookingId,
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}
