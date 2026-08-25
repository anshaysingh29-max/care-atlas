'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import PartnerShell from '@/components/PartnerShell';
import { getPartnerReferrals } from '@/lib/firebase/partners';

function status(value) {
  return String(value || 'case_created').replaceAll('_',' ');
}

export default function PartnerReferralsClient() {
  const [rows,setRows]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{getPartnerReferrals().then(setRows).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);

  return <PartnerShell title="Referrals" subtitle="Follow attributed cases using privacy-safe aliases, campaign tags and commercial status only.">
    {error&&<div className="document-alert error">{error}</div>}
    <div className="permission-banner phase7b-referral-privacy"><ShieldAlert size={18}/><div><strong>No clinical access</strong><span>Partners see referral progress and commercial status, not medical reports, diagnosis details or hospital clinical notes.</span></div></div>
    <section className="portal-card phase7b-referral-table">
      <div className="phase7b-referral-row head"><span>Patient</span><span>Treatment</span><span>Campaign</span><span>Stage</span><span>Commission</span></div>
      {loading?<div className="phase7a-loading">Loading referrals…</div>:rows.length===0?<p className="phase7a-empty">No attributed cases yet.</p>:rows.map(item=><div className={`phase7b-referral-row ${item.selfReferral?'flagged':''}`} key={item.id}>
        <span><strong>{item.patientAlias}</strong><small>{item.caseNumber}</small></span>
        <span>{item.treatmentName}<small>{item.patientCountry}</small></span>
        <span>{item.campaign || 'general'}</span>
        <span><b>{item.selfReferral?'Self-referral · ineligible':status(item.referralStatus)}</b></span>
        <span>{item.selfReferral?'Blocked':status(item.commissionStatus)}</span>
      </div>)}
    </section>
  </PartnerShell>;
}
