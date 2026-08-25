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

export const KYC_STATUSES = Object.freeze([
  'not_started',
  'submitted',
  'needs_correction',
  'verified',
  'rejected'
]);

export const PAYOUT_PROFILE_STATUSES = Object.freeze([
  'not_started',
  'submitted',
  'needs_correction',
  'verified',
  'rejected'
]);

export const PAYOUT_REQUEST_STATUSES = Object.freeze([
  'requested',
  'on_hold',
  'paid',
  'rejected'
]);

export const DEFAULT_MIN_PAYOUT_INR = 1000;
export const PARTNER_KYC_VERSION = '2026-08-25-v1';

function requireUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('CareAtlas Partner sign-in is required.');
  return user;
}

function millis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

function clean(value, max = 180) {
  return String(value || '').trim().slice(0, max);
}

function normalizeTaxId(value) {
  return clean(value, 64).toUpperCase().replace(/\s+/g, '');
}

function normalizeAccount(value) {
  return clean(value, 80).replace(/[\s-]+/g, '');
}

function normalizeUpi(value) {
  return clean(value, 120).toLowerCase().replace(/\s+/g, '');
}

export function maskTaxId(value) {
  const normalized = normalizeTaxId(value);
  if (!normalized) return 'Not provided';
  if (normalized.length <= 4) return normalized;
  return `${'*'.repeat(Math.max(2, normalized.length - 4))}${normalized.slice(-4)}`;
}

export function maskAccount(value) {
  const normalized = normalizeAccount(value);
  if (!normalized) return 'Not provided';
  if (normalized.length <= 4) return normalized;
  return `•••• ${normalized.slice(-4)}`;
}

export async function getPartnerKyc() {
  const user = requireUser();
  const snapshot = await getDoc(doc(getFirebaseDb(), 'partnerKyc', user.uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function submitPartnerKyc({
  entityType,
  legalName,
  country,
  taxIdType,
  taxId,
  addressLine1,
  addressLine2,
  city,
  region,
  postalCode
}) {
  const user = requireUser();
  const db = getFirebaseDb();
  const ref = doc(db, 'partnerKyc', user.uid);
  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().status === 'verified') {
    throw new Error('Your identity verification is already locked as verified. Contact CareAtlas support if details changed.');
  }

  const normalizedTaxId = normalizeTaxId(taxId);
  if (!['individual', 'business'].includes(entityType)) throw new Error('Choose Individual or Business / Agency.');
  if (!clean(legalName, 160)) throw new Error('Legal name is required.');
  if (!clean(country, 80)) throw new Error('Country is required.');
  if (!clean(taxIdType, 40)) throw new Error('Tax ID type is required.');
  if (normalizedTaxId.length < 4) throw new Error('Enter a valid tax identifier for manual review.');
  if (!clean(addressLine1, 180) || !clean(city, 80)) throw new Error('Address and city are required.');

  const payload = {
    partnerId: user.uid,
    entityType,
    legalName: clean(legalName, 160),
    country: clean(country, 80),
    taxIdType: clean(taxIdType, 40),
    taxId: normalizedTaxId,
    taxIdMasked: maskTaxId(normalizedTaxId),
    addressLine1: clean(addressLine1, 180),
    addressLine2: clean(addressLine2, 180),
    city: clean(city, 80),
    region: clean(region, 80),
    postalCode: clean(postalCode, 24),
    status: 'submitted',
    kycVersion: PARTNER_KYC_VERSION,
    reviewNote: '',
    reviewedBy: null,
    reviewedAt: null,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (!existing.exists()) payload.createdAt = serverTimestamp();
  await setDoc(ref, payload, { merge: existing.exists() });
  return getPartnerKyc();
}

export async function getPartnerPayoutProfile() {
  const user = requireUser();
  const snapshot = await getDoc(doc(getFirebaseDb(), 'partnerPayoutProfiles', user.uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function submitPartnerPayoutProfile({
  method,
  payoutCurrency,
  payoutCountry,
  accountHolder,
  bankName,
  accountNumber,
  routingCode,
  swiftCode,
  upiId
}) {
  const user = requireUser();
  const db = getFirebaseDb();
  const ref = doc(db, 'partnerPayoutProfiles', user.uid);
  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().status === 'verified') {
    throw new Error('Your payout destination is verified and locked. Contact CareAtlas support to change it.');
  }
  if (!['bank', 'upi'].includes(method)) throw new Error('Choose bank transfer or UPI.');
  if (!clean(accountHolder, 160)) throw new Error('Account holder name is required.');

  const normalizedAccount = normalizeAccount(accountNumber);
  const normalizedUpi = normalizeUpi(upiId);
  if (method === 'bank' && (!normalizedAccount || !clean(bankName, 120) || !clean(routingCode, 80))) {
    throw new Error('Bank name, account number and IFSC / routing code are required.');
  }
  if (method === 'upi' && !normalizedUpi.includes('@')) throw new Error('Enter a valid UPI ID.');

  const payload = {
    partnerId: user.uid,
    method,
    payoutCurrency: clean(payoutCurrency || 'INR', 8).toUpperCase(),
    payoutCountry: clean(payoutCountry || 'India', 80),
    accountHolder: clean(accountHolder, 160),
    bankName: method === 'bank' ? clean(bankName, 120) : '',
    accountNumber: method === 'bank' ? normalizedAccount : '',
    accountNumberMasked: method === 'bank' ? maskAccount(normalizedAccount) : '',
    routingCode: method === 'bank' ? clean(routingCode, 80).toUpperCase() : '',
    swiftCode: method === 'bank' ? clean(swiftCode, 40).toUpperCase() : '',
    upiId: method === 'upi' ? normalizedUpi : '',
    status: 'submitted',
    reviewNote: '',
    reviewedBy: null,
    reviewedAt: null,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if (!existing.exists()) payload.createdAt = serverTimestamp();
  await setDoc(ref, payload, { merge: existing.exists() });
  return getPartnerPayoutProfile();
}

export async function getPartnerPayoutSettings() {
  const snapshot = await getDoc(doc(getFirebaseDb(), 'systemSettings', 'partnerPayouts'));
  if (!snapshot.exists()) return { minPayoutAmount: DEFAULT_MIN_PAYOUT_INR, currency: 'INR' };
  return {
    minPayoutAmount: Number(snapshot.data().minPayoutAmount) || DEFAULT_MIN_PAYOUT_INR,
    currency: snapshot.data().currency || 'INR',
    ...snapshot.data()
  };
}

export async function getPartnerPayoutRequest() {
  const user = requireUser();
  const snapshot = await getDoc(doc(getFirebaseDb(), 'partnerPayoutRequests', user.uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getPartnerPayoutSettlements() {
  const user = requireUser();
  const snapshot = await getDocs(query(collection(getFirebaseDb(), 'payoutSettlements'), where('partnerId', '==', user.uid)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => millis(b.paidAt || b.createdAt) - millis(a.paidAt || a.createdAt));
}

export async function getPartnerPayoutSnapshot() {
  const user = requireUser();
  const db = getFirebaseDb();
  const [kycSnapshot, profileSnapshot, requestSnapshot, settingsSnapshot, commissionsSnapshot, settlementsSnapshot] = await Promise.all([
    getDoc(doc(db, 'partnerKyc', user.uid)),
    getDoc(doc(db, 'partnerPayoutProfiles', user.uid)),
    getDoc(doc(db, 'partnerPayoutRequests', user.uid)),
    getDoc(doc(db, 'systemSettings', 'partnerPayouts')),
    getDocs(query(collection(db, 'commissions'), where('partnerId', '==', user.uid))),
    getDocs(query(collection(db, 'payoutSettlements'), where('partnerId', '==', user.uid)))
  ]);

  const commissions = commissionsSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  const settlements = settlementsSnapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => millis(b.paidAt || b.createdAt) - millis(a.paidAt || a.createdAt));
  const pending = commissions.filter(item => ['pending', 'on_hold'].includes(item.status)).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const available = commissions.filter(item => item.status === 'approved').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const paid = commissions.filter(item => item.status === 'paid').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return {
    kyc: kycSnapshot.exists() ? { id: kycSnapshot.id, ...kycSnapshot.data() } : null,
    payoutProfile: profileSnapshot.exists() ? { id: profileSnapshot.id, ...profileSnapshot.data() } : null,
    payoutRequest: requestSnapshot.exists() ? { id: requestSnapshot.id, ...requestSnapshot.data() } : null,
    settings: settingsSnapshot.exists() ? {
      minPayoutAmount: Number(settingsSnapshot.data().minPayoutAmount) || DEFAULT_MIN_PAYOUT_INR,
      currency: settingsSnapshot.data().currency || 'INR',
      ...settingsSnapshot.data()
    } : { minPayoutAmount: DEFAULT_MIN_PAYOUT_INR, currency: 'INR' },
    commissions,
    settlements,
    pending,
    available,
    paid
  };
}

export async function requestPartnerPayout() {
  const user = requireUser();
  const db = getFirebaseDb();
  const [partnerSnapshot, kycSnapshot, payoutSnapshot, settingsSnapshot, activeRequestSnapshot, commissionsSnapshot] = await Promise.all([
    getDoc(doc(db, 'partners', user.uid)),
    getDoc(doc(db, 'partnerKyc', user.uid)),
    getDoc(doc(db, 'partnerPayoutProfiles', user.uid)),
    getDoc(doc(db, 'systemSettings', 'partnerPayouts')),
    getDoc(doc(db, 'partnerPayoutRequests', user.uid)),
    getDocs(query(collection(db, 'commissions'), where('partnerId', '==', user.uid)))
  ]);

  const partner = partnerSnapshot.exists() ? partnerSnapshot.data() : null;
  if (!partner || partner.status !== 'approved') throw new Error('Partner approval is required before requesting payout.');
  const kyc = kycSnapshot.exists() ? kycSnapshot.data() : null;
  if (kyc?.status !== 'verified') throw new Error('Complete and verify Partner KYC before requesting payout.');
  const payoutProfile = payoutSnapshot.exists() ? payoutSnapshot.data() : null;
  if (payoutProfile?.status !== 'verified') throw new Error('Your payout destination must be verified first.');

  const currentRequest = activeRequestSnapshot.exists() ? activeRequestSnapshot.data() : null;
  if (currentRequest && ['requested', 'on_hold'].includes(currentRequest.status)) {
    throw new Error('You already have a payout request being processed.');
  }

  const approved = commissionsSnapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.status === 'approved');
  const gross = approved.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const settings = settingsSnapshot.exists() ? settingsSnapshot.data() : null;
  const minPayoutAmount = Number(settings?.minPayoutAmount) || DEFAULT_MIN_PAYOUT_INR;
  if (!approved.length || gross < minPayoutAmount) {
    throw new Error(`At least INR ${minPayoutAmount.toLocaleString('en-IN')} in approved earnings is required.`);
  }

  const requestRef = doc(db, 'partnerPayoutRequests', user.uid);
  const payload = {
    requestId: user.uid,
    partnerId: user.uid,
    partnerName: partner.displayName || user.displayName || user.email || '',
    grossAmountSnapshot: Math.round(gross * 100) / 100,
    taxWithheldSnapshot: 0,
    netAmountSnapshot: Math.round(gross * 100) / 100,
    currency: payoutProfile.payoutCurrency || partner.payoutCurrency || 'INR',
    commissionIds: approved.map(item => item.id),
    commissionCount: approved.length,
    payoutMethod: payoutProfile.method,
    payoutDestinationSnapshot: payoutProfile.method === 'upi'
      ? payoutProfile.upiId
      : `${payoutProfile.bankName || 'Bank'} · ${payoutProfile.accountNumberMasked || maskAccount(payoutProfile.accountNumber)}`,
    status: 'requested',
    paymentReference: '',
    settlementNote: '',
    requestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    paidAt: null
  };

  if (!activeRequestSnapshot.exists()) payload.createdAt = serverTimestamp();
  await setDoc(requestRef, payload, { merge: activeRequestSnapshot.exists() });
  return getPartnerPayoutRequest();
}

export async function resubmitPartnerPayoutRequest() {
  return requestPartnerPayout();
}
