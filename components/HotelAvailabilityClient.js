'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, Plus } from 'lucide-react';
import HotelPartnerShell from '@/components/HotelPartnerShell';
import { useAuth } from '@/components/AuthProvider';
import { formatHotelMoney, formatStayDate, getHotelAvailability, getHotelRooms, saveHotelAvailability } from '@/lib/firebase/hotel';

const empty = { roomId: '', startDate: '', endDate: '', availableRooms: 1, nightlyRateOverride: '' };

export default function HotelAvailabilityClient() {
  const { hotelProfile } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [windows, setWindows] = useState([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const [roomRows, availabilityRows] = await Promise.all([getHotelRooms(undefined, { includeInactive: false }), getHotelAvailability()]);
    setRooms(roomRows);
    setWindows(availabilityRows);
    if (!form.roomId && roomRows[0]) setForm(current => ({ ...current, roomId: roomRows[0].id }));
  }

  useEffect(() => { load().catch(err => setMessage(err?.message || 'Unable to load availability.')); }, []);

  const roomMap = useMemo(() => Object.fromEntries(rooms.map(room => [room.id, room])), [rooms]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await saveHotelAvailability(form);
      setForm({ ...empty, roomId: form.roomId || rooms[0]?.id || '' });
      await load();
      setMessage('Availability window saved.');
    } catch (err) {
      setMessage(err?.message || 'Unable to save availability.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <HotelPartnerShell title="Availability" subtitle="Share date windows and room counts for longer medical-travel stays.">
      <div className="phase7d-grid-two">
        <form className="portal-card" onSubmit={save}>
          <div className="portal-card-heading"><div><span className="eyebrow">NEW WINDOW</span><h2>Add availability</h2></div><CalendarDays size={24}/></div>
          <label>Room type<select value={form.roomId} onChange={e => setForm(v => ({ ...v, roomId: e.target.value }))} required><option value="">Select room</option>{rooms.map(room => <option value={room.id} key={room.id}>{room.name}</option>)}</select></label>
          <div className="phase7d-form-grid-two">
            <label>Available from<input type="date" value={form.startDate} onChange={e => setForm(v => ({ ...v, startDate: e.target.value }))} required /></label>
            <label>Available until<input type="date" value={form.endDate} onChange={e => setForm(v => ({ ...v, endDate: e.target.value }))} required /></label>
            <label>Rooms available<input type="number" min="0" value={form.availableRooms} onChange={e => setForm(v => ({ ...v, availableRooms: e.target.value }))} /></label>
            <label>Rate override <small>optional</small><input type="number" min="0" value={form.nightlyRateOverride} onChange={e => setForm(v => ({ ...v, nightlyRateOverride: e.target.value }))} /></label>
          </div>
          {message && <div className={message.includes('saved') ? 'phase7d-form-success' : 'phase7d-form-error'}>{message}</div>}
          <button className="button" disabled={hotelProfile?.status !== 'approved' || saving || !rooms.length}>{saving ? <Loader2 size={16} className="phase7d-spin"/> : <Plus size={16}/>} Add availability</button>
          {!rooms.length && <small className="phase7d-muted">Publish a room type first.</small>}
        </form>

        <section className="portal-card">
          <span className="eyebrow">ACTIVE WINDOWS</span>
          <h2>{windows.length} date window{windows.length === 1 ? '' : 's'}</h2>
          <div className="phase7d-availability-list">
            {windows.map(item => {
              const room = roomMap[item.roomId];
              return <article key={item.id}><strong>{room?.name || 'Room'}</strong><span>{formatStayDate(item.startDate)} → {formatStayDate(item.endDate)}</span><i>{item.availableRooms} rooms · {item.nightlyRateOverride ? formatHotelMoney(item.nightlyRateOverride, room?.currency) : 'base rate'}</i></article>;
            })}
            {!windows.length && <p>No date-specific availability added yet. Patients can still request against your base room inventory.</p>}
          </div>
        </section>
      </div>
    </HotelPartnerShell>
  );
}
