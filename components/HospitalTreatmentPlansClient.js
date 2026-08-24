'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileCheck2, LoaderCircle, Plus, ShieldCheck } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';
import { useAuth } from '@/components/AuthProvider';
import { formatHospitalTimestamp, getHospitalTreatmentPlans } from '@/lib/firebase/hospital';

export default function HospitalTreatmentPlansClient() {
  const { userProfile } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userProfile?.hospitalId) return;
    let active = true;
    getHospitalTreatmentPlans(userProfile.hospitalId)
      .then(rows => { if (active) setPlans(rows); })
      .catch(loadError => { if (active) setError(loadError?.message || 'Could not load treatment plans.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userProfile?.hospitalId]);

  const action = <Link href="/hospital/treatment-plans/new" className="button button-sm"><Plus size={15}/> New treatment plan</Link>;

  return <HospitalShell title="Treatment plans" subtitle="Structured responses submitted by your hospital for assigned CareAtlas cases." action={action}>
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
    {loading ? <div className="hospital-live-loading"><LoaderCircle className="spin" size={22}/> Loading submitted plans…</div> : <section className="portal-card phase6e-plan-table"><div className="phase6e-plan-row head"><span>Plan</span><span>Case</span><span>Procedure</span><span>Estimate</span><span>Status</span></div>{plans.length ? plans.map(plan => <div className="phase6e-plan-row" key={plan.id}><span><strong>{plan.planNumber || plan.id}</strong><small>{formatHospitalTimestamp(plan.createdAt)}</small></span><span>{plan.caseNumber || plan.caseId}</span><span>{plan.procedure || plan.treatmentName}</span><span>{plan.currency || 'USD'} {Number(plan.estimatedCost || 0).toLocaleString()}</span><span><i>{plan.status || 'submitted'}</i></span></div>) : <div className="empty-documents"><FileCheck2 size={28}/><h3>No treatment plans submitted yet.</h3><p>Open an assigned case and create the hospital's first structured response.</p></div>}</section>}
  </HospitalShell>;
}
