'use client';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';

function requireUser() {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    const error = new Error('Please sign in to manage CareAtlas documents.');
    error.code = 'careatlas/auth-required';
    throw error;
  }
  return user;
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export async function getPatientDocuments(patientId) {
  const user = requireUser();
  const ownerId = patientId || user.uid;

  if (ownerId !== user.uid) {
    throw new Error('You can only load documents linked to your own CareAtlas account.');
  }

  const db = getFirebaseDb();
  const snapshot = await getDocs(query(
    collection(db, 'caseDocuments'),
    where('patientId', '==', ownerId)
  ));

  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

export async function createCaseDocumentMetadata({
  caseId,
  caseNumber,
  driveFileId,
  driveAccessKey,
  name,
  mimeType,
  size,
  category = 'Medical report'
}) {
  const user = requireUser();
  const db = getFirebaseDb();

  const documentRef = await addDoc(collection(db, 'caseDocuments'), {
    patientId: user.uid,
    caseId,
    caseNumber,
    driveFileId,
    driveAccessKey,
    name,
    mimeType,
    size: Number(size) || 0,
    category,
    storageProvider: 'google_drive',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await updateDoc(doc(db, 'cases', caseId), {
    documentCount: increment(1),
    updatedAt: serverTimestamp()
  });

  return documentRef.id;
}

export async function removeCaseDocumentMetadata(documentId, caseId) {
  requireUser();
  const db = getFirebaseDb();

  await deleteDoc(doc(db, 'caseDocuments', documentId));

  if (caseId) {
    await updateDoc(doc(db, 'cases', caseId), {
      documentCount: increment(-1),
      updatedAt: serverTimestamp()
    });
  }
}

export function formatDocumentDate(value, fallback = 'Just now') {
  const millis = timestampMillis(value);
  if (!millis) return fallback;
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(millis));
}
