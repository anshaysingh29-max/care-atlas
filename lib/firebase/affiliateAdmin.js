'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { isAdminRole, isCareAtlasStaffRole } from './admin';

export const REFERRAL_STATUSES = Object.freeze([
  ['case_created', 'Case created'],
  ['qualified', 'Qualified'],
  ['hospital_matched', 'Hospital matched'],
  ['hospital_selected', 'Hospital selected'],
  ['treatment_booked', 'Treatment booked'],
  ['treatment_verified', 'Treatment verified'],
  ['closed_lost', 'Closed / not converted']
]);

export const COMMISSION_STATUSES = Object.freeze([
  ['pending', 'Pending review'],
  ['approved', 'Approved'],
  ['on_hold', 'On hold'],
  ['paid', 'Paid'],
  ['rejected', 'Rejected']
]);

export function commissionTransitions(status) {
  const map = {
    pending: ['approved', 'on_hold', 'rejected'],
    on_hold: ['approved', 'rejected'],
    approved: ['on_hold'],
    paid: [],
    rejected: []
  };
  return map[status] || [];
}

function requireUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('CareAtlas operations sign-in is required.');
  return user;
}

async function requireStaffProfile(adminOnly = false) {
  const user = requireUser();
  const snapshot = await getDoc(doc(getFirebaseDb(), 'users', user.uid));
  const profile = snapshot.exists() ? snapshot.data() : null;
  const allowed = adminOnly ? isAdminRole(profile?.role) : isCareAtlasStaffRole(profile?.role);
  if (!allowed) throw new Error(adminOnly ? 'Administrator access is required.' : 'CareAtlas staff access is required.');
  return { user, profile };
}

function millis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export async function getAdminPartners() {
  await requireStaffProfile(true);
  const snapshot = await getDocs(collection(getFirebaseDb(), 'partners'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => millis(b.updatedAt || b.createdAt) - millis(a.updatedAt || a.createdAt));
}

export async function getAdminReferrals() {
  await requireStaffProfile();
  const snapshot = await getDocs(collection(getFirebaseDb(), 'referrals'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => millis(b.updatedAt || b.createdAt) - millis(a.updatedAt || a.createdAt));
}

export async function getAdminPartnerLeads() {
  await requireStaffProfile();
  const snapshot = await getDocs(collection(getFirebaseDb(), 'partnerLeads'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => millis(b.updatedAt || b.createdAt) - millis(a.updatedAt || a.createdAt));
}

export async function updatePartnerLeadStatus({ leadId, status, convertedCaseId = null }) {
  const { user, profile } = await requireStaffProfile();
  const allowed = ['new', 'contacted', 'qualified', 'converted', 'closed'];
  if (!allowed.includes(status)) throw new Error('Invalid lead status.');
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.update(doc(db, 'partnerLeads', leadId), {
    status,
    convertedCaseId: status === 'converted' ? (convertedCaseId || null) : null,
    updatedAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'partner_lead.status_updated',
    leadId,
    changes: { status, convertedCaseId: status === 'converted' ? (convertedCaseId || null) : null },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function getAdminCommissions() {
  await requireStaffProfile(true);
  const snapshot = await getDocs(collection(getFirebaseDb(), 'commissions'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => millis(b.updatedAt || b.createdAt) - millis(a.updatedAt || a.createdAt));
}

export async function reviewPartner({ partnerId, status, commissionRatePct }) {
  const { user, profile } = await requireStaffProfile(true);
  const db = getFirebaseDb();
  const partnerRef = doc(db, 'partners', partnerId);
  const partnerSnapshot = await getDoc(partnerRef);
  if (!partnerSnapshot.exists()) throw new Error('Partner not found.');
  const partner = partnerSnapshot.data();
  const normalizedStatus = ['approved', 'rejected', 'suspended', 'pending_review'].includes(status) ? status : 'pending_review';
  const rate = Math.max(0, Math.min(100, Number(commissionRatePct) || 0));

  const batch = writeBatch(db);
  batch.update(partnerRef, {
    status: normalizedStatus,
    commissionRatePct: rate,
    reviewedBy: user.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const codeRef = doc(db, 'referralCodes', partner.referralCode);
  batch.set(codeRef, {
    code: partner.referralCode,
    partnerId,
    status: normalizedStatus === 'approved' ? 'active' : 'inactive',
    attributionWindowDays: 60,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  }, { merge: true });

  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'partner.reviewed',
    partnerId,
    changes: { status: normalizedStatus, commissionRatePct: rate },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function updateReferralStatus({ referralId, status }) {
  const { user, profile } = await requireStaffProfile();
  const db = getFirebaseDb();
  const allowed = REFERRAL_STATUSES.map(([value]) => value);
  if (!allowed.includes(status)) throw new Error('Invalid referral status.');
  const batch = writeBatch(db);
  batch.update(doc(db, 'referrals', referralId), {
    referralStatus: status,
    lockedAt: status === 'qualified' ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'referral.status_updated',
    referralId,
    changes: { referralStatus: status },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function createCommission({ referral, careAtlasRevenue, ratePct, currency = 'INR', note = '' }) {
  const { user, profile } = await requireStaffProfile(true);
  if (!referral?.id || !referral?.partnerId) throw new Error('Choose a valid referral first.');
  if (referral.referralStatus !== 'treatment_verified') {
    throw new Error('Commission can only be created after the referral is marked Treatment verified.');
  }
  if (referral.selfReferral) {
    throw new Error('Self-referrals are not eligible for partner commission.');
  }
  const db = getFirebaseDb();
  const partnerSnapshot = await getDoc(doc(db, 'partners', referral.partnerId));
  const partner = partnerSnapshot.exists() ? partnerSnapshot.data() : null;
  const revenue = Math.max(0, Number(careAtlasRevenue) || 0);
  const rate = Math.max(0, Math.min(100, Number(ratePct ?? partner?.commissionRatePct) || 0));
  const amount = Math.round(revenue * (rate / 100) * 100) / 100;
  const commissionRef = doc(db, 'commissions', referral.id);
  const existingCommission = await getDoc(commissionRef);
  if (existingCommission.exists()) throw new Error('A commission ledger already exists for this referral.');
  const batch = writeBatch(db);
  batch.set(commissionRef, {
    commissionId: referral.id,
    referralId: referral.id,
    partnerId: referral.partnerId,
    referralCode: referral.referralCode,
    caseId: referral.caseId,
    caseNumber: referral.caseNumber,
    patientAlias: referral.patientAlias,
    treatmentName: referral.treatmentName,
    commissionModel: 'revenue_share',
    ratePct: rate,
    careAtlasRevenue: revenue,
    amount,
    currency,
    status: 'pending',
    note: String(note || '').slice(0, 500),
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    approvedAt: null,
    paidAt: null
  });
  batch.update(doc(db, 'referrals', referral.id), {
    commissionStatus: 'pending',
    updatedAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'commission.created',
    referralId: referral.id,
    partnerId: referral.partnerId,
    changes: { revenue, ratePct: rate, amount, currency },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function updateCommissionStatus({ commissionId, status }) {
  const { user, profile } = await requireStaffProfile(true);
  const allowed = COMMISSION_STATUSES.map(([value]) => value);
  if (!allowed.includes(status)) throw new Error('Invalid commission status.');
  const db = getFirebaseDb();
  const commissionRef = doc(db, 'commissions', commissionId);
  const snapshot = await getDoc(commissionRef);
  if (!snapshot.exists()) throw new Error('Commission not found.');
  const commission = snapshot.data();
  if (status === 'approved') {
    const kycSnapshot = await getDoc(doc(db, 'partnerKyc', commission.partnerId));
    if (!kycSnapshot.exists() || kycSnapshot.data().status !== 'verified') {
      throw new Error('Partner KYC must be verified before commission approval.');
    }
  }
  const transitions = commissionTransitions(commission.status);
  if (!transitions.includes(status)) {
    throw new Error(`Commission cannot move from ${commission.status} to ${status}.`);
  }

  const update = {
    status,
    updatedAt: serverTimestamp(),
    approvedAt: (status === 'approved' && !commission.approvedAt) || (status === 'paid' && !commission.approvedAt)
      ? serverTimestamp()
      : (commission.approvedAt || null),
    paidAt: status === 'paid' ? serverTimestamp() : (commission.paidAt || null)
  };
  const batch = writeBatch(db);
  batch.update(commissionRef, update);
  batch.update(doc(db, 'referrals', commission.referralId), {
    commissionStatus: status,
    updatedAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: `commission.${status}`,
    referralId: commission.referralId,
    partnerId: commission.partnerId,
    changes: { status },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function getAdminPartnerVerificationRows() {
  await requireStaffProfile(true);
  const db = getFirebaseDb();
  const [partnersSnapshot, kycSnapshot, payoutSnapshot] = await Promise.all([
    getDocs(collection(db, 'partners')),
    getDocs(collection(db, 'partnerKyc')),
    getDocs(collection(db, 'partnerPayoutProfiles'))
  ]);

  const kycMap = new Map(kycSnapshot.docs.map(item => [item.id, { id: item.id, ...item.data() }]));
  const payoutMap = new Map(payoutSnapshot.docs.map(item => [item.id, { id: item.id, ...item.data() }]));
  const taxCounts = new Map();
  const payoutCounts = new Map();

  for (const item of kycMap.values()) {
    const key = String(item.taxId || '').trim().toUpperCase().replace(/\s+/g, '');
    if (key) taxCounts.set(key, (taxCounts.get(key) || 0) + 1);
  }
  for (const item of payoutMap.values()) {
    const key = item.method === 'upi'
      ? `upi:${String(item.upiId || '').trim().toLowerCase()}`
      : `bank:${String(item.accountNumber || '').replace(/[\s-]+/g, '')}`;
    if (!key.endsWith(':')) payoutCounts.set(key, (payoutCounts.get(key) || 0) + 1);
  }

  return partnersSnapshot.docs.map(item => {
    const partner = { id: item.id, ...item.data() };
    const kyc = kycMap.get(item.id) || null;
    const payoutProfile = payoutMap.get(item.id) || null;
    const taxKey = String(kyc?.taxId || '').trim().toUpperCase().replace(/\s+/g, '');
    const payoutKey = payoutProfile?.method === 'upi'
      ? `upi:${String(payoutProfile?.upiId || '').trim().toLowerCase()}`
      : `bank:${String(payoutProfile?.accountNumber || '').replace(/[\s-]+/g, '')}`;
    return {
      ...partner,
      kyc,
      payoutProfile,
      duplicateTaxId: Boolean(taxKey && (taxCounts.get(taxKey) || 0) > 1),
      duplicatePayoutDestination: Boolean(payoutProfile && !payoutKey.endsWith(':') && (payoutCounts.get(payoutKey) || 0) > 1)
    };
  }).sort((a, b) => millis(b.updatedAt || b.createdAt) - millis(a.updatedAt || a.createdAt));
}

export async function reviewPartnerKyc({ partnerId, status, reviewNote = '' }) {
  const { user, profile } = await requireStaffProfile(true);
  const allowed = ['submitted', 'needs_correction', 'verified', 'rejected'];
  if (!allowed.includes(status)) throw new Error('Invalid KYC review status.');
  const db = getFirebaseDb();
  const ref = doc(db, 'partnerKyc', partnerId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Partner KYC submission not found.');
  const batch = writeBatch(db);
  batch.update(ref, {
    status,
    reviewNote: String(reviewNote || '').slice(0, 500),
    reviewedBy: user.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'partner_kyc.reviewed',
    partnerId,
    changes: { status, reviewNote: String(reviewNote || '').slice(0, 500) },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function reviewPartnerPayoutProfile({ partnerId, status, reviewNote = '' }) {
  const { user, profile } = await requireStaffProfile(true);
  const allowed = ['submitted', 'needs_correction', 'verified', 'rejected'];
  if (!allowed.includes(status)) throw new Error('Invalid payout profile review status.');
  const db = getFirebaseDb();
  const ref = doc(db, 'partnerPayoutProfiles', partnerId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Payout destination submission not found.');
  const batch = writeBatch(db);
  batch.update(ref, {
    status,
    reviewNote: String(reviewNote || '').slice(0, 500),
    reviewedBy: user.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'partner_payout_profile.reviewed',
    partnerId,
    changes: { status, reviewNote: String(reviewNote || '').slice(0, 500) },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function getAdminPayoutRequests() {
  await requireStaffProfile(true);
  const snapshot = await getDocs(collection(getFirebaseDb(), 'partnerPayoutRequests'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => millis(b.updatedAt || b.requestedAt) - millis(a.updatedAt || a.requestedAt));
}

export async function getAdminPayoutSettlements() {
  await requireStaffProfile(true);
  const snapshot = await getDocs(collection(getFirebaseDb(), 'payoutSettlements'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => millis(b.paidAt || b.createdAt) - millis(a.paidAt || a.createdAt));
}

export async function getAdminPayoutSettings() {
  await requireStaffProfile(true);
  const snapshot = await getDoc(doc(getFirebaseDb(), 'systemSettings', 'partnerPayouts'));
  if (!snapshot.exists()) return { minPayoutAmount: 1000, currency: 'INR' };
  return { minPayoutAmount: Number(snapshot.data().minPayoutAmount) || 1000, currency: snapshot.data().currency || 'INR', ...snapshot.data() };
}

export async function updateAdminPayoutSettings({ minPayoutAmount, currency = 'INR' }) {
  const { user, profile } = await requireStaffProfile(true);
  const amount = Math.max(0, Number(minPayoutAmount) || 0);
  if (amount <= 0) throw new Error('Minimum payout must be greater than zero.');
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.set(doc(db, 'systemSettings', 'partnerPayouts'), {
    minPayoutAmount: Math.round(amount * 100) / 100,
    currency: String(currency || 'INR').trim().toUpperCase().slice(0, 8),
    updatedBy: user.uid,
    updatedAt: serverTimestamp()
  }, { merge: true });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'partner_payout.settings_updated',
    changes: { minPayoutAmount: Math.round(amount * 100) / 100, currency },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function updatePayoutRequestStatus({ partnerId, status, settlementNote = '' }) {
  const { user, profile } = await requireStaffProfile(true);
  if (!['on_hold', 'rejected'].includes(status)) throw new Error('Invalid payout request status.');
  const db = getFirebaseDb();
  const ref = doc(db, 'partnerPayoutRequests', partnerId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Payout request not found.');
  const current = snapshot.data();
  if (!['requested', 'on_hold'].includes(current.status)) throw new Error('This payout request is no longer actionable.');
  const batch = writeBatch(db);
  batch.update(ref, {
    status,
    settlementNote: String(settlementNote || '').slice(0, 500),
    updatedAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: `partner_payout.${status}`,
    partnerId,
    changes: { status, settlementNote: String(settlementNote || '').slice(0, 500) },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function settlePayoutRequest({ partnerId, paymentReference, settlementNote = '', taxWithheld = 0 }) {
  const { user, profile } = await requireStaffProfile(true);
  const db = getFirebaseDb();
  const [requestSnapshot, kycSnapshot, payoutSnapshot] = await Promise.all([
    getDoc(doc(db, 'partnerPayoutRequests', partnerId)),
    getDoc(doc(db, 'partnerKyc', partnerId)),
    getDoc(doc(db, 'partnerPayoutProfiles', partnerId))
  ]);
  if (!requestSnapshot.exists()) throw new Error('Payout request not found.');
  const request = requestSnapshot.data();
  if (!['requested', 'on_hold'].includes(request.status)) throw new Error('This payout request is no longer actionable.');
  if (!kycSnapshot.exists() || kycSnapshot.data().status !== 'verified') throw new Error('Partner KYC is not verified.');
  if (!payoutSnapshot.exists() || payoutSnapshot.data().status !== 'verified') throw new Error('Partner payout destination is not verified.');
  if (!String(paymentReference || '').trim()) throw new Error('Bank / UPI payment reference is required.');

  const commissionIds = Array.isArray(request.commissionIds) ? request.commissionIds : [];
  if (!commissionIds.length) throw new Error('This request does not contain approved commissions.');
  const snapshots = await Promise.all(commissionIds.map(id => getDoc(doc(db, 'commissions', id))));
  const eligible = snapshots
    .filter(item => item.exists())
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.partnerId === partnerId && item.status === 'approved');
  if (eligible.length !== commissionIds.length) {
    throw new Error('Commission state changed after this payout was requested. Ask the partner to request payout again.');
  }

  const gross = Math.round(eligible.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) * 100) / 100;
  if (Math.abs(gross - Number(request.grossAmountSnapshot || 0)) > 0.01) {
    throw new Error('Payout amount no longer matches the approved commission ledger. Refresh the request before settlement.');
  }
  const tax = Math.round(Math.max(0, Number(taxWithheld) || 0) * 100) / 100;
  if (tax > gross) throw new Error('Tax withheld cannot exceed the gross payout.');
  const net = Math.round((gross - tax) * 100) / 100;
  const paymentRef = String(paymentReference || '').trim().slice(0, 120);
  const note = String(settlementNote || '').trim().slice(0, 500);
  const settlementRef = doc(collection(db, 'payoutSettlements'));
  const batch = writeBatch(db);

  for (const commission of eligible) {
    batch.update(doc(db, 'commissions', commission.id), {
      status: 'paid',
      payoutRequestId: partnerId,
      paymentReference: paymentRef,
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    if (commission.referralId) {
      batch.update(doc(db, 'referrals', commission.referralId), {
        commissionStatus: 'paid',
        updatedAt: serverTimestamp()
      });
    }
  }

  batch.update(doc(db, 'partnerPayoutRequests', partnerId), {
    status: 'paid',
    taxWithheldSnapshot: tax,
    netAmountSnapshot: net,
    paymentReference: paymentRef,
    settlementNote: note,
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(settlementRef, {
    settlementId: settlementRef.id,
    payoutRequestId: partnerId,
    partnerId,
    partnerName: request.partnerName || '',
    grossAmount: gross,
    taxWithheld: tax,
    netAmount: net,
    currency: request.currency || 'INR',
    commissionIds,
    commissionCount: commissionIds.length,
    payoutMethod: request.payoutMethod || payoutSnapshot.data().method,
    payoutDestinationSnapshot: request.payoutDestinationSnapshot || '',
    paymentReference: paymentRef,
    settlementNote: note,
    paidBy: user.uid,
    paidAt: serverTimestamp(),
    createdAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'partner_payout.paid',
    partnerId,
    changes: { grossAmount: gross, taxWithheld: tax, netAmount: net, paymentReference: paymentRef, settlementId: settlementRef.id },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
  return settlementRef.id;
}

