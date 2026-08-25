export const BUSINESS_INTELLIGENCE_VERSION = 'careatlas-8d-2026-08-25-v1';

const RECOGNIZED_CASE_STATUSES = new Set(['invoiced', 'received']);
const COST_BEARING_CASE_STATUSES = new Set(['invoiced', 'received', 'refunded', 'cancelled']);
const FINANCE_RESOLVED_STATUSES = new Set(['invoiced', 'received', 'refunded', 'cancelled']);
const ACTIVE_COMMISSION_STATUSES = new Set(['pending', 'approved', 'on_hold', 'paid']);
const TREATMENT_STAGES = new Set(['treatment', 'follow_up']);

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rounded(value) {
  return Math.round((number(value) + Number.EPSILON) * 100) / 100;
}

function currencyOf(value, fallback = 'USD') {
  return String(value || fallback).trim().toUpperCase().slice(0, 8) || fallback;
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function isTreatmentStage(record) {
  return TREATMENT_STAGES.has(record?.currentStage) || record?.status === 'completed';
}

function ratio(numerator, denominator) {
  return denominator > 0 ? rounded((numerator / denominator) * 100) : null;
}

function groupBy(rows, keyOf) {
  const map = new Map();
  for (const row of rows || []) {
    const key = keyOf(row);
    if (!key) continue;
    const list = map.get(key) || [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

function caseLabel(record) {
  return record?.caseNumber || record?.id || 'Case';
}

function treatmentLabel(record) {
  return record?.treatmentName || record?.treatmentSlug || 'Unspecified treatment';
}

function countryFromCase(record, hospitalMap) {
  const assigned = unique(record?.assignedHospitalIds || []);
  const countries = unique(assigned.map(id => hospitalMap.get(id)?.country).filter(Boolean));
  if (countries.length === 1) return countries[0];
  const preferred = unique(record?.preferredDestinationSlugs || []);
  if (preferred.length === 1) return preferred[0].replace(/\b\w/g, c => c.toUpperCase());
  return '';
}

function caseAttributionHospitalId(record, financeRecord) {
  if (financeRecord?.hospitalId) return financeRecord.hospitalId;
  const assigned = unique(record?.assignedHospitalIds || []);
  return assigned.length === 1 ? assigned[0] : '';
}

function isRecognizedFinance(row, reportingCurrency) {
  return RECOGNIZED_CASE_STATUSES.has(row?.status) && currencyOf(row?.currency) === reportingCurrency;
}

function commissionEligible(row, reportingCurrency) {
  return ACTIVE_COMMISSION_STATUSES.has(row?.status) && currencyOf(row?.currency, 'INR') === reportingCurrency;
}

function completedStay(row, reportingCurrency) {
  return row?.status === 'completed' && currencyOf(row?.currency, 'INR') === reportingCurrency;
}

function financialStatusLabel(status) {
  return ({
    forecast: 'Forecast',
    invoiced: 'Invoiced',
    received: 'Received',
    refunded: 'Refunded',
    cancelled: 'Cancelled'
  })[status] || 'Not recorded';
}

export function buildBusinessIntelligenceWorkspace({
  cases = [],
  hospitals = [],
  hospitalCommercials = [],
  treatmentPlans = [],
  consultations = [],
  caseFinancials = [],
  commissions = [],
  referrals = [],
  partners = [],
  hotels = [],
  hotelBookings = [],
  currency = 'USD'
} = {}) {
  const reportingCurrency = currencyOf(currency);
  const caseMap = new Map(cases.map(row => [row.id || row.caseId, row]));
  const hospitalMap = new Map(hospitals.map(row => [row.id || row.hospitalId, row]));
  const hotelMap = new Map(hotels.map(row => [row.id || row.hotelId, row]));
  const partnerMap = new Map(partners.map(row => [row.id || row.partnerId, row]));
  const financeByCase = new Map(caseFinancials.map(row => [row.caseId || row.id, row]));

  const currencies = unique([
    reportingCurrency,
    ...caseFinancials.map(row => currencyOf(row.currency)),
    ...commissions.map(row => currencyOf(row.currency, 'INR')),
    ...hotelBookings.map(row => currencyOf(row.currency, 'INR')),
    ...treatmentPlans.map(row => currencyOf(row.currency))
  ]).sort();

  const recognizedFinance = caseFinancials.filter(row => isRecognizedFinance(row, reportingCurrency));
  const costBearingFinance = caseFinancials.filter(row => COST_BEARING_CASE_STATUSES.has(row.status) && currencyOf(row.currency) === reportingCurrency);
  const forecastFinance = caseFinancials.filter(row => row.status === 'forecast' && currencyOf(row.currency) === reportingCurrency);
  const activeCommissions = commissions.filter(row => commissionEligible(row, reportingCurrency));
  const completedBookings = hotelBookings.filter(row => completedStay(row, reportingCurrency));
  const recognizedFinanceCaseIds = new Set(recognizedFinance.map(row => row.caseId));

  // Referral commissions already require treatment verification and record CareAtlas revenue.
  // Use that revenue only as a fallback when the same case has no canonical caseFinancial record.
  const commissionRevenueFallbackRows = activeCommissions.filter(row =>
    number(row.careAtlasRevenue) > 0 && !recognizedFinanceCaseIds.has(row.caseId)
  );

  const caseRevenue = rounded(recognizedFinance.reduce((sum, row) => sum + number(row.careAtlasRevenue), 0));
  const referralRevenueFallback = rounded(commissionRevenueFallbackRows.reduce((sum, row) => sum + number(row.careAtlasRevenue), 0));
  const stayRevenue = rounded(completedBookings.reduce((sum, row) => sum + number(row.careAtlasCommissionAmount), 0));
  const recognizedRevenue = rounded(caseRevenue + referralRevenueFallback + stayRevenue);
  const forecastRevenue = rounded(forecastFinance.reduce((sum, row) => sum + number(row.careAtlasRevenue), 0));
  const treatmentValue = rounded(recognizedFinance.reduce((sum, row) => sum + number(row.treatmentValue), 0));
  const directCosts = rounded(costBearingFinance.reduce((sum, row) => sum + number(row.directCost), 0));
  const affiliateCommissionCost = rounded(activeCommissions.reduce((sum, row) => sum + number(row.amount), 0));
  const netContribution = rounded(recognizedRevenue - directCosts - affiliateCommissionCost);
  const caseCashReceived = rounded(recognizedFinance.filter(row => row.status === 'received').reduce((sum, row) => sum + number(row.careAtlasRevenue), 0));

  const treatmentStageCases = cases.filter(isTreatmentStage);
  const financiallyCoveredCaseIds = new Set([
    ...caseFinancials.filter(row => FINANCE_RESOLVED_STATUSES.has(row.status)).map(row => row.caseId),
    ...commissionRevenueFallbackRows.map(row => row.caseId)
  ]);
  const treatmentStageFinanceCovered = treatmentStageCases.filter(row => financiallyCoveredCaseIds.has(row.id || row.caseId)).length;

  const commercialMap = new Map(hospitalCommercials.map(row => [row.id || row.hospitalId, row]));
  const activeHospitals = hospitals.filter(row => row.status !== 'suspended' && row.marketplaceStatus === 'published');
  const configuredCommercials = activeHospitals.filter(row => {
    const commercial = commercialMap.get(row.id || row.hospitalId);
    return commercial && commercial.model && commercial.model !== 'not_configured';
  });
  const signedCommercials = activeHospitals.filter(row => commercialMap.get(row.id || row.hospitalId)?.contractStatus === 'signed');

  const plansByHospital = groupBy(treatmentPlans, row => row.hospitalId);
  const consultationsByHospital = groupBy(consultations, row => row.hospitalId);

  const hospitalPerformance = activeHospitals.map(hospital => {
    const hospitalId = hospital.id || hospital.hospitalId;
    const assignedCases = cases.filter(row => (row.assignedHospitalIds || []).includes(hospitalId));
    const assignedIds = new Set(assignedCases.map(row => row.id || row.caseId));
    const planCaseIds = new Set((plansByHospital.get(hospitalId) || []).map(row => row.caseId).filter(id => assignedIds.has(id)));
    const consultationCaseIds = new Set((consultationsByHospital.get(hospitalId) || []).map(row => row.caseId).filter(id => assignedIds.has(id)));
    const treatmentAssociated = assignedCases.filter(isTreatmentStage);

    const financeRows = recognizedFinance.filter(row => row.hospitalId === hospitalId);
    const costRows = costBearingFinance.filter(row => row.hospitalId === hospitalId);
    const financeIds = new Set(financeRows.map(row => row.caseId));
    const fallbackRows = commissionRevenueFallbackRows.filter(row => {
      const careCase = caseMap.get(row.caseId);
      return caseAttributionHospitalId(careCase, null) === hospitalId && !financeIds.has(row.caseId);
    });
    const revenue = rounded(
      financeRows.reduce((sum, row) => sum + number(row.careAtlasRevenue), 0) +
      fallbackRows.reduce((sum, row) => sum + number(row.careAtlasRevenue), 0)
    );
    const directCost = rounded(costRows.reduce((sum, row) => sum + number(row.directCost), 0));
    const affiliateCost = rounded(activeCommissions.filter(row => {
      const careCase = caseMap.get(row.caseId);
      const finance = financeByCase.get(row.caseId);
      return caseAttributionHospitalId(careCase, finance) === hospitalId;
    }).reduce((sum, row) => sum + number(row.amount), 0));

    return {
      hospitalId,
      name: hospital.name || hospital.propertyName || hospitalId,
      country: hospital.country || '',
      assignedCases: assignedCases.length,
      treatmentPlanCases: planCaseIds.size,
      consultationCases: consultationCaseIds.size,
      treatmentStageCases: treatmentAssociated.length,
      treatmentPlanRate: ratio(planCaseIds.size, assignedCases.length),
      treatmentStageRate: ratio(treatmentAssociated.length, assignedCases.length),
      revenue,
      directCost,
      affiliateCost,
      netContribution: rounded(revenue - directCost - affiliateCost),
      commercialModel: commercialMap.get(hospitalId)?.model || 'not_configured',
      contractStatus: commercialMap.get(hospitalId)?.contractStatus || 'draft'
    };
  }).sort((a, b) => b.revenue - a.revenue || b.treatmentStageCases - a.treatmentStageCases || b.assignedCases - a.assignedCases);

  const referralRowsByPartner = groupBy(referrals, row => row.partnerId);
  const commissionRowsByPartner = groupBy(activeCommissions, row => row.partnerId);
  const affiliatePerformance = unique([
    ...referrals.map(row => row.partnerId),
    ...activeCommissions.map(row => row.partnerId)
  ]).map(partnerId => {
    const partnerReferrals = referralRowsByPartner.get(partnerId) || [];
    const partnerCommissions = commissionRowsByPartner.get(partnerId) || [];
    const revenue = rounded(partnerCommissions.reduce((sum, row) => sum + number(row.careAtlasRevenue), 0));
    const commissionCost = rounded(partnerCommissions.reduce((sum, row) => sum + number(row.amount), 0));
    const retainedRevenue = rounded(revenue - commissionCost);
    return {
      partnerId,
      name: partnerMap.get(partnerId)?.displayName || partnerMap.get(partnerId)?.organization || partnerMap.get(partnerId)?.email || partnerId,
      referrals: partnerReferrals.length,
      treatmentVerified: partnerReferrals.filter(row => row.referralStatus === 'treatment_verified').length,
      revenue,
      commissionCost,
      retainedRevenue,
      roiPct: commissionCost > 0 ? rounded((retainedRevenue / commissionCost) * 100) : null,
      revenuePerCommission: commissionCost > 0 ? rounded(revenue / commissionCost) : null
    };
  }).sort((a, b) => b.revenue - a.revenue || b.treatmentVerified - a.treatmentVerified);

  const bookingsByHotel = groupBy(completedBookings, row => row.hotelId);
  const stayPerformance = unique(completedBookings.map(row => row.hotelId)).map(hotelId => {
    const rows = bookingsByHotel.get(hotelId) || [];
    const grossBookingValue = rounded(rows.reduce((sum, row) => sum + number(row.totalAmount), 0));
    const revenue = rounded(rows.reduce((sum, row) => sum + number(row.careAtlasCommissionAmount), 0));
    const hotelPayable = rounded(rows.reduce((sum, row) => sum + Math.max(0, number(row.totalAmount) - number(row.careAtlasCommissionAmount)), 0));
    const settledToHotel = rounded(rows.filter(row => row.settlementStatus === 'paid').reduce((sum, row) => sum + Math.max(0, number(row.totalAmount) - number(row.careAtlasCommissionAmount)), 0));
    return {
      hotelId,
      name: hotelMap.get(hotelId)?.propertyName || hotelMap.get(hotelId)?.name || hotelId,
      country: hotelMap.get(hotelId)?.country || '',
      completedStays: rows.length,
      roomNights: rows.reduce((sum, row) => sum + number(row.nights), 0),
      grossBookingValue,
      revenue,
      hotelPayable,
      settledToHotel,
      pendingSettlement: rounded(hotelPayable - settledToHotel),
      effectiveCommissionRatePct: grossBookingValue > 0 ? rounded((revenue / grossBookingValue) * 100) : null
    };
  }).sort((a, b) => b.revenue - a.revenue || b.completedStays - a.completedStays);

  const destinationBuckets = new Map();
  function destinationBucket(country) {
    const key = String(country || '').trim() || 'Unattributed';
    if (!destinationBuckets.has(key)) destinationBuckets.set(key, { country: key, caseRevenue: 0, stayRevenue: 0, directCost: 0, affiliateCost: 0, cases: new Set(), treatmentCases: new Set() });
    return destinationBuckets.get(key);
  }

  for (const finance of recognizedFinance) {
    const careCase = caseMap.get(finance.caseId);
    const hospital = hospitalMap.get(finance.hospitalId);
    const country = finance.destinationCountry || hospital?.country || countryFromCase(careCase, hospitalMap);
    const bucket = destinationBucket(country);
    bucket.caseRevenue += number(finance.careAtlasRevenue);
    if (careCase) {
      bucket.cases.add(careCase.id || careCase.caseId);
      if (isTreatmentStage(careCase)) bucket.treatmentCases.add(careCase.id || careCase.caseId);
    }
  }
  for (const finance of costBearingFinance) {
    const careCase = caseMap.get(finance.caseId);
    const hospital = hospitalMap.get(finance.hospitalId);
    const country = finance.destinationCountry || hospital?.country || countryFromCase(careCase, hospitalMap);
    const bucket = destinationBucket(country);
    bucket.directCost += number(finance.directCost);
    if (careCase) {
      bucket.cases.add(careCase.id || careCase.caseId);
      if (isTreatmentStage(careCase)) bucket.treatmentCases.add(careCase.id || careCase.caseId);
    }
  }
  for (const row of commissionRevenueFallbackRows) {
    const careCase = caseMap.get(row.caseId);
    const hospitalId = caseAttributionHospitalId(careCase, null);
    const country = hospitalMap.get(hospitalId)?.country || countryFromCase(careCase, hospitalMap);
    const bucket = destinationBucket(country);
    bucket.caseRevenue += number(row.careAtlasRevenue);
    if (careCase) {
      bucket.cases.add(careCase.id || careCase.caseId);
      if (isTreatmentStage(careCase)) bucket.treatmentCases.add(careCase.id || careCase.caseId);
    }
  }
  for (const commission of activeCommissions) {
    const careCase = caseMap.get(commission.caseId);
    const finance = financeByCase.get(commission.caseId);
    const hospitalId = caseAttributionHospitalId(careCase, finance);
    const country = finance?.destinationCountry || hospitalMap.get(hospitalId)?.country || countryFromCase(careCase, hospitalMap);
    destinationBucket(country).affiliateCost += number(commission.amount);
  }
  for (const booking of completedBookings) {
    const country = hotelMap.get(booking.hotelId)?.country || '';
    const bucket = destinationBucket(country);
    bucket.stayRevenue += number(booking.careAtlasCommissionAmount);
    if (booking.caseId) bucket.cases.add(booking.caseId);
  }

  const destinationPerformance = Array.from(destinationBuckets.values()).map(bucket => ({
    country: bucket.country,
    cases: bucket.cases.size,
    treatmentStageCases: bucket.treatmentCases.size,
    caseRevenue: rounded(bucket.caseRevenue),
    stayRevenue: rounded(bucket.stayRevenue),
    revenue: rounded(bucket.caseRevenue + bucket.stayRevenue),
    directCost: rounded(bucket.directCost),
    affiliateCost: rounded(bucket.affiliateCost),
    netContribution: rounded(bucket.caseRevenue + bucket.stayRevenue - bucket.directCost - bucket.affiliateCost)
  })).sort((a, b) => b.revenue - a.revenue || b.cases - a.cases);

  const treatmentBuckets = new Map();
  function treatmentBucket(label) {
    const key = label || 'Unspecified treatment';
    if (!treatmentBuckets.has(key)) treatmentBuckets.set(key, { treatment: key, cases: new Set(), treatmentCases: new Set(), caseRevenue: 0, stayRevenue: 0, directCost: 0, affiliateCost: 0 });
    return treatmentBuckets.get(key);
  }
  for (const careCase of cases) {
    const bucket = treatmentBucket(treatmentLabel(careCase));
    bucket.cases.add(careCase.id || careCase.caseId);
    if (isTreatmentStage(careCase)) bucket.treatmentCases.add(careCase.id || careCase.caseId);
  }
  for (const finance of recognizedFinance) {
    const careCase = caseMap.get(finance.caseId);
    const bucket = treatmentBucket(finance.treatmentName || treatmentLabel(careCase));
    bucket.caseRevenue += number(finance.careAtlasRevenue);
  }
  for (const finance of costBearingFinance) {
    const careCase = caseMap.get(finance.caseId);
    treatmentBucket(finance.treatmentName || treatmentLabel(careCase)).directCost += number(finance.directCost);
  }
  for (const row of commissionRevenueFallbackRows) {
    const careCase = caseMap.get(row.caseId);
    treatmentBucket(row.treatmentName || treatmentLabel(careCase)).caseRevenue += number(row.careAtlasRevenue);
  }
  for (const commission of activeCommissions) {
    const careCase = caseMap.get(commission.caseId);
    treatmentBucket(commission.treatmentName || treatmentLabel(careCase)).affiliateCost += number(commission.amount);
  }
  for (const booking of completedBookings) {
    const careCase = caseMap.get(booking.caseId);
    treatmentBucket(treatmentLabel(careCase)).stayRevenue += number(booking.careAtlasCommissionAmount);
  }

  const treatmentPerformance = Array.from(treatmentBuckets.values()).map(bucket => ({
    treatment: bucket.treatment,
    cases: bucket.cases.size,
    treatmentStageCases: bucket.treatmentCases.size,
    treatmentStageRate: ratio(bucket.treatmentCases.size, bucket.cases.size),
    caseRevenue: rounded(bucket.caseRevenue),
    stayRevenue: rounded(bucket.stayRevenue),
    revenue: rounded(bucket.caseRevenue + bucket.stayRevenue),
    directCost: rounded(bucket.directCost),
    affiliateCost: rounded(bucket.affiliateCost),
    netContribution: rounded(bucket.caseRevenue + bucket.stayRevenue - bucket.directCost - bucket.affiliateCost)
  })).sort((a, b) => b.revenue - a.revenue || b.treatmentStageCases - a.treatmentStageCases || b.cases - a.cases);

  const financeQueue = treatmentStageCases.map(careCase => {
    const finance = financeByCase.get(careCase.id || careCase.caseId) || null;
    const commissionFallback = commissionRevenueFallbackRows.find(row => row.caseId === (careCase.id || careCase.caseId)) || null;
    return {
      caseId: careCase.id || careCase.caseId,
      caseNumber: caseLabel(careCase),
      treatmentName: treatmentLabel(careCase),
      patientCountry: careCase.patientCountry || '',
      assignedHospitalIds: unique(careCase.assignedHospitalIds || []),
      financeStatus: finance?.status || (commissionFallback ? 'affiliate_ledger_only' : 'missing'),
      financeStatusLabel: finance ? financialStatusLabel(finance.status) : (commissionFallback ? 'Affiliate ledger only' : 'Missing'),
      currency: finance?.currency || commissionFallback?.currency || '',
      revenue: finance ? number(finance.careAtlasRevenue) : number(commissionFallback?.careAtlasRevenue),
      needsCanonicalFinance: !finance || !FINANCE_RESOLVED_STATUSES.has(finance.status)
    };
  }).sort((a, b) => Number(b.needsCanonicalFinance) - Number(a.needsCanonicalFinance) || a.caseNumber.localeCompare(b.caseNumber));

  const warnings = [];
  const missingFinance = financeQueue.filter(row => row.financeStatus === 'missing').length;
  const affiliateOnly = financeQueue.filter(row => row.financeStatus === 'affiliate_ledger_only').length;
  const ambiguousHospitalAttribution = treatmentStageCases.filter(row => unique(row.assignedHospitalIds || []).length > 1 && !financeByCase.get(row.id || row.caseId)?.hospitalId).length;
  const completedStayMissingCommission = hotelBookings.filter(row => row.status === 'completed' && (row.careAtlasCommissionAmount === null || row.careAtlasCommissionAmount === undefined)).length;
  const commissionMissingRevenue = commissions.filter(row => ACTIVE_COMMISSION_STATUSES.has(row.status) && number(row.careAtlasRevenue) <= 0).length;
  const unattributedFinance = recognizedFinance.filter(row => !row.destinationCountry && !hospitalMap.get(row.hospitalId)?.country).length;
  const missingSignedCommercial = activeHospitals.length - signedCommercials.length;

  if (missingFinance) warnings.push({ severity: 'high', code: 'missing_case_finance', count: missingFinance, message: `${missingFinance} treatment-stage case${missingFinance === 1 ? ' has' : 's have'} no finance record.` });
  if (affiliateOnly) warnings.push({ severity: 'medium', code: 'affiliate_ledger_only', count: affiliateOnly, message: `${affiliateOnly} treatment-stage case${affiliateOnly === 1 ? ' relies' : 's rely'} on affiliate commission ledgers for revenue attribution.` });
  if (ambiguousHospitalAttribution) warnings.push({ severity: 'medium', code: 'ambiguous_hospital', count: ambiguousHospitalAttribution, message: `${ambiguousHospitalAttribution} treatment-stage case${ambiguousHospitalAttribution === 1 ? ' is' : 's are'} assigned to multiple hospitals without canonical finance attribution.` });
  if (completedStayMissingCommission) warnings.push({ severity: 'high', code: 'stay_commission_missing', count: completedStayMissingCommission, message: `${completedStayMissingCommission} completed stay${completedStayMissingCommission === 1 ? ' is' : 's are'} missing a CareAtlas commission amount.` });
  if (commissionMissingRevenue) warnings.push({ severity: 'medium', code: 'affiliate_revenue_missing', count: commissionMissingRevenue, message: `${commissionMissingRevenue} affiliate commission ledger${commissionMissingRevenue === 1 ? ' has' : 's have'} no recorded CareAtlas revenue.` });
  if (unattributedFinance) warnings.push({ severity: 'medium', code: 'destination_attribution_missing', count: unattributedFinance, message: `${unattributedFinance} recognized case finance record${unattributedFinance === 1 ? '' : 's'} cannot be attributed to a destination country.` });
  if (missingSignedCommercial > 0) warnings.push({ severity: 'info', code: 'commercial_contract_gap', count: missingSignedCommercial, message: `${missingSignedCommercial} published hospital${missingSignedCommercial === 1 ? ' does' : 's do'} not have a signed commercial contract recorded.` });

  return {
    algorithmVersion: BUSINESS_INTELLIGENCE_VERSION,
    reportingCurrency,
    currencies,
    headline: {
      recognizedRevenue,
      caseRevenue,
      referralRevenueFallback,
      stayRevenue,
      forecastRevenue,
      caseCashReceived,
      treatmentValue,
      directCosts,
      affiliateCommissionCost,
      netContribution,
      contributionMarginPct: recognizedRevenue > 0 ? rounded((netContribution / recognizedRevenue) * 100) : null,
      treatmentStageCases: treatmentStageCases.length,
      treatmentStageFinanceCovered,
      financeCoveragePct: ratio(treatmentStageFinanceCovered, treatmentStageCases.length),
      publishedHospitals: activeHospitals.length,
      configuredCommercials: configuredCommercials.length,
      signedCommercials: signedCommercials.length,
      completedStays: completedBookings.length
    },
    hospitalPerformance,
    affiliatePerformance,
    stayPerformance,
    destinationPerformance,
    treatmentPerformance,
    financeQueue,
    warnings,
    sourceCounts: {
      cases: cases.length,
      hospitals: hospitals.length,
      hospitalCommercials: hospitalCommercials.length,
      treatmentPlans: treatmentPlans.length,
      consultations: consultations.length,
      caseFinancials: caseFinancials.length,
      commissions: commissions.length,
      referrals: referrals.length,
      partners: partners.length,
      hotels: hotels.length,
      hotelBookings: hotelBookings.length
    }
  };
}
