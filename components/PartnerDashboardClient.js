'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeIndianRupee, CircleDollarSign, Clock3, Copy, UserCheck, UsersRound } from 'lucide-react';
import PartnerShell from '@/components/PartnerShell';
import { buildPartnerReferralUrl, formatPartnerMoney, getPartnerDashboardData } from '@/lib/firebase/partners';

export default function PartnerDashboardClient() {
  const [data,setData]=useState(null); const [error,setError]=useState(''); const [copied,setCopied]=useState(false); const [referralUrl,setReferralUrl]=useState('');
  useEffect(()=>{getPartnerDashboardData().then(result=>{setData(result);setReferralUrl(buildPartnerReferralUrl(result?.profile?.referralCode));}).catch(e=>setError(e.message));},[]);
  async function copyLink(){if(!referralUrl)return; await navigator.clipboard.writeText(referralUrl); setCopied(true); setTimeout(()=>setCopied(false),1500);}
  return <PartnerShell title="Partner overview" subtitle="Track introductions from first case to approved commission without exposing patient medical information.">
    {error && <div className="document-alert error">{error}</div>}
    {!data ? <div className="phase7a-loading">Loading partner performance…</div> : <>
      <div className="phase7a-partner-stats">
        <article><UsersRound size={19}/><strong>{data.referrals.length}</strong><span>Patients referred</span></article>
        <article><UserCheck size={19}/><strong>{data.qualified}</strong><span>Qualified referrals</span></article>
        <article><Clock3 size={19}/><strong>{formatPartnerMoney(data.pending)}</strong><span>Awaiting payout</span></article>
        <article><BadgeIndianRupee size={19}/><strong>{formatPartnerMoney(data.paid)}</strong><span>Paid earnings</span></article>
      </div>
      <div className="phase7a-dashboard-grid">
        <section className="portal-card phase7a-link-card"><span className="eyebrow">YOUR REFERRAL CODE</span><h2>{data.profile?.referralCode}</h2><p>Share your tracked CareAtlas link. First valid referral attribution is retained for 60 days.</p><div className="phase7a-share-line"><code>{referralUrl || 'Open Marketing to generate your link'}</code><button type="button" onClick={copyLink} disabled={data.profile?.status!=='approved'}><Copy size={15}/>{copied?'Copied':'Copy'}</button></div><Link className="link-arrow" href="/partner/marketing">Marketing tools <ArrowRight size={14}/></Link></section>
        <section className="portal-card"><span className="eyebrow">EARNINGS MODEL</span><div className="phase7a-rate"><CircleDollarSign size={22}/><strong>{data.profile?.commissionRatePct || 0}%</strong></div><h3>Share of eligible CareAtlas revenue</h3><p className="phase7a-muted">Commission is created only after CareAtlas verifies the commercial outcome. Patient treatment price and hospital ranking are not changed by partner compensation.</p><Link className="link-arrow" href="/partner/earnings">View ledger <ArrowRight size={14}/></Link></section>
      </div>
      <section className="portal-card phase7a-recent"><div className="portal-card-heading"><div><span className="eyebrow">RECENT REFERRALS</span><h2>Latest patient introductions.</h2></div><Link href="/partner/referrals" className="link-arrow">All referrals <ArrowRight size={14}/></Link></div>{data.referrals.length===0?<p className="phase7a-empty">No attributed cases yet. Share your referral link after your partner account is approved.</p>:data.referrals.slice(0,5).map(item=><article key={item.id}><div><strong>{item.patientAlias}</strong><span>{item.treatmentName} · {item.patientCountry}</span></div><div><b>{String(item.referralStatus||'').replaceAll('_',' ')}</b><small>{item.caseNumber}</small></div></article>)}</section>
    </>}
  </PartnerShell>;
}
