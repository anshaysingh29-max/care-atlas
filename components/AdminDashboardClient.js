'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Building2, Clock3, FileText, HeartHandshake, LoaderCircle, PlaneTakeoff, UsersRound } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { formatAdminTimestamp, getAdminDashboardData, stageLabel } from '@/lib/firebase/admin';

export default function AdminDashboardClient() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getAdminDashboardData().then(result => {
      if (active) setData(result);
    }).catch(err => {
      if (active) setError(err?.message || 'Could not load operations data.');
    });
    return () => { active = false; };
  }, []);

  return (
    <AdminShell title="Global operations" subtitle="Live patient cases and operational bottlenecks from Firestore.">
      {error && <div className="document-alert error"><span>{error}</span></div>}
      {!data ? (
        <div className="admin-live-loading"><LoaderCircle className="spin" size={23}/> Loading live CareAtlas operations…</div>
      ) : (
        <>
          <div className="admin-stat-grid">
            <article><span><UsersRound size={18}/></span><strong>{data.activeCases}</strong><small>Active cases</small><em>{data.cases.length} total</em></article>
            <article><span><HeartHandshake size={18}/></span><strong>{data.unassigned}</strong><small>Unassigned</small><em>Needs coordinator</em></article>
            <article><span><Building2 size={18}/></span><strong>{data.matching}</strong><small>Hospital matching</small><em>Active matching stage</em></article>
            <article><span><PlaneTakeoff size={18}/></span><strong>{data.travel}</strong><small>Travel preparation</small><em>{data.documents} case documents</em></article>
          </div>

          <div className="admin-grid-main phase6d-dashboard-grid">
            <section className="portal-card">
              <div className="portal-card-heading"><div><span className="eyebrow">LIVE CASE PIPELINE</span><h2>Current journey distribution.</h2></div><Link className="link-arrow" href="/admin/cases">Open queue <ArrowRight size={15}/></Link></div>
              <div className="live-stage-grid">
                {data.stageCounts.map(stage => <article key={stage.value}><strong>{stage.count}</strong><span>{stage.label}</span></article>)}
              </div>
            </section>

            <aside className="admin-stack">
              <section className="portal-card ops-health"><span className="eyebrow">LIVE QUEUE</span><div className="ops-score">{data.unassigned}<small></small></div><h3>Cases need ownership</h3><p>Assign coordinators from the case detail screen.</p></section>
              <section className="portal-card admin-mini-list"><span className="eyebrow">DOCUMENTS</span><h3>{data.documents} uploaded records</h3><p>Metadata is in Firestore; file bytes remain in private Google Drive.</p></section>
            </aside>
          </div>

          <section className="portal-card phase6d-recent-card">
            <div className="portal-card-heading"><div><span className="eyebrow">RECENT CASES</span><h2>Latest operational activity.</h2></div><Clock3 size={20}/></div>
            <div className="phase6d-recent-list">
              {data.recent.length ? data.recent.map(item => (
                <Link href={`/admin/cases/case?id=${encodeURIComponent(item.id)}`} key={item.id}>
                  <span><strong>{item.caseNumber || item.id}</strong><small>{item.patientName || item.patientEmail || 'Patient'} · {item.treatmentName || 'Treatment request'}</small></span>
                  <span><i>{stageLabel(item.currentStage)}</i><small>{formatAdminTimestamp(item.updatedAt || item.createdAt)}</small></span>
                  <ArrowRight size={15}/>
                </Link>
              )) : <div className="empty-documents"><FileText size={26}/><h3>No patient cases yet.</h3><p>Create a patient treatment request first.</p></div>}
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
