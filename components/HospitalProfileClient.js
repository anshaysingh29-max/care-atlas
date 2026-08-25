'use client';

import { useEffect, useState } from 'react';
import { Building2, Globe2, Save, ShieldCheck, Stethoscope } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';
import { useAuth } from '@/components/AuthProvider';
import { getHospitalCatalogueProfile } from '@/lib/firebase/hospital';
import { getMyPublishedHospital, updateHospitalOperationalProfile } from '@/lib/firebase/hospitalNetwork';

const split=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
export default function HospitalProfileClient() {
  const { user, userProfile } = useAuth();
  const demo = getHospitalCatalogueProfile(userProfile?.hospitalId);
  const [live,setLive]=useState(null); const [form,setForm]=useState(null); const [message,setMessage]=useState('');
  useEffect(()=>{if(!userProfile?.hospitalId)return;getMyPublishedHospital(userProfile.hospitalId).then(h=>{setLive(h);if(h)setForm({website:h.website||'',address:h.address||'',description:h.description||'',internationalDeskEmail:h.internationalDeskEmail||'',internationalDeskPhone:h.internationalDeskPhone||'',languages:(h.languages||[]).join(', '),services:(h.services||[]).join(', ')});});},[userProfile?.hospitalId]);
  const hospital=live||demo; const specialties=live?.specialtyNames||demo?.specialties||[];
  async function save(e){e.preventDefault();setMessage('');try{await updateHospitalOperationalProfile({hospitalId:userProfile.hospitalId,...form,languages:split(form.languages),services:split(form.services)});setMessage('Operational profile updated. Approved specialties and commercials are unchanged.');}catch(err){setMessage(err.message);}}
  return <HospitalShell title="Hospital profile" subtitle="Manage operational marketplace information. Specialty approval and commercial terms remain controlled by CareAtlas.">
    <div className="phase6e-profile-grid">
      <section className="portal-card"><div className="portal-card-heading"><div><span className="eyebrow">PARTNER IDENTITY</span><h2>{hospital?.name || userProfile?.hospitalName || userProfile?.hospitalId}</h2></div><Building2 size={22}/></div><div className="admin-detail-facts"><span><Globe2 size={15}/><small>Location</small><strong>{hospital ? `${hospital.city}, ${hospital.country}` : 'CareAtlas partner'}</strong></span><span><Stethoscope size={15}/><small>Hospital ID</small><strong>{userProfile?.hospitalId}</strong></span><span><ShieldCheck size={15}/><small>User role</small><strong>{userProfile?.role}</strong></span><span><ShieldCheck size={15}/><small>Account</small><strong>{user?.email}</strong></span></div>{specialties.length ? <div className="phase6e-specialty-chips">{specialties.map(item => <span key={item}>{item}</span>)}</div> : null}</section>
      <section className="portal-card"><span className="eyebrow">GOVERNANCE</span><h2>CareAtlas-approved specialties.</h2><p>Hospitals can update operational information, but cannot directly publish new specialties or view/edit private commercial terms. New specialty additions require CareAtlas review.</p><div className="permission-banner"><ShieldCheck size={18}/><div><strong>Commercial separation</strong><span>Commission, revenue share, contracts and settlement terms exist in an admin-only collection.</span></div></div></section>
    </div>
    {live&&userProfile?.role==='hospital_admin'&&<form className="portal-card phase7g-hospital-edit" onSubmit={save}><span className="eyebrow">OPERATIONAL PROFILE</span><div className="phase7g-form-two"><label>Website<input value={form?.website||''} onChange={e=>setForm({...form,website:e.target.value})}/></label><label>Address<input value={form?.address||''} onChange={e=>setForm({...form,address:e.target.value})}/></label></div><label>Marketplace description<textarea value={form?.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="phase7g-form-two"><label>International desk email<input type="email" value={form?.internationalDeskEmail||''} onChange={e=>setForm({...form,internationalDeskEmail:e.target.value})}/></label><label>International desk phone<input value={form?.internationalDeskPhone||''} onChange={e=>setForm({...form,internationalDeskPhone:e.target.value})}/></label></div><div className="phase7g-form-two"><label>Languages <small>comma separated</small><input value={form?.languages||''} onChange={e=>setForm({...form,languages:e.target.value})}/></label><label>International services <small>comma separated</small><input value={form?.services||''} onChange={e=>setForm({...form,services:e.target.value})}/></label></div>{message&&<div className="phase7g-info">{message}</div>}<button className="button button-sm"><Save size={15}/> Save operational profile</button></form>}
  </HospitalShell>;
}
