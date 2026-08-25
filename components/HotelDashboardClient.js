'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, BedDouble, CalendarDays, CircleDollarSign, Clock3 } from 'lucide-react';
import HotelPartnerShell from '@/components/HotelPartnerShell';
import { formatHotelMoney, getHotelDashboardData } from '@/lib/firebase/hotel';

export default function HotelDashboardClient() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getHotelDashboardData().then(setData).catch(err => setError(err?.message || 'Unable to load property dashboard.'));
  }, []);

  return (
    <HotelPartnerShell title="Stay Partner overview" subtitle="Manage your CareAtlas medical-travel accommodation workflow.">
      {error && <div className="phase7d-form-error">{error}</div>}
      {!data ? <section className="portal-card"><h2>Loading property data…</h2></section> : (
        <>
          <div className="phase7d-stat-grid">
            <div className="phase7d-stat"><BedDouble size={19}/><strong>{data.liveRooms}</strong><span>Published room types</span></div>
            <div className="phase7d-stat"><CalendarDays size={19}/><strong>{data.openBookings}</strong><span>Open booking requests</span></div>
            <div className="phase7d-stat"><Clock3 size={19}/><strong>{data.availability.length}</strong><span>Availability windows</span></div>
            <div className="phase7d-stat"><CircleDollarSign size={19}/><strong>{formatHotelMoney(data.grossBookingValue, data.rooms[0]?.currency || 'INR')}</strong><span>Completed booking value</span></div>
          </div>

          <div className="phase7d-grid-two">
            <section className="portal-card">
              <span className="eyebrow">NEXT ACTIONS</span>
              <h2>{data.profile?.status === 'approved' ? 'Keep inventory fresh.' : 'Finish your property profile.'}</h2>
              <p>{data.profile?.status === 'approved'
                ? 'Medical travellers often need longer stays and caregiver-friendly rooms. Keep room counts, rates and date windows accurate.'
                : 'CareAtlas reviews the property before it becomes visible to patients. Add address, amenities and hospital proximity now.'}</p>
              <div className="phase7d-link-stack">
                <Link href="/hotel/profile">Complete property profile <ArrowRight size={16}/></Link>
                <Link href="/hotel/rates">Manage rooms and rates <ArrowRight size={16}/></Link>
                <Link href="/hotel/availability">Update availability <ArrowRight size={16}/></Link>
              </div>
            </section>

            <section className="portal-card">
              <span className="eyebrow">BOOKING PIPELINE</span>
              <h2>{data.bookings.length} total request{data.bookings.length === 1 ? '' : 's'}</h2>
              <div className="phase7d-mini-list">
                {data.bookings.slice(0, 5).map(item => (
                  <div key={item.id}><strong>{item.bookingId}</strong><span>{item.patientAlias} · {item.nights} nights</span><i>{item.status.replaceAll('_', ' ')}</i></div>
                ))}
                {!data.bookings.length && <p>No patient stay requests yet.</p>}
              </div>
              <Link href="/hotel/bookings" className="link-arrow">Open booking desk <ArrowRight size={16}/></Link>
            </section>
          </div>
        </>
      )}
    </HotelPartnerShell>
  );
}
