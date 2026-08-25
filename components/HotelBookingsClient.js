'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Loader2 } from 'lucide-react';
import HotelPartnerShell from '@/components/HotelPartnerShell';
import {
  formatHotelMoney,
  formatStayDate,
  getHotelBookings,
  updateHotelBooking
} from '@/lib/firebase/hotel';

function actionsFor(status) {
  const map = {
    requested: [['quoted', 'Send quote'], ['declined', 'Decline']],
    quoted: [['confirmed', 'Confirm booking'], ['declined', 'Decline']],
    confirmed: [['checked_in', 'Mark checked in'], ['cancelled', 'Cancel']],
    checked_in: [['completed', 'Mark completed']]
  };
  return map[status] || [];
}

export default function HotelBookingsClient() {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setRows(await getHotelBookings());
  }

  useEffect(() => { load().catch(err => setMessage(err?.message || 'Unable to load bookings.')); }, []);

  function draftFor(row) {
    return drafts[row.id] || {
      quotedNightlyRate: row.quotedNightlyRate || row.requestedNightlyRate || '',
      taxesAndFees: row.taxesAndFees || 0,
      hotelNote: row.hotelNote || ''
    };
  }

  function setDraft(id, key, value) {
    setDrafts(current => ({
      ...current,
      [id]: { ...(current[id] || {}), [key]: value }
    }));
  }

  async function move(row, status) {
    setWorking(`${row.id}:${status}`);
    setMessage('');
    try {
      await updateHotelBooking({ bookingId: row.id, status, ...draftFor(row) });
      await load();
      setMessage(`Booking ${row.bookingId} updated.`);
    } catch (err) {
      setMessage(err?.message || 'Unable to update booking.');
    } finally {
      setWorking('');
    }
  }

  return (
    <HotelPartnerShell title="Bookings" subtitle="Quote and confirm CareAtlas accommodation requests without accessing medical records.">
      {message && <div className={message.includes('updated') ? 'phase7d-form-success' : 'phase7d-form-error'}>{message}</div>}
      <div className="phase7d-booking-list">
        {rows.map(row => {
          const draft = draftFor(row);
          const open = ['requested', 'quoted'].includes(row.status);
          return (
            <section className="portal-card phase7d-booking-card" key={row.id}>
              <div className="phase7d-booking-head">
                <div><span className="eyebrow">{row.bookingId}</span><h2>{row.patientAlias} · {row.roomName}</h2><p>{formatStayDate(row.checkInDate)} → {formatStayDate(row.checkOutDate)} · {row.nights} nights · {row.guests} guest{row.guests === 1 ? '' : 's'}</p></div>
                <span className={`phase7d-booking-status ${row.status}`}>{row.status.replaceAll('_', ' ')}</span>
              </div>

              <div className="phase7d-booking-details">
                <div><small>REQUESTED RATE</small><strong>{formatHotelMoney(row.requestedNightlyRate, row.currency)} / night</strong></div>
                <div><small>ESTIMATED BASE</small><strong>{formatHotelMoney(row.estimatedSubtotal, row.currency)}</strong></div>
                <div><small>ACCESSIBILITY / STAY NOTE</small><strong>{row.accessibilityNeeds || 'No special stay request'}</strong></div>
              </div>

              {open && (
                <div className="phase7d-booking-quote">
                  <label>Quoted nightly rate<input type="number" min="0" value={draft.quotedNightlyRate} onChange={e => setDraft(row.id, 'quotedNightlyRate', e.target.value)} /></label>
                  <label>Taxes / fees<input type="number" min="0" value={draft.taxesAndFees} onChange={e => setDraft(row.id, 'taxesAndFees', e.target.value)} /></label>
                  <label>Hotel note<input value={draft.hotelNote} onChange={e => setDraft(row.id, 'hotelNote', e.target.value)} placeholder="Breakfast included, shuttle timings, check-in note..." /></label>
                </div>
              )}

              {row.totalAmount !== null && row.totalAmount !== undefined && (
                <div className="phase7d-total-strip">
                  <CheckCircle2 size={18}/><span>Current booking total</span><strong>{formatHotelMoney(row.totalAmount, row.currency)}</strong>
                </div>
              )}

              <div className="phase7d-inline-actions">
                {actionsFor(row.status).map(([status, label]) => (
                  <button key={status} type="button" className={status === 'declined' || status === 'cancelled' ? 'button secondary' : 'button'} onClick={() => move(row, status)} disabled={working !== ''}>
                    {working === `${row.id}:${status}` && <Loader2 size={15} className="phase7d-spin"/>}{label}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
        {!rows.length && <section className="portal-card phase7d-empty-state"><CalendarDays size={28}/><h2>No booking requests yet.</h2><p>Approved rooms become available to CareAtlas patients through their Stay section.</p></section>}
      </div>
    </HotelPartnerShell>
  );
}
