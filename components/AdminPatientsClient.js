'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Globe2, LoaderCircle, Search, ShieldCheck, UserRound, UserRoundCheck } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { getAdminPatients, stageLabel } from '@/lib/firebase/admin';

export default function AdminPatientsClient() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    getAdminPatients().then(rows => { if (active) setPatients(rows); })
      .catch(err => { if (active) setError(err?.message || 'Could not load patients.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter(item => [item.displayName, item.email, item.country, item.latestCase?.caseNumber, item.latestCase?.treatmentName].filter(Boolean).some(value => String(value).toLowerCase().includes(term)));
  }, [patients, search]);

  return (
    <AdminShell title="Patients" subtitle="Live patient profiles with their current CareAtlas cases.">
      <div className="admin-filter-bar phase6d-filter-bar"><label><Search size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search patient, email or case"/></label></div>
      {error && <div className="document-alert error"><span>{error}</span></div>}
      {loading ? <div className="admin-live-loading"><LoaderCircle className="spin" size={22}/> Loading patient profiles…</div> : (
        <div className="patient-admin-grid phase6d-patient-grid">
          {rows.map(patient => {
            const latest = patient.latestCase;
            return <article className="portal-card admin-patient-card" key={patient.id}><div className="patient-avatar"><UserRound size={20}/></div><div><span className="eyebrow">{latest?.caseNumber || `${patient.cases.length} case${patient.cases.length === 1 ? '' : 's'}`}</span><h2>{patient.displayName || patient.email || 'Patient'}</h2><p><Globe2 size={13}/>{patient.country || 'Country not set'}</p><strong>{latest?.treatmentName || 'No treatment case yet'}</strong><small><UserRoundCheck size={12}/>{latest?.coordinatorName || 'Unassigned'} · {latest ? stageLabel(latest.currentStage) : 'No active stage'}</small>{latest && <Link href={`/admin/cases/case?id=${encodeURIComponent(latest.id)}`} className="link-arrow">Open case <ArrowRight size={13}/></Link>}</div></article>;
          })}
          {!rows.length && <div className="empty-documents"><h3>No matching patients.</h3><p>Patient profiles appear here after Firebase registration.</p></div>}
        </div>
      )}
      <div className="permission-banner admin-privacy"><ShieldCheck size={18}/><div><strong>Minimum necessary access</strong><span>6D protects this screen with CareAtlas staff roles. More granular coordinator-level data scoping is a production-hardening task.</span></div></div>
    </AdminShell>
  );
}
