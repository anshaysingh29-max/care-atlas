'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle, Clock3, FileText, Hospital, Plane, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import PatientShell from '@/components/PatientShell';
import { useAuth } from '@/components/AuthProvider';
import { getPatientCases } from '@/lib/firebase/cases';
import { destinations } from '@/lib/data';

const journey = [
  ['case_submitted', 'Case submitted'],
  ['records_review', 'Records reviewed'],
  ['hospital_matching', 'Hospital matching'],
  ['treatment_plans', 'Treatment plans'],
  ['consultation', 'Doctor consultation'],
  ['hospital_selected', 'Hospital selected'],
  ['travel_preparation', 'Travel preparation'],
  ['treatment', 'Treatment'],
  ['follow_up', 'Follow-up']
];

const stageLabels = Object.fromEntries(journey);

function firstName(value) {
  return (value || 'Patient').trim().split(/\s+/)[0];
}

function stageIndex(stage) {
  const index = journey.findIndex(([key]) => key === stage);
  return index >= 0 ? index : 0;
}

function destinationNames(slugs = []) {
  if (!slugs.length) return 'CareAtlas recommendation requested';
  return slugs.map(slug => destinations.find(item => item.slug === slug)?.name || slug).join(' · ');
}

export default function PatientDashboardClient() {
  const { user, patientProfile } = useAuth();
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [caseError, setCaseError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingCases(true);
    getPatientCases(user.uid)
      .then(result => {
        if (active) {
          setCases(result);
          setCaseError('');
        }
      })
      .catch(error => {
        console.error('Unable to load patient cases', error);
        if (active) setCaseError('We could not load your cases. Please refresh and try again.');
      })
      .finally(() => {
        if (active) setLoadingCases(false);
      });
    return () => { active = false; };
  }, [user]);

  const activeCase = cases[0] || null;
  const currentJourneyIndex = useMemo(() => stageIndex(activeCase?.currentStage), [activeCase]);
  const displayName = patientProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Patient';

  if (loadingCases && user) {
    return (
      <PatientShell title={`Welcome, ${firstName(displayName)}.`} subtitle="Loading your live CareAtlas journey…">
        <section className="portal-card"><span className="eyebrow">LIVE FIRESTORE DATA</span><h2>Loading your cases…</h2></section>
      </PatientShell>
    );
  }

  if (!activeCase) {
    return (
      <PatientShell title={`Welcome, ${firstName(displayName)}.`} subtitle="Your secure patient account is ready.">
        {caseError && <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Could not load cases</strong><span>{caseError}</span></div></div>}
        <section className="portal-card next-action-card">
          <span className="eyebrow">FIRST STEP</span>
          <Stethoscope size={32}/>
          <h2>Create your first treatment case.</h2>
          <p>Your account is authenticated. Submit your medical requirement and CareAtlas will save the case securely in Firestore.</p>
          <Link className="button" href="/get-treatment-plan">Get a treatment plan <ArrowRight size={17}/></Link>
        </section>
      </PatientShell>
    );
  }

  const providerCount = activeCase.assignedHospitalIds?.length || 0;
  const stageLabel = stageLabels[activeCase.currentStage] || 'Case submitted';

  return (
    <PatientShell
      title={`Welcome, ${firstName(displayName)}.`}
      subtitle="This dashboard is now reading your real authenticated CareAtlas case from Firestore."
      caseNumber={activeCase.caseNumber}
    >
      {caseError && <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Refresh recommended</strong><span>{caseError}</span></div></div>}

      <div className="patient-stat-grid">
        <div className="patient-stat"><span><FileText size={18}/></span><strong>{cases.length}</strong><small>Case{cases.length === 1 ? '' : 's'} submitted</small></div>
        <div className="patient-stat"><span><Hospital size={18}/></span><strong>{providerCount}</strong><small>Hospitals assigned</small></div>
        <div className="patient-stat"><span><Clock3 size={18}/></span><strong>{stageLabel}</strong><small>Current stage</small></div>
        <div className="patient-stat"><span><UserRound size={18}/></span><strong>{activeCase.coordinatorId ? 'Assigned' : 'Pending'}</strong><small>CareAtlas coordinator</small></div>
      </div>

      <div className="patient-grid-two">
        <section className="portal-card journey-card">
          <div className="portal-card-heading"><div><span className="eyebrow">YOUR LIVE JOURNEY</span><h2>{activeCase.treatmentName}</h2></div><span className="status-pill">{stageLabel}</span></div>
          <div className="journey-list">
            {journey.map(([key,label], index) => {
              const status = index < currentJourneyIndex ? 'complete' : index === currentJourneyIndex ? 'current' : 'upcoming';
              return <div key={key} className={`journey-item ${status}`}>
                <div className="journey-marker">{status === 'complete' ? <CheckCircle2 size={19}/> : status === 'current' ? <Clock3 size={18}/> : <Circle size={18}/>}</div>
                <div><small>STEP {String(index + 1).padStart(2,'0')}</small><strong>{label}</strong>{status === 'current' && <span>This is the current stage saved against your CareAtlas case.</span>}</div>
              </div>;
            })}
          </div>
        </section>

        <div className="patient-stack">
          <section className="portal-card next-action-card">
            <span className="eyebrow">CASE STATUS</span>
            <ShieldCheck size={28}/>
            <h3>{stageLabel}</h3>
            <p>{activeCase.currentStage === 'case_submitted'
              ? 'Your case has been received. The CareAtlas operations workflow will be connected in Phase 6D.'
              : 'Your case progress is being tracked in Firestore.'}</p>
            <Link href="/patient/cases" className="link-arrow">View case details <ArrowRight size={17}/></Link>
          </section>

          <section className="portal-card trip-mini">
            <span className="eyebrow">TRAVEL PREFERENCES</span>
            <Plane size={24}/>
            <h3>{destinationNames(activeCase.preferredDestinationSlugs)}</h3>
            <p>{activeCase.budget || 'Budget not specified'} · {activeCase.companions || 'Companion preference not specified'}</p>
          </section>

          <section className="portal-card">
            <span className="eyebrow">MEDICAL DOCUMENTS</span>
            <FileText size={24}/>
            <h3>{activeCase.documentCount || 0} documents</h3>
            <p>Google Drive document storage and patient-wise folders are intentionally scheduled for Phase 6C.</p>
            <Link href="/patient/documents" className="link-arrow">Open documents area <ArrowRight size={17}/></Link>
          </section>
        </div>
      </div>
    </PatientShell>
  );
}
