export const CORE_SPECIALTIES = [
  { id: 'cardiology', name: 'Cardiology', icon: '🫀', summary: 'Heart, vascular and cardiac surgical care.', featured: true },
  { id: 'orthopaedics', name: 'Orthopaedics', icon: '🦴', summary: 'Joint replacement, sports medicine and musculoskeletal care.', featured: true },
  { id: 'oncology', name: 'Oncology', icon: '🎗️', summary: 'Multidisciplinary cancer diagnosis and treatment.', featured: true },
  { id: 'neurology', name: 'Neurology', icon: '🧠', summary: 'Neurological evaluation, surgery and rehabilitation.', featured: true },
  { id: 'spine-surgery', name: 'Spine Surgery', icon: '🩻', summary: 'Complex and minimally invasive spine care.', featured: true },
  { id: 'ivf-fertility', name: 'IVF & Fertility', icon: '🧬', summary: 'Fertility evaluation, IVF and reproductive medicine.', featured: true },
  { id: 'dental', name: 'Dental', icon: '🦷', summary: 'Implants, restorative and cosmetic dental care.', featured: true },
  { id: 'cosmetic-surgery', name: 'Cosmetic Surgery', icon: '✨', summary: 'Reconstructive and aesthetic procedures.', featured: false },
  { id: 'gastroenterology', name: 'Gastroenterology', icon: '🩺', summary: 'Digestive, liver and gastrointestinal care.', featured: false },
  { id: 'urology', name: 'Urology', icon: '🩺', summary: 'Urinary, prostate and male reproductive care.', featured: false },
  { id: 'nephrology', name: 'Nephrology', icon: '🩺', summary: 'Kidney medicine and renal care.', featured: false },
  { id: 'ophthalmology', name: 'Ophthalmology', icon: '👁️', summary: 'Eye surgery, vision correction and specialist eye care.', featured: false },
  { id: 'ent', name: 'ENT', icon: '👂', summary: 'Ear, nose, throat and head-and-neck care.', featured: false },
  { id: 'dermatology', name: 'Dermatology', icon: '🩺', summary: 'Medical and procedural skin care.', featured: false },
  { id: 'bariatric-surgery', name: 'Bariatric Surgery', icon: '⚕️', summary: 'Metabolic and weight-loss surgery.', featured: false },
  { id: 'organ-transplant', name: 'Organ Transplant', icon: '⚕️', summary: 'Transplant evaluation and specialist transplant pathways.', featured: false },
  { id: 'health-checkups', name: 'Health Checkups', icon: '🧪', summary: 'Preventive screening and executive health assessments.', featured: false }
];

export function specialtySlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function specialtyById(id) {
  return CORE_SPECIALTIES.find(item => item.id === id) || null;
}
