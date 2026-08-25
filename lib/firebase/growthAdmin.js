'use client';

import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { isCareAtlasStaffRole } from './admin';
import { buildGrowthWorkspace } from '@/lib/ai/growth';

async function requireStaffIdentity() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('CareAtlas operations sign-in is required.');
  const db = getFirebaseDb();
  const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
  const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;
  if (!profile || !isCareAtlasStaffRole(profile.role) || profile.status === 'disabled') {
    throw new Error('CareAtlas operations access is required.');
  }
  return { user, profile, db };
}

async function loadCollectionSafe(name) {
  try {
    const snapshot = await getDocs(collection(getFirebaseDb(), name));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  } catch (error) {
    console.warn(`Growth CRM could not load ${name}.`, error);
    return [];
  }
}

export async function getGrowthCrmWorkspace() {
  await requireStaffIdentity();
  const [cases, partnerLeads, referrals, careMatchRuns] = await Promise.all([
    loadCollectionSafe('cases'),
    loadCollectionSafe('partnerLeads'),
    loadCollectionSafe('referrals'),
    loadCollectionSafe('careMatchRuns')
  ]);

  return buildGrowthWorkspace({ cases, partnerLeads, referrals, careMatchRuns });
}
