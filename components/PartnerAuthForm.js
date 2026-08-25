'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Handshake, LoaderCircle, ShieldCheck } from 'lucide-react';
import { friendlyAuthError } from '@/lib/firebase/auth';
import { PARTNER_TYPES, isPartnerRole, registerPartner, signInPartner } from '@/lib/firebase/partners';
import { useAuth } from '@/components/AuthProvider';

export default function PartnerAuthForm({ mode = 'login' }) {
  const router = useRouter();
  const { user, userProfile, partnerProfile, loading, refreshProfile } = useAuth();
  const registerMode = mode === 'register';
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '', country: '', phone: '', organization: '',
    partnerType: 'Independent referral partner', acceptedTerms: false
  });

  useEffect(() => {
    if (!loading && user && isPartnerRole(userProfile?.role) && partnerProfile && !['rejected', 'suspended'].includes(partnerProfile.status)) router.replace('/partner');
  }, [loading, user, userProfile, partnerProfile, router]);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      let signedInUser;
      if (registerMode) {
        const result = await registerPartner(form);
        signedInUser = result.user;
      } else {
        signedInUser = await signInPartner(form);
      }
      await refreshProfile(signedInUser);
      setForm(prev => ({ ...prev, password: '' }));
      router.replace('/partner');
    } catch (submitError) {
      if (submitError?.code?.startsWith('careatlas/partner-')) setError(submitError.message);
      else setError(friendlyAuthError(submitError));
    } finally {
      setBusy(false);
    }
  }

  return <form className="auth-form phase7a-auth-form" onSubmit={submit}>
    <div className="auth-form-heading">
      <span className="eyebrow"><Handshake size={15}/> CAREATLAS PARTNERS</span>
      <h1>{registerMode ? 'Build a healthcare referral business with CareAtlas.' : 'Welcome back, partner.'}</h1>
      <p>{registerMode ? 'Introduce patients to CareAtlas and track qualified referrals and approved earnings without accessing medical records.' : 'Track referrals, earnings and payout status from your partner workspace.'}</p>
    </div>
    <div className="prototype-banner phase7a-partner-banner"><ShieldCheck size={17}/><div><strong>Privacy-separated partner access</strong><span>Partners never receive patient medical documents or clinical records. Accounts require CareAtlas approval before referral links activate.</span></div></div>
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}

    {registerMode && <>
      <label className="field-label"><span>Your name</span><input required value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Full name"/></label>
      <label className="field-label"><span>Country</span><input required value={form.country} onChange={e=>update('country',e.target.value)} placeholder="e.g. Kenya"/></label>
      <label className="field-label"><span>Phone</span><input value={form.phone} onChange={e=>update('phone',e.target.value)} placeholder="Business / WhatsApp number"/></label>
      <label className="field-label"><span>Organization (optional)</span><input value={form.organization} onChange={e=>update('organization',e.target.value)} placeholder="Agency or business name"/></label>
      <label className="field-label"><span>Partner type</span><select value={form.partnerType} onChange={e=>update('partnerType',e.target.value)}>{PARTNER_TYPES.map(item=><option value={item} key={item}>{item}</option>)}</select></label>
    </>}

    <label className="field-label"><span>Email</span><input required type="email" autoComplete="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="partner@example.com"/></label>
    <label className="field-label"><span>Password</span><div className="password-field"><input required minLength={6} autoComplete={registerMode?'new-password':'current-password'} type={showPassword?'text':'password'} value={form.password} onChange={e=>update('password',e.target.value)} placeholder="Minimum 6 characters"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>

    {registerMode && <label className="phase7a-terms"><input required type="checkbox" checked={form.acceptedTerms} onChange={e=>update('acceptedTerms',e.target.checked)}/><span>I agree to the CareAtlas Partner terms and understand that referral compensation must not influence clinical recommendations, hospital ranking or patient treatment price. Regulated clinical referral arrangements require separate approval.</span></label>}

    <button className="button full-button auth-submit" type="submit" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:null}{busy ? ' Please wait…' : <>{registerMode?'Create partner account':'Open partner workspace'} <ArrowRight size={17}/></>}</button>
    <p className="auth-switch">{registerMode ? <>Already a partner? <Link href="/partner-login">Sign in</Link></> : <>New to the network? <Link href="/partner-register">Apply as a partner</Link></>}</p>
  </form>;
}
