'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import HotelPartnerShell from '@/components/HotelPartnerShell';
import { useAuth } from '@/components/AuthProvider';
import {
  HOTEL_AMENITIES,
  MEDICAL_STAY_FEATURES,
  PROPERTY_TYPES,
  getHotelProfile,
  updateHotelProfile
} from '@/lib/firebase/hotel';
import { hospitals } from '@/lib/data';

const empty = {
  propertyName: '',
  propertyType: 'Hotel',
  country: '',
  city: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  contactName: '',
  contactPhone: '',
  website: '',
  description: '',
  totalRooms: 0,
  starRating: 0,
  amenities: [],
  medicalStayFeatures: [],
  mealOptions: '',
  photoUrlsText: '',
  nearbyHospitalIdsRequested: []
};

export default function HotelProfileClient() {
  const { refreshProfile } = useAuth();
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getHotelProfile().then(profile => {
      if (!profile) return;
      setStatus(profile.status || '');
      setReviewNote(profile.reviewNote || '');
      setForm({
        ...empty,
        ...profile,
        photoUrlsText: (profile.photoUrls || []).join('\n')
      });
    }).catch(err => setMessage(err?.message || 'Unable to load profile.'));
  }, []);

  const hospitalOptions = useMemo(() => hospitals.map(item => ({ id: item.slug, label: `${item.name} · ${item.city}` })), []);

  function setField(key, value) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function toggleArray(key, value) {
    setForm(current => {
      const list = current[key] || [];
      return { ...current, [key]: list.includes(value) ? list.filter(item => item !== value) : [...list, value] };
    });
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateHotelProfile({
        ...form,
        photoUrls: form.photoUrlsText.split(/\n+/).map(item => item.trim()).filter(Boolean)
      });
      await refreshProfile();
      setMessage('Property profile saved.');
    } catch (err) {
      setMessage(err?.message || 'Unable to save property profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <HotelPartnerShell title="Property profile" subtitle="Describe the stay experience, accessibility and proximity to CareAtlas hospitals.">
      {reviewNote && <div className="phase7d-review-note"><ShieldCheck size={18}/><div><strong>CareAtlas review note</strong><span>{reviewNote}</span></div></div>}
      <form className="portal-card phase7d-profile-form" onSubmit={save}>
        <div className="phase7d-form-grid-two">
          <label>Property name<input value={form.propertyName} onChange={e => setField('propertyName', e.target.value)} required /></label>
          <label>Property type<select value={form.propertyType} onChange={e => setField('propertyType', e.target.value)}>{PROPERTY_TYPES.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Country<input value={form.country} onChange={e => setField('country', e.target.value)} required /></label>
          <label>City<input value={form.city} onChange={e => setField('city', e.target.value)} required /></label>
          <label>Address line 1<input value={form.addressLine1} onChange={e => setField('addressLine1', e.target.value)} /></label>
          <label>Address line 2<input value={form.addressLine2} onChange={e => setField('addressLine2', e.target.value)} /></label>
          <label>Postal code<input value={form.postalCode} onChange={e => setField('postalCode', e.target.value)} /></label>
          <label>Total rooms<input type="number" min="0" value={form.totalRooms} onChange={e => setField('totalRooms', e.target.value)} /></label>
          <label>Self-reported star category<input type="number" min="0" max="5" step="0.5" value={form.starRating} onChange={e => setField('starRating', e.target.value)} /></label>
          <label>Contact name<input value={form.contactName} onChange={e => setField('contactName', e.target.value)} /></label>
          <label>Phone / WhatsApp<input value={form.contactPhone} onChange={e => setField('contactPhone', e.target.value)} /></label>
          <label>Website<input value={form.website} onChange={e => setField('website', e.target.value)} placeholder="https://..." /></label>
        </div>

        <label>Description<textarea rows="5" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Describe the property, location and longer-stay experience." /></label>
        <label>Meal options<textarea rows="3" value={form.mealOptions} onChange={e => setField('mealOptions', e.target.value)} placeholder="Breakfast, vegetarian meals, room service, kitchenette..." /></label>

        <div className="phase7d-choice-section">
          <strong>General amenities</strong>
          <div className="phase7d-choice-grid">{HOTEL_AMENITIES.map(item => <label key={item}><input type="checkbox" checked={form.amenities.includes(item)} onChange={() => toggleArray('amenities', item)} /> {item}</label>)}</div>
        </div>

        <div className="phase7d-choice-section">
          <strong>Medical-travel friendly features</strong>
          <div className="phase7d-choice-grid">{MEDICAL_STAY_FEATURES.map(item => <label key={item}><input type="checkbox" checked={form.medicalStayFeatures.includes(item)} onChange={() => toggleArray('medicalStayFeatures', item)} /> {item}</label>)}</div>
        </div>

        <div className="phase7d-choice-section">
          <strong>Nearby CareAtlas-listed hospitals</strong>
          <p>Request the hospitals your property serves. CareAtlas confirms this mapping during review.</p>
          <div className="phase7d-choice-grid">{hospitalOptions.map(item => <label key={item.id}><input type="checkbox" checked={form.nearbyHospitalIdsRequested.includes(item.id)} onChange={() => toggleArray('nearbyHospitalIdsRequested', item.id)} /> {item.label}</label>)}</div>
        </div>

        <label>Property image URLs <small>One URL per line. Direct upload is intentionally not enabled in this MVP.</small>
          <textarea rows="4" value={form.photoUrlsText} onChange={e => setField('photoUrlsText', e.target.value)} placeholder="https://your-hotel.example/room.jpg" />
        </label>

        {message && <div className={message.includes('saved') ? 'phase7d-form-success' : 'phase7d-form-error'}>{message}</div>}
        <button className="button" disabled={saving}>{saving ? <Loader2 size={17} className="phase7d-spin"/> : <Save size={17}/>} Save profile</button>
        <small className="phase7d-muted">Current application status: {status.replaceAll('_', ' ') || 'loading'}</small>
      </form>
    </HotelPartnerShell>
  );
}
