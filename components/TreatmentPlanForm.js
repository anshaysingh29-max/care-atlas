'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, FileText, FileUp, Globe2, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { destinations, treatments } from '@/lib/data';
import { useAuth } from '@/components/AuthProvider';
import { createPatientCase } from '@/lib/firebase/cases';

const PENDING_CASE_KEY = 'careatlas-pending-case';

const steps = [
  ['About you', UserRound],
  ['Medical need', FileText],
  ['Records', FileUp],
  ['Travel', Globe2],
  ['Review', Check]
];

const initialForm = {
  name: '', age: '', gender: '', country: '', phone: '', email: '', language: 'English',
  treatment: 'knee-replacement', diagnosis: '', urgency: 'Exploring options',
  preferredDestinations: [], budget: '', companions: 'Patient + 1 attendant',
  visa: true, accommodation: true, airportPickup: true,
  preferredHospitalIds: [], navigatorSpecialtyId: '', navigatorMatchVersion: ''
};

function prettyBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TreatmentPlanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, patientProfile, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [submittedCase, setSubmittedCase] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [restoredDraft, setRestoredDraft] = useState(false);

  const treatment = useMemo(() => treatments.find(item => item.slug === form.treatment), [form.treatment]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const pending = JSON.parse(window.sessionStorage.getItem(PENDING_CASE_KEY) || 'null');
      if (pending?.form) {
        setForm(prev => ({ ...prev, ...pending.form }));
        setStep(4);
        setRestoredDraft(true);
      }
    } catch {
      window.sessionStorage.removeItem(PENDING_CASE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (searchParams.get('source') !== 'care-navigator') return;
    if (window.sessionStorage.getItem(PENDING_CASE_KEY)) return;
    const treatmentParam = searchParams.get('treatment') || '';
    const validTreatment = treatments.some(item => item.slug === treatmentParam) ? treatmentParam : '';
    const destinationParams = (searchParams.get('destinations') || '').split(',').map(item => item.trim()).filter(item => destinations.some(destination => destination.slug === item));
    const hospitalId = (searchParams.get('hospital') || '').trim();
    setForm(prev => ({
      ...prev,
      treatment: validTreatment || prev.treatment,
      preferredDestinations: destinationParams.length ? destinationParams : prev.preferredDestinations,
      preferredHospitalIds: hospitalId ? [hospitalId] : prev.preferredHospitalIds,
      navigatorSpecialtyId: (searchParams.get('specialty') || '').trim(),
      navigatorMatchVersion: (searchParams.get('matchVersion') || '').trim()
    }));
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    setForm(prev => ({
      ...prev,
      name: prev.name || patientProfile?.displayName || user.displayName || '',
      email: user.email || prev.email,
      country: prev.country || patientProfile?.country || '',
      phone: prev.phone || patientProfile?.phone || '',
      language: prev.language || patientProfile?.preferredLanguage || 'English'
    }));
  }, [user, patientProfile]);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setSubmitError('');
  }

  function toggleDestination(slug) {
    setForm(prev => ({
      ...prev,
      preferredDestinations: prev.preferredDestinations.includes(slug)
        ? prev.preferredDestinations.filter(item => item !== slug)
        : [...prev.preferredDestinations, slug]
    }));
  }

  function addFiles(event) {
    const incoming = Array.from(event.target.files || []).slice(0, 8);
    const safeMeta = incoming.map(file => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: file.type || 'File'
    }));
    setFiles(prev => [...prev, ...safeMeta].slice(0, 8));
    event.target.value = '';
  }

  function removeFile(id) {
    setFiles(prev => prev.filter(file => file.id !== id));
  }

  function canContinue() {
    if (step === 0) return Boolean(form.name && form.email && form.country);
    if (step === 1) return Boolean(form.treatment && form.diagnosis.trim());
    return true;
  }

  function next() {
    if (canContinue()) setStep(prev => Math.min(4, prev + 1));
  }

  async function submit() {
    setSubmitError('');

    if (!user) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(PENDING_CASE_KEY, JSON.stringify({ form }));
      }
      router.push('/register');
      return;
    }

    setSubmitting(true);
    try {
      const createdCase = await createPatientCase({
        form: { ...form, email: user.email || form.email },
        treatmentName: treatment?.name
      });
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(PENDING_CASE_KEY);
      setSubmittedCase(createdCase);
      setFiles([]);
      setRestoredDraft(false);
    } catch (error) {
      console.error('Unable to create CareAtlas case', error);
      setSubmitError(error?.message || 'We could not create your case. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSubmittedCase(null);
    setStep(0);
    setForm({
      ...initialForm,
      name: patientProfile?.displayName || user?.displayName || '',
      email: user?.email || '',
      country: patientProfile?.country || ''
    });
    setFiles([]);
    setSubmitError('');
  }

  if (submittedCase) {
    return (
      <div className="case-success-shell">
        <span className="case-success-icon"><Check size={31}/></span>
        <span className="eyebrow">CASE SUBMITTED</span>
        <h1>Your CareAtlas case is now live.</h1>
        <p>Your treatment request has been securely saved to Firestore and is now available in your patient portal. You can manage consent and upload medical documents securely from your case workspace.</p>
        <div className="case-reference"><small>Case reference</small><strong>{submittedCase.caseNumber}</strong></div>
        <div className="success-actions">
          <Link className="button" href="/patient">Open patient dashboard <ArrowRight size={16}/></Link>
          <Link className="button button-ghost" href="/patient/cases">View my cases</Link>
          <button className="button button-ghost" type="button" onClick={resetForm}>Start another case</button>
        </div>
      </div>
    );
  }

  return (
    <div className="intake-shell">
      <aside className="intake-sidebar">
        <div>
          <span className="eyebrow light">CAREATLAS CASE INTAKE</span>
          <h2>One structured request for your treatment journey.</h2>
          <p>Tell us what you know. The final clinical recommendation must always come from a qualified treating medical team.</p>
        </div>
        <div className="intake-steps">
          {steps.map(([label, Icon], index) => (
            <div key={label} className={`intake-step ${index === step ? 'active' : ''} ${index < step ? 'complete' : ''}`}>
              <span>{index < step ? <Check size={15}/> : <Icon size={15}/>}</span>
              <div><small>Step {index + 1}</small><strong>{label}</strong></div>
            </div>
          ))}
        </div>
        <div className="privacy-card"><ShieldCheck size={20}/><div><strong>Secure case data is live</strong><p>Your case details are stored behind Firebase Authentication and Firestore Security Rules. Medical-file storage is intentionally not enabled yet.</p></div></div>
      </aside>

      <div className="intake-main">
        <div className="mobile-progress"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
        <div className="intake-heading"><span className="mini-label">STEP {step + 1} OF {steps.length}</span><h1>{steps[step][0]}</h1></div>

        {restoredDraft && step === 4 && (
          <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Your treatment request was restored.</strong><span>You signed in successfully. Review the details below and submit your real CareAtlas case.</span></div></div>
        )}

        {step === 0 && (
          <div className="form-stack">
            <div className="form-row-two">
              <label className="field-label"><span>Patient name *</span><input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Full name" /></label>
              <label className="field-label"><span>Age</span><input min="0" max="120" type="number" value={form.age} onChange={e => update('age', e.target.value)} placeholder="Age" /></label>
            </div>
            <div className="form-row-two">
              <label className="field-label"><span>Gender</span><select value={form.gender} onChange={e => update('gender', e.target.value)}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></label>
              <label className="field-label"><span>Country of residence *</span><input value={form.country} onChange={e => update('country', e.target.value)} placeholder="e.g. United Kingdom" /></label>
            </div>
            <div className="form-row-two">
              <label className="field-label"><span>Email *</span><input type="email" value={form.email} readOnly={Boolean(user)} onChange={e => update('email', e.target.value)} placeholder="patient@example.com" /></label>
              <label className="field-label"><span>Phone / WhatsApp</span><input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="Include country code" /></label>
            </div>
            <label className="field-label"><span>Preferred language</span><select value={form.language} onChange={e => update('language', e.target.value)}><option>English</option><option>Arabic</option><option>French</option><option>Spanish</option><option>Russian</option></select></label>
          </div>
        )}

        {step === 1 && (
          <div className="form-stack">
            {form.navigatorSpecialtyId && <div className="prototype-banner phase8a-intake-context"><ShieldCheck size={17}/><div><strong>Started from CareAtlas AI Care Navigator</strong><span>Your selected specialty, destinations and preferred hospital shortlist were carried into this form. The AI match does not assign a hospital or replace clinical assessment.</span></div></div>}
            <label className="field-label"><span>Treatment required *</span><select value={form.treatment} onChange={e => update('treatment', e.target.value)}>{treatments.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
            <label className="field-label"><span>Diagnosis / medical concern *</span><textarea rows="6" value={form.diagnosis} onChange={e => update('diagnosis', e.target.value)} placeholder="Briefly describe the diagnosis, symptoms, previous treatment or what your current doctor has recommended." /></label>
            <div><span className="field-heading">How soon are you considering treatment?</span><div className="choice-grid four-choice">{['Immediately', 'Within 1 month', '1–3 months', 'Exploring options'].map(item => <button type="button" onClick={() => update('urgency', item)} className={`choice-card ${form.urgency === item ? 'active' : ''}`} key={item}>{item}</button>)}</div></div>
          </div>
        )}

        {step === 2 && (
          <div className="form-stack">
            <div className="prototype-banner medical-banner"><ShieldCheck size={18}/><div><strong>Medical documents are added after your case is created.</strong><span>You can select files here to prepare the request, but this intake screen does not upload them. After case creation, use the secure Documents area in your patient portal.</span></div></div>
            <label className="upload-zone">
              <FileUp size={30}/>
              <strong>Select medical documents for preview</strong>
              <span>PDF, JPG or PNG · up to 8 files · upload securely after case creation</span>
              <input type="file" accept=".pdf,image/jpeg,image/png" multiple onChange={addFiles} />
            </label>
            {files.length > 0 && <div className="file-list">{files.map(file => <div className="file-row" key={file.id}><span className="file-icon"><FileText size={17}/></span><div><strong>{file.name}</strong><small>{prettyBytes(file.size)} · browser preview only</small></div><button type="button" onClick={() => removeFile(file.id)} aria-label={`Remove ${file.name}`}><Trash2 size={16}/></button></div>)}</div>}
          </div>
        )}

        {step === 3 && (
          <div className="form-stack">
            <div><span className="field-heading">Preferred treatment destinations</span><p className="field-help">Choose any that you already have in mind, or leave blank for CareAtlas recommendations.</p><div className="choice-grid destination-choice-grid">{destinations.map(destination => <button type="button" onClick={() => toggleDestination(destination.slug)} className={`choice-card destination-choice ${form.preferredDestinations.includes(destination.slug) ? 'active' : ''}`} key={destination.slug}><span>{destination.flag}</span><strong>{destination.name}</strong><small>{destination.costIndex}</small></button>)}</div></div>
            <div className="form-row-two"><label className="field-label"><span>Estimated total budget</span><select value={form.budget} onChange={e => update('budget', e.target.value)}><option value="">Not sure yet</option><option>Under $5,000</option><option>$5,000–$10,000</option><option>$10,000–$20,000</option><option>$20,000+</option></select></label><label className="field-label"><span>Who is travelling?</span><select value={form.companions} onChange={e => update('companions', e.target.value)}><option>Patient only</option><option>Patient + 1 attendant</option><option>Patient + family</option></select></label></div>
            <div><span className="field-heading">Travel assistance</span><div className="service-toggle-grid">{[['visa','Visa assistance'],['accommodation','Accommodation'],['airportPickup','Airport pickup']].map(([key,label]) => <button type="button" key={key} className={`service-toggle ${form[key] ? 'active' : ''}`} onClick={() => update(key, !form[key])}><span>{form[key] && <Check size={14}/>}</span>{label}</button>)}</div></div>
          </div>
        )}

        {step === 4 && (
          <div className="review-shell">
            <div className="review-card"><span className="mini-label">PATIENT</span><h3>{form.name || 'Not provided'}</h3><p>{form.country} · {user?.email || form.email}</p></div>
            <div className="review-card"><span className="mini-label">MEDICAL NEED</span><h3>{treatment?.name}</h3><p>{form.urgency}</p><blockquote>{form.diagnosis || 'No summary provided.'}</blockquote></div>
            <div className="review-card"><span className="mini-label">RECORDS</span><h3>{files.length} file{files.length === 1 ? '' : 's'} selected for preview</h3><p>These files are only a local selection preview. Upload the actual documents from the secure patient Documents area after case creation.</p></div>
            <div className="review-card"><span className="mini-label">TRAVEL</span><h3>{form.preferredDestinations.length ? form.preferredDestinations.map(slug => destinations.find(destination => destination.slug === slug)?.name).join(', ') : 'Recommend the best destination'}</h3><p>{form.budget || 'Budget not specified'} · {form.companions}</p></div>
            <div className="consent-note"><ShieldCheck size={19}/><p>Submitting creates a real CareAtlas case linked to your Firebase account. Medical-document sharing with hospitals remains controlled by your recorded CareAtlas consent state and provider assignment.</p></div>
            {!user && !authLoading && <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Account required to submit</strong><span>Your form will be kept in this browser while you create an account, then restored for final submission.</span></div></div>}
            {submitError && <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Case was not created</strong><span>{submitError}</span></div></div>}
          </div>
        )}

        <div className="intake-footer">
          <button type="button" className="back-button" onClick={() => setStep(prev => Math.max(0, prev - 1))} disabled={step === 0 || submitting}><ArrowLeft size={16}/> Back</button>
          {step < 4
            ? <button type="button" className="button" disabled={!canContinue()} onClick={next}>Continue <ArrowRight size={17}/></button>
            : <button type="button" className="button" onClick={submit} disabled={submitting || authLoading}>{submitting ? 'Creating case…' : user ? 'Submit case to CareAtlas' : 'Create account & continue'} {!submitting && <ArrowRight size={17}/>}</button>}
        </div>
      </div>
    </div>
  );
}
