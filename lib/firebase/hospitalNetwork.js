'use client';

import {
  collection,
  deleteDoc,
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
import { CORE_SPECIALTIES, specialtySlug } from '@/lib/specialties';

export const HOSPITAL_APPLICATION_TERMS_VERSION = '2026-08-25-v1';
export const HOSPITAL_APPLICANT_ROLE = 'hospital_applicant';

function clean(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function unique(values, max = 80) {
  return Array.from(new Set((values || []).map(item => clean(item, 120)).filter(Boolean))).slice(0, max);
}

export async function getOnboardingSpecialties() {
  try {
    const snapshot = await getDocs(collection(getFirebaseDb(), 'specialties'));
    const remote = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    if (!remote.length) return CORE_SPECIALTIES;
    const map = new Map(CORE_SPECIALTIES.map(item => [item.id, item]));
    remote.forEach(item => {
      if (item.status === 'archived') map.delete(item.id);
      else map.set(item.id, { ...map.get(item.id), ...item });
    });
    return [...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  } catch {
    return CORE_SPECIALTIES;
  }
}

export async function registerHospitalApplicant({
  hospitalName,
  legalName,
  contactName,
  email,
  password,
  country,
  city,
  phone,
  website,
  specialtyIds,
  requestedSpecialties,
  acceptedTerms
}) {
  if (!acceptedTerms) throw new Error('Accept the CareAtlas hospital onboarding terms before continuing.');
  if (!clean(hospitalName, 160) || !clean(legalName, 180)) throw new Error('Hospital and legal names are required.');
  if (!clean(contactName, 120)) throw new Error('Primary contact is required.');
  if (!clean(country, 80) || !clean(city, 80)) throw new Error('Country and city are required.');
  if (!(specialtyIds || []).length && !(requestedSpecialties || []).length) throw new Error('Select or request at least one specialty.');

  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const credential = await createUserWithEmailAndPassword(auth, clean(email, 180), password);
  const user = credential.user;
  const applicationId = user.uid;

  try {
    await updateProfile(user, { displayName: clean(contactName, 120) });
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', user.uid), {
      userId: user.uid,
      email: user.email || clean(email, 180),
      displayName: clean(contactName, 120),
      country: clean(country, 80),
      role: HOSPITAL_APPLICANT_ROLE,
      hospitalApplicationId: applicationId,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    batch.set(doc(db, 'hospitalApplications', applicationId), {
      applicationId,
      ownerUserId: user.uid,
      hospitalName: clean(hospitalName, 160),
      legalName: clean(legalName, 180),
      country: clean(country, 80),
      city: clean(city, 80),
      address: '',
      contactName: clean(contactName, 120),
      contactEmail: user.email || clean(email, 180),
      contactPhone: clean(phone, 50),
      website: clean(website, 240),
      description: '',
      internationalDeskEmail: '',
      internationalDeskPhone: '',
      languages: [],
      services: [],
      accreditationClaims: [],
      specialtyIds: unique(specialtyIds, 50),
      requestedSpecialtyNames: unique(requestedSpecialties, 20),
      status: 'pending_review',
      reviewNote: '',
      termsAccepted: true,
      termsVersion: HOSPITAL_APPLICATION_TERMS_VERSION,
      applicationSource: 'hospital_web',
      submittedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await batch.commit();
    return { user, applicationId };
  } catch (error) {
    try { await deleteUser(user); } catch (rollbackError) { console.error('Hospital applicant rollback failed', rollbackError); }
    throw error;
  }
}

export async function signInHospitalNetwork({ email, password }) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, clean(email, 180), password);
  const snapshot = await getDoc(doc(getFirebaseDb(), 'users', credential.user.uid));
  const profile = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  const allowed = profile && [
    HOSPITAL_APPLICANT_ROLE,
    'hospital_admin',
    'hospital_doctor',
    'hospital_coordinator'
  ].includes(profile.role) && profile.status !== 'disabled';
  if (!allowed) {
    await signOut(auth);
    throw new Error('This account does not have CareAtlas hospital network access.');
  }
  return { user: credential.user, profile };
}

export async function getHospitalApplication() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Hospital sign in is required.');
  const snapshot = await getDoc(doc(getFirebaseDb(), 'hospitalApplications', user.uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function updateHospitalApplication(payload) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Hospital sign in is required.');
  const ref = doc(getFirebaseDb(), 'hospitalApplications', user.uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Hospital application was not found.');
  if (!['pending_review', 'needs_correction'].includes(snapshot.data().status)) throw new Error('This application can no longer be edited.');
  await updateDoc(ref, {
    hospitalName: clean(payload.hospitalName, 160),
    legalName: clean(payload.legalName, 180),
    country: clean(payload.country, 80),
    city: clean(payload.city, 80),
    address: clean(payload.address, 300),
    contactName: clean(payload.contactName, 120),
    contactPhone: clean(payload.contactPhone, 50),
    website: clean(payload.website, 240),
    description: clean(payload.description, 1800),
    internationalDeskEmail: clean(payload.internationalDeskEmail, 180),
    internationalDeskPhone: clean(payload.internationalDeskPhone, 50),
    languages: unique(payload.languages, 30),
    services: unique(payload.services, 40),
    accreditationClaims: unique(payload.accreditationClaims, 30),
    specialtyIds: unique(payload.specialtyIds, 50),
    requestedSpecialtyNames: unique(payload.requestedSpecialtyNames, 20),
    status: 'pending_review',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function getHospitalTeamRequests(hospitalId) {
  const user = getFirebaseAuth().currentUser;
  if (!user || !hospitalId) return [];
  const snapshot = await getDocs(query(collection(getFirebaseDb(), 'hospitalTeamInvites'), where('hospitalId', '==', hospitalId)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function requestHospitalTeamAccess({ hospitalId, email, displayName, role }) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Hospital admin sign in is required.');
  if (!['hospital_doctor', 'hospital_coordinator'].includes(role)) throw new Error('Choose a valid team role.');
  const id = `${hospitalId}__${specialtySlug(email).slice(0, 48)}__${Date.now().toString(36)}`;
  await setDoc(doc(getFirebaseDb(), 'hospitalTeamInvites', id), {
    inviteId: id,
    hospitalId,
    requestedBy: user.uid,
    email: clean(email, 180).toLowerCase(),
    displayName: clean(displayName, 120),
    requestedRole: role,
    status: 'pending_admin_provisioning',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function cancelHospitalTeamRequest(inviteId) {
  if (!getFirebaseAuth().currentUser) throw new Error('Hospital admin sign in is required.');
  await deleteDoc(doc(getFirebaseDb(), 'hospitalTeamInvites', inviteId));
}


export async function getMyPublishedHospital(hospitalId) {
  if (!hospitalId) return null;
  const snapshot = await getDoc(doc(getFirebaseDb(), 'hospitals', hospitalId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function updateHospitalOperationalProfile({ hospitalId, website, address, description, internationalDeskEmail, internationalDeskPhone, languages, services }) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Hospital admin sign in is required.');
  const userSnapshot = await getDoc(doc(getFirebaseDb(), 'users', user.uid));
  const profile = userSnapshot.exists() ? userSnapshot.data() : null;
  if (!profile || profile.role !== 'hospital_admin' || profile.hospitalId !== hospitalId) throw new Error('Only the hospital administrator can update the operational profile.');
  await updateDoc(doc(getFirebaseDb(), 'hospitals', hospitalId), {
    website: clean(website, 240),
    address: clean(address, 300),
    description: clean(description, 1800),
    internationalDeskEmail: clean(internationalDeskEmail, 180),
    internationalDeskPhone: clean(internationalDeskPhone, 50),
    languages: unique(languages, 30),
    services: unique(services, 40),
    updatedAt: serverTimestamp()
  });
}
