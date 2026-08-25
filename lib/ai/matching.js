import { treatments as catalogueTreatments } from '@/lib/data';

export const MATCH_ALGORITHM_VERSION = 'careatlas-8a-2026-08-25-v1';

export const MATCH_PRIORITIES = Object.freeze([
  { id: 'visa', label: 'Visa support', keywords: ['visa'] },
  { id: 'stay', label: 'Hotel / stay support', keywords: ['hotel', 'accommodation', 'stay'] },
  { id: 'airport', label: 'Airport transfer', keywords: ['airport', 'pickup', 'transfer', 'transport'] },
  { id: 'interpreter', label: 'Interpreter support', keywords: ['interpreter', 'translation', 'language'] },
  { id: 'teleconsultation', label: 'Teleconsultation', keywords: ['teleconsult', 'virtual', 'video consultation', 'video consult'] }
]);

export const BUDGET_BANDS = Object.freeze([
  { id: 'not_sure', label: 'Not sure yet', maxUsd: null },
  { id: 'under_5000', label: 'Under $5,000', maxUsd: 5000 },
  { id: '5000_10000', label: '$5,000–$10,000', maxUsd: 10000 },
  { id: '10000_20000', label: '$10,000–$20,000', maxUsd: 20000 },
  { id: '20000_plus', label: '$20,000+', maxUsd: null }
]);

const controlledAliases = Object.freeze({
  cardiology: ['heart', 'cardiac', 'cardiology', 'bypass', 'cabg', 'angioplasty', 'valve'],
  orthopaedics: ['orthopedic', 'orthopaedic', 'orthopedics', 'orthopaedics', 'knee replacement', 'hip replacement', 'joint replacement'],
  oncology: ['oncology', 'cancer', 'chemotherapy', 'radiation therapy', 'radiotherapy'],
  neurology: ['neurology', 'neurological', 'brain surgery', 'neurosurgery'],
  'spine-surgery': ['spine surgery', 'spinal surgery', 'spine fusion', 'decompression'],
  'ivf-fertility': ['ivf', 'fertility', 'reproductive medicine'],
  dental: ['dental', 'dentistry', 'dental implant', 'dental implants'],
  'cosmetic-surgery': ['cosmetic surgery', 'plastic surgery', 'reconstructive surgery'],
  gastroenterology: ['gastroenterology', 'digestive', 'liver care'],
  urology: ['urology', 'prostate'],
  nephrology: ['nephrology', 'kidney care', 'renal'],
  ophthalmology: ['ophthalmology', 'eye surgery', 'vision correction'],
  ent: ['ent', 'ear nose throat'],
  dermatology: ['dermatology', 'skin care'],
  'bariatric-surgery': ['bariatric surgery', 'weight loss surgery'],
  'organ-transplant': ['organ transplant', 'transplant'],
  'health-checkups': ['health checkup', 'health checkups', 'executive health', 'screening']
});

function clean(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/orthopedics/g, 'orthopaedics')
    .replace(/orthopedic/g, 'orthopaedic')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countrySlug(value) {
  const term = normalize(value);
  if (term.includes('united arab emirates') || term === 'uae' || term.includes('dubai') || term.includes('abu dhabi')) return 'uae';
  if (term.includes('india')) return 'india';
  if (term.includes('turkey') || term.includes('turkiye')) return 'turkey';
  if (term.includes('thailand')) return 'thailand';
  return term.replace(/\s+/g, '-');
}

function numericPrice(hospital) {
  const candidates = [hospital?.startingPriceUsd, hospital?.priceUsd, hospital?.price];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) return candidate;
    const parsed = Number(String(candidate || '').replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function serviceText(hospital) {
  return normalize([...(hospital?.services || []), hospital?.description || ''].join(' '));
}

function profileCompleteness(hospital) {
  const checks = [
    clean(hospital?.description).length >= 40,
    (hospital?.languages || []).length > 0,
    (hospital?.services || []).length > 0,
    Boolean(clean(hospital?.internationalDeskEmail) || clean(hospital?.internationalDeskPhone)),
    Boolean(clean(hospital?.address) || clean(hospital?.city))
  ];
  return checks.filter(Boolean).length / checks.length;
}

function specialtyMatch(hospital, specialtyId, specialtyName) {
  const ids = hospital?.specialtyIds || [];
  if (specialtyId && ids.includes(specialtyId)) return true;
  const names = [...(hospital?.specialtyNames || []), ...(hospital?.specialties || [])].map(normalize);
  const needle = normalize(specialtyName);
  return Boolean(needle && names.some(name => name.includes(needle) || needle.includes(name)));
}

function priceFit(price, budgetBand) {
  if (!price || !budgetBand || budgetBand.id === 'not_sure') return null;
  if (budgetBand.id === '20000_plus') return price >= 12000 ? 1 : 0.85;
  if (!budgetBand.maxUsd) return null;
  if (price <= budgetBand.maxUsd) return 1;
  if (price <= budgetBand.maxUsd * 1.2) return 0.5;
  return 0;
}

export function suggestCareTargets(query, specialties = [], treatments = catalogueTreatments) {
  const term = normalize(query);
  if (!term) return [];
  const results = [];
  specialties.forEach(item => {
    const haystack = normalize(`${item.name} ${item.summary || ''}`);
    const aliases = controlledAliases[item.id] || [];
    const aliasHit = aliases.some(alias => term.includes(normalize(alias)) || normalize(alias).includes(term));
    if (haystack.includes(term) || term.includes(normalize(item.name)) || aliasHit) {
      results.push({ kind: 'specialty', id: item.id, name: item.name, specialtyId: item.id, score: aliasHit ? 3 : 2 });
    }
  });
  treatments.forEach(item => {
    const haystack = normalize(`${item.name} ${item.category} ${item.summary || ''}`);
    if (haystack.includes(term) || term.includes(normalize(item.name))) {
      const specialty = specialties.find(s => {
        const sName = normalize(s.name);
        const cat = normalize(item.category);
        return sName && (cat.includes(sName) || sName.includes(cat));
      });
      results.push({ kind: 'treatment', id: item.slug, name: item.name, specialtyId: specialty?.id || '', treatmentSlug: item.slug, score: 4 });
    }
  });
  return results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 8);
}

export function treatmentsForSpecialty(specialty, treatments = catalogueTreatments) {
  if (!specialty) return [];
  const name = normalize(specialty.name);
  return treatments.filter(item => {
    const category = normalize(item.category);
    if (category.includes(name) || name.includes(category)) return true;
    if (specialty.id === 'orthopaedics') return category.includes('orthopaedic');
    if (specialty.id === 'ivf-fertility') return category.includes('fertility');
    if (specialty.id === 'spine-surgery') return normalize(item.name).includes('spine');
    if (specialty.id === 'dental') return category.includes('dental');
    return false;
  });
}

export function buildHospitalMatches({
  hospitals = [],
  specialtyId,
  specialtyName,
  destinationIds = [],
  preferredLanguages = [],
  priorityIds = [],
  budgetBandId = 'not_sure'
}) {
  const budgetBand = BUDGET_BANDS.find(item => item.id === budgetBandId) || BUDGET_BANDS[0];
  const requestedLanguages = preferredLanguages.map(normalize).filter(Boolean);
  const requestedPriorities = MATCH_PRIORITIES.filter(item => priorityIds.includes(item.id));

  return hospitals
    .filter(hospital => hospital?.marketplaceStatus === 'published' && hospital?.status !== 'suspended' && hospital?.verified !== false)
    .filter(hospital => specialtyMatch(hospital, specialtyId, specialtyName))
    .map(hospital => {
      let points = 0;
      let possible = 0;
      const reasons = [];
      const gaps = [];

      // Clinical fit is intentionally limited to a provider-declared, CareAtlas-approved specialty match.
      // This is NOT a diagnosis or medical suitability determination.
      points += 45;
      possible += 45;
      reasons.push(`CareAtlas-approved ${specialtyName || 'specialty'} capability`);

      points += 10;
      possible += 10;
      reasons.push('Published CareAtlas hospital partner');

      const completeness = profileCompleteness(hospital);
      possible += 10;
      points += Math.round(completeness * 10);
      if (completeness >= 0.8) reasons.push('Strong international-patient profile completeness');
      else gaps.push('Some international-patient profile details are still being completed');

      if (destinationIds.length) {
        possible += 15;
        const destination = countrySlug(hospital.country);
        if (destinationIds.includes(destination)) {
          points += 15;
          reasons.push(`${hospital.country} matches your destination preference`);
        } else {
          gaps.push(`${hospital.country} is outside your selected destinations`);
        }
      }

      if (requestedLanguages.length) {
        possible += 10;
        const hospitalLanguages = (hospital.languages || []).map(normalize);
        const matches = requestedLanguages.filter(language => hospitalLanguages.includes(language));
        if (matches.length) {
          points += 10;
          reasons.push(`Lists your preferred language${matches.length > 1 ? 's' : ''}`);
        } else if (!hospitalLanguages.length) {
          points += 3;
          gaps.push('Language support is not yet fully published');
        } else {
          gaps.push('Preferred language is not currently listed');
        }
      }

      if (requestedPriorities.length) {
        possible += 10;
        const text = serviceText(hospital);
        const supported = requestedPriorities.filter(priority => priority.keywords.some(keyword => text.includes(normalize(keyword))));
        const ratio = supported.length / requestedPriorities.length;
        points += Math.round(ratio * 10);
        if (supported.length) reasons.push(`Matches ${supported.length} of ${requestedPriorities.length} support priorities`);
        if (supported.length < requestedPriorities.length) gaps.push('Some requested travel/support services need confirmation');
      }

      const price = numericPrice(hospital);
      const fit = priceFit(price, budgetBand);
      if (budgetBand.id !== 'not_sure' && fit !== null) {
        possible += 10;
        points += Math.round(fit * 10);
        if (fit >= 0.85) reasons.push('Published starting estimate is broadly within your budget preference');
        else gaps.push('Published starting estimate may be above your stated budget');
      } else if (budgetBand.id !== 'not_sure') {
        gaps.push('Provider-specific price is not published, so budget fit was not scored');
      }

      const score = possible ? Math.round((points / possible) * 100) : 0;
      return {
        hospitalId: hospital.id || hospital.hospitalId,
        hospital,
        score,
        scoreBasis: possible,
        reasons: reasons.slice(0, 5),
        gaps: gaps.slice(0, 4),
        publishedPriceUsd: price,
        algorithmVersion: MATCH_ALGORITHM_VERSION
      };
    })
    .sort((a, b) => b.score - a.score || String(a.hospital.name).localeCompare(String(b.hospital.name)));
}

export function safeMatchSnapshot({ specialtyId, treatmentSlug, destinationIds = [], preferredLanguages = [], priorityIds = [], budgetBandId, matches = [] }) {
  return {
    algorithmVersion: MATCH_ALGORITHM_VERSION,
    specialtyId: clean(specialtyId).slice(0, 100),
    treatmentSlug: clean(treatmentSlug).slice(0, 100),
    destinationIds: destinationIds.map(clean).filter(Boolean).slice(0, 10),
    preferredLanguages: preferredLanguages.map(value => clean(value).slice(0, 60)).filter(Boolean).slice(0, 10),
    priorityIds: priorityIds.map(clean).filter(Boolean).slice(0, 10),
    budgetBandId: clean(budgetBandId || 'not_sure').slice(0, 40),
    shortlistedHospitalIds: matches.slice(0, 5).map(item => item.hospitalId).filter(Boolean),
    matchSummaries: matches.slice(0, 5).map(item => ({
      hospitalId: item.hospitalId,
      score: item.score,
      reasons: item.reasons.slice(0, 4)
    }))
  };
}

export const MATCHING_DISCLOSURE = Object.freeze({
  title: 'Explainable CareAtlas matching',
  body: 'CareAtlas 8A ranks only published hospital partners using approved specialty capability and the preferences you choose. It does not diagnose, predict outcomes or replace a treating clinician.',
  commercialNeutrality: 'CareAtlas commission, affiliate payouts and hospital commercial terms are never used in the ranking.'
});
