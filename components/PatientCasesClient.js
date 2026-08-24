'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, Clock3, FileText, Hospital, MapPin, ShieldCheck, Stethoscope, Users } from 'lucide-react';
import PatientShell from '@/components/PatientShell';
import { useAuth } from '@/components/AuthProvider';
import { formatFirebaseTimestamp, getPatientCases } from '@/lib/firebase/cases';
import { destinations } from '@/lib/data';

const stageLabels = {
  case_submitted: 'Case submitted',
  records_review: 'Records review',
  hospital_matching: 'Hospital matching',
  treatment_plans: 'Treatment plans',
  consultation: 'Doctor consultation',
  hospital_selected: 'Hospital selected',
  travel_preparation: 'Travel preparation',
  treatment: 'Treatment',
  follow_up: 'Follow-up'
};

function destinationNames(slugs = []) {
  if (!slugs.length) return 'CareAtlas recommendation requested';
  return slugs.map(slug => destinations.find(item => item.slug === slug)?.name || slug).join(' · ');
}

export default function PatientCasesClient() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    getPatientCases(user.uid)
      .then(result => {
        if (!active) return;
        setCases(result);
        setSelectedId(current => current || result[0]?.id || '');
        setError('');
      })
      .catch(loadError => {
        console.error('Unable to load patient cases', loadError);
        if (active) setError('We could not load your cases. Please refresh and try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  const selectedCase = useMemo(
    () => cases.find(item => item.id === selectedId) || cases[0] || null,
    [cases, selectedId]
  );

  if (loading && user) {
    return <PatientShell title="My medical cases" subtitle="Loading your Firestore cases…"><section className="portal-card"><h2>Loading cases…</h2></section></PatientShell>;
  }

  if (!selectedCase) {
    return (
      <PatientShell title="My medical cases" subtitle="Your submitted CareAtlas cases will appear here.">
        {error && <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Could not load cases</strong><span>{error}</span></div></div>}
        <section className="portal-card next-action-card"><Stethoscope size={30}/><h2>No treatment cases yet.</h2><p>Create your first structured medical travel request.</p><Link className="button" href="/get-treatment-plan">Create treatment case</Link></section>
      </PatientShell>
    );
  }

  const stageLabel = stageLabels[selectedCase.currentStage] || 'Case submitted';
  const hospitalCount = selectedCase.assignedHospitalIds?.length || 0;

  return (
    <PatientShell title="My medical cases" subtitle="These cases are loaded from Firestore for your authenticated account." caseNumber={selectedCase.caseNumber}>
      {error && <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Refresh recommended</strong><span>{error}</span></div></div>}

      {cases.length > 1 && (
        <section className="portal-card">
          <span className="eyebrow">SELECT CASE</span>
          <div className="choice-grid">
            {cases.map(item => <button type="button" key={item.id} className={`choice-card ${item.id === selectedCase.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)}><strong>{item.caseNumber}</strong><small>{item.treatmentName}</small></button>)}
          </div>
        </section>
      )}

      <div className="case-overview-banner">
        <div><span className="status-pill">{stageLabel}</span><h2>{selectedCase.treatmentName}</h2><p>{selectedCase.urgency} · Case {selectedCase.caseNumber}</p></div>
        <div className="case-health"><Clock3 size={18}/><div><small>Submitted</small><strong>{formatFirebaseTimestamp(selectedCase.createdAt)}</strong></div></div>
      </div>

      <div className="patient-grid-two compact-grid">
        <section className="portal-card">
          <span className="eyebrow">CASE SUMMARY</span>
          <div className="detail-list">
            <div><Stethoscope/><span><small>Treatment</small><strong>{selectedCase.treatmentName}</strong></span></div>
            <div><MapPin/><span><small>Preferred destinations</small><strong>{destinationNames(selectedCase.preferredDestinationSlugs)}</strong></span></div>
            <div><CalendarDays/><span><small>Timing</small><strong>{selectedCase.urgency || 'Not specified'}</strong></span></div>
            <div><Users/><span><small>Travelling with</small><strong>{selectedCase.companions || 'Not specified'}</strong></span></div>
          </div>
        </section>

        <section className="portal-card">
          <span className="eyebrow">CASE ACTIVITY</span>
          <div className="activity-list">
            <div><CheckCircle2/><span><strong>Case submitted</strong><small>{formatFirebaseTimestamp(selectedCase.submittedAt || selectedCase.createdAt)}</small></span></div>
            <div className="current"><Clock3/><span><strong>{stageLabel}</strong><small>Current Firestore stage</small></span></div>
          </div>
        </section>
      </div>

      <section className="portal-card hospital-review-card">
        <div className="portal-card-heading"><div><span className="eyebrow">HOSPITAL ASSIGNMENT</span><h2>{hospitalCount ? `${hospitalCount} provider${hospitalCount === 1 ? '' : 's'} assigned to this case.` : 'No hospitals assigned yet.'}</h2></div><Hospital size={24}/></div>
        <p>{hospitalCount
          ? 'CareAtlas hospital assignments are stored against this case. Provider details will become live as Phase 6D and 6E connect the operations and hospital portals.'
          : 'The CareAtlas operations team will assign suitable providers after the real admin workflow is connected in Phase 6D.'}</p>
      </section>

      <section className="portal-card">
        <span className="eyebrow">MEDICAL SUMMARY</span>
        <FileText size={22}/>
        <h3>Patient-provided concern</h3>
        <p>{selectedCase.diagnosis}</p>
      </section>
    </PatientShell>
  );
}
