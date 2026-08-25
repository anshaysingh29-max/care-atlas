'use client';

import { useEffect, useState } from 'react';
import { CircleDollarSign, Landmark, ReceiptText } from 'lucide-react';
import HotelPartnerShell from '@/components/HotelPartnerShell';
import { formatHotelMoney, formatStayDate, getHotelPayoutSnapshot } from '@/lib/firebase/hotel';

export default function HotelPayoutsClient() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getHotelPayoutSnapshot().then(setData).catch(err => setError(err?.message || 'Unable to load settlements.'));
  }, []);

  return (
    <HotelPartnerShell title="Settlements" subtitle="Track completed stay value, CareAtlas booking fees and manually recorded settlements.">
      {error && <div className="phase7d-form-error">{error}</div>}
      {!data ? <section className="portal-card"><h2>Loading settlement data…</h2></section> : (
        <>
          <div className="phase7d-stat-grid">
            <div className="phase7d-stat"><CircleDollarSign size={19}/><strong>{formatHotelMoney(data.gross)}</strong><span>Completed booking value</span></div>
            <div className="phase7d-stat"><ReceiptText size={19}/><strong>{formatHotelMoney(data.fees)}</strong><span>CareAtlas booking fees</span></div>
            <div className="phase7d-stat"><Landmark size={19}/><strong>{formatHotelMoney(data.pending)}</strong><span>Pending settlement</span></div>
            <div className="phase7d-stat"><Landmark size={19}/><strong>{formatHotelMoney(data.settled)}</strong><span>Recorded as settled</span></div>
          </div>

          <div className="phase7d-settlement-note"><Landmark size={19}/><div><strong>Manual settlement in Phase 7D</strong><span>CareAtlas operations records payment references after settlement. Automated hotel payouts are intentionally not connected yet.</span></div></div>

          <section className="portal-card">
            <span className="eyebrow">COMPLETED STAYS</span>
            <div className="phase7d-settlement-list">
              {data.completed.map(row => (
                <article key={row.id}>
                  <div><strong>{row.bookingId}</strong><span>{row.patientAlias} · ended {formatStayDate(row.checkOutDate)}</span></div>
                  <div><strong>{formatHotelMoney((Number(row.totalAmount) || 0) - (Number(row.careAtlasCommissionAmount) || 0), row.currency)}</strong><span>Net after CareAtlas fee</span></div>
                  <i>{row.settlementStatus === 'paid' ? `Paid · ${row.settlementReference || 'reference recorded'}` : 'Pending settlement'}</i>
                </article>
              ))}
              {!data.completed.length && <p>No completed stays yet.</p>}
            </div>
          </section>
        </>
      )}
    </HotelPartnerShell>
  );
}
