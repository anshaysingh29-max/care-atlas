'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, FileText, Globe2, HeartHandshake, LoaderCircle, Mail, Phone, Save, ShieldCheck, Stethoscope } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import AdminCaseMessagingPanel from '@/components/AdminCaseMessagingPanel';
import { useAuth } from '@/components/AuthProvider';
import { hospitals } from '@/lib/data';
import {
  CASE_STAGES,
  CASE_STATUSES,
  COORDINATORS,
  formatAdminTimestamp,
  getAdminCase,
  getAdminCaseDocuments,
  getAdminCaseConsentState,
  stageLabel,
  updateAdminCaseOperations
} from '@/lib/firebase/admin';

export default function AdminCaseDetailClient() {
  const { userProfile } = useAuth();
  const [caseId, setCaseId] = useState('');
  const [record, setRecord] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [consentState, setConsentState] = useState(null);
  const [form, setForm] = useState({ currentStage: 'case_submitted', status: 'submitted', coordinatorId: '', assignedHospitalIds: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCoordinator = useMemo(() => COORDINATORS.find(item => item.id === form.coordinatorId) || null, [form.coordinatorId]);

  async function load(targetId) {
    setLoading(true);
    setError('');
    try {
      const [caseRecord, docs, consent] = await Promise.all([
        getAdminCase(targetId),
        getAdminCaseDocuments(targetId),
        getAdminCaseConsentState(targetId)
      ]);
      setRecord(caseRecord);
      setDocuments(docs);
      setConsentState(consent);
      setForm({
        currentStage: caseRecord.currentStage || 'case_submitted',
        status: caseRecord.status || 'submitted',
        coordinatorId: caseRecord.coordinatorId || '',
        assignedHospitalIds: Array.isArray(caseRecord.assignedHospitalIds) ? caseRecord.assignedHospitalIds : []
      });
    } catch (loadError) {
      setError(loadError?.message || 'Could not load this CareAtlas case.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get('id') || '';
    setCaseId(target);
    if (target) load(target);
    else {
      setLoading(false);
      setError('No case ID was supplied. Return to the case queue and choose a case.');
    }
  }, []);

  function toggleHospital(slug) {
    setForm(prev => ({
      ...prev,
      assignedHospitalIds: prev.assignedHospitalIds.includes(slug)
        ? prev.assignedHospitalIds.filter(item => item !== slug)
        : [...prev.assignedHospitalIds, slug]
    }));
  }

  async function saveOperations() {
    if (!caseId) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateAdminCaseOperations({
        caseId,
        currentStage: form.currentStage,
        status: form.status,
        coordinatorId: selectedCoordinator?.id || '',
        coordinatorName: selectedCoordinator?.name || '',
        assignedHospitalIds: form.assignedHospitalIds,
        actorRole: userProfile?.role || ''
      });
      setRecord(updated);
      setNotice('Case operations saved to Firestore and an audit event was recorded.');
    } catch (saveError) {
      setError(saveError?.message || 'Could not save case operations.');
    } finally {
      setSaving(false);
    }
  }

  const action = <Link href="/admin/cases" className="text-button"><ArrowLeft size={15}/> Back to cases</Link>;

  return (
    <AdminShell title={record ? `${record.caseNumber || record.id} · ${record.patientName || 'Patient'}` : 'Case operations'} subtitle={record ? `${record.treatmentName || 'Treatment request'} · ${record.patientCountry || 'Country not set'}` : 'Manage a live CareAtlas case.'} action={action}>
      {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
      {notice && <div className="document-alert success"><ShieldCheck size={17}/><span>{notice}</span></div>}
      {loading ? <div className="admin-live-loading"><LoaderCircle className="spin" size={22}/> Loading case operations…</div> : record && (
        <div className="admin-case-detail-grid phase6d-case-detail">
          <div className="admin-case-column">
            <section className="portal-card case-control-card">
              <div className="portal-card-heading"><div><span className="eyebrow">CASE CONTROL</span><h2>Live journey ownership.</h2></div><span className="admin-stage-pill">{stageLabel(form.currentStage)}</span></div>
              <div className="phase6d-control-grid">
                <label className="field-label"><span>Journey stage</span><select value={form.currentStage} onChange={event => setForm({ ...form, currentStage: event.target.value })}>{CASE_STAGES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label className="field-label"><span>Case status</span><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{CASE_STATUSES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label className="field-label phase6d-control-span"><span>Care coordinator</span><select value={form.coordinatorId} onChange={event => setForm({ ...form, coordinatorId: event.target.value })}><option value="">Unassigned</option>{COORDINATORS.map(item => <option key={item.id} value={item.id}>{item.name} · {item.region}</option>)}</select></label>
              </div>
              <button className="button admin-save-button" type="button" onClick={saveOperations} disabled={saving}>{saving ? <LoaderCircle className="spin" size={17}/> : <Save size={17}/>} {saving ? 'Saving…' : 'Save operations'}</button>
              <div className="admin-detail-facts phase6d-case-facts">
                <span><Globe2 size={15}/><small>Patient from</small><strong>{record.patientCountry || 'Not set'}</strong></span>
                <span><HeartHandshake size={15}/><small>Companions</small><strong>{record.companions || 'Not set'}</strong></span>
                <span><FileText size={15}/><small>Documents</small><strong>{documents.length}</strong></span>
                <span><ShieldCheck size={15}/><small>Hospital sharing</small><strong>{consentState?.hospitalSharing ? 'Allowed' : 'Not allowed'}</strong></span>
                <span><ShieldCheck size={15}/><small>Updated</small><strong>{formatAdminTimestamp(record.updatedAt || record.createdAt)}</strong></span>
              </div>
            </section>

            <section className="portal-card">
              <div className="portal-card-heading"><div><span className="eyebrow">MEDICAL REQUEST</span><h2>Patient-submitted context.</h2></div><Stethoscope size={22}/></div>
              <div className="case-narrative"><strong>Diagnosis / request</strong><p>{record.diagnosis || 'No diagnosis text was supplied.'}</p><strong>Urgency</strong><p>{record.urgency || 'Not set'}</p><strong>Uploaded documents</strong><div className="admin-doc-list">{documents.length ? documents.map(item => <span key={item.id}><FileText size={14}/> {item.name} <i>{item.category || 'Medical report'}</i></span>) : <span><FileText size={14}/> No documents uploaded yet.</span>}</div></div>
            </section>

            <AdminCaseMessagingPanel caseId={caseId}/>
          </div>

          <aside className="admin-case-column">
            <section className="portal-card">
              <span className="eyebrow">HOSPITAL MATCHING</span>
              <h2>{form.assignedHospitalIds.length} provider{form.assignedHospitalIds.length === 1 ? '' : 's'} assigned.</h2>
              <p className="admin-small-note">These are the current demo catalogue provider IDs. Hospital access is live and document access is additionally controlled by the patient’s recorded sharing consent.</p>
              <div className="phase6d-hospital-picker">
                {hospitals.map(hospital => <label key={hospital.slug} className={form.assignedHospitalIds.includes(hospital.slug) ? 'selected' : ''}><input type="checkbox" checked={form.assignedHospitalIds.includes(hospital.slug)} onChange={() => toggleHospital(hospital.slug)}/><Building2 size={16}/><span><strong>{hospital.name}</strong><small>{hospital.city}, {hospital.country}</small></span></label>)}
              </div>
            </section>

            <section className="portal-card">
              <span className="eyebrow">PATIENT CONTACT</span>
              <div className="contact-mini"><span><Mail size={15}/> {record.patientEmail || 'Email not set'}</span><span><Phone size={15}/> {record.patientPhone || 'Phone not set'}</span></div>
              <p className="admin-small-note">Use test/non-sensitive patient data until final consent, audit and production compliance hardening is completed.</p>
            </section>
          </aside>
        </div>
      )}
    </AdminShell>
  );
}
