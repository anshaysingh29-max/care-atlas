export const COPILOT_VERSION = 'careatlas-8b-2026-08-25-v1';

const ACTIVE_STATUSES = new Set(['submitted', 'active', 'waiting_partner', 'awaiting_patient', 'travel_confirmed']);
const FINAL_STATUSES = new Set(['completed', 'cancelled']);

function timestampMillis(value) {
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

function daysSince(value, now = Date.now()) {
  const millis = timestampMillis(value);
  if (!millis) return null;
  return Math.max(0, Math.floor((now - millis) / 86400000));
}

function labelize(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function compactText(value, fallback = 'Not provided') {
  const text = String(value || '').trim();
  return text || fallback;
}

function hasActive(rows, finalStatuses = ['completed', 'cancelled', 'declined']) {
  return rows.some(row => !finalStatuses.includes(row.status));
}

function addBlocker(blockers, severity, code, title, detail) {
  blockers.push({ severity, code, title, detail });
}

function addAction(actions, priority, code, title, detail, channel = 'operations') {
  actions.push({ priority, code, title, detail, channel });
}

function scoreSeverity(severity) {
  if (severity === 'critical') return 28;
  if (severity === 'high') return 20;
  if (severity === 'medium') return 12;
  return 5;
}

function priorityBand(score, isFinal) {
  if (isFinal) return 'monitor';
  if (score >= 70) return 'urgent';
  if (score >= 45) return 'high';
  if (score >= 20) return 'normal';
  return 'monitor';
}

function buildPatientDraft({ caseRecord, blockers, actions }) {
  const top = actions.find(action => action.channel === 'patient');
  if (!top) return '';

  const caseNumber = caseRecord.caseNumber || 'your CareAtlas case';
  const name = String(caseRecord.patientName || '').trim().split(' ')[0];
  const greeting = name ? `Hi ${name},` : 'Hello,';

  const templates = {
    request_documents: `${greeting}\n\nTo keep ${caseNumber} moving, please upload any medical reports or records you already have available in your CareAtlas Documents section. Only share information you are comfortable providing. Our team will review the records you choose to upload and let you know if anything else is needed.\n\nRegards,\nCareAtlas Care Team`,
    request_medical_consent: `${greeting}\n\nWe can see documents linked to ${caseNumber}, but your Medical Data Processing consent is not currently active. Please review Consent & Privacy in your CareAtlas portal so our operations team can review the records you have chosen to share.\n\nRegards,\nCareAtlas Care Team`,
    request_hospital_sharing_consent: `${greeting}\n\nWe are preparing the hospital review for ${caseNumber}. Before an assigned hospital can access the records you have chosen to share, please review the Hospital Sharing consent in Consent & Privacy.\n\nRegards,\nCareAtlas Care Team`,
    patient_follow_up: `${greeting}\n\nWe are checking in on ${caseNumber}. Your CareAtlas case is currently waiting for your input. Please open your patient portal and review the latest case status or messages. If you need help, reply in CareAtlas Messages and our team will assist.\n\nRegards,\nCareAtlas Care Team`,
    travel_readiness: `${greeting}\n\nYour treatment journey for ${caseNumber} is approaching the travel-preparation stage. When you are ready, please open Travel Concierge in your CareAtlas portal to share your travel-support preferences. Do not send passport numbers or passport scans through messages.\n\nRegards,\nCareAtlas Care Team`
  };

  return templates[top.code] || `${greeting}\n\nWe have an update regarding ${caseNumber}. Please open your CareAtlas patient portal to review the latest information and next steps.\n\nRegards,\nCareAtlas Care Team`;
}

export function analyzeCoordinatorCase(bundle, options = {}) {
  const now = options.now || Date.now();
  const caseRecord = bundle.caseRecord || {};
  const documents = Array.isArray(bundle.documents) ? bundle.documents : [];
  const consent = bundle.consent || null;
  const treatmentPlans = Array.isArray(bundle.treatmentPlans) ? bundle.treatmentPlans : [];
  const consultations = Array.isArray(bundle.consultations) ? bundle.consultations : [];
  const travelRequests = Array.isArray(bundle.travelRequests) ? bundle.travelRequests : [];
  const hotelBookings = Array.isArray(bundle.hotelBookings) ? bundle.hotelBookings : [];
  const messages = Array.isArray(bundle.messages) ? bundle.messages : [];

  const blockers = [];
  const actions = [];
  const isFinal = FINAL_STATUSES.has(caseRecord.status);
  const active = ACTIVE_STATUSES.has(caseRecord.status) || (!caseRecord.status && !isFinal);
  const assignedHospitalIds = Array.isArray(caseRecord.assignedHospitalIds) ? caseRecord.assignedHospitalIds : [];
  const documentCount = Math.max(documents.length, Number(caseRecord.documentCount) || 0);
  const staleDays = daysSince(caseRecord.updatedAt || caseRecord.createdAt, now);

  if (active && !caseRecord.coordinatorId) {
    addBlocker(blockers, 'high', 'unassigned', 'No coordinator assigned', 'An active case has no named CareAtlas coordinator.');
    addAction(actions, 100, 'assign_coordinator', 'Assign a coordinator', 'Give one CareAtlas owner responsibility for the next step.');
  }

  if (active && staleDays !== null && staleDays >= 3) {
    addBlocker(blockers, staleDays >= 7 ? 'high' : 'medium', 'stale_case', `No case update for ${staleDays} days`, 'Review the latest case activity and decide whether CareAtlas, the patient or a provider owes the next action.');
    addAction(actions, 85, 'review_stale_case', 'Review the stalled case', 'Confirm the current owner and record the next operational action.');
  }

  if (caseRecord.status === 'awaiting_patient') {
    addBlocker(blockers, 'medium', 'awaiting_patient', 'Waiting for patient input', 'The case status indicates that patient input is required before the journey can progress.');
    addAction(actions, 90, 'patient_follow_up', 'Follow up with the patient', 'Review the latest message thread before sending a reminder.', 'patient');
  }

  if (['records_review', 'hospital_matching', 'treatment_plans', 'consultation'].includes(caseRecord.currentStage)) {
    if (documentCount === 0) {
      addBlocker(blockers, 'high', 'no_documents', 'No medical records uploaded', 'The journey has reached records review or beyond without any uploaded case documents.');
      addAction(actions, 95, 'request_documents', 'Request available medical records', 'Ask the patient to upload records they already have. Do not prescribe a clinical document list.', 'patient');
    } else if (consent?.medicalDataProcessing !== true) {
      addBlocker(blockers, 'critical', 'medical_consent_missing', 'Medical-data processing consent missing', 'Records appear to exist, but CareAtlas should not review them until the recorded consent is active.');
      addAction(actions, 100, 'request_medical_consent', 'Request consent review', 'Ask the patient to review Medical Data Processing consent in the portal.', 'patient');
    }
  }

  if (caseRecord.currentStage === 'hospital_matching' && assignedHospitalIds.length === 0) {
    addBlocker(blockers, 'high', 'no_hospital_match', 'No hospital assigned for matching', 'The case is in hospital matching but no provider has been assigned by CareAtlas operations.');
    addAction(actions, 94, 'review_hospital_options', 'Review eligible hospitals', 'Use specialty, destination, patient preferences and verified marketplace data. AI shortlist is advisory only.');
  }

  if (assignedHospitalIds.length > 0 && documentCount > 0 && consent?.hospitalSharing !== true && ['hospital_matching', 'treatment_plans', 'consultation'].includes(caseRecord.currentStage)) {
    addBlocker(blockers, 'high', 'hospital_sharing_missing', 'Hospital-sharing consent missing', 'A provider is assigned, but the recorded sharing consent does not allow case documents to be shared with the hospital.');
    addAction(actions, 96, 'request_hospital_sharing_consent', 'Request hospital-sharing consent review', 'Ask the patient to review Hospital Sharing consent before records are exposed to providers.', 'patient');
  }

  if (caseRecord.currentStage === 'treatment_plans' && assignedHospitalIds.length > 0 && treatmentPlans.length === 0) {
    addBlocker(blockers, 'high', 'treatment_plan_missing', 'No treatment plan received', 'The case is in the treatment-plan stage and no hospital plan is currently recorded.');
    addAction(actions, 92, 'follow_up_hospital_plan', 'Follow up with assigned hospital', 'Check whether the assigned provider has reviewed the case and when a plan can be expected.');
  }

  if (caseRecord.currentStage === 'consultation' && !hasActive(consultations)) {
    addBlocker(blockers, 'medium', 'consultation_missing', 'No active consultation', 'The case is in consultation stage but no proposed or scheduled consultation is recorded.');
    addAction(actions, 88, 'arrange_consultation', 'Coordinate a consultation', 'Work with the assigned hospital to propose an appropriate consultation slot.');
  }

  if (caseRecord.currentStage === 'travel_preparation' && !hasActive(travelRequests) && !hasActive(hotelBookings, ['completed', 'cancelled', 'declined', 'rejected'])) {
    addBlocker(blockers, 'medium', 'travel_not_started', 'Travel support not started', 'The case is in travel preparation but there is no active travel request or stay booking.');
    addAction(actions, 82, 'travel_readiness', 'Invite patient to Travel Concierge', 'Ask the patient to provide non-sensitive travel preferences when ready.', 'patient');
  }

  const latestMessage = [...messages].sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))[0] || null;
  if (latestMessage && latestMessage.senderRole === 'patient') {
    const messageAge = daysSince(latestMessage.createdAt, now);
    if (messageAge !== null && messageAge >= 1 && active) {
      addBlocker(blockers, messageAge >= 3 ? 'high' : 'medium', 'patient_message_waiting', 'Patient message may need a response', `The latest case message was sent by the patient ${messageAge} day${messageAge === 1 ? '' : 's'} ago.`);
      addAction(actions, 91, 'reply_to_patient', 'Review and answer the patient message', 'Read the full thread before responding. Do not rely on the summary alone.');
    }
  }

  if (!actions.length && !isFinal) {
    addAction(actions, 20, 'routine_review', 'Continue routine case review', 'No major operational blocker was detected from the currently available CareAtlas data.');
  }

  actions.sort((a, b) => b.priority - a.priority);
  blockers.sort((a, b) => scoreSeverity(b.severity) - scoreSeverity(a.severity));

  let score = blockers.reduce((sum, blocker) => sum + scoreSeverity(blocker.severity), 0);
  if (active && staleDays !== null) score += Math.min(15, staleDays * 2);
  if (caseRecord.status === 'awaiting_patient' || caseRecord.status === 'waiting_partner') score += 6;
  score = Math.min(100, score);

  const summaryParts = [
    `${caseRecord.caseNumber || caseRecord.id || 'Case'} is at ${labelize(caseRecord.currentStage || 'case_submitted')}.`,
    `${compactText(caseRecord.treatmentName, 'Treatment request')} for a patient from ${compactText(caseRecord.patientCountry, 'an unspecified country')}.`,
    caseRecord.coordinatorName ? `Coordinator: ${caseRecord.coordinatorName}.` : 'No coordinator is assigned.',
    assignedHospitalIds.length ? `${assignedHospitalIds.length} hospital${assignedHospitalIds.length === 1 ? '' : 's'} assigned.` : 'No hospital is assigned.',
    `${documentCount} case document${documentCount === 1 ? '' : 's'} recorded.`,
    treatmentPlans.length ? `${treatmentPlans.length} treatment plan${treatmentPlans.length === 1 ? '' : 's'} recorded.` : 'No treatment plan recorded.',
    consultations.length ? `${consultations.length} consultation record${consultations.length === 1 ? '' : 's'} found.` : 'No consultation record found.'
  ];

  const readiness = [
    { id: 'coordinator', label: 'Coordinator assigned', ready: Boolean(caseRecord.coordinatorId) },
    { id: 'medicalConsent', label: 'Medical-data processing consent', ready: consent?.medicalDataProcessing === true },
    { id: 'documents', label: 'At least one case document', ready: documentCount > 0 },
    { id: 'provider', label: 'Hospital assigned', ready: assignedHospitalIds.length > 0 },
    { id: 'sharing', label: 'Hospital-sharing consent', ready: consent?.hospitalSharing === true },
    { id: 'plan', label: 'Treatment plan received', ready: treatmentPlans.length > 0 },
    { id: 'consultation', label: 'Consultation recorded', ready: consultations.length > 0 },
    { id: 'travel', label: 'Travel/stay activity started', ready: travelRequests.length > 0 || hotelBookings.length > 0 }
  ];

  const patientDraft = buildPatientDraft({ caseRecord, blockers, actions });

  return {
    algorithmVersion: COPILOT_VERSION,
    generatedAt: new Date(now).toISOString(),
    caseId: caseRecord.id || '',
    caseNumber: caseRecord.caseNumber || '',
    priorityScore: score,
    priorityBand: priorityBand(score, isFinal),
    staleDays,
    summary: summaryParts.join(' '),
    blockers,
    nextActions: actions,
    readiness,
    patientDraft,
    requiresHumanReview: true,
    disclaimer: 'Coordinator Copilot uses structured CareAtlas workflow data. It does not diagnose, provide medical advice, select a hospital automatically, or send messages automatically.'
  };
}

export function sortCopilotQueue(rows) {
  return [...rows].sort((a, b) => {
    const scoreDiff = (b.analysis?.priorityScore || 0) - (a.analysis?.priorityScore || 0);
    if (scoreDiff) return scoreDiff;
    const bUpdated = timestampMillis(b.caseRecord?.updatedAt || b.caseRecord?.createdAt);
    const aUpdated = timestampMillis(a.caseRecord?.updatedAt || a.caseRecord?.createdAt);
    return aUpdated - bUpdated;
  });
}

export function copilotBandLabel(value) {
  return ({ urgent: 'Urgent', high: 'High', normal: 'Normal', monitor: 'Monitor' })[value] || 'Normal';
}
