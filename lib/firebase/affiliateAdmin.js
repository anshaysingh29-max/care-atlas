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
    approved: ['paid', 'on_hold'],
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
