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
import { CORE_SPECIALTIES, specialtySlug } from '@/lib/specialties';

function clean(value, max = 500) { return String(value || '').trim().slice(0, max); }
function unique(values, max = 80) { return Array.from(new Set((values || []).map(item => clean(item, 120)).filter(Boolean))).slice(0, max); }
function requireUser() { const user = getFirebaseAuth().currentUser; if (!user) throw new Error('Admin sign in is required.'); return user; }
async function roleOf(uid) { const s = await getDoc(doc(getFirebaseDb(), 'users', uid)); return s.exists() ? s.data().role : ''; }
async function requireAdmin() { const user = requireUser(); const role = await roleOf(user.uid); if (!['careatlas_admin','super_admin'].includes(role)) throw new Error('CareAtlas admin access is required.'); return { user, role }; }

export async function seedCoreSpecialties() {
  const { user, role } = await requireAdmin();
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  CORE_SPECIALTIES.forEach(item => {
    batch.set(doc(db, 'specialties', item.id), {
      specialtyId: item.id,
      name: item.name,
      icon: item.icon,
      summary: item.summary,
      featured: Boolean(item.featured),
      status: 'active',
      source: 'careatlas_core',
      updatedAt: serverTimestamp()
    }, { merge: true });
  });
  batch.set(doc(collection(db, 'auditLogs')), { actorId: user.uid, actorRole: role, action: 'specialty.core_seeded', entityType: 'specialty', entityId: 'core', source: 'admin_web', createdAt: serverTimestamp() });
  await batch.commit();
}

export async function getAdminHospitalNetwork({ includeCommercials = false } = {}) {
  const db = getFirebaseDb();
  const base = [
    getDocs(collection(db, 'hospitalApplications')),
    getDocs(collection(db, 'hospitals')),
    getDocs(collection(db, 'specialties')),
    getDocs(collection(db, 'hospitalTeamInvites'))
  ];
  const [applications, hospitals, specialties, teamInvites] = await Promise.all(base);
  let commercials = [];
  if (includeCommercials) {
    const commercialSnapshot = await getDocs(collection(db, 'hospitalCommercials'));
    commercials = commercialSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return {
    applications: applications.docs.map(d => ({ id: d.id, ...d.data() })),
    hospitals: hospitals.docs.map(d => ({ id: d.id, ...d.data() })),
    specialties: specialties.docs.map(d => ({ id: d.id, ...d.data() })),
    commercials,
    teamInvites: teamInvites.docs.map(d => ({ id: d.id, ...d.data() }))
  };
}

export async function createSpecialty({ name, summary = '', featured = false }) {
  const { user, role } = await requireAdmin();
  const id = specialtySlug(name);
  if (!id) throw new Error('Enter a valid specialty name.');
  const db = getFirebaseDb();
  await setDoc(doc(db, 'specialties', id), {
    specialtyId: id,
    name: clean(name, 120),
    summary: clean(summary, 500),
    icon: '⚕️',
    featured: Boolean(featured),
    status: 'active',
    source: 'admin_approved',
    approvedBy: user.uid,
    approvedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  await setDoc(doc(collection(db, 'auditLogs')), { actorId: user.uid, actorRole: role, action: 'specialty.approved', entityType: 'specialty', entityId: id, source: 'admin_web', createdAt: serverTimestamp() });
  return id;
}

export async function updateSpecialtyStatus({ specialtyId, status, featured }) {
  const { user, role } = await requireAdmin();
  if (!['active','archived'].includes(status)) throw new Error('Invalid specialty status.');
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'specialties', specialtyId), { status, featured: Boolean(featured), updatedAt: serverTimestamp() });
  await setDoc(doc(collection(db, 'auditLogs')), { actorId: user.uid, actorRole: role, action: `specialty.${status}`, entityType: 'specialty', entityId: specialtyId, source: 'admin_web', createdAt: serverTimestamp() });
}

export async function reviewHospitalApplication({ applicationId, status, reviewNote }) {
  const { user, role } = await requireAdmin();
  if (!['needs_correction','rejected'].includes(status)) throw new Error('Use publishHospitalApplication to approve a hospital.');
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'hospitalApplications', applicationId), { status, reviewNote: clean(reviewNote, 1200), reviewedBy: user.uid, reviewedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await setDoc(doc(collection(db, 'auditLogs')), { actorId: user.uid, actorRole: role, action: `hospital.application_${status}`, entityType: 'hospitalApplication', entityId: applicationId, source: 'admin_web', createdAt: serverTimestamp() });
}

export async function publishHospitalApplication({ applicationId, reviewNote = '' }) {
  const { user, role } = await requireAdmin();
  const db = getFirebaseDb();
  const [appSnap, specialtySnap] = await Promise.all([
    getDoc(doc(db, 'hospitalApplications', applicationId)),
    getDocs(collection(db, 'specialties'))
  ]);
  if (!appSnap.exists()) throw new Error('Hospital application not found.');
  const app = appSnap.data();
  const specialtyMap = new Map(specialtySnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]).filter(([,v]) => v.status !== 'archived'));
  const requestedSlugs = (app.requestedSpecialtyNames || []).map(specialtySlug).filter(Boolean);
  const unresolved = requestedSlugs.filter(id => !specialtyMap.has(id));
  if (unresolved.length) throw new Error('Approve the hospital requested specialties first: ' + unresolved.join(', '));
  const specialtyIds = unique([...(app.specialtyIds || []), ...requestedSlugs], 80).filter(id => specialtyMap.has(id));
  if (!specialtyIds.length) throw new Error('At least one approved specialty is required.');
  const suffix = String(applicationId).slice(0,6).toLowerCase();
  const hospitalId = `${specialtySlug(app.hospitalName) || 'hospital'}-${suffix}`;
  const specialtyNames = specialtyIds.map(id => specialtyMap.get(id)?.name || id);
  const hospitalRef = doc(db, 'hospitals', hospitalId);
  const batch = writeBatch(db);
  batch.set(hospitalRef, {
    hospitalId,
    applicationId,
    ownerUserId: app.ownerUserId,
    name: app.hospitalName,
    legalName: app.legalName,
    country: app.country,
    city: app.city,
    address: app.address || '',
    website: app.website || '',
    description: app.description || '',
    internationalDeskEmail: app.internationalDeskEmail || app.contactEmail || '',
    internationalDeskPhone: app.internationalDeskPhone || app.contactPhone || '',
    languages: app.languages || [],
    services: app.services || [],
    accreditationClaims: app.accreditationClaims || [],
    specialtyIds,
    specialtyNames,
    specialties: specialtyNames,
    verified: true,
    verificationStatus: 'verified_by_careatlas_ops',
    status: 'active',
    marketplaceStatus: 'published',
    rating: null,
    reviewCount: 0,
    response: 'Contact CareAtlas',
    image: '',
    source: 'firestore_partner',
    publishedBy: user.uid,
    publishedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  batch.update(doc(db, 'hospitalApplications', applicationId), { status: 'approved', hospitalId, reviewNote: clean(reviewNote, 1200), reviewedBy: user.uid, reviewedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  batch.update(doc(db, 'users', app.ownerUserId), { role: 'hospital_admin', hospitalId, hospitalName: app.hospitalName, updatedAt: serverTimestamp() });
  batch.set(doc(db, 'hospitalCommercials', hospitalId), {
    hospitalId,
    model: 'not_configured',
    commissionRatePct: null,
    fixedFee: null,
    currency: 'USD',
    settlementTerms: '',
    contractStatus: 'draft',
    visibility: 'admin_only',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  batch.set(doc(collection(db, 'auditLogs')), { actorId: user.uid, actorRole: role, action: 'hospital.partner_published', entityType: 'hospital', entityId: hospitalId, source: 'admin_web', createdAt: serverTimestamp() });
  await batch.commit();
  return hospitalId;
}

export async function saveHospitalCommercial({ hospitalId, model, commissionRatePct, fixedFee, currency, settlementTerms, contractStatus, internalNote }) {
  const { user, role } = await requireAdmin();
  const db = getFirebaseDb();
  const validModels = ['not_configured','revenue_share','fixed_referral_fee','hybrid'];
  if (!validModels.includes(model)) throw new Error('Invalid commercial model.');
  await setDoc(doc(db, 'hospitalCommercials', hospitalId), {
    hospitalId,
    model,
    commissionRatePct: commissionRatePct === '' || commissionRatePct == null ? null : Math.max(0, Math.min(100, Number(commissionRatePct))),
    fixedFee: fixedFee === '' || fixedFee == null ? null : Math.max(0, Number(fixedFee)),
    currency: clean(currency || 'USD', 8),
    settlementTerms: clean(settlementTerms, 600),
    contractStatus: ['draft','negotiating','signed','inactive'].includes(contractStatus) ? contractStatus : 'draft',
    internalNote: clean(internalNote, 1200),
    updatedBy: user.uid,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await setDoc(doc(collection(db, 'auditLogs')), { actorId: user.uid, actorRole: role, action: 'hospital.commercials_updated', entityType: 'hospitalCommercial', entityId: hospitalId, source: 'admin_web', createdAt: serverTimestamp() });
}

export async function updateTeamInvite({ inviteId, status }) {
  const { user, role } = await requireAdmin();
  if (!['pending_admin_provisioning','provisioned','rejected'].includes(status)) throw new Error('Invalid team request status.');
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'hospitalTeamInvites', inviteId), { status, reviewedBy: user.uid, reviewedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await setDoc(doc(collection(db, 'auditLogs')), { actorId: user.uid, actorRole: role, action: `hospital.team_${status}`, entityType: 'hospitalTeamInvite', entityId: inviteId, source: 'admin_web', createdAt: serverTimestamp() });
}
