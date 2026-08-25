'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, UserRoundPlus } from 'lucide-react';
import PartnerShell from '@/components/PartnerShell';
import { createPartnerLead, getPartnerLeads, partnerLeadStatusLabel } from '@/lib/firebase/partnerLeads';
import { useAuth } from '@/components/AuthProvider';

const emptyForm = {
  firstName: '',
  country: '',
  treatmentInterest: '',
  contactMethod: 'phone',
  contactValue: '',
  contactConsent: false,
  notes: '',
  campaign: 'direct-lead'
};

export default function PartnerLeadsClient() {
  const { partnerProfile } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLeads(await getPartnerLeads());
    } catch (error) {
      setNotice(error?.message || 'Could not load leads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      await createPartnerLead(form);
      setForm(emptyForm);
      setNotice('Lead submitted to CareAtlas.');
      await load();
    } catch (error) {
      setNotice(error?.message || 'Could not submit this lead.');
    } finally {
      setBusy(false);
    }
  }

  const approved = partnerProfile?.status === 'approved';
  return <PartnerShell title="Partner leads" subtitle="Introduce a consented person before they create a CareAtlas account. Keep medical details out of this form.">
    <div className="phase7b-leads-layout">
      <form className="portal-card phase7b-lead-form" onSubmit={submit}>
        <UserRoundPlus size={24}/>
        <span className="eyebrow">NEW INTRODUCTION</span>
        <h2>Send a warm lead to CareAtlas.</h2>
        <p className="phase7a-muted">Use only minimum contact information. Do not paste scans, reports, diagnoses or detailed medical history here.</p>
        {notice && <div className={`document-alert ${notice.includes('submitted')?'success':'error'}`}>{notice}</div>}
        <label className="field-label"><span>First / preferred name</span><input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></label>
        <label className="field-label"><span>Country</span><input value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></label>
        <label className="field-label"><span>Treatment interest</span><input value={form.treatmentInterest} onChange={e=>setForm({...form,treatmentInterest:e.target.value})} placeholder="e.g. Knee replacement"/></label>
        <div className="phase7b-contact-grid">
          <label className="field-label"><span>Contact method</span><select value={form.contactMethod} onChange={e=>setForm({...form,contactMethod:e.target.value})}><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></label>
          <label className="field-label"><span>Contact</span><input required value={form.contactValue} onChange={e=>setForm({...form,contactValue:e.target.value})}/></label>
        </div>
        <label className="field-label"><span>Campaign</span><input value={form.campaign} onChange={e=>setForm({...form,campaign:e.target.value})} placeholder="direct-lead"/></label>
        <label className="field-label"><span>Non-clinical note</span><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} maxLength={500} placeholder="Best time to contact, language preference, etc."/></label>
        <label className="phase7b-check"><input type="checkbox" checked={form.contactConsent} onChange={e=>setForm({...form,contactConsent:e.target.checked})}/><span>This person asked me to connect them with CareAtlas and agreed that I may share these contact details for this purpose.</span></label>
        <button className="button full-button" type="submit" disabled={!approved || busy || !form.contactConsent}>{busy?'Submitting…':'Submit lead'} <ArrowRight size={16}/></button>
        {!approved && <p className="phase7a-muted">Lead submission activates after partner approval.</p>}
      </form>

      <section className="portal-card phase7b-lead-list">
        <div className="portal-card-heading"><div><span className="eyebrow">YOUR LEADS</span><h2>Pre-registration introductions.</h2></div><ShieldCheck size={20}/></div>
        {loading ? <div className="phase7a-loading">Loading leads…</div> : leads.length === 0 ? <p className="phase7a-empty">No leads submitted yet.</p> : leads.map(item=><article key={item.id}>
          <div><strong>{item.firstName}</strong><span>{item.treatmentInterest || 'Treatment not specified'} · {item.country || 'Country not specified'}</span><small>{item.contactMethod}: {item.contactValue}</small></div>
          <div><b>{partnerLeadStatusLabel(item.status)}</b><small>{item.campaign || 'direct'}</small></div>
        </article>)}
      </section>
    </div>
  </PartnerShell>;
}
