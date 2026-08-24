'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Globe2, LoaderCircle, Search, UserRoundCheck } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { formatAdminTimestamp, getAdminCases, stageLabel } from '@/lib/firebase/admin';

export default function AdminCasesClient() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let active = true;
    getAdminCases().then(rows => {
      if (active) setCases(rows);
    }).catch(err => {
      if (active) setError(err?.message || 'Could not load CareAtlas cases.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return cases.filter(item => {
      if (filter === 'unassigned' && item.coordinatorId) return false;
      if (filter === 'matching' && item.currentStage !== 'hospital_matching') return false;
      if (filter === 'travel' && item.currentStage !== 'travel_preparation') return false;
      if (!term) return true;
      return [item.caseNumber, item.patientName, item.patientEmail, item.patientCountry, item.treatmentName, item.diagnosis]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
    });
  }, [cases, search, filter]);

  return (
    <AdminShell title="Patient cases" subtitle="Live Firestore queue for case ownership, hospital matching and journey progression.">
      <div className="admin-filter-bar phase6d-filter-bar">
        <label><Search size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search case, patient, treatment or country"/></label>
        {[['all','All'],['unassigned','Unassigned'],['matching','Hospital matching'],['travel','Travel prep']].map(([value,label]) => <button type="button" key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
      </div>

      {error && <div className="document-alert error"><span>{error}</span></div>}
      {loading ? <div className="admin-live-loading"><LoaderCircle className="spin" size={22}/> Loading live cases…</div> : (
        <section className="portal-card admin-table-card">
          <div className="admin-case-row head"><span>Case</span><span>Patient</span><span>Treatment</span><span>Stage</span><span>Coordinator</span><span>Updated</span></div>
          {rows.map(item => (
            <Link href={`/admin/cases/case?id=${encodeURIComponent(item.id)}`} className="admin-case-row" key={item.id}>
              <span><strong>{item.caseNumber || item.id}</strong><small><Globe2 size={11}/>{item.patientCountry || 'Country not set'}</small></span>
              <span>{item.patientName || item.patientEmail || 'Patient'}</span>
              <span>{item.treatmentName || 'Treatment request'}</span>
              <span><i>{stageLabel(item.currentStage)}</i></span>
              <span><UserRoundCheck size={12}/>{item.coordinatorName || 'Unassigned'}</span>
              <span>{formatAdminTimestamp(item.updatedAt || item.createdAt)}<ArrowRight size={13}/></span>
            </Link>
          ))}
          {!rows.length && <div className="empty-documents"><h3>No matching cases.</h3><p>Change the search or filter, or submit a patient treatment request.</p></div>}
        </section>
      )}
    </AdminShell>
  );
}
