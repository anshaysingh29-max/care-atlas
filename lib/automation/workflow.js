export const WORKFLOW_AUTOMATION_VERSION = 'careatlas-8e-2026-08-25-v1';

export const TASK_STATUSES = Object.freeze([
  ['open', 'Open'],
  ['in_progress', 'In progress'],
  ['blocked', 'Blocked'],
  ['completed', 'Completed'],
  ['dismissed', 'Dismissed']
]);

export const TASK_PRIORITIES = Object.freeze([
  ['urgent', 'Urgent'],
  ['high', 'High'],
  ['normal', 'Normal'],
  ['low', 'Low']
]);

export const DEFAULT_AUTOMATION_RULES = Object.freeze([
  { id: 'assign_coordinator', name: 'Assign new case coordinator', description: 'Creates a task when an active CareAtlas case has no coordinator.', enabled: true, slaHours: 2, priority: 'high', owner: 'operations' },
  { id: 'request_records', name: 'Request available medical records', description: 'Creates a task in Records Review when no case documents are available.', enabled: true, slaHours: 24, priority: 'high', owner: 'coordinator' },
  { id: 'review_hospital_matching', name: 'Review hospital matching', description: 'Creates a task when a case is in Hospital Matching without an assigned hospital.', enabled: true, slaHours: 24, priority: 'high', owner: 'coordinator' },
  { id: 'follow_up_treatment_plan', name: 'Follow up for treatment plan', description: 'Creates a provider follow-up task when a case is waiting for treatment plans.', enabled: true, slaHours: 24, priority: 'normal', owner: 'coordinator' },
  { id: 'schedule_consultation', name: 'Coordinate consultation', description: 'Creates a task when a consultation-stage case has no consultation scheduled.', enabled: true, slaHours: 24, priority: 'normal', owner: 'coordinator' },
  { id: 'travel_readiness', name: 'Activate travel readiness', description: 'Creates a task when travel preparation has begun but no travel request exists.', enabled: true, slaHours: 24, priority: 'normal', owner: 'coordinator' },
  { id: 'patient_recovery', name: 'Recover stalled patient journey', description: 'Creates a recovery task when an awaiting-patient case has been inactive for 3+ days.', enabled: true, slaHours: 4, priority: 'high', owner: 'coordinator' },
  { id: 'provider_follow_up', name: 'Escalate provider wait', description: 'Creates a follow-up task when a case is waiting on a provider for 2+ days.', enabled: true, slaHours: 4, priority: 'high', owner: 'coordinator' },
  { id: 'post_treatment_follow_up', name: 'Post-treatment follow-up', description: 'Creates a follow-up task when treatment is reached and the case has not entered follow-up.', enabled: true, slaHours: 48, priority: 'normal', owner: 'coordinator' }
]);

const ACTIVE_STATUSES = new Set(['submitted', 'active', 'waiting_partner', 'awaiting_patient', 'travel_confirmed']);
const FINAL_STATUSES = new Set(['completed', 'cancelled']);

export function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function taskIdFor(caseId, ruleId) {
  return `${String(caseId || '').replace(/[^a-zA-Z0-9_-]/g, '_')}__${ruleId}`;
}

export function mergeAutomationRules(config) {
  const overrides = config?.rules && typeof config.rules === 'object' ? config.rules : {};
  return DEFAULT_AUTOMATION_RULES.map(rule => ({
    ...rule,
    ...(overrides[rule.id] || {}),
    id: rule.id,
    slaHours: Math.max(1, Math.min(720, Number(overrides[rule.id]?.slaHours ?? rule.slaHours) || rule.slaHours)),
    enabled: overrides[rule.id]?.enabled === undefined ? rule.enabled : overrides[rule.id].enabled === true
  }));
}

function ageDays(value, now) {
  const millis = timestampMillis(value);
  if (!millis) return null;
  return Math.max(0, Math.floor((now - millis) / 86400000));
}

function activeRows(rows, final = ['completed', 'cancelled', 'declined']) {
  return (Array.isArray(rows) ? rows : []).filter(row => !final.includes(row.status));
}

function conditionFor(ruleId, bundle, now) {
  const c = bundle.caseRecord || {};
  const isFinal = FINAL_STATUSES.has(c.status);
  const active = ACTIVE_STATUSES.has(c.status) || (!c.status && !isFinal);
  const assigned = Array.isArray(c.assignedHospitalIds) ? c.assignedHospitalIds.length : 0;
  const docCount = Math.max(Array.isArray(bundle.documents) ? bundle.documents.length : 0, Number(c.documentCount) || 0);
  const planCount = activeRows(bundle.treatmentPlans).length;
  const consultationCount = activeRows(bundle.consultations).length;
  const travelCount = activeRows(bundle.travelRequests).length;
  const staleDays = ageDays(c.updatedAt || c.createdAt || c.submittedAt, now);

  switch (ruleId) {
    case 'assign_coordinator': return active && !c.coordinatorId;
    case 'request_records': return active && c.currentStage === 'records_review' && docCount === 0;
    case 'review_hospital_matching': return active && c.currentStage === 'hospital_matching' && assigned === 0;
    case 'follow_up_treatment_plan': return active && c.currentStage === 'treatment_plans' && planCount === 0;
    case 'schedule_consultation': return active && c.currentStage === 'consultation' && consultationCount === 0;
    case 'travel_readiness': return active && c.currentStage === 'travel_preparation' && travelCount === 0;
    case 'patient_recovery': return active && c.status === 'awaiting_patient' && staleDays !== null && staleDays >= 3;
    case 'provider_follow_up': return active && c.status === 'waiting_partner' && staleDays !== null && staleDays >= 2;
    case 'post_treatment_follow_up': return active && c.currentStage === 'treatment' && c.status !== 'completed';
    default: return false;
  }
}

function taskCopy(ruleId, c) {
  const number = c.caseNumber || c.id || 'CareAtlas case';
  const patient = c.patientName || 'Patient';
  const copies = {
    assign_coordinator: ['Assign a CareAtlas coordinator', `${number} is active but has no coordinator. Assign one owner before the SLA expires.`],
    request_records: ['Request available medical records', `${patient} has reached records review but no case documents are recorded. Review the case and request only the records needed for coordination.`],
    review_hospital_matching: ['Review eligible hospital matches', `${number} is in hospital matching with no provider assigned. Review approved providers and patient preferences before assigning.`],
    follow_up_treatment_plan: ['Follow up for treatment plan', `${number} is waiting for a treatment plan. Check the assigned hospital workflow and follow up operationally.`],
    schedule_consultation: ['Coordinate doctor consultation', `${number} is at consultation stage with no active consultation recorded. Coordinate availability with the patient and hospital.`],
    travel_readiness: ['Start travel readiness checklist', `${number} has reached travel preparation but no active travel request exists. Invite the patient to complete Travel Concierge when appropriate.`],
    patient_recovery: ['Recover stalled patient journey', `${number} is waiting for the patient and has been inactive for at least 3 days. Review consent and contact context before following up.`],
    provider_follow_up: ['Follow up with provider', `${number} has been waiting on a provider for at least 2 days. Review the latest provider activity and escalate if necessary.`],
    post_treatment_follow_up: ['Begin post-treatment follow-up', `${number} has reached treatment. Confirm the next follow-up step and prepare the patient outcome/review workflow when appropriate.`]
  };
  return copies[ruleId] || ['Review CareAtlas workflow task', `Review ${number} and decide the next operational action.`];
}

export function buildAutomationCandidates(bundle, config, options = {}) {
  const now = options.now || Date.now();
  const c = bundle.caseRecord || {};
  if (!c.id) return [];
  const baseTime = timestampMillis(c.updatedAt || c.createdAt || c.submittedAt) || now;
  return mergeAutomationRules(config)
    .filter(rule => rule.enabled && conditionFor(rule.id, bundle, now))
    .map(rule => {
      const [title, detail] = taskCopy(rule.id, c);
      const dueAtMillis = Math.max(baseTime, now - 30 * 86400000) + rule.slaHours * 3600000;
      return {
        id: taskIdFor(c.id, rule.id), caseId: c.id, caseNumber: c.caseNumber || '', patientId: c.patientId || '', patientName: c.patientName || '', patientCountry: c.patientCountry || '', treatmentName: c.treatmentName || '', currentStage: c.currentStage || 'case_submitted', caseStatus: c.status || 'submitted', source: 'automation', ruleId: rule.id, ruleName: rule.name, automationVersion: WORKFLOW_AUTOMATION_VERSION, title, detail, priority: rule.priority, ownerType: rule.owner, assignedTo: rule.owner === 'coordinator' ? (c.coordinatorId || '') : '', assignedToName: rule.owner === 'coordinator' ? (c.coordinatorName || '') : '', slaHours: rule.slaHours, dueAtMillis, triggerFingerprint: `${rule.id}|${c.currentStage || ''}|${c.status || ''}`
      };
    });
}

export function getTaskSlaState(task, now = Date.now()) {
  if (['completed', 'dismissed'].includes(task?.status)) return { state: 'resolved', label: task.status === 'completed' ? 'Completed' : 'Dismissed', overdueHours: 0, escalationLevel: 0 };
  const due = timestampMillis(task?.dueAt) || Number(task?.dueAtMillis) || 0;
  if (!due) return { state: 'no_due_date', label: 'No due date', overdueHours: 0, escalationLevel: 0 };
  const diffHours = (due - now) / 3600000;
  if (diffHours >= 4) return { state: 'on_track', label: `Due in ${Math.ceil(diffHours)}h`, overdueHours: 0, escalationLevel: 0 };
  if (diffHours >= 0) return { state: 'due_soon', label: `Due in ${Math.max(1, Math.ceil(diffHours))}h`, overdueHours: 0, escalationLevel: 0 };
  const overdueHours = Math.max(1, Math.floor(Math.abs(diffHours)));
  const escalationLevel = overdueHours >= 48 ? 3 : overdueHours >= 24 ? 2 : 1;
  return { state: 'overdue', label: `${overdueHours}h overdue`, overdueHours, escalationLevel };
}

export function summarizeTasks(tasks = [], now = Date.now()) {
  const active = tasks.filter(task => !['completed', 'dismissed'].includes(task.status));
  return {
    total: tasks.length,
    open: active.length,
    overdue: active.filter(task => getTaskSlaState(task, now).state === 'overdue').length,
    dueSoon: active.filter(task => getTaskSlaState(task, now).state === 'due_soon').length,
    unassigned: active.filter(task => !task.assignedTo).length,
    urgent: active.filter(task => ['urgent', 'high'].includes(task.priority)).length
  };
}
