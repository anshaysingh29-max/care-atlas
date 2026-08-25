'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { useAuth } from '@/components/AuthProvider';
import {
  createSpecialty,
  getAdminHospitalNetwork,
  publishHospitalApplication,
  reviewHospitalApplication,
  seedCoreSpecialties,
  updateTeamInvite
} from '@/lib/firebase/hospitalNetworkAdmin';
import { specialtySlug } from '@/lib/specialties';

export default function AdminHospitalNetworkClient() {
  const { userProfile } = useAuth();
  const canAdmin = ['careatlas_admin', 'super_admin'].includes(userProfile?.role);
  const [data, setData] = useState({ applications: [], hospitals: [], specialties: [], teamInvites: [] });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      let next = await getAdminHospitalNetwork();
      if (canAdmin && !next.specialties.length) {
        await seedCoreSpecialties();
        next = await getAdminHospitalNetwork();
      }
      setData(next);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => { load(); }, [canAdmin]);
  const specMap = useMemo(() => new Map(data.specialties.map(s => [s.id, s])), [data.specialties]);

  async function act(key, fn) {
    setBusy(key); setError('');
    try { await fn(); await load(); }
    catch (actionError) { setError(actionError.message); }
    finally { setBusy(''); }
  }

  return <AdminShell
    title="Hospital network"
    subtitle="Review hospital applications, verify specialties and publish approved providers to the CareAtlas marketplace."
    action={canAdmin ? <button className="button button-sm" onClick={() => act('seed', seedCoreSpecialties)} disabled={busy === 'seed'}><RefreshCw size={15}/> Seed core specialties</button> : null}
  >
    {error && <div className="document-alert error"><ShieldCheck size={17}/>{error}</div>}
    {!canAdmin && <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Read-only operations view</strong><span>Hospital approval, specialty governance and team provisioning require CareAtlas Admin access.</span></div></div>}

    <section className="phase7g-admin-stats">
      <div><strong>{data.applications.filter(a => a.status === 'pending_review').length}</strong><span>Applications pending</span></div>
      <div><strong>{data.hospitals.filter(h => h.marketplaceStatus === 'published').length}</strong><span>Published hospitals</span></div>
      <div><strong>{data.specialties.filter(s => s.status !== 'archived').length}</strong><span>Active specialties</span></div>
      <div><strong>{data.teamInvites.filter(i => i.status === 'pending_admin_provisioning').length}</strong><span>Team access requests</span></div>
    </section>

    <section className="phase7g-admin-list">
      <div className="portal-card">
        <span className="eyebrow">APPLICATIONS</span><h2>Hospital onboarding queue</h2>
        {data.applications.map(a => <article className="phase7g-application" key={a.id}>
          <div>
            <strong>{a.hospitalName}</strong><span>{a.city}, {a.country} · {a.legalName}</span>
            <div className="phase7g-request-tags">
              {(a.specialtyIds || []).map(id => <span key={id}>{specMap.get(id)?.name || id}</span>)}
              {(a.requestedSpecialtyNames || []).map(name => <span className={specMap.has(specialtySlug(name)) ? 'resolved' : 'requested'} key={name}>{name}{specMap.has(specialtySlug(name)) ? ' ✓' : ' · NEW'}</span>)}
            </div>
            {a.reviewNote && <small>Review note: {a.reviewNote}</small>}
          </div>
          <div className="phase7g-app-actions">
            <i>{a.status.replaceAll('_', ' ')}</i>
            {canAdmin && (a.requestedSpecialtyNames || []).filter(name => !specMap.has(specialtySlug(name))).map(name => <button key={name} onClick={() => act(`spec-${name}`, () => createSpecialty({ name }))}>Approve {name}</button>)}
            {canAdmin && ['pending_review', 'needs_correction'].includes(a.status) && <>
              <button className="approve" onClick={() => act(`pub-${a.id}`, () => publishHospitalApplication({ applicationId: a.id }))}><CheckCircle2 size={15}/> Publish hospital</button>
              <button onClick={() => act(`fix-${a.id}`, () => reviewHospitalApplication({ applicationId: a.id, status: 'needs_correction', reviewNote: 'Please review and complete the requested hospital information.' }))}>Needs correction</button>
              <button className="reject" onClick={() => act(`rej-${a.id}`, () => reviewHospitalApplication({ applicationId: a.id, status: 'rejected', reviewNote: 'Application not approved at this time.' }))}><XCircle size={15}/> Reject</button>
            </>}
          </div>
        </article>)}
        {!data.applications.length && <p>No hospital applications yet.</p>}
      </div>

      <div className="portal-card">
        <span className="eyebrow">PUBLISHED NETWORK</span><h2>Live hospitals</h2>
        {data.hospitals.map(h => <article className="phase7g-live-hospital" key={h.id}><Building2 size={18}/><div><strong>{h.name}</strong><span>{h.city}, {h.country}</span><small>{(h.specialtyNames || h.specialties || []).join(' · ')}</small></div><i>{h.marketplaceStatus}</i></article>)}
        {!data.hospitals.length && <p>No Firestore-managed hospitals published yet. Existing demo providers remain available as fallback.</p>}
      </div>

      <div className="portal-card">
        <span className="eyebrow">TEAM ACCESS REQUESTS</span><h2>Manual provisioning queue</h2>
        {data.teamInvites.map(i => <article className="phase7g-team-row" key={i.id}><div><strong>{i.displayName || i.email}</strong><span>{i.email} · {i.requestedRole}</span><small>Hospital: {i.hospitalId}</small></div><div><i>{i.status.replaceAll('_', ' ')}</i>{canAdmin && i.status === 'pending_admin_provisioning' && <><button onClick={() => act(i.id, () => updateTeamInvite({ inviteId: i.id, status: 'provisioned' }))}>Mark provisioned</button><button onClick={() => act(i.id, () => updateTeamInvite({ inviteId: i.id, status: 'rejected' }))}>Reject</button></>}</div></article>)}
        {!data.teamInvites.length && <p>No team access requests.</p>}
      </div>
    </section>
  </AdminShell>;
}
