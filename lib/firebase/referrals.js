'use client';

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from './client';

export const REFERRAL_STORAGE_KEY = 'careatlas-referral-attribution';
export const REFERRAL_WINDOW_DAYS = 60;

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
}

export function getStoredReferralAttribution() {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(REFERRAL_STORAGE_KEY) || 'null');
    if (!value?.code || !value?.expiresAt) return null;
    if (Date.now() > Number(value.expiresAt)) {
      window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export async function captureReferralFromLocation() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const incomingCode = normalizeCode(params.get('ref'));
  if (!incomingCode) return getStoredReferralAttribution();

  // First *valid* browser attribution wins for the 60-day MVP window.
  const existing = getStoredReferralAttribution();
  if (existing) return existing;
  const validCode = await validateReferralCode(incomingCode);
  if (!validCode) return null;

  const now = Date.now();
  const attribution = {
    code: incomingCode,
    firstSeenAt: now,
    expiresAt: now + REFERRAL_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    landingPath: `${window.location.pathname}${window.location.search}`
  };
  window.localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(attribution));
  return attribution;
}

export async function validateReferralCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const snapshot = await getDoc(doc(getFirebaseDb(), 'referralCodes', normalized));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.status !== 'active' || !data.partnerId) return null;
  return { code: normalized, ...data };
}

export async function attachReferralToCase({ caseId, caseNumber, form, treatmentName, currentStage = 'case_submitted', caseStatus = 'submitted' }) {
  if (typeof window === 'undefined') return null;
  const attribution = getStoredReferralAttribution();
  if (!attribution?.code) return null;

  const code = await validateReferralCode(attribution.code);
  if (!code) return null;

  const referralRef = doc(getFirebaseDb(), 'referrals', caseId);
  const existing = await getDoc(referralRef);
  if (existing.exists()) return { id: existing.id, ...existing.data() };

  const aliasSuffix = String(caseNumber || caseId).slice(-4).toUpperCase();
  const payload = {
    referralId: caseId,
    partnerId: code.partnerId,
    referralCode: code.code,
    caseId,
    caseNumber,
    patientAlias: `Patient ${aliasSuffix}`,
    patientCountry: form?.country || '',
    treatmentName: treatmentName || form?.treatment || '',
    currentStage,
    caseStatus,
    referralStatus: 'case_created',
    commissionStatus: 'not_created',
    attributionModel: 'first_valid_referrer',
    attributionWindowDays: REFERRAL_WINDOW_DAYS,
    landingPath: attribution.landingPath || '',
    firstSeenAtMs: Number(attribution.firstSeenAt) || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(referralRef, payload);
  return { id: caseId, ...payload };
}
