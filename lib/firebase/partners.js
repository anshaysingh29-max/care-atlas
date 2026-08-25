'use client';

import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { USER_ROLES } from './roles';

export const PARTNER_TYPES = Object.freeze([
  'Medical travel facilitator',
  'Travel consultant',
  'Community representative',
  'Content creator / influencer',
  'Former patient / community advocate',
  'Independent referral partner',
  'Other'
]);

export const PARTNER_TERMS_VERSION = '2026-08-25-v1';

function referralCodeForUid(uid) {
  const safe = String(uid || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase();
  return `CA${safe}`;
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export function formatPartnerMoney(value, currency = 'INR') {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-IN')}`;
  }
}

export function formatPartnerDate(value, fallback = '—') {
  const millis = timestampMillis(value);
  if (!millis) return fallback;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(millis));
}

export function isPartnerRole(role) {
  return role === USER_ROLES.PARTNER;
}

export async function registerPartner({ name, email, password, country, phone, organization, partnerType, acceptedTerms }) {
  if (!acceptedTerms) {
    const error = new Error('Accept the CareAtlas Partner terms and referral disclosure before registering.');
    error.code = 'careatlas/partner-terms-required';
    throw error;
  }

  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = credential.user;

  try {
    const displayName = name?.trim() || '';
    if (displayName) await updateProfile(user, { displayName });

    const referralCode = referralCodeForUid(user.uid);
    const base = {
      userId: user.uid,
      email: user.email || email.trim(),
      displayName,
      country: country?.trim() || '',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const partner = {
      partnerId: user.uid,
      email: user.email || email.trim(),
      displayName,
      country: country?.trim() || '',
      phone: phone?.trim() || '',
      organization: organization?.trim() || '',
      partnerType: partnerType || 'Independent referral partner',
      status: 'pending_review',
      referralCode,
      commissionModel: 'revenue_share',
      commissionRatePct: 0,
      payoutCurrency: 'INR',
      termsAccepted: true,
      termsVersion: PARTNER_TERMS_VERSION,
      disclosureAccepted: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', user.uid), { ...base, role: USER_ROLES.PARTNER });
    batch.set(doc(db, 'partners', user.uid), partner);
    await batch.commit();
    return { user, partner };
  } catch (error) {
    try { await deleteUser(user); } catch (rollbackError) { console.error('Could not roll back partner Auth user.', rollbackError); }
    throw error;
  }
}

export async function signInPartner({ email, password }) {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  const db = getFirebaseDb();
  const [userSnapshot, partnerSnapshot] = await Promise.all([
    getDoc(doc(db, 'users', credential.user.uid)),
    getDoc(doc(db, 'partners', credential.user.uid))
  ]);
  const userProfile = userSnapshot.exists() ? userSnapshot.data() : null;
  const partnerProfile = partnerSnapshot.exists() ? partnerSnapshot.data() : null;

  if (!userProfile || userProfile.role !== USER_ROLES.PARTNER || !partnerProfile || ['rejected', 'suspended'].includes(partnerProfile.status)) {
    await signOut(getFirebaseAuth());
    const error = new Error('This account does not have active CareAtlas Partner access.');
    error.code = 'careatlas/partner-access-denied';
    throw error;
  }
  return credential.user;
}

export async function getPartnerProfile(partnerId) {
  const user = getFirebaseAuth().currentUser;
  const target = partnerId || user?.uid;
  if (!user || target !== user.uid) throw new Error('Partner sign-in is required.');
  const snapshot = await getDoc(doc(getFirebaseDb(), 'partners', target));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getPartnerReferrals() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Partner sign-in is required.');
  const snapshot = await getDocs(query(collection(getFirebaseDb(), 'referrals'), where('partnerId', '==', user.uid)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

export async function getPartnerCommissions() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Partner sign-in is required.');
  const snapshot = await getDocs(query(collection(getFirebaseDb(), 'commissions'), where('partnerId', '==', user.uid)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

export async function getPartnerDashboardData() {
  const [profile, referrals, commissions] = await Promise.all([
    getPartnerProfile(),
    getPartnerReferrals(),
    getPartnerCommissions()
  ]);
  const approved = commissions.filter(item => item.status === 'approved').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const paid = commissions.filter(item => item.status === 'paid').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const pending = commissions.filter(item => ['pending', 'on_hold', 'approved'].includes(item.status)).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const qualified = referrals.filter(item => !['case_created', 'closed_lost'].includes(item.referralStatus)).length;
  return { profile, referrals, commissions, approved, paid, pending, qualified };
}

export async function updatePartnerProfile({ displayName, country, phone, organization, partnerType }) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Partner sign-in is required.');
  await updateDoc(doc(getFirebaseDb(), 'partners', user.uid), {
    displayName: displayName?.trim() || '',
    country: country?.trim() || '',
    phone: phone?.trim() || '',
    organization: organization?.trim() || '',
    partnerType: partnerType || 'Independent referral partner',
    updatedAt: serverTimestamp()
  });
  return getPartnerProfile();
}

export function buildPartnerReferralUrl(code) {
  if (typeof window === 'undefined' || !code) return '';
  const path = window.location.pathname;
  const partnerIndex = path.indexOf('/partner');
  const basePath = partnerIndex >= 0 ? path.slice(0, partnerIndex) : '';
  return `${window.location.origin}${basePath || ''}/?ref=${encodeURIComponent(code)}`;
}
