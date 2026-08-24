'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';

export default function AuthForm({ mode = 'login' }) {
  const router = useRouter();
  const isRegister = mode === 'register';
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', country: '', password: '' });

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    // Static-host prototype: do not persist or transmit passwords.
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('careatlas-demo-user', JSON.stringify({
        name: form.name || form.email.split('@')[0] || 'Patient',
        email: form.email,
        country: form.country
      }));
    }
    setForm(prev => ({ ...prev, password: '' }));
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="auth-success">
        <span className="auth-success-icon"><ShieldCheck size={28}/></span>
        <span className="eyebrow">PROTOTYPE ACCESS READY</span>
        <h2>{isRegister ? 'Your demo account is ready.' : 'You are signed in for this browser session.'}</h2>
        <p>CareAtlas is currently hosted as a static preview. No password was stored or transmitted. Real authentication will be connected when the secure backend is introduced.</p>
        <button className="button full-button" type="button" onClick={() => router.push('/get-treatment-plan')}>Continue to treatment planner <ArrowRight size={17}/></button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-form-heading">
        <span className="eyebrow"><LockKeyhole size={15}/> {isRegister ? 'CREATE ACCOUNT' : 'PATIENT SIGN IN'}</span>
        <h1>{isRegister ? 'Create your CareAtlas access.' : 'Welcome back to CareAtlas.'}</h1>
        <p>{isRegister ? 'Set up your patient access for the prototype journey.' : 'Continue your medical travel planning journey.'}</p>
      </div>

      <div className="prototype-banner">
        <ShieldCheck size={17}/>
        <div><strong>Static prototype mode</strong><span>Do not use a real password. Credentials are not sent anywhere.</span></div>
      </div>

      {isRegister && (
        <div className="form-row-two">
          <label className="field-label"><span>Full name</span><input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" /></label>
          <label className="field-label"><span>Country</span><input required value={form.country} onChange={e => update('country', e.target.value)} placeholder="Country of residence" /></label>
        </div>
      )}

      <label className="field-label"><span>Email address</span><input required type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" /></label>
      <label className="field-label">
        <span>Password</span>
        <div className="password-field">
          <input required minLength={6} type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} placeholder="Use a temporary demo password" />
          <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
        </div>
      </label>

      <button className="button full-button auth-submit" type="submit">{isRegister ? 'Create demo access' : 'Continue'} <ArrowRight size={17}/></button>

      <p className="auth-switch">
        {isRegister ? 'Already have access?' : 'New to CareAtlas?'}{' '}
        <Link href={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create account'}</Link>
      </p>
    </form>
  );
}
