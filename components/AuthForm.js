'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import {
  friendlyAuthError,
  registerPatient,
  resetPatientPassword,
  signInPatient
} from '@/lib/firebase/auth';
import { useAuth } from '@/components/AuthProvider';

const PENDING_CASE_KEY = 'careatlas-pending-case';

export default function AuthForm({ mode = 'login' }) {
  const router = useRouter();
  const { user, loading: authLoading, refreshProfile, firebaseConfigured } = useAuth();
  const isRegister = mode === 'register';
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', country: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const pending = JSON.parse(window.sessionStorage.getItem(PENDING_CASE_KEY) || 'null');
      if (pending?.form && isRegister) {
        setForm(prev => ({
          ...prev,
          name: pending.form.name || prev.name,
          email: pending.form.email || prev.email,
          country: pending.form.country || prev.country
        }));
      }
    } catch {
      // Ignore malformed browser-only draft state.
    }
  }, [isRegister]);

  useEffect(() => {
    if (!authLoading && user && !submitting) {
      router.replace('/patient');
    }
  }, [authLoading, user, submitting, router]);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
    setNotice('');
  }

  async function submit(event) {
    event.preventDefault();
    if (!firebaseConfigured) {
      setError('Firebase is not configured for this build yet.');
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      let signedInUser;
      if (isRegister) {
        signedInUser = await registerPatient(form);
      } else {
        signedInUser = await signInPatient(form);
      }

      await refreshProfile(signedInUser);
      setForm(prev => ({ ...prev, password: '' }));

      const hasPendingCase = typeof window !== 'undefined' &&
        Boolean(window.sessionStorage.getItem(PENDING_CASE_KEY));
      router.replace(hasPendingCase ? '/get-treatment-plan' : '/patient');
    } catch (authError) {
      setError(friendlyAuthError(authError));
    } finally {
      setSubmitting(false);
    }
  }

  async function forgotPassword() {
    setError('');
    setNotice('');
    try {
      await resetPatientPassword(form.email);
      setNotice('Password reset email sent. Check your inbox and spam folder.');
    } catch (resetError) {
      setError(friendlyAuthError(resetError));
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-form-heading">
        <span className="eyebrow"><LockKeyhole size={15}/> {isRegister ? 'CREATE PATIENT ACCOUNT' : 'PATIENT SIGN IN'}</span>
        <h1>{isRegister ? 'Create your CareAtlas account.' : 'Welcome back to CareAtlas.'}</h1>
        <p>{isRegister ? 'Your account will securely connect your treatment requests and patient journey.' : 'Sign in to continue your medical travel planning journey.'}</p>
      </div>

      <div className="prototype-banner">
        <ShieldCheck size={17}/>
        <div>
          <strong>Firebase authentication is live</strong>
          <span>Your password is handled by Firebase Authentication and is never stored in CareAtlas Firestore.</span>
        </div>
      </div>

      {isRegister && (
        <div className="form-row-two">
          <label className="field-label"><span>Full name</span><input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" autoComplete="name" /></label>
          <label className="field-label"><span>Country</span><input required value={form.country} onChange={e => update('country', e.target.value)} placeholder="Country of residence" autoComplete="country-name" /></label>
        </div>
      )}

      <label className="field-label"><span>Email address</span><input required type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
      <label className="field-label">
        <span>Password</span>
        <div className="password-field">
          <input required minLength={6} type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} placeholder={isRegister ? 'Minimum 6 characters' : 'Your password'} autoComplete={isRegister ? 'new-password' : 'current-password'} />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
        </div>
      </label>

      {error && <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Could not continue</strong><span>{error}</span></div></div>}
      {notice && <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Email sent</strong><span>{notice}</span></div></div>}

      {!isRegister && (
        <button className="back-button" type="button" onClick={forgotPassword} disabled={submitting}>Forgot password?</button>
      )}

      <button className="button full-button auth-submit" type="submit" disabled={submitting || authLoading || !firebaseConfigured}>
        {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'} {!submitting && <ArrowRight size={17}/>} 
      </button>

      <p className="auth-switch">
        {isRegister ? 'Already have an account?' : 'New to CareAtlas?'}{' '}
        <Link href={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create account'}</Link>
      </p>
    </form>
  );
}
