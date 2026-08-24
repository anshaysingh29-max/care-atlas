'use client';

import { useEffect, useState } from 'react';
import { Building2, FileCheck2, LoaderCircle, ShieldCheck, Stethoscope } from 'lucide-react';
import PatientShell from '@/components/PatientShell';
import { useAuth } from '@/components/AuthProvider';
import { formatHospitalTimestamp, getPatientTreatmentPlans } from '@/lib/firebase/hospital';

export default function PatientTreatmentPlansClient() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    getPatientTreatmentPlans(user.uid)
      .then(rows => { if (active) setPlans(rows); })
      .catch(loadError => { if (active) setError(loadError?.message || 'Could not load your treatment plans.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  return <PatientShell title="Treatment plans" subtitle="Hospital responses submitted for your CareAtlas treatment cases.">
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
    {loading ? <div className="document-loading"><LoaderCircle className="spin" size={22}/> Loading hospital treatment plans…</div> : plans.length ? <div className="phase6e-patient-plans">{plans.map(plan => <article className="portal-card" key={plan.id}><div className="phase6e-patient-plan-top"><div><span className="eyebrow">{plan.planNumber || 'TREATMENT PLAN'}</span><h2>{plan.hospitalName || plan.hospitalId}</h2><p>{plan.caseNumber || plan.caseId} · {plan.treatmentName || 'Treatment request'}</p></div><span className="hospital-status large">{plan.status || 'submitted'}</span></div><div className="phase6e-plan-highlight"><span><Stethoscope size={17}/><small>Proposed procedure</small><strong>{plan.procedure || 'See plan summary'}</strong></span><span><Building2 size={17}/><small>Consultant</small><strong>{plan.consultantName || 'Hospital clinical team'}</strong></span><span><FileCheck2 size={17}/><small>Estimated cost</small><strong>{plan.currency || 'USD'} {Number(plan.estimatedCost || 0).toLocaleString()}</strong></span></div><div className="case-narrative"><strong>Treatment summary</strong><p>{plan.treatmentSummary || 'No summary supplied.'}</p><strong>Estimated stay</strong><p>{plan.estimatedStay || 'Not specified'}</p>{plan.inclusions ? <><strong>Included</strong><p>{plan.inclusions}</p></> : null}{plan.exclusions ? <><strong>Not included / possible extras</strong><p>{plan.exclusions}</p></> : null}{plan.notes ? <><strong>Hospital notes</strong><p>{plan.notes}</p></> : null}</div><small className="phase6e-plan-date">Submitted {formatHospitalTimestamp(plan.createdAt)}</small></article>)}</div> : <div className="empty-documents"><FileCheck2 size={28}/><h3>No treatment plans yet.</h3><p>Once an assigned hospital submits a plan, it will appear here automatically.</p></div>}
    <p className="phase6e-safety-copy">Treatment plans are hospital-submitted proposals, not guarantees of clinical suitability, outcomes or final cost. Final decisions require direct clinical review.</p>
  </PatientShell>;
}
