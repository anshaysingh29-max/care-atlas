'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileCheck2, LoaderCircle, Save, ShieldCheck } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';
import { useAuth } from '@/components/AuthProvider';
import { canHospitalSubmitPlans, createHospitalTreatmentPlan, getHospitalCases } from '@/lib/firebase/hospital';

const initialForm = {
  caseId: '',
  procedure: '',
  consultantName: '',
  consultantSpecialty: '',
  treatmentSummary: '',
  estimatedCost: '',
  currency: 'USD',
  estimatedStay: '',
  inclusions: '',
  exclusions: '',
  notes: '',
  validityDays: '30'
};

export default function HospitalTreatmentPlanForm() {
  const { userProfile } = useAuth();
  const [cases, setCases] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCase = useMemo(() => cases.find(item => item.id === form.caseId) || null, [cases, form.caseId]);
  const permitted = canHospitalSubmitPlans(userProfile?.role);

  useEffect(() => {
    if (!userProfile?.hospitalId) return;
    const requestedCase = new URLSearchParams(window.location.search).get('case') || '';
    let active = true;
    getHospitalCases(userProfile.hospitalId)
      .then(rows => {
        if (!active) return;
        setCases(rows);
        const defaultCase = rows.some(item => item.id === requestedCase) ? requestedCase : rows[0]?.id || '';
        setForm(prev => ({ ...prev, caseId: defaultCase }));
      })
      .catch(loadError => { if (active) setError(loadError?.message || 'Could not load assigned cases.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userProfile?.hospitalId]);

  async function submit(event) {
    event.preventDefault();
    if (!selectedCase || !permitted) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const plan = await createHospitalTreatmentPlan({ hospitalId: userProfile.hospitalId, caseId: selectedCase.id, form });
      setNotice(`${plan.planNumber} was submitted to CareAtlas and is now visible to the patient.`);
      setForm(prev => ({ ...initialForm, caseId: prev.caseId }));
    } catch (saveError) {
      setError(saveError?.message || 'Could not submit this treatment plan.');
    } finally {
      setSaving(false);
    }
  }

  const action = <Link href="/hospital/treatment-plans" className="text-button"><ArrowLeft size={15}/> Back to treatment plans</Link>;

  return <HospitalShell title="New treatment plan" subtitle="Create a structured clinical and commercial response for an assigned patient case." action={action}>
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
    {notice && <div className="document-alert success"><FileCheck2 size={17}/><span>{notice}</span></div>}
    {!permitted && <div className="permission-banner"><ShieldCheck size={18}/><div><strong>Clinical submission restricted</strong><span>Your role can review cases and consultations, but only hospital admins or doctors can submit treatment plans.</span></div></div>}
    {loading ? <div className="hospital-live-loading"><LoaderCircle className="spin" size={22}/> Loading assigned cases…</div> : <form className="portal-card phase6e-plan-form" onSubmit={submit}>
      <div className="portal-card-heading"><div><span className="eyebrow">STRUCTURED RESPONSE</span><h2>Hospital treatment proposal.</h2></div><FileCheck2 size={22}/></div>
      <div className="phase6e-form-grid">
        <label className="field-label phase6e-full"><span>Assigned CareAtlas case</span><select required value={form.caseId} onChange={event => setForm({ ...form, caseId: event.target.value })}><option value="">Select assigned case</option>{cases.map(item => <option key={item.id} value={item.id}>{item.caseNumber || item.id} · {item.treatmentName || 'Treatment request'} · {item.patientCountry || 'Country'}</option>)}</select></label>
        <label className="field-label"><span>Proposed procedure</span><input required value={form.procedure} onChange={event => setForm({ ...form, procedure: event.target.value })} placeholder="e.g. Robotic total knee replacement"/></label>
        <label className="field-label"><span>Consultant / doctor</span><input required value={form.consultantName} onChange={event => setForm({ ...form, consultantName: event.target.value })} placeholder="Doctor name"/></label>
        <label className="field-label"><span>Consultant specialty</span><input required value={form.consultantSpecialty} onChange={event => setForm({ ...form, consultantSpecialty: event.target.value })} placeholder="Orthopedics"/></label>
        <label className="field-label"><span>Estimated hospital stay</span><input required value={form.estimatedStay} onChange={event => setForm({ ...form, estimatedStay: event.target.value })} placeholder="e.g. 5–7 days"/></label>
        <label className="field-label"><span>Estimated cost</span><input required min="0" type="number" value={form.estimatedCost} onChange={event => setForm({ ...form, estimatedCost: event.target.value })} placeholder="4500"/></label>
        <label className="field-label"><span>Currency</span><select value={form.currency} onChange={event => setForm({ ...form, currency: event.target.value })}><option>USD</option><option>INR</option><option>EUR</option><option>AED</option><option>THB</option><option>TRY</option></select></label>
        <label className="field-label"><span>Plan validity</span><select value={form.validityDays} onChange={event => setForm({ ...form, validityDays: event.target.value })}><option value="15">15 days</option><option value="30">30 days</option><option value="45">45 days</option><option value="60">60 days</option></select></label>
        <label className="field-label phase6e-full"><span>Treatment summary</span><textarea required rows="5" value={form.treatmentSummary} onChange={event => setForm({ ...form, treatmentSummary: event.target.value })} placeholder="Clinical recommendation, approach and expected pathway. Avoid guarantees or unsupported outcome claims."/></label>
        <label className="field-label phase6e-full"><span>Included in estimate</span><textarea rows="3" value={form.inclusions} onChange={event => setForm({ ...form, inclusions: event.target.value })} placeholder="Hospital stay, surgeon fee, routine investigations…"/></label>
        <label className="field-label phase6e-full"><span>Excluded / additional costs</span><textarea rows="3" value={form.exclusions} onChange={event => setForm({ ...form, exclusions: event.target.value })} placeholder="Complications, extended stay, unrelated investigations…"/></label>
        <label className="field-label phase6e-full"><span>Additional notes</span><textarea rows="3" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Any preparation, record requests or limitations."/></label>
      </div>
      <button className="button phase6e-submit-button" type="submit" disabled={saving || !permitted || !selectedCase}>{saving ? <LoaderCircle className="spin" size={17}/> : <Save size={17}/>} {saving ? 'Submitting…' : 'Submit treatment plan'}</button>
      <p className="phase6e-safety-copy">This MVP stores the plan in Firestore and records a hospital audit event. Clinical suitability and final pricing remain subject to hospital review.</p>
    </form>}
  </HospitalShell>;
}
