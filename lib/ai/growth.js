export const GROWTH_ENGINE_VERSION = 'careatlas-8c-2026-08-25-v1';

const FINAL_CASE_STATUSES = new Set(['completed', 'cancelled']);
const ACTIVE_CASE_STATUSES = new Set(['submitted', 'active', 'waiting_partner', 'awaiting_patient', 'travel_confirmed']);

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

export function daysSince(value, now = Date.now()) {
  const millis = timestampMillis(value);
  if (!millis) return null;
  return Math.max(0, Math.floor((now - millis) / 86400000));
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function safeText(value, max = 160) {
  return String(value || '').trim().slice(0, max);
}

function titleCase(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function firstName(value) {
  return safeText(value, 80).split(/\s+/)[0] || '';
}

function band(score) {
  if (score >= 75) return 'hot';
  if (score >= 55) return 'warm';
  if (score >= 30) return 'watch';
  return 'low';
}

function caseStageBoost(stage) {
  return ({
    case_submitted: 8,
    records_review: 14,
    hospital_matching: 22,
    treatment_plans: 30,
    consultation: 38,
    hospital_selected: 45,
    travel_preparation: 50,
    treatment: 55,
    follow_up: 45
  })[stage] || 5;
}

function caseRecoveryReason(record, staleDays) {
  if (record.status === 'awaiting_patient') return 'Waiting for patient input';
  if (record.status === 'waiting_partner') return 'Waiting on a provider or partner';
  if (!record.coordinatorId) return 'No coordinator assigned';
  if (staleDays !== null && staleDays >= 7) return `No case update for ${staleDays} days`;
  if (staleDays !== null && staleDays >= 3) return `Case inactive for ${staleDays} days`;
  return 'Active case with a recoverable next step';
}

export function analyzeCaseGrowthOpportunity(caseRecord, options = {}) {
  const now = options.now || Date.now();
  const record = caseRecord || {};
  const staleDays = daysSince(record.updatedAt || record.createdAt || record.submittedAt, now);
  const isFinal = FINAL_CASE_STATUSES.has(record.status);
  const active = ACTIVE_CASE_STATUSES.has(record.status) || (!record.status && !isFinal);
  const preferredHospitals = Array.isArray(record.patientPreferredHospitalIds) ? record.patientPreferredHospitalIds.length : 0;
  const assignedHospitals = Array.isArray(record.assignedHospitalIds) ? record.assignedHospitalIds.length : 0;
  const docCount = Number(record.documentCount) || 0;

  let score = caseStageBoost(record.currentStage);
  const signals = [];

  if (record.careNavigatorContext?.source === 'care-navigator') {
    score += 9;
    signals.push('Used AI Care Navigator');
  }
  if (preferredHospitals > 0) {
    score += Math.min(12, preferredHospitals * 4);
    signals.push(`${preferredHospitals} preferred hospital${preferredHospitals === 1 ? '' : 's'}`);
  }
  if (docCount > 0) {
    score += 10;
    signals.push('Uploaded case documents');
  }
  if (assignedHospitals > 0) {
    score += 10;
    signals.push('Hospital assigned');
  }
  if (record.coordinatorId) {
    score += 6;
    signals.push('Coordinator assigned');
  }
  if (record.status === 'awaiting_patient') {
    score += 12;
    signals.push('Waiting for patient response');
  }
  if (record.status === 'waiting_partner') {
    score += 8;
    signals.push('Waiting for provider/partner');
  }
  if (staleDays !== null) {
    if (staleDays >= 14) score -= 14;
    else if (staleDays >= 7) score -= 8;
    else if (staleDays <= 1) score += 8;
  }

  score = clamp(score);

  const recoverable = active && !['treatment', 'follow_up'].includes(record.currentStage) && (
    record.status === 'awaiting_patient' ||
    record.status === 'waiting_partner' ||
    !record.coordinatorId ||
    (staleDays !== null && staleDays >= 3)
  );

  const name = firstName(record.patientName);
  const caseNumber = record.caseNumber || 'your CareAtlas case';
  const draft = `${name ? `Hi ${name},` : 'Hello,'}\n\nWe are checking in on ${caseNumber}. Your CareAtlas journey is still open, and our team can help you with the next step. Please open your CareAtlas portal to review the latest status and messages. If you would like to continue, reply in CareAtlas Messages and your coordinator can assist.\n\nRegards,\nCareAtlas Care Team`;

  return {
    type: 'case',
    id: record.id || '',
    caseId: record.id || '',
    caseNumber: record.caseNumber || '',
    patientId: record.patientId || '',
    patientName: record.patientName || 'Patient',
    patientCountry: record.patientCountry || '',
    treatmentName: record.treatmentName || 'Treatment request',
    stage: record.currentStage || 'case_submitted',
    status: record.status || 'submitted',
    score,
    band: band(score),
    staleDays,
    recoverable,
    recoveryReason: recoverable ? caseRecoveryReason(record, staleDays) : '',
    signals,
    campaign: safeText(record.campaign || '', 48),
    source: record.careNavigatorContext?.source === 'care-navigator' ? 'care-navigator' : safeText(record.source || 'web', 48),
    draft,
    updatedAt: record.updatedAt || record.createdAt || record.submittedAt || null
  };
}

export function analyzePartnerLeadGrowthOpportunity(lead, options = {}) {
  const now = options.now || Date.now();
  const row = lead || {};
  const staleDays = daysSince(row.updatedAt || row.createdAt, now);
  const status = row.status || 'new';
  let score = ({ new: 32, contacted: 45, qualified: 78, converted: 100, closed: 5 })[status] ?? 25;
  const signals = [];

  if (row.contactConsent === true) {
    score += 8;
    signals.push('Contact consent recorded');
  }
  if (safeText(row.treatmentInterest, 120)) {
    score += 8;
    signals.push('Treatment interest provided');
  }
  if (safeText(row.country, 80)) {
    score += 4;
    signals.push('Country provided');
  }
  if (safeText(row.campaign, 48)) {
    score += 5;
    signals.push(`Campaign: ${row.campaign}`);
  }
  if (staleDays !== null) {
    if (status === 'new' && staleDays >= 2) score += 10;
    if (status === 'qualified' && staleDays >= 3) score += 8;
    if (staleDays >= 14) score -= 12;
  }

  score = clamp(score);
  const actionable = !['converted', 'closed'].includes(status) && row.contactConsent === true;
  const recoverable = actionable && (
    (status === 'new' && staleDays !== null && staleDays >= 1) ||
    (status === 'contacted' && staleDays !== null && staleDays >= 3) ||
    (status === 'qualified' && staleDays !== null && staleDays >= 2)
  );

  const name = firstName(row.firstName);
  const interest = safeText(row.treatmentInterest, 120);
  const draft = `${name ? `Hi ${name},` : 'Hello,'}\n\nYou previously asked CareAtlas to contact you${interest ? ` about ${interest}` : ' about international healthcare options'}. If you are still interested, reply to this message and our care team can explain the next steps and help you start a CareAtlas case.\n\nRegards,\nCareAtlas Care Team`;

  return {
    type: 'partner_lead',
    id: row.id || '',
    partnerId: row.partnerId || '',
    firstName: row.firstName || 'Lead',
    country: row.country || '',
    treatmentInterest: row.treatmentInterest || '',
    contactMethod: row.contactMethod || '',
    contactValue: row.contactValue || '',
    contactConsent: row.contactConsent === true,
    status,
    score,
    band: band(score),
    staleDays,
    recoverable,
    recoveryReason: recoverable ? `${titleCase(status)} lead has had no recent progress` : '',
    signals,
    campaign: safeText(row.campaign || '', 48) || 'direct',
    source: row.source || 'partner_web',
    draft,
    updatedAt: row.updatedAt || row.createdAt || null
  };
}

export function analyzeNavigatorOpportunity(run, patientCaseIds = new Set(), options = {}) {
  const now = options.now || Date.now();
  const row = run || {};
  const patientId = row.patientId || row.userId || '';
  const staleDays = daysSince(row.createdAt || row.generatedAt, now);
  const results = Array.isArray(row.matchSummaries) ? row.matchSummaries : (Array.isArray(row.results) ? row.results : []);
  const shortlist = Array.isArray(row.shortlistedHospitalIds) ? row.shortlistedHospitalIds : [];
  const hasCase = patientId && patientCaseIds.has(patientId);
  let score = 24;
  if (shortlist.length) score += 25;
  else if (results.length) score += 10;
  if (staleDays !== null && staleDays <= 2) score += 15;
  else if (staleDays !== null && staleDays <= 7) score += 8;
  if (hasCase) score = 10;
  score = clamp(score);

  return {
    type: 'navigator',
    id: row.id || '',
    patientId,
    specialtyId: row.specialtyId || row.input?.specialtyId || '',
    treatmentSlug: row.treatmentSlug || row.input?.treatmentSlug || '',
    shortlistCount: shortlist.length,
    resultCount: results.length,
    score,
    band: band(score),
    staleDays,
    converted: Boolean(hasCase),
    recoverable: !hasCase && Boolean(patientId) && (shortlist.length > 0 || results.length > 0) && (staleDays === null || staleDays <= 14),
    source: 'care-navigator',
    updatedAt: row.createdAt || row.generatedAt || null
  };
}

function stageRank(stage) {
  return ({
    case_submitted: 1,
    records_review: 2,
    hospital_matching: 3,
    treatment_plans: 4,
    consultation: 5,
    hospital_selected: 6,
    travel_preparation: 7,
    treatment: 8,
    follow_up: 9
  })[stage] || 0;
}

export function buildGrowthFunnel(cases = []) {
  const active = cases.filter(row => row.status !== 'cancelled');
  const total = active.length;
  const steps = [
    ['case_created', 'Cases created', 1],
    ['records_review', 'Reached records review', 2],
    ['hospital_matching', 'Reached hospital matching', 3],
    ['treatment_plans', 'Reached treatment plans', 4],
    ['consultation', 'Reached consultation', 5],
    ['hospital_selected', 'Selected a hospital', 6],
    ['treatment', 'Reached treatment', 8]
  ];
  return steps.map(([id, label, minRank], index) => {
    const count = active.filter(row => stageRank(row.currentStage) >= minRank).length;
    return {
      id,
      label,
      count,
      rateFromStart: total ? Math.round((count / total) * 100) : 0,
      dropFromPrevious: index === 0 ? 0 : 0
    };
  }).map((row, index, rows) => ({
    ...row,
    dropFromPrevious: index === 0 ? 0 : Math.max(0, rows[index - 1].count - row.count)
  }));
}

export function buildCampaignPerformance({ partnerLeads = [], referrals = [] } = {}) {
  const map = new Map();
  function rowFor(campaign) {
    const key = safeText(campaign, 48) || 'direct';
    if (!map.has(key)) map.set(key, { campaign: key, leads: 0, referredCases: 0, qualified: 0, treatmentVerified: 0, selfReferrals: 0 });
    return map.get(key);
  }

  partnerLeads.forEach(lead => {
    const row = rowFor(lead.campaign);
    row.leads += 1;
    if (['qualified', 'converted'].includes(lead.status)) row.qualified += 1;
  });

  referrals.forEach(referral => {
    const row = rowFor(referral.campaign);
    row.referredCases += 1;
    if (!['case_created', 'closed_lost'].includes(referral.referralStatus)) row.qualified += 1;
    if (referral.referralStatus === 'treatment_verified') row.treatmentVerified += 1;
    if (referral.selfReferral) row.selfReferrals += 1;
  });

  return [...map.values()].map(row => ({
    ...row,
    totalIntroductions: row.leads + row.referredCases,
    verifiedRate: row.referredCases ? Math.round((row.treatmentVerified / row.referredCases) * 100) : 0
  })).sort((a, b) => b.totalIntroductions - a.totalIntroductions || a.campaign.localeCompare(b.campaign));
}

export function buildGrowthWorkspace({ cases = [], partnerLeads = [], referrals = [], careMatchRuns = [] } = {}, options = {}) {
  const patientCaseIds = new Set(cases.map(row => row.patientId).filter(Boolean));
  const caseOpportunities = cases.map(row => analyzeCaseGrowthOpportunity(row, options));
  const leadOpportunities = partnerLeads.map(row => analyzePartnerLeadGrowthOpportunity(row, options));
  const navigatorOpportunities = careMatchRuns.map(row => analyzeNavigatorOpportunity(row, patientCaseIds, options));

  const opportunities = [...caseOpportunities, ...leadOpportunities, ...navigatorOpportunities]
    .filter(row => row.recoverable)
    .sort((a, b) => b.score - a.score || (b.staleDays || 0) - (a.staleDays || 0));

  const activeCases = caseOpportunities.filter(row => !FINAL_CASE_STATUSES.has(row.status));
  const hot = opportunities.filter(row => row.band === 'hot').length;
  const warm = opportunities.filter(row => row.band === 'warm').length;
  const abandoned = caseOpportunities.filter(row => row.recoverable && Number(row.staleDays) >= 7).length;
  const navigatorUnconverted = navigatorOpportunities.filter(row => row.recoverable).length;

  return {
    algorithmVersion: GROWTH_ENGINE_VERSION,
    generatedAt: new Date(options.now || Date.now()).toISOString(),
    metrics: {
      activeCases: activeCases.length,
      openPartnerLeads: leadOpportunities.filter(row => !['converted', 'closed'].includes(row.status)).length,
      hotOpportunities: hot,
      warmOpportunities: warm,
      abandonedCases: abandoned,
      navigatorUnconverted
    },
    opportunities,
    caseOpportunities,
    leadOpportunities,
    navigatorOpportunities,
    funnel: buildGrowthFunnel(cases),
    campaigns: buildCampaignPerformance({ partnerLeads, referrals }),
    safeguards: {
      usesClinicalSeverity: false,
      usesHospitalCommercials: false,
      autoSendsMessages: false,
      autoChangesCaseStatus: false
    }
  };
}

export function growthBandLabel(value) {
  return ({ hot: 'Hot', warm: 'Warm', watch: 'Watch', low: 'Low' })[value] || 'Watch';
}
