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
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { USER_ROLES } from './roles';

export const HOTEL_TERMS_VERSION = '2026-08-25-v1';

export const PROPERTY_TYPES = Object.freeze([
  'Hotel',
  'Serviced apartment',
  'Guest house',
  'Recovery residence',
  'Apartment hotel',
  'Other'
]);

export const HOTEL_AMENITIES = Object.freeze([
  'Wi-Fi',
  'Breakfast',
  'Restaurant',
  'Kitchen / kitchenette',
  'Laundry',
  'Room service',
  'Lift / elevator',
  'Parking',
  '24-hour front desk',
  'Airport transfer'
]);

export const MEDICAL_STAY_FEATURES = Object.freeze([
  'Wheelchair accessible',
  'Step-free access',
  'Caregiver-friendly rooms',
  'Long-stay rates',
  'Flexible meal options',
  'Early check-in support',
  'Late check-out support',
  'Accessible bathroom',
  'Hospital shuttle',
  'Pharmacy nearby'
]);

export const HOTEL_BOOKING_STATUSES = Object.freeze([
  'requested',
  'quoted',
  'confirmed',
  'checked_in',
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
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function dateNights(checkInDate, checkOutDate) {
  const start = new Date(`${checkInDate}T00:00:00`);
  const end = new Date(`${checkOutDate}T00:00:00`);
  const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Number.isFinite(nights) ? nights : 0;
}

function patientAlias(name, email) {
  const source = clean(name || email?.split('@')[0] || 'Patient', 120);
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CareAtlas patient';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function hotelBookingNumber() {
  const now = new Date();
  const y = String(now.getUTCFullYear()).slice(-2);
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `HB-${y}${m}${d}-${random}`;
}

export function isHotelPartnerRole(role) {
  return role === USER_ROLES.HOTEL_PARTNER;
}

export function formatHotelMoney(value, currency = 'INR') {
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

export function formatHotelDate(value, fallback = '—') {
  const millis = timestampMillis(value);
  if (!millis) return fallback;
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(millis));
}

export function formatStayDate(value, fallback = '—') {
  if (!value) return fallback;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

export async function registerHotelPartner({
  propertyName,
  propertyType,
  contactName,
  email,
  password,
  country,
  city,
  phone,
  acceptedTerms
}) {
  if (!acceptedTerms) throw new Error('Accept the CareAtlas Stay Partner terms before registering.');
  if (!clean(propertyName, 160)) throw new Error('Property name is required.');
  if (!clean(contactName, 120)) throw new Error('Primary contact name is required.');
  if (!clean(country, 80) || !clean(city, 80)) throw new Error('Country and city are required.');

  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const credential = await createUserWithEmailAndPassword(auth, clean(email, 180), password);
  const user = credential.user;

  try {
    const name = clean(contactName, 120);
    if (name) await updateProfile(user, { displayName: name });

    const hotelId = user.uid;
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', user.uid), {
      userId: user.uid,
      email: user.email || clean(email, 180),
      displayName: name,
      country: clean(country, 80),
      role: USER_ROLES.HOTEL_PARTNER,
      hotelId,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    batch.set(doc(db, 'hotels', hotelId), {
      hotelId,
      ownerUserId: user.uid,
      propertyName: clean(propertyName, 160),
      propertyType: PROPERTY_TYPES.includes(propertyType) ? propertyType : 'Hotel',
      country: clean(country, 80),
      city: clean(city, 80),
      addressLine1: '',
      addressLine2: '',
      postalCode: '',
      contactName: name,
      contactEmail: user.email || clean(email, 180),
      contactPhone: clean(phone, 40),
      website: '',
      description: '',
      totalRooms: 0,
      starRating: 0,
      amenities: [],
      medicalStayFeatures: [],
      mealOptions: '',
      photoUrls: [],
      nearbyHospitalIdsRequested: [],
      nearbyHospitalIds: [],
      status: 'pending_review',
      reviewNote: '',
      commissionModel: 'booking_revenue_share',
      commissionRatePct: 0,
      termsAccepted: true,
      termsVersion: HOTEL_TERMS_VERSION,
      applicationSource: 'hotel_web',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await batch.commit();
    return { user, hotelId };
  } catch (error) {
    try {
      await deleteUser(user);
    } catch (rollbackError) {
      console.error('Could not roll back hotel partner Auth user.', rollbackError);
    }
    throw error;
  }
}

export async function signInHotelPartner({ email, password }) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, clean(email, 180), password);
  const db = getFirebaseDb();
  const [userSnapshot, hotelSnapshot] = await Promise.all([
    getDoc(doc(db, 'users', credential.user.uid)),
    getDoc(doc(db, 'hotels', credential.user.uid))
  ]);

  const userProfile = userSnapshot.exists() ? userSnapshot.data() : null;
  const hotelProfile = hotelSnapshot.exists() ? hotelSnapshot.data() : null;

  if (
    !userProfile ||
    userProfile.role !== USER_ROLES.HOTEL_PARTNER ||
    !hotelProfile ||
    ['rejected', 'suspended'].includes(hotelProfile.status) ||
    userProfile.status === 'disabled'
  ) {
    await signOut(auth);
    throw new Error('This account does not have active CareAtlas Stay Partner access.');
  }

  return credential.user;
}

function requireUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sign in to continue.');
  return user;
}

export async function getHotelProfile(hotelId) {
  const user = getFirebaseAuth().currentUser;
  const target = hotelId || user?.uid;
  if (!target) return null;
  const snapshot = await getDoc(doc(getFirebaseDb(), 'hotels', target));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function updateHotelProfile({
  propertyName,
  propertyType,
  country,
  city,
  addressLine1,
  addressLine2,
  postalCode,
  contactName,
  contactPhone,
  website,
  description,
  totalRooms,
  starRating,
  amenities,
  medicalStayFeatures,
  mealOptions,
  photoUrls,
  nearbyHospitalIdsRequested
}) {
  const user = requireUser();
  const ref = doc(getFirebaseDb(), 'hotels', user.uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists() || snapshot.data().ownerUserId !== user.uid) throw new Error('Hotel profile not found.');

  await updateDoc(ref, {
    propertyName: clean(propertyName, 160),
    propertyType: PROPERTY_TYPES.includes(propertyType) ? propertyType : 'Hotel',
    country: clean(country, 80),
    city: clean(city, 80),
    addressLine1: clean(addressLine1, 180),
    addressLine2: clean(addressLine2, 180),
    postalCode: clean(postalCode, 24),
    contactName: clean(contactName, 120),
    contactPhone: clean(contactPhone, 40),
    website: clean(website, 260),
    description: clean(description, 1200),
    totalRooms: Math.max(0, Math.round(asNumber(totalRooms))),
    starRating: Math.min(5, Math.max(0, asNumber(starRating))),
    amenities: Array.from(new Set((amenities || []).filter(item => HOTEL_AMENITIES.includes(item)))).slice(0, 20),
    medicalStayFeatures: Array.from(new Set((medicalStayFeatures || []).filter(item => MEDICAL_STAY_FEATURES.includes(item)))).slice(0, 20),
    mealOptions: clean(mealOptions, 400),
    photoUrls: Array.from(new Set((photoUrls || []).map(item => clean(item, 500)).filter(Boolean))).slice(0, 8),
    nearbyHospitalIdsRequested: Array.from(new Set((nearbyHospitalIdsRequested || []).map(item => clean(item, 100)).filter(Boolean))).slice(0, 20),
    updatedAt: serverTimestamp()
  });

  return getHotelProfile(user.uid);
}

export async function getHotelRooms(hotelId, { includeInactive = true } = {}) {
  const target = hotelId || requireUser().uid;
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'hotelRooms'),
    where('hotelId', '==', target)
  ));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => includeInactive || item.active !== false)
    .sort((a, b) => clean(a.name).localeCompare(clean(b.name)));
}

export async function createHotelRoom({
  name,
  roomType,
  bedType,
  maxGuests,
  roomsAvailable,
  nightlyRate,
  currency,
  taxesIncluded,
  features
}) {
  const user = requireUser();
  const db = getFirebaseDb();
  const hotel = await getHotelProfile(user.uid);
  if (!hotel || hotel.status !== 'approved') throw new Error('CareAtlas must approve the property before rooms can be published.');
  if (!clean(name, 120)) throw new Error('Room name is required.');
  if (asNumber(nightlyRate) <= 0) throw new Error('Enter a valid nightly rate.');

  const ref = doc(collection(db, 'hotelRooms'));
  const batch = writeBatch(db);
  batch.set(ref, {
    roomId: ref.id,
    hotelId: user.uid,
    name: clean(name, 120),
    roomType: clean(roomType || 'Standard room', 100),
    bedType: clean(bedType, 100),
    maxGuests: Math.max(1, Math.round(asNumber(maxGuests, 1))),
    roomsAvailable: Math.max(0, Math.round(asNumber(roomsAvailable, 1))),
    nightlyRate: Math.round(asNumber(nightlyRate) * 100) / 100,
    currency: clean(currency || 'INR', 8).toUpperCase(),
    taxesIncluded: Boolean(taxesIncluded),
    features: Array.from(new Set((features || []).map(item => clean(item, 100)).filter(Boolean))).slice(0, 20),
    active: true,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorRole: USER_ROLES.HOTEL_PARTNER,
    hotelId: user.uid,
    action: 'hotel.room_created',
    entityType: 'hotelRoom',
    entityId: ref.id,
    source: 'hotel_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
  return ref.id;
}

export async function updateHotelRoom(roomId, updates) {
  const user = requireUser();
  const db = getFirebaseDb();
  const ref = doc(db, 'hotelRooms', roomId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists() || snapshot.data().hotelId !== user.uid) throw new Error('Room not found.');

  const payload = {
    name: clean(updates.name, 120),
    roomType: clean(updates.roomType || 'Standard room', 100),
    bedType: clean(updates.bedType, 100),
    maxGuests: Math.max(1, Math.round(asNumber(updates.maxGuests, 1))),
    roomsAvailable: Math.max(0, Math.round(asNumber(updates.roomsAvailable))),
    nightlyRate: Math.round(asNumber(updates.nightlyRate) * 100) / 100,
    currency: clean(updates.currency || 'INR', 8).toUpperCase(),
    taxesIncluded: Boolean(updates.taxesIncluded),
    features: Array.from(new Set((updates.features || []).map(item => clean(item, 100)).filter(Boolean))).slice(0, 20),
    active: updates.active !== false,
    updatedAt: serverTimestamp()
  };
  await updateDoc(ref, payload);
}

export async function getHotelAvailability(hotelId) {
  const target = hotelId || requireUser().uid;
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'hotelAvailability'),
    where('hotelId', '==', target)
  ));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => clean(a.startDate).localeCompare(clean(b.startDate)));
}

export async function saveHotelAvailability({
  availabilityId,
  roomId,
  startDate,
  endDate,
  availableRooms,
  nightlyRateOverride
}) {
  const user = requireUser();
  const db = getFirebaseDb();
  const roomSnapshot = await getDoc(doc(db, 'hotelRooms', roomId));
  if (!roomSnapshot.exists() || roomSnapshot.data().hotelId !== user.uid) throw new Error('Choose one of your published room types.');
  if (!startDate || !endDate || dateNights(startDate, endDate) < 1) throw new Error('Choose a valid availability date range.');

  const ref = availabilityId
    ? doc(db, 'hotelAvailability', availabilityId)
    : doc(collection(db, 'hotelAvailability'));

  if (availabilityId) {
    const current = await getDoc(ref);
    if (!current.exists() || current.data().hotelId !== user.uid) throw new Error('Availability window not found.');
    await updateDoc(ref, {
      roomId,
      startDate,
      endDate,
      availableRooms: Math.max(0, Math.round(asNumber(availableRooms))),
      nightlyRateOverride: asNumber(nightlyRateOverride) > 0 ? Math.round(asNumber(nightlyRateOverride) * 100) / 100 : null,
      updatedAt: serverTimestamp()
    });
    return ref.id;
  }

  await setDoc(ref, {
    availabilityId: ref.id,
    hotelId: user.uid,
    roomId,
    startDate,
    endDate,
    availableRooms: Math.max(0, Math.round(asNumber(availableRooms))),
    nightlyRateOverride: asNumber(nightlyRateOverride) > 0 ? Math.round(asNumber(nightlyRateOverride) * 100) / 100 : null,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function getHotelBookings(hotelId) {
  const target = hotelId || requireUser().uid;
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'hotelBookings'),
    where('hotelId', '==', target)
  ));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

function nextBookingStatusAllowed(current, next) {
  const allowed = {
    requested: ['quoted', 'declined'],
    quoted: ['confirmed', 'declined'],
    confirmed: ['checked_in', 'cancelled'],
    checked_in: ['completed'],
    completed: [],
    declined: [],
    cancelled: []
  };
  return (allowed[current] || []).includes(next);
}

export async function updateHotelBooking({
  bookingId,
  status,
  quotedNightlyRate,
  taxesAndFees,
  hotelNote
}) {
  const user = requireUser();
  const db = getFirebaseDb();
  const ref = doc(db, 'hotelBookings', bookingId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists() || snapshot.data().hotelId !== user.uid) throw new Error('Booking request not found.');
  const booking = snapshot.data();

  if (!nextBookingStatusAllowed(booking.status, status)) {
    throw new Error(`Cannot move this booking from ${booking.status} to ${status}.`);
  }

  const quoteRate = asNumber(quotedNightlyRate, booking.quotedNightlyRate || booking.requestedNightlyRate);
  const fees = Math.max(0, asNumber(taxesAndFees));
  const total = ['quoted', 'confirmed', 'checked_in', 'completed'].includes(status)
    ? Math.round(((quoteRate * asNumber(booking.nights)) + fees) * 100) / 100
    : booking.totalAmount || null;
  const hotel = await getHotelProfile(user.uid);
  const commissionRate = asNumber(hotel?.commissionRatePct);
  const careAtlasCommissionAmount = total === null
    ? null
    : Math.round((total * commissionRate / 100) * 100) / 100;

  const payload = {
    status,
    quotedNightlyRate: quoteRate > 0 ? Math.round(quoteRate * 100) / 100 : null,
    taxesAndFees: fees,
    totalAmount: total,
    careAtlasCommissionRatePct: commissionRate,
    careAtlasCommissionAmount,
    hotelNote: clean(hotelNote, 800),
    updatedAt: serverTimestamp()
  };
  if (status === 'quoted') payload.quotedAt = serverTimestamp();
  if (status === 'confirmed') payload.confirmedAt = serverTimestamp();
  if (status === 'checked_in') payload.checkedInAt = serverTimestamp();
  if (status === 'completed') {
    payload.completedAt = serverTimestamp();
    payload.settlementStatus = 'pending';
  }
  if (status === 'declined' || status === 'cancelled') payload.closedAt = serverTimestamp();

  const batch = writeBatch(db);
  batch.update(ref, payload);
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorRole: USER_ROLES.HOTEL_PARTNER,
    hotelId: user.uid,
    action: `hotel.booking_${status}`,
    entityType: 'hotelBooking',
    entityId: bookingId,
    source: 'hotel_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function getHotelDashboardData() {
  const user = requireUser();
  const [profile, rooms, bookings, availability] = await Promise.all([
    getHotelProfile(user.uid),
    getHotelRooms(user.uid),
    getHotelBookings(user.uid),
    getHotelAvailability(user.uid)
  ]);
  return {
    profile,
    rooms,
    bookings,
    availability,
    liveRooms: rooms.filter(item => item.active !== false).length,
    openBookings: bookings.filter(item => ['requested', 'quoted', 'confirmed', 'checked_in'].includes(item.status)).length,
    completedBookings: bookings.filter(item => item.status === 'completed').length,
    grossBookingValue: bookings.filter(item => item.status === 'completed').reduce((sum, item) => sum + asNumber(item.totalAmount), 0)
  };
}

export async function getHotelPayoutSnapshot() {
  const user = requireUser();
  const bookings = await getHotelBookings(user.uid);
  const completed = bookings.filter(item => item.status === 'completed');
  const gross = completed.reduce((sum, item) => sum + asNumber(item.totalAmount), 0);
  const fees = completed.reduce((sum, item) => sum + asNumber(item.careAtlasCommissionAmount), 0);
  const settled = completed
    .filter(item => item.settlementStatus === 'paid')
    .reduce((sum, item) => sum + Math.max(0, asNumber(item.totalAmount) - asNumber(item.careAtlasCommissionAmount)), 0);
  const pending = completed
    .filter(item => item.settlementStatus !== 'paid')
    .reduce((sum, item) => sum + Math.max(0, asNumber(item.totalAmount) - asNumber(item.careAtlasCommissionAmount)), 0);
  return { completed, gross, fees, settled, pending };
}

export async function getApprovedStayHotels() {
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'hotels'),
    where('status', '==', 'approved')
  ));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => `${a.country || ''}${a.city || ''}${a.propertyName || ''}`.localeCompare(`${b.country || ''}${b.city || ''}${b.propertyName || ''}`));
}

export async function getPatientHotelBookings() {
  const user = requireUser();
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'hotelBookings'),
    where('patientId', '==', user.uid)
  ));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

export async function createPatientHotelBooking({
  caseId,
  hotelId,
  roomId,
  checkInDate,
  checkOutDate,
  guests,
  companions,
  accessibilityNeeds
}) {
  const user = requireUser();
  const db = getFirebaseDb();
  const [caseSnapshot, hotelSnapshot, roomSnapshot] = await Promise.all([
    getDoc(doc(db, 'cases', caseId)),
    getDoc(doc(db, 'hotels', hotelId)),
    getDoc(doc(db, 'hotelRooms', roomId))
  ]);
  if (!caseSnapshot.exists() || caseSnapshot.data().patientId !== user.uid) throw new Error('Choose one of your CareAtlas treatment cases.');
  if (!hotelSnapshot.exists() || hotelSnapshot.data().status !== 'approved') throw new Error('This stay partner is not currently available.');
  if (!roomSnapshot.exists() || roomSnapshot.data().hotelId !== hotelId || roomSnapshot.data().active === false) throw new Error('This room is not currently available.');

  const nights = dateNights(checkInDate, checkOutDate);
  if (nights < 1) throw new Error('Check-out must be after check-in.');
  if (nights > 180) throw new Error('For stays longer than 180 nights, ask CareAtlas operations for a custom arrangement.');

  const careCase = caseSnapshot.data();
  const hotel = hotelSnapshot.data();
  const room = roomSnapshot.data();
  const assignedHospitalIds = careCase.assignedHospitalIds || [];
  const linkedHospitalId = (hotel.nearbyHospitalIds || []).find(id => assignedHospitalIds.includes(id)) || null;
  const bookingId = hotelBookingNumber();
  const requestedNightlyRate = asNumber(room.nightlyRate);
  const estimate = Math.round(requestedNightlyRate * nights * 100) / 100;

  await setDoc(doc(db, 'hotelBookings', bookingId), {
    bookingId,
    patientId: user.uid,
    patientAlias: patientAlias(user.displayName, user.email),
    caseId,
    caseNumber: careCase.caseNumber,
    hotelId,
    hotelName: hotel.propertyName,
    roomId,
    roomName: room.name,
    linkedHospitalId,
    checkInDate,
    checkOutDate,
    nights,
    guests: Math.max(1, Math.round(asNumber(guests, 1))),
    companions: Math.max(0, Math.round(asNumber(companions))),
    accessibilityNeeds: clean(accessibilityNeeds, 500),
    requestedNightlyRate,
    estimatedSubtotal: estimate,
    quotedNightlyRate: null,
    taxesAndFees: null,
    totalAmount: null,
    currency: room.currency || 'INR',
    hotelNote: '',
    status: 'requested',
    settlementStatus: 'not_applicable',
    settlementReference: '',
    careAtlasCommissionRatePct: asNumber(hotel.commissionRatePct),
    careAtlasCommissionAmount: null,
    source: 'patient_web',
    requestedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return bookingId;
}

export async function cancelPatientHotelBooking(bookingId) {
  const user = requireUser();
  const db = getFirebaseDb();
  const ref = doc(db, 'hotelBookings', bookingId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists() || snapshot.data().patientId !== user.uid) throw new Error('Booking request not found.');
  if (!['requested', 'quoted'].includes(snapshot.data().status)) throw new Error('Contact CareAtlas to cancel a confirmed stay.');
  await updateDoc(ref, {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
