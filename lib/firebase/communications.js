'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { CAREATLAS_STAFF_ROLES, HOSPITAL_ROLES, USER_ROLES } from './roles';
import { hasMessagingConsent } from './consents';

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export function formatMessageTimestamp(value, fallback = 'Just now') {
  const millis = timestampMillis(value);
  if (!millis) return fallback;
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(millis));
}

function requireUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sign in to use CareAtlas messaging.');
  return user;
}

async function getProfile(userId) {
  const snapshot = await getDoc(doc(getFirebaseDb(), 'users', userId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

async function getCase(caseId) {
  const snapshot = await getDoc(doc(getFirebaseDb(), 'cases', caseId));
  if (!snapshot.exists()) throw new Error('This CareAtlas case could not be found.');
  return { id: snapshot.id, ...snapshot.data() };
}

async function requireMessagingConsent(caseId) {
  const snapshot = await getDoc(doc(getFirebaseDb(), 'caseConsentStates', caseId));
  if (!snapshot.exists() || !hasMessagingConsent(snapshot.data())) {
    const error = new Error('Case messaging is locked until the patient accepts the CareAtlas messaging consent.');
    error.code = 'careatlas/messaging-consent-required';
    throw error;
  }
  return snapshot.data();
}

export async function getPatientMessages(patientId) {
  const user = requireUser();
  if (!patientId || patientId !== user.uid) throw new Error('You can only load your own CareAtlas messages.');
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'caseMessages'),
    where('patientId', '==', patientId)
  ));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(a.createdAt) - timestampMillis(b.createdAt));
}

export async function getStaffCaseMessages(caseId) {
  const user = requireUser();
  const profile = await getProfile(user.uid);
  if (!profile || !CAREATLAS_STAFF_ROLES.includes(profile.role)) throw new Error('CareAtlas staff access is required.');
  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'caseMessages'),
    where('caseId', '==', caseId)
  ));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(a.createdAt) - timestampMillis(b.createdAt));
}

export async function getHospitalMessages(hospitalId, caseId) {
  const user = requireUser();
  const profile = await getProfile(user.uid);
  if (!profile || !HOSPITAL_ROLES.includes(profile.role) || profile.hospitalId !== hospitalId) {
    throw new Error('Hospital partner access is required.');
  }
  if (!caseId) return [];
  const caseRecord = await getCase(caseId);
  const assigned = Array.isArray(caseRecord.assignedHospitalIds) ? caseRecord.assignedHospitalIds : [];
  if (!assigned.includes(hospitalId)) throw new Error('This case is no longer assigned to your hospital.');

  const snapshot = await getDocs(query(
    collection(getFirebaseDb(), 'caseMessages'),
    where('caseId', '==', caseId),
    where('hospitalId', '==', hospitalId)
  ));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(a.createdAt) - timestampMillis(b.createdAt));
}

function messagePayload({ caseRecord, senderId, senderRole, senderName, body, hospitalId, source }) {
  return {
    caseId: caseRecord.id,
    caseNumber: caseRecord.caseNumber || '',
    patientId: caseRecord.patientId,
    hospitalId: hospitalId || null,
    threadType: hospitalId ? 'hospital' : 'careatlas',
    senderId,
    senderRole,
    senderName: senderName || '',
    body: body.trim(),
    source,
    createdAt: serverTimestamp()
  };
}

function validateBody(body) {
  const value = String(body || '').trim();
  if (!value) throw new Error('Write a message first.');
  if (value.length > 4000) throw new Error('Messages must be 4,000 characters or fewer.');
  return value;
}

export async function sendPatientMessage({ caseId, hospitalId = '', body }) {
  const user = requireUser();
  const text = validateBody(body);
  const caseRecord = await getCase(caseId);
  if (caseRecord.patientId !== user.uid) throw new Error('This case does not belong to the signed-in patient.');
  await requireMessagingConsent(caseId);

  if (hospitalId) {
    const assigned = Array.isArray(caseRecord.assignedHospitalIds) ? caseRecord.assignedHospitalIds : [];
    if (!assigned.includes(hospitalId)) throw new Error('That hospital is not assigned to this case.');
  }

  const db = getFirebaseDb();
  const messageRef = doc(collection(db, 'caseMessages'));
  await writeBatch(db)
    .set(messageRef, messagePayload({
      caseRecord,
      senderId: user.uid,
      senderRole: USER_ROLES.PATIENT,
      senderName: user.displayName || user.email || 'Patient',
      body: text,
      hospitalId,
      source: 'patient_web'
    }))
    .commit();
  return messageRef.id;
}

export async function sendStaffMessage({ caseId, body }) {
  const user = requireUser();
  const text = validateBody(body);
  const profile = await getProfile(user.uid);
  if (!profile || !CAREATLAS_STAFF_ROLES.includes(profile.role)) throw new Error('CareAtlas staff access is required.');
  const caseRecord = await getCase(caseId);
  await requireMessagingConsent(caseId);

  const db = getFirebaseDb();
  const messageRef = doc(collection(db, 'caseMessages'));
  const notificationRef = doc(collection(db, 'notifications'));
  const auditRef = doc(collection(db, 'auditLogs'));
  const batch = writeBatch(db);

  batch.set(messageRef, messagePayload({
    caseRecord,
    senderId: user.uid,
    senderRole: profile.role,
    senderName: profile.displayName || user.email || 'CareAtlas team',
    body: text,
    source: 'admin_web'
  }));
  batch.set(notificationRef, {
    recipientId: caseRecord.patientId,
    patientId: caseRecord.patientId,
    caseId,
    type: 'message',
    title: 'New message from CareAtlas',
    body: text.slice(0, 180),
    createdBy: user.uid,
    createdByRole: profile.role,
    source: 'admin_web',
    readAt: null,
    createdAt: serverTimestamp()
  });
  batch.set(auditRef, {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'message.sent_to_patient',
    caseId,
    entityId: messageRef.id,
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
  return messageRef.id;
}

export async function sendHospitalMessage({ caseId, hospitalId, body }) {
  const user = requireUser();
  const text = validateBody(body);
  const profile = await getProfile(user.uid);
  if (!profile || !HOSPITAL_ROLES.includes(profile.role) || profile.hospitalId !== hospitalId) {
    throw new Error('Hospital partner access is required.');
  }
  const caseRecord = await getCase(caseId);
  const assigned = Array.isArray(caseRecord.assignedHospitalIds) ? caseRecord.assignedHospitalIds : [];
  if (!assigned.includes(hospitalId)) throw new Error('This case is not assigned to your hospital.');
  await requireMessagingConsent(caseId);

  const db = getFirebaseDb();
  const messageRef = doc(collection(db, 'caseMessages'));
  const notificationRef = doc(collection(db, 'notifications'));
  const auditRef = doc(collection(db, 'auditLogs'));
  const batch = writeBatch(db);

  batch.set(messageRef, messagePayload({
    caseRecord,
    senderId: user.uid,
    senderRole: profile.role,
    senderName: profile.displayName || user.email || 'Hospital team',
    body: text,
    hospitalId,
    source: 'hospital_web'
  }));
  batch.set(notificationRef, {
    recipientId: caseRecord.patientId,
    patientId: caseRecord.patientId,
    caseId,
    hospitalId,
    type: 'message',
    title: 'New hospital message',
    body: text.slice(0, 180),
    createdBy: user.uid,
    createdByRole: profile.role,
    source: 'hospital_web',
    readAt: null,
    createdAt: serverTimestamp()
  });
  batch.set(auditRef, {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    hospitalId,
    action: 'message.sent_to_patient',
    caseId,
    entityId: messageRef.id,
    source: 'hospital_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
  return messageRef.id;
}

export function subscribeToPatientNotifications(patientId, onRows, onError) {
  if (!patientId) return () => {};
  const q = query(
    collection(getFirebaseDb(), 'notifications'),
    where('recipientId', '==', patientId)
  );
  return onSnapshot(q, snapshot => {
    const rows = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
    onRows(rows);
  }, onError);
}

export async function markNotificationRead(notificationId) {
  const user = requireUser();
  if (!notificationId) return;
  const ref = doc(getFirebaseDb(), 'notifications', notificationId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists() || snapshot.data().recipientId !== user.uid) throw new Error('Notification not found.');
  await updateDoc(ref, { readAt: serverTimestamp() });
}
