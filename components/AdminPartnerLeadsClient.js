'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { getAdminPartnerLeads, updatePartnerLeadStatus } from '@/lib/firebase/affiliateAdmin';
import { PARTNER_LEAD_STATUSES, partnerLeadStatusLabel } from '@/lib/firebase/partnerLeads';

export default function AdminPartnerLeadsClient() {
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState('');

  const load = useCallback(async()=> {
    try {
      setLoading(true);
      setRows(await getAdminPartnerLeads());
    } catch (error) {
      setNotice(error?.message || 'Could not load partner leads.');
    } finally {
      setLoading(false);
    }
  },[]);

  useEffect(()=>{load();},[load]);

  async function change(row,status) {
    try {
      setNotice('');
      await updatePartnerLeadStatus({leadId:row.id,status});
      await load();
    } catch (error) {
      setNotice(error?.message || 'Could not update lead.');
    }
  }

  return <AdminShell title="Partner leads" subtitle="Follow consented pre-registration introductions before they become patient cases.">
    <div className="permission-banner"><ShieldCheck size={18}/><div><strong>Minimum necessary data</strong><span>This queue contains contact information shared with consent. Keep it inside CareAtlas operations and do not add medical files or detailed diagnoses.</span></div></div>
    {notice&&<div className="document-alert error">{notice}</div>}
    <section className="portal-card phase7b-admin-leads">
      <div className="phase7b-admin-lead-row head"><span>Lead</span><span>Partner</span><span>Contact</span><span>Interest</span><span>Status</span></div>
      {loading?<div className="admin-live-loading">Loading partner leads…</div>:rows.length===0?<p className="phase7a-empty">No partner leads yet.</p>:rows.map(row=><div className="phase7b-admin-lead-row" key={row.id}>
        <span><strong>{row.firstName}</strong><small>{row.country || 'Country not provided'} · {row.campaign || 'direct'}</small></span>
        <span><code>{String(row.partnerId||'').slice(0,10)}…</code></span>
        <span><strong>{row.contactMethod}</strong><small>{row.contactValue}</small></span>
        <span>{row.treatmentInterest || 'Not specified'}</span>
        <span><select value={row.status || 'new'} onChange={e=>change(row,e.target.value)}>{PARTNER_LEAD_STATUSES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><small>{partnerLeadStatusLabel(row.status)}</small></span>
      </div>)}
    </section>
  </AdminShell>;
}
