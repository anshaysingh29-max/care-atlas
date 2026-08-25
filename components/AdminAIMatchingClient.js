'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Building2, ShieldCheck, Sparkles } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { formatNavigatorDate, getAdminMatchRuns } from '@/lib/firebase/careNavigator';
import { getMarketplaceSpecialties, getPublishedHospitals } from '@/lib/firebase/marketplace';

function patientAlias(uid) {
  const value = String(uid || '');
  return value ? `Patient …${value.slice(-6)}` : 'Patient';
}

export default function AdminAIMatchingClient() {
  const [runs, setRuns] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminMatchRuns(), getMarketplaceSpecialties(), getPublishedHospitals()])
      .then(([matchRuns, specialtyRows, hospitalRows]) => {
        setRuns(matchRuns);
        setSpecialties(specialtyRows);
        setHospitals(hospitalRows);
      })
      .finally(() => setLoading(false));
  }, []);

  const hospitalMap = useMemo(() => new Map(hospitals.map(h => [h.id || h.hospitalId, h])), [hospitals]);
  const specialtyMap = useMemo(() => new Map(specialties.map(s => [s.id, s])), [specialties]);

  return <AdminShell title="AI Matching" subtitle="Audit explainable CareAtlas match runs. 8A stores normalized preferences and ranked hospital IDs, not free-text medical narratives.">
    <section className="phase8a-admin-policy portal-card">
      <ShieldCheck size={21}/><div><strong>Ranking governance</strong><span>Hospital commercials, affiliate commission and CareAtlas revenue share are not read by the 8A matching engine. Matches are decision-support only and never auto-assign a hospital.</span></div>
    </section>
    <section className="phase8a-admin-stats">
      <div className="portal-card"><Bot size={18}/><strong>{runs.length}</strong><span>Saved match runs</span></div>
      <div className="portal-card"><Building2 size={18}/><strong>{hospitals.length}</strong><span>Live published hospitals</span></div>
      <div className="portal-card"><Sparkles size={18}/><strong>{specialties.length}</strong><span>Marketplace specialties</span></div>
    </section>
    <section className="portal-card phase8a-admin-table-wrap">
      <div className="phase8a-admin-table-head"><div><span className="eyebrow">MATCH AUDIT</span><h3>Recent patient-saved shortlists</h3></div></div>
      {loading ? <p>Loading match runs…</p> : <div className="phase8a-admin-table">
        {runs.map(run => <article key={run.id}>
          <div><strong>{patientAlias(run.patientId)}</strong><span>{formatNavigatorDate(run.createdAt)}</span></div>
          <div><strong>{specialtyMap.get(run.specialtyId)?.name || run.specialtyId || '—'}</strong><span>{run.treatmentSlug || 'Specialty consultation'}</span></div>
          <div className="phase8a-admin-shortlist">{(run.matchSummaries || []).slice(0,3).map(item => <span key={item.hospitalId}><b>{item.score}</b> {hospitalMap.get(item.hospitalId)?.name || item.hospitalId}</span>)}{!(run.matchSummaries || []).length && <span>No shortlist</span>}</div>
          <div><code>{run.algorithmVersion || '—'}</code></div>
        </article>)}
        {!runs.length && <div className="phase8a-empty-admin">No patient-saved Care Navigator match runs yet.</div>}
      </div>}
    </section>
  </AdminShell>;
}
