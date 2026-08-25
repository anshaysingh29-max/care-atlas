'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './client';
import { isCareAtlasStaffRole } from './admin';

export const REVIEW_MODERATION_STATUSES = Object.freeze(['pending_review', 'published', 'rejected', 'hidden']);
export const CONCERN_STATUSES = Object.freeze(['open', 'in_review', 'waiting_on_patient', 'resolved', 'closed']);

function clean(value, max = 800) {
  return String(value || '').trim().slice(0, max);
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

async function requireStaff() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('CareAtlas operations sign-in is required.');
  const db = getFirebaseDb();
  const snapshot = await getDoc(doc(db, 'users', user.uid));
  const profile = snapshot.exists() ? snapshot.data() : null;
  if (!profile || !isCareAtlasStaffRole(profile.role) || profile.status === 'disabled') {
    throw new Error('CareAtlas operations access is required.');
  }
  return { user, profile, db };
}

export async function getAdminReviews() {
  await requireStaff();
  const snapshot = await getDocs(collection(getFirebaseDb(), 'experienceReviews'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

export async function getAdminConcerns() {
  await requireStaff();
  const snapshot = await getDocs(collection(getFirebaseDb(), 'patientConcerns'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt));
}

export async function moderateReview({ reviewId, status }) {
  const { user, profile, db } = await requireStaff();
  if (!REVIEW_MODERATION_STATUSES.includes(status)) throw new Error('Choose a valid review status.');
  const ref = doc(db, 'experienceReviews', reviewId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Review not found.');
  const review = snapshot.data();
  const batch = writeBatch(db);
  const update = {
    status,
    moderatedBy: user.uid,
    moderatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if (status === 'published') update.publishedAt = serverTimestamp();
  if (status !== 'published') update.publishedAt = null;
  batch.update(ref, update);
  const publishedRef = doc(db, 'publishedExperienceReviews', reviewId);
  if (status === 'published') {
    batch.set(publishedRef, {
      reviewId,
      targetType: review.targetType,
      targetId: review.targetId,
      targetName: review.targetName || review.targetId,
      rating: review.rating,
      title: review.title || '',
      body: review.body || '',
      patientReportedOutcome: review.patientReportedOutcome || 'prefer_not_to_say',
      wouldRecommend: Boolean(review.wouldRecommend),
      verifiedJourney: true,
      status: 'published',
      publishedAt: serverTimestamp(),
      source: 'careatlas_moderation'
    });
  } else {
    batch.delete(publishedRef);
  }
  batch.set(doc(collection(db, 'notifications')), {
    recipientId: review.patientId,
    patientId: review.patientId,
    caseId: review.caseId,
    type: 'review_moderation',
    title: status === 'published' ? 'Your CareAtlas review is published' : 'Your CareAtlas review was updated',
    body: status === 'published'
      ? `Your verified ${String(review.targetType || 'experience')} feedback is now visible to the relevant CareAtlas partner.`
      : `Your review status is now ${status.replaceAll('_', ' ')}.`,
    createdBy: user.uid,
    createdByRole: profile.role,
    source: 'admin_web',
    readAt: null,
    createdAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'trust.review_moderated',
    caseId: review.caseId,
    entityType: 'experienceReview',
    entityId: reviewId,
    changes: { status },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function updateConcern({ concernId, status, assignedTo, resolutionSummary }) {
  const { user, profile, db } = await requireStaff();
  if (!CONCERN_STATUSES.includes(status)) throw new Error('Choose a valid concern status.');
  const ref = doc(db, 'patientConcerns', concernId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Concern not found.');
  const concern = snapshot.data();
  const batch = writeBatch(db);
  const update = {
    status,
    assignedTo: clean(assignedTo, 160),
    resolutionSummary: clean(resolutionSummary, 1000),
    updatedAt: serverTimestamp()
  };
  if (status === 'resolved' || status === 'closed') update.resolvedAt = serverTimestamp();
  else update.resolvedAt = null;
  batch.update(ref, update);
  const publishedRef = doc(db, 'publishedExperienceReviews', reviewId);
  if (status === 'published') {
    batch.set(publishedRef, {
      reviewId,
      targetType: review.targetType,
      targetId: review.targetId,
      targetName: review.targetName || review.targetId,
      rating: review.rating,
      title: review.title || '',
      body: review.body || '',
      patientReportedOutcome: review.patientReportedOutcome || 'prefer_not_to_say',
      wouldRecommend: Boolean(review.wouldRecommend),
      verifiedJourney: true,
      status: 'published',
      publishedAt: serverTimestamp(),
      source: 'careatlas_moderation'
    });
  } else {
    batch.delete(publishedRef);
  }
  batch.set(doc(collection(db, 'notifications')), {
    recipientId: concern.patientId,
    patientId: concern.patientId,
    caseId: concern.caseId,
    type: 'concern_update',
    title: 'CareAtlas support concern updated',
    body: `Your concern is now ${status.replaceAll('_', ' ')}${update.resolutionSummary ? ` · ${update.resolutionSummary.slice(0, 120)}` : ''}.`,
    createdBy: user.uid,
    createdByRole: profile.role,
    source: 'admin_web',
    readAt: null,
    createdAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'trust.concern_updated',
    caseId: concern.caseId,
    entityType: 'patientConcern',
    entityId: concernId,
    changes: { status, assignedTo: update.assignedTo },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
}

export async function getQualityDashboard() {
  const [reviews, concerns] = await Promise.all([getAdminReviews(), getAdminConcerns()]);
  const published = reviews.filter(item => item.status === 'published');
  const providerMap = new Map();
  published
    .filter(item => ['hospital', 'hotel'].includes(item.targetType))
    .forEach(item => {
      const key = `${item.targetType}:${item.targetId}`;
      if (!providerMap.has(key)) {
        providerMap.set(key, {
          key,
          targetType: item.targetType,
          targetId: item.targetId,
          targetName: item.targetName || item.targetId,
          ratings: [],
          improved: 0,
          outcomeAnswers: 0,
          recommended: 0,
          reviewCount: 0,
          concerns: 0,
          unresolvedConcerns: 0
        });
      }
      const row = providerMap.get(key);
      row.ratings.push(Number(item.rating) || 0);
      row.reviewCount += 1;
      if (item.wouldRecommend) row.recommended += 1;
      if (['much_better', 'better'].includes(item.patientReportedOutcome)) row.improved += 1;
      if (item.patientReportedOutcome && item.patientReportedOutcome !== 'prefer_not_to_say') row.outcomeAnswers += 1;
    });

  concerns.forEach(item => {
    if (!['hospital', 'hotel'].includes(item.targetType) || !item.targetId) return;
    const key = `${item.targetType}:${item.targetId}`;
    if (!providerMap.has(key)) {
      providerMap.set(key, {
        key,
        targetType: item.targetType,
        targetId: item.targetId,
        targetName: item.targetName || item.targetId,
        ratings: [],
        improved: 0,
        outcomeAnswers: 0,
        recommended: 0,
        reviewCount: 0,
        concerns: 0,
        unresolvedConcerns: 0
      });
    }
    const row = providerMap.get(key);
    row.concerns += 1;
    if (!['resolved', 'closed'].includes(item.status)) row.unresolvedConcerns += 1;
  });

  const providers = Array.from(providerMap.values()).map(row => {
    const averageRating = row.ratings.length ? row.ratings.reduce((a, b) => a + b, 0) / row.ratings.length : 0;
    return {
      ...row,
      averageRating,
      recommendationRate: row.reviewCount ? Math.round((row.recommended / row.reviewCount) * 100) : 0,
      improvementRate: row.outcomeAnswers ? Math.round((row.improved / row.outcomeAnswers) * 100) : null,
      sampleStatus: row.reviewCount >= 5 ? 'established' : 'small_sample'
    };
  }).sort((a, b) => b.reviewCount - a.reviewCount || b.averageRating - a.averageRating);

  const careAtlasReviews = published.filter(item => item.targetType === 'careatlas');
  const careAtlasAverage = careAtlasReviews.length
    ? careAtlasReviews.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / careAtlasReviews.length
    : 0;
  const careAtlasRecommendationRate = careAtlasReviews.length
    ? Math.round((careAtlasReviews.filter(item => item.wouldRecommend).length / careAtlasReviews.length) * 100)
    : 0;

  return {
    providers,
    publishedReviewCount: published.length,
    pendingReviewCount: reviews.filter(item => item.status === 'pending_review').length,
    openConcernCount: concerns.filter(item => !['resolved', 'closed'].includes(item.status)).length,
    resolvedConcernCount: concerns.filter(item => ['resolved', 'closed'].includes(item.status)).length,
    careAtlasReviewCount: careAtlasReviews.length,
    careAtlasAverage,
    careAtlasRecommendationRate,
    careAtlasOpenConcerns: concerns.filter(item => item.targetType === 'careatlas' && !['resolved', 'closed'].includes(item.status)).length
  };
}
