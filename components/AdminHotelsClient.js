'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { getAdminHotels, hotelHospitalOptions, reviewHotelApplication } from '@/lib/firebase/hotelAdmin';

export default function AdminHotelsClient() {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');
  const hospitalOptions = useMemo(() => hotelHospitalOptions(), []);

  async function load() {
    setRows(await getAdminHotels());
  }

  useEffect(() => { load().catch(err => setMessage(err?.message || 'Unable to load Stay Partners.')); }, []);

  function draftFor(row) {
    return drafts[row.id] || {
      commissionRatePct: row.commissionRatePct || 12,
      nearbyHospitalIds: row.nearbyHospitalIds?.length ? row.nearbyHospitalIds : (row.nearbyHospitalIdsRequested || []),
      reviewNote: row.reviewNote || ''
    };
  }

  function patchDraft(id, patch) {
    setDrafts(current => ({ ...current, [id]: { ...(current[id] || {}), ...patch } }));
  }

  function toggleHospital(row, id) {
    const draft = draftFor(row);
    const next = draft.nearbyHospitalIds.includes(id)
      ? draft.nearbyHospitalIds.filter(item => item !== id)
      : [...draft.nearbyHospitalIds, id];
    patchDraft(row.id, { nearbyHospitalIds: next });
  }

  async function review(row, status) {
    setWorking(`${row.id}:${status}`);
    setMessage('');
    try {
      await reviewHotelApplication({ hotelId: row.id, status, ...draftFor(row) });
      await load();
      setMessage(`${row.propertyName} updated to ${status.replaceAll('_', ' ')}.`);
    } catch (err) {
      setMessage(err?.message || 'Unable to update hotel application.');
    } finally {
      setWorking('');
    }
  }

  return (
    <AdminShell title="Stay Partners" subtitle="Review hotel applications, map nearby hospitals and set CareAtlas booking commission.">
      {message && <div className={message.includes('updated') ? 'phase7d-form-success' : 'phase7d-form-error'}>{message}</div>}
      <div className="phase7d-admin-hotel-list">
        {rows.map(row => {
          const draft = draftFor(row);
          return (
            <section className="portal-card phase7d-admin-hotel-card" key={row.id}>
              <div className="phase7d-admin-hotel-head">
                <div><span className="eyebrow">{row.status.replaceAll('_', ' ')}</span><h2>{row.propertyName}</h2><p>{row.propertyType} · {row.city}, {row.country} · contact {row.contactName || row.contactEmail}</p></div>
                <Building2 size={26}/>
              </div>

              <div className="phase7d-admin-property-grid">
                <div><small>ROOMS</small><strong>{row.totalRooms || 'Not set'}</strong></div>
                <div><small>MEDICAL-STAY FEATURES</small><strong>{row.medicalStayFeatures?.length || 0}</strong></div>
                <div><small>REQUESTED HOSPITAL LINKS</small><strong>{row.nearbyHospitalIdsRequested?.length || 0}</strong></div>
                <div><small>WEBSITE</small><strong>{row.website || 'Not added'}</strong></div>
              </div>

              <div className="phase7d-admin-review-grid">
                <label>CareAtlas commission %
                  <input type="number" min="0" max="40" step="0.5" value={draft.commissionRatePct} onChange={e => patchDraft(row.id, { commissionRatePct: e.target.value })} />
                </label>
                <label>Review note
                  <input value={draft.reviewNote} onChange={e => patchDraft(row.id, { reviewNote: e.target.value })} placeholder="Verification note or correction request" />
                </label>
              </div>

              <div className="phase7d-choice-section">
                <strong>Approved nearby hospital mapping</strong>
                <div className="phase7d-choice-grid">{hospitalOptions.map(item => <label key={item.id}><input type="checkbox" checked={draft.nearbyHospitalIds.includes(item.id)} onChange={() => toggleHospital(row, item.id)} /> {item.name} · {item.city}</label>)}</div>
              </div>

              <div className="phase7d-inline-actions">
                <button className="button" onClick={() => review(row, 'approved')} disabled={working !== ''}>{working === `${row.id}:approved` ? <Loader2 size={15} className="phase7d-spin"/> : <CheckCircle2 size={15}/>} Approve</button>
                <button className="button secondary" onClick={() => review(row, 'needs_correction')} disabled={working !== ''}><ShieldCheck size={15}/> Needs correction</button>
                <button className="button secondary" onClick={() => review(row, row.status === 'suspended' ? 'approved' : 'suspended')} disabled={working !== ''}>{row.status === 'suspended' ? 'Reactivate' : 'Suspend'}</button>
                {row.status !== 'approved' && <button className="button secondary" onClick={() => review(row, 'rejected')} disabled={working !== ''}>Reject</button>}
              </div>
            </section>
          );
        })}
        {!rows.length && <section className="portal-card"><h2>No Stay Partner applications yet.</h2></section>}
      </div>
    </AdminShell>
  );
}
