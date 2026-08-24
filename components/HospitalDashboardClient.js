'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, FileCheck2, FolderKanban, LoaderCircle, ShieldCheck } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';
import { useAuth } from '@/components/AuthProvider';
import { formatHospitalTimestamp, getHospitalDashboardData } from '@/lib/firebase/hospital';

export default function HospitalDashboardClient() {
  const { userProfile } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userProfile?.hospitalId) return;
    let active = true;
    getHospitalDashboardData(userProfile.hospitalId)
      .then(result => { if (active) setData(result); })
      .catch(loadError => { if (active) setError(loadError?.message || 'Could not load hospital operations.'); });
    return () => { active = false; };
  }, [userProfile?.hospitalId]);

  return <HospitalShell title="Partner operations" subtitle="Review assigned cases, clinical responses and consultations from one live workspace.">
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
    {!data ? <div className="hospital-live-loading"><LoaderCircle className="spin" size={22}/> Loading partner operations…</div> : <>
      <div className="phase6e-hospital-stats">
        <article><span><FolderKanban size={18}/></span><strong>{data.assignedCases}</strong><small>Assigned cases</small></article>
        <article><span><FileCheck2 size={18}/></span><strong>{data.needsPlan}</strong><small>Cases needing plan</small></article>
        <article><span><FileCheck2 size={18}/></span><strong>{data.submittedPlans}</strong><small>Plans submitted</small></article>
        <article><span><CalendarClock size={18}/></span><strong>{data.activeConsultations}</strong><small>Active consultations</small></article>
      </div>
      <section className="portal-card phase6e-recent-cases">
        <div className="portal-card-heading"><div><span className="eyebrow">ASSIGNED CASES</span><h2>Latest patient requests.</h2></div><Link href="/hospital/cases" className="link-arrow">All cases <ArrowRight size={15}/></Link></div>
        {data.recentCases.length ? data.recentCases.map(item => <Link key={item.id} href={`/hospital/cases/case?id=${encodeURIComponent(item.id)}`} className="phase6e-recent-row"><span><strong>{item.caseNumber || item.id}</strong><small>{item.patientCountry || 'Country not set'}</small></span><span>{item.treatmentName || 'Treatment request'}</span><span>{item.documentCount || 0} docs</span><span>{formatHospitalTimestamp(item.updatedAt || item.createdAt)} <ArrowRight size={14}/></span></Link>) : <div className="empty-documents"><FolderKanban size={27}/><h3>No cases assigned yet.</h3><p>A CareAtlas admin must assign this hospital to a patient case before it appears here.</p></div>}
      </section>
    </>}
  </HospitalShell>;
}
