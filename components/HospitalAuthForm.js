'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function HospitalAuthForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  function submit(e) {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('careatlas-demo-hospital', JSON.stringify({ hospital: 'Aster Nova Institute', email: form.email }));
    }
    setForm(prev => ({ ...prev, password: '' }));
    setSubmitted(true);
  }

  if (submitted) {
    return <div className="auth-success hospital-auth-success">
      <span className="auth-success-icon"><Building2 size={28}/></span>
      <span className="eyebrow">PARTNER ACCESS READY</span>
      <h2>Aster Nova demo workspace is ready.</h2>
      <p>This static preview contains fictional cases and stores no hospital password. Production partner access will require verified users, role controls and audit logging.</p>
      <button className="button full-button" type="button" onClick={() => router.push('/hospital')}>Open hospital dashboard <ArrowRight size={17}/></button>
    </div>;
  }

  return <form className="auth-form" onSubmit={submit}>
    <div className="auth-form-heading">
      <span className="eyebrow"><Building2 size={15}/> HOSPITAL SIGN IN</span>
      <h1>Manage international patient cases.</h1>
      <p>Review shared records, respond with structured treatment plans and coordinate consultations.</p>
    </div>
    <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Static prototype mode</strong><span>Use demo credentials only. Nothing is transmitted to a server.</span></div></div>
    <label className="field-label"><span>Work email</span><input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="international@hospital.example" /></label>
    <label className="field-label"><span>Password</span><div className="password-field"><input required minLength={6} type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Temporary demo password"/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
    <button className="button full-button auth-submit" type="submit">Continue to partner portal <ArrowRight size={17}/></button>
    <p className="auth-switch">Patient? <a href="/login">Open patient sign in</a></p>
  </form>;
}
