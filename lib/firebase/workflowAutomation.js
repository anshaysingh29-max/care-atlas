'use client';

import {
  Timestamp,
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
import { getCoordinatorCopilotWorkspace } from './copilot';
import {
  WORKFLOW_AUTOMATION_VERSION,
  buildAutomationCandidates,
  getTaskSlaState,
  mergeAutomationRules,
  summarizeTasks
} from '@/lib/automation/workflow';

async function requireStaffIdentity({ adminOnly = false } = {}) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('CareAtlas operations sign-in is required.');
  const db = getFirebaseDb();
  const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
  const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;
  if (!profile || !isCareAtlasStaffRole(profile.role) || profile.status === 'disabled') throw new Error('CareAtlas operations access is required.');
  if (adminOnly && !isAdminRole(profile.role)) throw new Error('CareAtlas admin access is required for workflow configuration.');
  return { user, profile, db };
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'number') return value;
  return 0;
}

function sortTasks(rows) {
  const rank = { urgent: 4, high: 3, normal: 2, low: 1 };
  return [...rows].sort((a, b) => {
    const aResolved = ['completed', 'dismissed'].includes(a.status) ? 1 : 0;
    const bResolved = ['completed', 'dismissed'].includes(b.status) ? 1 : 0;
    if (aResolved !== bResolved) return aResolved - bResolved;
    const aSla = getTaskSlaState(a);
    const bSla = getTaskSlaState(b);
    if (aSla.state === 'overdue' && bSla.state !== 'overdue') return -1;
    if (bSla.state === 'overdue' && aSla.state !== 'overdue') return 1;
    const priorityDiff = (rank[b.priority] || 0) - (rank[a.priority] || 0);
    if (priorityDiff) return priorityDiff;
    return timestampMillis(a.dueAt) - timestampMillis(b.dueAt);
  });
}

export async function getWorkflowAutomationConfig() {
  await requireStaffIdentity();
  const db = getFirebaseDb();
  const snapshot = await getDoc(doc(db, 'workflowAutomationConfig', 'default'));
  const config = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : { rules: {} };
  return { ...config, resolvedRules: mergeAutomationRules(config) };
}

export async function saveWorkflowAutomationConfig(rules) {
  const { user, profile, db } = await requireStaffIdentity({ adminOnly: true });
  const cleanRules = {};
  mergeAutomationRules({ rules }).forEach(rule => {
    cleanRules[rule.id] = { enabled: rule.enabled, slaHours: rule.slaHours, priority: rule.priority, owner: rule.owner };
  });
  const batch = writeBatch(db);
  batch.set(doc(db, 'workflowAutomationConfig', 'default'), {
    rules: cleanRules,
    automationVersion: WORKFLOW_AUTOMATION_VERSION,
    updatedBy: user.uid,
    updatedByRole: profile.role,
    updatedAt: serverTimestamp()
  }, { merge: true });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'workflow.automation_config_updated',
    entityType: 'workflowAutomationConfig',
    entityId: 'default',
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
  return getWorkflowAutomationConfig();
}

export async function getWorkflowTasks({ caseId = '', includeResolved = true } = {}) {
  await requireStaffIdentity();
  const snapshot = await getDocs(collection(getFirebaseDb(), 'workflowTasks'));
  let rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  if (caseId) rows = rows.filter(item => item.caseId === caseId);
  if (!includeResolved) rows = rows.filter(item => !['completed', 'dismissed'].includes(item.status));
  return sortTasks(rows);
}

export async function getMyWorkflowTasks({ includeUnassigned = true, limit = 6 } = {}) {
  const { user, profile } = await requireStaffIdentity();
  const rows = await getWorkflowTasks({ includeResolved: false });
  const ids = new Set([user.uid, profile.coordinatorId].filter(Boolean));
  return rows.filter(task => ids.has(task.assignedTo) || (includeUnassigned && !task.assignedTo)).slice(0, limit);
}

export async function syncWorkflowAutomation() {
  const { user, profile, db } = await requireStaffIdentity();
  const [workspace, config, existingTasks] = await Promise.all([
    getCoordinatorCopilotWorkspace(),
    getWorkflowAutomationConfig(),
    getWorkflowTasks({ includeResolved: true })
  ]);

  const candidates = workspace.flatMap(bundle => buildAutomationCandidates(bundle, config));
  const candidateById = new Map(candidates.map(item => [item.id, item]));
  const existingById = new Map(existingTasks.map(item => [item.id, item]));
  const batch = writeBatch(db);
  let created = 0;
  let refreshed = 0;
  let resolved = 0;
  const now = Date.now();

  candidates.slice(0, 350).forEach(candidate => {
    const ref = doc(db, 'workflowTasks', candidate.id);
    const existing = existingById.get(candidate.id);
    const payload = {
      ...candidate,
      dueAt: Timestamp.fromMillis(candidate.dueAtMillis),
      updatedAt: serverTimestamp(),
      lastEvaluatedAt: serverTimestamp()
    };
    delete payload.dueAtMillis;

    if (!existing) {
      batch.set(ref, {
        ...payload,
        status: 'open',
        createdBy: user.uid,
        createdByRole: profile.role,
        createdAt: serverTimestamp(),
        completedAt: null,
        completionType: ''
      });
      created += 1;
      return;
    }

    const resolvedTask = ['completed', 'dismissed'].includes(existing.status);
    const shouldReopen = resolvedTask && (existing.completionType === 'signal_resolved' || existing.triggerFingerprint !== candidate.triggerFingerprint);
    if (shouldReopen) {
      batch.set(ref, {
        ...payload,
        assignedTo: existing.assignedTo || candidate.assignedTo,
        assignedToName: existing.assignedToName || candidate.assignedToName,
        status: 'open',
        completedAt: null,
        completedBy: '',
        completionType: '',
        reopenedAt: serverTimestamp()
      }, { merge: true });
    } else {
      batch.set(ref, {
        caseNumber: candidate.caseNumber,
        patientName: candidate.patientName,
        patientCountry: candidate.patientCountry,
        treatmentName: candidate.treatmentName,
        currentStage: candidate.currentStage,
        caseStatus: candidate.caseStatus,
        ruleName: candidate.ruleName,
        title: candidate.title,
        detail: candidate.detail,
        automationVersion: candidate.automationVersion,
        lastEvaluatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    refreshed += 1;
  });

  existingTasks.filter(task => task.source === 'automation' && !['completed', 'dismissed'].includes(task.status) && !candidateById.has(task.id)).slice(0, Math.max(0, 420 - candidates.length)).forEach(task => {
    batch.update(doc(db, 'workflowTasks', task.id), {
      status: 'completed',
      completionType: 'signal_resolved',
      completedAt: serverTimestamp(),
      completedBy: 'automation_sync',
      updatedAt: serverTimestamp(),
      lastEvaluatedAt: serverTimestamp()
    });
    resolved += 1;
  });

  const runRef = doc(collection(db, 'workflowAutomationRuns'));
  batch.set(runRef, {
    runId: runRef.id,
    automationVersion: WORKFLOW_AUTOMATION_VERSION,
    mode: 'browser_sync',
    createdTasks: created,
    refreshedTasks: refreshed,
    resolvedTasks: resolved,
    candidateCount: candidates.length,
    evaluatedCaseCount: workspace.length,
    actorId: user.uid,
    actorRole: profile.role,
    createdAt: serverTimestamp()
  });
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'workflow.automation_sync_run',
    entityType: 'workflowAutomationRun',
    entityId: runRef.id,
    counts: { created, refreshed, resolved, candidates: candidates.length },
    source: 'admin_web',
    createdAt: serverTimestamp()
  });

  await batch.commit();
  const tasks = await getWorkflowTasks({ includeResolved: true });
  return { tasks, metrics: summarizeTasks(tasks, now), created, refreshed, resolved, candidateCount: candidates.length };
}

export async function updateWorkflowTask(taskId, changes = {}) {
  const { user, profile, db } = await requireStaffIdentity();
  if (!taskId) throw new Error('Missing workflow task ID.');
  const ref = doc(db, 'workflowTasks', taskId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Workflow task not found.');
  const current = snapshot.data();
  const allowedStatus = ['open', 'in_progress', 'blocked', 'completed', 'dismissed'];
  const payload = { updatedAt: serverTimestamp(), updatedBy: user.uid, updatedByRole: profile.role };
  if (changes.status && allowedStatus.includes(changes.status)) payload.status = changes.status;
  if (changes.priority && ['urgent', 'high', 'normal', 'low'].includes(changes.priority)) payload.priority = changes.priority;
  if (changes.assignedTo !== undefined) payload.assignedTo = String(changes.assignedTo || '').slice(0, 160);
  if (changes.assignedToName !== undefined) payload.assignedToName = String(changes.assignedToName || '').slice(0, 160);
  if (changes.note !== undefined) payload.note = String(changes.note || '').slice(0, 600);
  if (changes.dueAtMillis) payload.dueAt = Timestamp.fromMillis(Number(changes.dueAtMillis));
  if (payload.status === 'completed' || payload.status === 'dismissed') {
    payload.completedAt = serverTimestamp();
    payload.completedBy = user.uid;
    payload.completionType = payload.status === 'dismissed' ? 'manual_dismissal' : 'manual_completion';
  } else if (payload.status) {
    payload.completedAt = null;
    payload.completedBy = '';
    payload.completionType = '';
  }

  const batch = writeBatch(db);
  batch.update(ref, payload);
  batch.set(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'workflow.task_updated',
    entityType: 'workflowTask',
    entityId: taskId,
    caseId: current.caseId || '',
    changes: Object.keys(payload).filter(key => !key.endsWith('At')),
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  await batch.commit();
  const updated = await getDoc(ref);
  return { id: updated.id, ...updated.data() };
}

export async function takeWorkflowTask(taskId) {
  const { user, profile } = await requireStaffIdentity();
  return updateWorkflowTask(taskId, { assignedTo: user.uid, assignedToName: profile.displayName || user.email || 'CareAtlas staff', status: 'in_progress' });
}

export async function createManualWorkflowTask({ caseRecord, title, detail, priority = 'normal', dueAtMillis, assignedTo = '', assignedToName = '' }) {
  const { user, profile, db } = await requireStaffIdentity();
  const taskRef = doc(collection(db, 'workflowTasks'));
  const caseId = caseRecord?.id || '';
  const now = Date.now();
  await setDoc(taskRef, {
    taskId: taskRef.id,
    caseId,
    caseNumber: caseRecord?.caseNumber || '',
    patientId: caseRecord?.patientId || '',
    patientName: caseRecord?.patientName || '',
    patientCountry: caseRecord?.patientCountry || '',
    treatmentName: caseRecord?.treatmentName || '',
    currentStage: caseRecord?.currentStage || '',
    caseStatus: caseRecord?.status || '',
    source: 'manual',
    ruleId: '',
    ruleName: '',
    automationVersion: WORKFLOW_AUTOMATION_VERSION,
    title: String(title || '').trim().slice(0, 180),
    detail: String(detail || '').trim().slice(0, 900),
    priority,
    ownerType: 'manual',
    assignedTo: String(assignedTo || '').slice(0, 160),
    assignedToName: String(assignedToName || '').slice(0, 160),
    status: 'open',
    dueAt: Timestamp.fromMillis(Number(dueAtMillis) || now + 24 * 3600000),
    createdBy: user.uid,
    createdByRole: profile.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
    completionType: ''
  });
  await setDoc(doc(collection(db, 'auditLogs')), {
    actorId: user.uid,
    actorEmail: user.email || '',
    actorRole: profile.role,
    action: 'workflow.manual_task_created',
    entityType: 'workflowTask',
    entityId: taskRef.id,
    caseId,
    source: 'admin_web',
    createdAt: serverTimestamp()
  });
  return { id: taskRef.id };
}

export async function getWorkflowAutomationRuns(limit = 12) {
  await requireStaffIdentity();
  const snapshot = await getDocs(collection(getFirebaseDb(), 'workflowAutomationRuns'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt)).slice(0, limit);
}
