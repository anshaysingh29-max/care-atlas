'use client';

import { useEffect, useState } from 'react';
import { Loader2, ReceiptText } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { formatHotelMoney, formatStayDate } from '@/lib/firebase/hotel';
import { getAdminHotelBookings, updateAdminHotelBooking } from '@/lib/firebase/hotelAdmin';

export default function AdminHotelBookingsClient() {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setRows(await getAdminHotelBookings());
  }

  useEffect(() => { load().catch(err => setMessage(err?.message || 'Unable to load hotel bookings.')); }, []);

  function draftFor(row) {
    return drafts[row.id] || {
      status: row.status,
      settlementStatus: row.settlementStatus || 'not_applicable',
      settlementReference: row.settlementReference || '',
      operationsNote: row.operationsNote || ''
    };
  }

  function patch(id, key, value) {
    setDrafts(current => ({ ...current, [id]: { ...(current[id] || {}), [key]: value } }));
  }

  async function save(row) {
    setWorking(row.id);
    setMessage('');
    try {
      await updateAdminHotelBooking({ bookingId: row.id, ...draftFor(row) });
      await load();
      setMessage(`${row.bookingId} updated.`);
    } catch (err) {
      setMessage(err?.message || 'Unable to update hotel booking.');
    } finally {
      setWorking('');
    }
  }

  return (
    <AdminShell title="Hotel bookings" subtitle="Coordinate stay requests and record hotel settlements after completed stays.">
      {message && <div className={message.includes('updated') ? 'phase7d-form-success' : 'phase7d-form-error'}>{message}</div>}
      <div className="phase7d-admin-booking-list">
        {rows.map(row => {
          const draft = draftFor(row);
          const net = Math.max(0, (Number(row.totalAmount) || 0) - (Number(row.careAtlasCommissionAmount) || 0));
          return (
            <section className="portal-card phase7d-admin-booking" key={row.id}>
              <div>
                <span className="eyebrow">{row.bookingId}</span>
                <h2>{row.hotelName}</h2>
                <p>{row.patientAlias} · {row.roomName} · {formatStayDate(row.checkInDate)} → {formatStayDate(row.checkOutDate)}</p>
              </div>

              <div className="phase7d-admin-property-grid">
                <div><small>STATUS</small><strong>{row.status.replaceAll('_', ' ')}</strong></div>
                <div><small>BOOKING TOTAL</small><strong>{row.totalAmount ? formatHotelMoney(row.totalAmount, row.currency) : 'Awaiting quote'}</strong></div>
                <div><small>CAREATLAS FEE</small><strong>{row.careAtlasCommissionAmount ? formatHotelMoney(row.careAtlasCommissionAmount, row.currency) : '—'}</strong></div>
                <div><small>HOTEL NET</small><strong>{row.totalAmount ? formatHotelMoney(net, row.currency) : '—'}</strong></div>
              </div>

              <div className="phase7d-admin-review-grid">
                <label>Booking status
                  <select value={draft.status} onChange={e => patch(row.id, 'status', e.target.value)}>
                    {['requested','quoted','confirmed','checked_in','completed','declined','cancelled'].map(item => <option key={item} value={item}>{item.replaceAll('_',' ')}</option>)}
                  </select>
                </label>
                <label>Settlement status
                  <select value={draft.settlementStatus} onChange={e => patch(row.id, 'settlementStatus', e.target.value)}>
                    {['not_applicable','pending','paid','on_hold'].map(item => <option key={item} value={item}>{item.replaceAll('_',' ')}</option>)}
                  </select>
                </label>
                <label>Settlement / UTR reference<input value={draft.settlementReference} onChange={e => patch(row.id, 'settlementReference', e.target.value)} /></label>
                <label>Operations note<input value={draft.operationsNote} onChange={e => patch(row.id, 'operationsNote', e.target.value)} /></label>
              </div>

              <button className="button" onClick={() => save(row)} disabled={working !== ''}>{working === row.id ? <Loader2 size={15} className="phase7d-spin"/> : <ReceiptText size={15}/>} Save operations update</button>
            </section>
          );
        })}
        {!rows.length && <section className="portal-card"><h2>No hotel booking requests yet.</h2></section>}
      </div>
    </AdminShell>
  );
}
