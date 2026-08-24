'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const requiredConfigKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'messagingSenderId',
  'appId'
];

export const missingFirebaseConfig = requiredConfigKeys.filter(
  key => !firebaseConfig[key]
);

export const isFirebaseConfigured = missingFirebaseConfig.length === 0;

function requireBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase browser services can only be initialized in the browser.');
  }
}

function requireConfig() {
  if (!isFirebaseConfigured) {
    throw new Error(
      `CareAtlas Firebase configuration is incomplete. Missing: ${missingFirebaseConfig.join(', ')}`
    );
  }
}

export function getFirebaseApp() {
  requireBrowser();
  requireConfig();
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}
