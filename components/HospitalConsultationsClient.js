'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, LoaderCircle, Save, ShieldCheck, Video } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';
import { useAuth } from '@/components/AuthProvider';
import {
  CONSULTATION_MODES,
  CONSULTATION_STATUSES,
  createHospitalConsultation,
  getHospitalCases,
  getHospitalConsultations,
  updateHospitalConsultationStatus
} from '@/lib/firebase/hospital';

const initialForm = {
  caseId: '',
  doctorName: '',
  doctorSpecialty: '',
  scheduledDate: '',
  scheduledTime: '',
  timezone: 'Asia/Kolkata',
  mode: 'video',
  meetingNote: ''
};

export default function HospitalConsultationsClient() {
  const { userProfile } = useAuth();
  const [cases, setCases] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCase = useMemo(() => cases.find(item => item.id === form.caseId) || null, [cases, form.caseId]);

  async function load() {
    if (!userProfile?.hospitalId) return;
    setLoading(true);
    setError('');
    try {
      const [caseRows, consultationRows] = await Promise.all([
        getHospitalCases(userProfile.hospitalId),
        getHospitalConsultations(userProfile.hospitalId)
      ]);
      const requestedCase = new URLSearchParams(window.location.search).get('case') || '';
      setCases(caseRows);
      setConsultations(consultationRows);
      setForm(prev => ({ ...prev, caseId: caseRows.some(item => item.id === requestedCase) ? requestedCase : prev.caseId || caseRows[0]?.id || '' }));
    } catch (loadError) {
      setError(loadError?.message || 'Could not load consultations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (userProfile?.hospitalId) load(); }, [userProfile?.hospitalId]);

  async function submit(event) {
    event.preventDefault();
    if (!selectedCase) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await createHospitalConsultation({ hospitalId: userProfile.hospitalId, caseId: selectedCase.id, form });
      setNotice(`Consultation proposed for ${selectedCase.caseNumber || selectedCase.id}.`);
      setForm(prev => ({ ...initialForm, caseId: prev.caseId, timezone: prev.timezone }));
      await load();
    } catch (saveError) {
      setError(saveError?.message || 'Could not propose this consultation.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item, status) {
    setBusy(item.id);
    setError('');
    try {
      await updateHospitalConsultationStatus({ hospitalId: userProfile.hospitalId, consultationId: item.id, status });
      await load();
    } catch (statusError) {
      setError(statusError?.message || 'Could not update consultation status.');
    } finally {
      setBusy('');
    }
  }

  return <HospitalShell title="Consultations" subtitle="Propose and track doctor consultations for cases assigned to your hospital.">
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
    {notice && <div className="document-alert success"><CalendarClock size={17}/><span>{notice}</span></div>}
    {loading ? <div className="hospital-live-loading"><LoaderCircle className="spin" size={22}/> Loading consultations…</div> : <div className="phase6e-consultation-layout">
      <form className="portal-card phase6e-consultation-form" onSubmit={submit}>
        <div className="portal-card-heading"><div><span className="eyebrow">PROPOSE CONSULTATION</span><h2>Doctor availability.</h2></div><Video size={22}/></div>
        <label className="field-label"><span>Assigned case</span><select required value={form.caseId} onChange={event => setForm({ ...form, caseId: event.target.value })}><option value="">Select case</option>{cases.map(item => <option key={item.id} value={item.id}>{item.caseNumber || item.id} · {item.treatmentName || 'Treatment'}</option>)}</select></label>
        <div className="phase6e-form-grid"><label className="field-label"><span>Doctor</span><input required value={form.doctorName} onChange={event => setForm({ ...form, doctorName: event.target.value })} placeholder="Doctor name"/></label><label className="field-label"><span>Specialty</span><input required value={form.doctorSpecialty} onChange={event => setForm({ ...form, doctorSpecialty: event.target.value })} placeholder="Specialty"/></label><label className="field-label"><span>Date</span><input required type="date" value={form.scheduledDate} onChange={event => setForm({ ...form, scheduledDate: event.target.value })}/></label><label className="field-label"><span>Time</span><input required type="time" value={form.scheduledTime} onChange={event => setForm({ ...form, scheduledTime: event.target.value })}/></label><label className="field-label"><span>Timezone</span><select value={form.timezone} onChange={event => setForm({ ...form, timezone: event.target.value })}><option>Asia/Kolkata</option><option>Europe/Istanbul</option><option>Asia/Bangkok</option><option>Asia/Dubai</option><option>UTC</option></select></label><label className="field-label"><span>Mode</span><select value={form.mode} onChange={event => setForm({ ...form, mode: event.target.value })}>{CONSULTATION_MODES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="field-label phase6e-full"><span>Patient instructions / note</span><textarea rows="3" value={form.meetingNote} onChange={event => setForm({ ...form, meetingNote: event.target.value })} placeholder="Joining instructions will be handled in a later messaging phase. Add preparation notes only."/></label></div>
        <button className="button phase6e-submit-button" type="submit" disabled={saving || !selectedCase}>{saving ? <LoaderCircle className="spin" size={17}/> : <Save size={17}/>} {saving ? 'Saving…' : 'Propose consultation'}</button>
      </form>
      <section className="portal-card phase6e-consultation-list"><div className="portal-card-heading"><div><span className="eyebrow">CONSULTATION QUEUE</span><h2>{consultations.length} scheduled / proposed.</h2></div></div>{consultations.length ? consultations.map(item => <article key={item.id}><CalendarClock size={18}/><div><strong>{item.caseNumber || item.caseId} · {item.doctorName}</strong><span>{item.scheduledDate || 'Date not set'} · {item.scheduledTime || 'Time not set'} · {item.timezone || 'UTC'}</span><small>{item.mode || 'video'} · {item.patientName || 'Patient'}</small></div><select disabled={busy === item.id} value={item.status || 'proposed'} onChange={event => changeStatus(item, event.target.value)}>{CONSULTATION_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></article>) : <div className="empty-documents"><CalendarClock size={28}/><h3>No consultations yet.</h3><p>Propose one after your clinical team has reviewed the assigned case.</p></div>}</section>
    </div>}
  </HospitalShell>;
}
