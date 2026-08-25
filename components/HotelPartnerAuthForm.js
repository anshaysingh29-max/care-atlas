'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import {
  PROPERTY_TYPES,
  registerHotelPartner,
  signInHotelPartner
} from '@/lib/firebase/hotel';
import { useAuth } from '@/components/AuthProvider';

const emptyRegister = {
  propertyName: '',
  propertyType: 'Hotel',
  contactName: '',
  email: '',
  password: '',
  country: '',
  city: '',
  phone: '',
  acceptedTerms: false
};

export default function HotelPartnerAuthForm({ mode = 'login' }) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [form, setForm] = useState(mode === 'register' ? emptyRegister : { email: '', password: '' });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  function setField(key, value) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setWorking(true);
    setError('');
    try {
      if (mode === 'register') {
        const result = await registerHotelPartner(form);
        await refreshProfile(result.user);
      } else {
        const user = await signInHotelPartner(form);
        await refreshProfile(user);
      }
      router.replace('/hotel');
    } catch (submitError) {
      console.error(submitError);
      setError(submitError?.message || 'Unable to continue. Please try again.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="phase7d-auth-wrap">
      <div className="phase7d-auth-panel">
        <div className="phase7d-auth-copy">
          <span className="eyebrow">CAREATLAS STAY NETWORK</span>
          <Building2 size={42}/>
          <h1>{mode === 'register' ? 'List your property for medical travellers.' : 'Stay Partner sign in'}</h1>
          <p>
            CareAtlas Stay Partners can publish medical-friendly rooms, share availability,
            respond to booking requests and coordinate longer recovery stays.
          </p>
          <div className="phase7d-auth-points">
            <span><CheckCircle2 size={17}/> Reach international patients and companions</span>
            <span><CheckCircle2 size={17}/> Control room rates and availability</span>
            <span><CheckCircle2 size={17}/> No access to patient medical records</span>
          </div>
          <div className="phase7d-auth-security">
            <ShieldCheck size={18}/>
            <span>Property applications are reviewed before rooms become visible to patients.</span>
          </div>
        </div>

        <form className="phase7d-auth-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">{mode === 'register' ? 'HOTEL ONBOARDING' : 'PARTNER ACCESS'}</span>
            <h2>{mode === 'register' ? 'Create your Stay Partner account' : 'Welcome back'}</h2>
          </div>

          {mode === 'register' && (
            <>
              <label>Property name<input value={form.propertyName} onChange={e => setField('propertyName', e.target.value)} required /></label>
              <div className="phase7d-form-grid-two">
                <label>Property type
                  <select value={form.propertyType} onChange={e => setField('propertyType', e.target.value)}>
                    {PROPERTY_TYPES.map(item => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label>Primary contact<input value={form.contactName} onChange={e => setField('contactName', e.target.value)} required /></label>
              </div>
              <div className="phase7d-form-grid-two">
                <label>Country<input value={form.country} onChange={e => setField('country', e.target.value)} required /></label>
                <label>City<input value={form.city} onChange={e => setField('city', e.target.value)} required /></label>
              </div>
              <label>Phone / WhatsApp<input value={form.phone} onChange={e => setField('phone', e.target.value)} /></label>
            </>
          )}

          <label>Email<input type="email" value={form.email} onChange={e => setField('email', e.target.value)} required /></label>
          <label>Password<input type="password" minLength={6} value={form.password} onChange={e => setField('password', e.target.value)} required /></label>

          {mode === 'register' && (
            <label className="phase7d-checkbox-row">
              <input type="checkbox" checked={form.acceptedTerms} onChange={e => setField('acceptedTerms', e.target.checked)} />
              <span>I accept the CareAtlas Stay Partner terms and understand approval is required before the property is published.</span>
            </label>
          )}

          {error && <div className="phase7d-form-error">{error}</div>}
          <button className="button phase7d-submit" type="submit" disabled={working}>
            {working && <Loader2 size={17} className="phase7d-spin"/>}
            {mode === 'register' ? 'Submit property application' : 'Sign in'}
          </button>

          <p className="phase7d-auth-switch">
            {mode === 'register'
              ? <>Already registered? <Link href="/hotel-login">Sign in</Link></>
              : <>New property? <Link href="/hotel-register">Apply to join</Link></>}
          </p>
        </form>
      </div>
    </section>
  );
}
