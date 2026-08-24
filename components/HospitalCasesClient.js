'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, Globe2, LoaderCircle, Search, ShieldCheck } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';
import { useAuth } from '@/components/AuthProvider';
import { getHospitalCases } from '@/lib/firebase/hospital';

const stageLabels = {
  case_submitted: 'Case submitted',
  records_review: 'Records review',
  hospital_matching: 'Hospital matching',
  treatment_plans: 'Treatment plans',
  consultation: 'Consultation',
  hospital_selected: 'Hospital selected',
  travel_preparation: 'Travel preparation',
  treatment: 'Treatment',
  follow_up: 'Follow-up'
};

export default function HospitalCasesClient() {
  const { userProfile } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!userProfile?.hospitalId) return;
    let active = true;
    setLoading(true);
    getHospitalCases(userProfile.hospitalId)
      .then(rows => { if (active) setCases(rows); })
      .catch(loadError => { if (active) setError(loadError?.message || 'Could not load assigned cases.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userProfile?.hospitalId]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return cases;
    return cases.filter(item => [item.caseNumber, item.patientName, item.patientCountry, item.treatmentName, item.diagnosis].some(value => String(value || '').toLowerCase().includes(needle)));
  }, [cases, search]);

  return <HospitalShell title="International patient cases" subtitle="Only cases explicitly assigned to your hospital are available here.">
    <div className="hospital-filter-bar phase6e-search-bar"><div><Search size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search case, treatment or country"/></div></div>
    <div className="permission-banner"><ShieldCheck size={18}/><div><strong>Permission-based access is active</strong><span>Firestore checks your hospital ID against each case assignment before returning patient information or document metadata.</span></div></div>
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
    {loading ? <div className="hospital-live-loading"><LoaderCircle className="spin" size={22}/> Loading assigned cases…</div> : <div className="case-card-list">{filtered.length ? filtered.map(item => <article className="hospital-case-card" key={item.id}><div className="case-card-top"><div><span className="case-priority">{item.status || 'active'}</span><h2>{item.caseNumber || item.id}</h2><p>{item.patientName || 'Patient'}</p></div><span className="hospital-status large">{stageLabels[item.currentStage] || item.currentStage || 'Assigned'}</span></div><div className="case-card-facts"><span><Globe2 size={15}/><small>Patient from</small><strong>{item.patientCountry || 'Not set'}</strong></span><span><FileText size={15}/><small>Treatment</small><strong>{item.treatmentName || 'Treatment request'}</strong></span><span><FileText size={15}/><small>Shared documents</small><strong>{item.documentCount || 0} files</strong></span></div><Link className="case-open-link" href={`/hospital/cases/case?id=${encodeURIComponent(item.id)}`}>Open case <ArrowRight size={16}/></Link></article>) : <div className="empty-documents"><FileText size={28}/><h3>No matching assigned cases.</h3><p>Cases appear only after CareAtlas operations assigns your hospital.</p></div>}</div>}
  </HospitalShell>;
}
