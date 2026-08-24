'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowRight, Eye, EyeOff, ShieldCheck, UserCog } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { friendlyAuthError, signInPatient, signOutCurrentUser } from '@/lib/firebase/auth';
import { getFirebaseDb } from '@/lib/firebase/client';
import { isCareAtlasStaffRole } from '@/lib/firebase/admin';

export default function AdminAuthForm() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && userProfile && isCareAtlasStaffRole(userProfile.role)) {
      router.replace('/admin');
    }
  }, [loading, userProfile, router]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const user = await signInPatient(form);
      const profileSnapshot = await getDoc(doc(getFirebaseDb(), 'users', user.uid));
      const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;

      if (!profile || !isCareAtlasStaffRole(profile.role) || profile.status === 'disabled') {
        await signOutCurrentUser();
        const denied = new Error('This Firebase account is not provisioned for CareAtlas operations.');
        denied.code = 'careatlas/admin-access-denied';
        throw denied;
      }

      setForm(prev => ({ ...prev, password: '' }));
      router.replace('/admin');
    } catch (submitError) {
      if (submitError?.code === 'careatlas/admin-access-denied') {
        setError(submitError.message);
      } else {
        setError(friendlyAuthError(submitError));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-form-heading">
        <span className="eyebrow"><UserCog size={15}/> OPERATIONS SIGN IN</span>
        <h1>Run the medical travel network.</h1>
        <p>Authorized CareAtlas staff sign in with Firebase Authentication. Admin roles cannot self-register.</p>
      </div>

      <div className="prototype-banner phase6d-secure-banner">
        <ShieldCheck size={17}/>
        <div><strong>Role-based access enabled</strong><span>Access requires a trusted staff role in Firestore.</span></div>
      </div>

      {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}

      <label className="field-label">
        <span>CareAtlas work email</span>
        <input required type="email" autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="admin@careatlas.example"/>
      </label>

      <label className="field-label">
        <span>Password</span>
        <div className="password-field">
          <input required minLength={6} autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="Your Firebase password"/>
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
        </div>
      </label>

      <button className="button full-button auth-submit" type="submit" disabled={busy}>
        {busy ? 'Verifying access…' : 'Continue to operations'} {!busy && <ArrowRight size={17}/>} 
      </button>
      <p className="auth-switch">Patient account? <a href="/login">Open patient sign in</a></p>
    </form>
  );
}
