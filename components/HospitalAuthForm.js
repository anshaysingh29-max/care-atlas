'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Eye, EyeOff, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { friendlyAuthError } from '@/lib/firebase/auth';
import { isHospitalUserRole, signInHospital } from '@/lib/firebase/hospital';

export default function HospitalAuthForm() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user && userProfile && isHospitalUserRole(userProfile.role) && userProfile.hospitalId) {
      router.replace('/hospital');
    }
  }, [loading, user, userProfile, router]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signInHospital(form);
      setForm(prev => ({ ...prev, password: '' }));
      router.replace('/hospital');
    } catch (signInError) {
      setError(friendlyAuthError(signInError));
    } finally {
      setBusy(false);
    }
  }

  return <form className="auth-form" onSubmit={submit}>
    <div className="auth-form-heading">
      <span className="eyebrow"><Building2 size={15}/> HOSPITAL SIGN IN</span>
      <h1>Manage assigned international patient cases.</h1>
      <p>Verified hospital users can review shared records, submit treatment plans and coordinate consultations.</p>
    </div>
    <div className="prototype-banner phase6e-live-banner"><ShieldCheck size={17}/><div><strong>Firebase partner access</strong><span>Hospital accounts are provisioned by CareAtlas. Patients cannot self-register as hospital users.</span></div></div>
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
    <label className="field-label"><span>Work email</span><input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="international@hospital.example" autoComplete="email"/></label>
    <label className="field-label"><span>Password</span><div className="password-field"><input required minLength={6} type={showPassword ? 'text' : 'password'} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="Hospital account password" autoComplete="current-password"/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
    <button className="button full-button auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : null}{busy ? ' Verifying access…' : <>Continue to partner portal <ArrowRight size={17}/></>}</button>
    <p className="auth-switch">Patient? <a href="/login">Open patient sign in</a></p>
  </form>;
}
