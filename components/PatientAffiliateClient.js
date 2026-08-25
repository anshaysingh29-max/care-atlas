'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  Copy,
  Handshake,
  ShieldCheck,
  UsersRound
} from 'lucide-react';
import PatientShell from '@/components/PatientShell';
import { useAuth } from '@/components/AuthProvider';
import {
  PARTNER_TYPES,
  buildPartnerReferralUrl,
  registerCurrentPatientAsPartner
} from '@/lib/firebase/partners';

export default function PatientAffiliateClient() {
  const { user, patientProfile, partnerProfile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    phone: '',
    organization: '',
    partnerType: 'Former patient / community advocate',
    acceptedTerms: false
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      phone: patientProfile?.phone || prev.phone
    }));
  }, [patientProfile?.phone]);

  const referralUrl = useMemo(
    () => partnerProfile?.status === 'approved' ? buildPartnerReferralUrl(partnerProfile.referralCode) : '',
    [partnerProfile?.status, partnerProfile?.referralCode]
  );

  async function apply(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      await registerCurrentPatientAsPartner(form);
      await refreshProfile(user);
      setNotice('Your CareAtlas Partner application has been submitted for review.');
    } catch (error) {
      setNotice(error?.message || 'Could not submit the partner application.');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!partnerProfile) {
    return <PatientShell title="Earn with CareAtlas" subtitle="Your patient account can also become a referral partner — no second login required.">
      <div className="phase7b-affiliate-intro">
        <section className="portal-card">
          <Handshake size={28}/>
          <span className="eyebrow">PATIENT + PARTNER</span>
          <h2>Help someone find care. Earn when a verified referral generates CareAtlas revenue.</h2>
          <p>You keep your normal patient account. If approved, the same login also opens a separate Partner workspace for referral links, leads, earnings and payouts.</p>
          <div className="phase7b-affiliate-points">
            <span><UsersRound size={16}/><strong>Refer people</strong><small>Share your tracked link or submit a consented lead.</small></span>
            <span><BadgeIndianRupee size={16}/><strong>Earn after verification</strong><small>Commission is based on eligible CareAtlas revenue, not medical advice or hospital ranking.</small></span>
            <span><ShieldCheck size={16}/><strong>Privacy separated</strong><small>Your affiliate view never exposes another patient’s medical records.</small></span>
          </div>
        </section>

        <form className="portal-card phase7b-affiliate-form" onSubmit={apply}>
          <span className="eyebrow">PARTNER APPLICATION</span>
          <h2>Apply with your existing patient account.</h2>
          {notice && <div className="document-alert error">{notice}</div>}
          <label className="field-label"><span>Name</span><input disabled value={patientProfile?.displayName || user?.displayName || ''}/></label>
          <label className="field-label"><span>Country</span><input disabled value={patientProfile?.country || ''}/></label>
          <label className="field-label"><span>Phone</span><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Optional contact number"/></label>
          <label className="field-label"><span>Organization / community</span><input value={form.organization} onChange={e=>setForm({...form,organization:e.target.value})} placeholder="Optional"/></label>
          <label className="field-label"><span>How will you refer patients?</span><select value={form.partnerType} onChange={e=>setForm({...form,partnerType:e.target.value})}>{PARTNER_TYPES.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
          <label className="phase7b-check"><input type="checkbox" checked={form.acceptedTerms} onChange={e=>setForm({...form,acceptedTerms:e.target.checked})}/><span>I accept the CareAtlas Partner terms and agree to disclose that I may receive compensation for successful referrals. I will not make medical guarantees or influence clinical recommendations.</span></label>
          <button className="button full-button" type="submit" disabled={busy || !form.acceptedTerms}>{busy?'Submitting…':'Apply to become a partner'} <ArrowRight size={16}/></button>
        </form>
      </div>
    </PatientShell>;
  }

  const approved = partnerProfile.status === 'approved';
  return <PatientShell title="Earn with CareAtlas" subtitle="Your patient and referral-partner access live under the same Firebase account.">
    {notice && <div className="document-alert success">{notice}</div>}
    <section className={`portal-card phase7b-affiliate-status ${approved?'approved':'pending'}`}>
      {approved ? <CheckCircle2 size={30}/> : <ShieldCheck size={30}/>}
      <span className="eyebrow">{approved?'PARTNER ACTIVE':'APPLICATION STATUS'}</span>
      <h2>{approved ? 'Your referral account is active.' : partnerProfile.status === 'pending_review' ? 'Your application is under review.' : `Partner status: ${partnerProfile.status}`}</h2>
      {approved ? <>
        <div className="phase7b-affiliate-summary">
          <span><small>Referral code</small><strong>{partnerProfile.referralCode}</strong></span>
          <span><small>Revenue share</small><strong>{partnerProfile.commissionRatePct || 0}%</strong></span>
          <span><small>Partner type</small><strong>{partnerProfile.partnerType}</strong></span>
        </div>
        <div className="phase7b-affiliate-actions">
          <Link className="button" href="/partner">Open Partner workspace <ArrowRight size={16}/></Link>
          <button className="text-button phase7b-copy-button" type="button" onClick={copy}><Copy size={15}/>{copied?'Copied':'Copy referral link'}</button>
        </div>
      </> : <p>CareAtlas will review the application before your referral code becomes active. You can continue using every patient feature normally while you wait.</p>}
    </section>
  </PatientShell>;
}
