'use client';

import { useEffect, useState } from 'react';
import { BedDouble, Loader2, Plus, Save } from 'lucide-react';
import HotelPartnerShell from '@/components/HotelPartnerShell';
import { useAuth } from '@/components/AuthProvider';
import { createHotelRoom, formatHotelMoney, getHotelRooms, updateHotelRoom } from '@/lib/firebase/hotel';

const empty = {
  name: '',
  roomType: 'Standard room',
  bedType: '',
  maxGuests: 2,
  roomsAvailable: 1,
  nightlyRate: '',
  currency: 'INR',
  taxesIncluded: false,
  featuresText: ''
};

export default function HotelRatesClient() {
  const { hotelProfile } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      setRooms(await getHotelRooms());
    } catch (err) {
      setMessage(err?.message || 'Unable to load rooms.');
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(room) {
    setEditing(room.id);
    setForm({
      ...room,
      featuresText: (room.features || []).join(', ')
    });
  }

  function reset() {
    setEditing('');
    setForm(empty);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        ...form,
        features: form.featuresText.split(',').map(item => item.trim()).filter(Boolean)
      };
      if (editing) await updateHotelRoom(editing, payload);
      else await createHotelRoom(payload);
      await load();
      reset();
      setMessage(editing ? 'Room updated.' : 'Room published.');
    } catch (err) {
      setMessage(err?.message || 'Unable to save room.');
    } finally {
      setSaving(false);
    }
  }

  const approved = hotelProfile?.status === 'approved';

  return (
    <HotelPartnerShell title="Rooms & rates" subtitle="Publish the room types and base rates that CareAtlas patients can request.">
      <div className="phase7d-grid-two phase7d-rates-layout">
        <form className="portal-card phase7d-room-form" onSubmit={save}>
          <div className="portal-card-heading"><div><span className="eyebrow">{editing ? 'EDIT ROOM' : 'NEW ROOM'}</span><h2>{editing ? 'Update room' : 'Add room type'}</h2></div><BedDouble size={24}/></div>
          <label>Room name<input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} required /></label>
          <div className="phase7d-form-grid-two">
            <label>Room type<input value={form.roomType} onChange={e => setForm(v => ({ ...v, roomType: e.target.value }))} /></label>
            <label>Bed type<input value={form.bedType} onChange={e => setForm(v => ({ ...v, bedType: e.target.value }))} placeholder="King / Twin / Accessible" /></label>
            <label>Max guests<input type="number" min="1" value={form.maxGuests} onChange={e => setForm(v => ({ ...v, maxGuests: e.target.value }))} /></label>
            <label>Base rooms available<input type="number" min="0" value={form.roomsAvailable} onChange={e => setForm(v => ({ ...v, roomsAvailable: e.target.value }))} /></label>
            <label>Nightly rate<input type="number" min="1" value={form.nightlyRate} onChange={e => setForm(v => ({ ...v, nightlyRate: e.target.value }))} required /></label>
            <label>Currency<input maxLength="8" value={form.currency} onChange={e => setForm(v => ({ ...v, currency: e.target.value.toUpperCase() }))} /></label>
          </div>
          <label>Features <small>Comma separated</small><input value={form.featuresText} onChange={e => setForm(v => ({ ...v, featuresText: e.target.value }))} placeholder="Kitchenette, accessible bathroom, balcony" /></label>
          <label className="phase7d-checkbox-row"><input type="checkbox" checked={Boolean(form.taxesIncluded)} onChange={e => setForm(v => ({ ...v, taxesIncluded: e.target.checked }))} /><span>Rate already includes taxes</span></label>
          {editing && <label className="phase7d-checkbox-row"><input type="checkbox" checked={form.active !== false} onChange={e => setForm(v => ({ ...v, active: e.target.checked }))} /><span>Room is active</span></label>}
          {message && <div className={message.includes('updated') || message.includes('published') ? 'phase7d-form-success' : 'phase7d-form-error'}>{message}</div>}
          <div className="phase7d-inline-actions">
            <button className="button" disabled={!approved || saving}>{saving ? <Loader2 size={16} className="phase7d-spin"/> : editing ? <Save size={16}/> : <Plus size={16}/>} {editing ? 'Save room' : 'Publish room'}</button>
            {editing && <button type="button" className="button secondary" onClick={reset}>Cancel edit</button>}
          </div>
          {!approved && <small className="phase7d-muted">Room publishing unlocks after CareAtlas approves your property.</small>}
        </form>

        <section className="portal-card">
          <span className="eyebrow">PUBLISHED INVENTORY</span>
          <h2>{rooms.length} room type{rooms.length === 1 ? '' : 's'}</h2>
          <div className="phase7d-room-list">
            {rooms.map(room => (
              <article key={room.id} className={room.active === false ? 'inactive' : ''}>
                <div><strong>{room.name}</strong><span>{room.roomType} · {room.bedType || 'Bed type not set'} · up to {room.maxGuests} guests</span></div>
                <div><strong>{formatHotelMoney(room.nightlyRate, room.currency)}</strong><span>{room.roomsAvailable} base rooms · {room.taxesIncluded ? 'tax included' : 'tax extra'}</span></div>
                <button type="button" onClick={() => startEdit(room)}>Edit</button>
              </article>
            ))}
            {!rooms.length && <p>No rooms published yet.</p>}
          </div>
        </section>
      </div>
    </HotelPartnerShell>
  );
}
