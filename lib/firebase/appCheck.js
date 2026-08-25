'use client';

import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getFirebaseApp } from './client';

let appCheckInstance = null;

export function getAppCheckSiteKey() {
  return (process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY || '').trim();
}

export function isAppCheckConfigured() {
  return Boolean(getAppCheckSiteKey());
}

export function initializeCareAtlasAppCheck() {
  if (typeof window === 'undefined') return null;
  const siteKey = getAppCheckSiteKey();
  if (!siteKey) return null;
  if (appCheckInstance) return appCheckInstance;

  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG === 'true'
  ) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  appCheckInstance = initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true
  });

  return appCheckInstance;
}
