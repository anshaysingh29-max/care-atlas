'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BedDouble,
  Building2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRoundCog
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { USER_ROLES } from '@/lib/firebase/roles';

const items = [
  ['/hotel', 'Overview', LayoutDashboard],
  ['/hotel/bookings', 'Bookings', CalendarDays],
  ['/hotel/rates', 'Rooms & Rates', BedDouble],
  ['/hotel/availability', 'Availability', SlidersHorizontal],
  ['/hotel/payouts', 'Settlements', ReceiptText],
  ['/hotel/reviews', 'Guest Feedback', Star],
  ['/hotel/profile', 'Property Profile', UserRoundCog]
];

export default function HotelPartnerShell({ children, title, subtitle, action }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, hotelProfile, loading, logout } = useAuth();
  const permitted = Boolean(
    user &&
    userProfile?.role === USER_ROLES.HOTEL_PARTNER &&
    userProfile?.status !== 'disabled' &&
    hotelProfile &&
    !['rejected', 'suspended'].includes(hotelProfile.status)
  );

  useEffect(() => {
    if (!loading && !permitted) router.replace('/hotel-login');
  }, [loading, permitted, router]);

  async function signOut() {
    await logout();
    router.replace('/hotel-login');
  }

  if (loading || !permitted) {
    return <section className="phase7d-hotel-gate"><ShieldCheck size={24}/><strong>Verifying Stay Partner access…</strong></section>;
  }

  const approved = hotelProfile.status === 'approved';

  return (
    <section className="phase7d-hotel-app">
      <div className="container phase7d-hotel-shell">
        <aside className="phase7d-hotel-sidebar">
          <div className="phase7d-hotel-brand">
            <span><Building2 size={20}/></span>
            <div><strong>CareAtlas Stays</strong><small>Partner portal</small></div>
          </div>
          <nav className="phase7d-hotel-nav" aria-label="Stay Partner navigation">
            {items.map(([href, label, Icon]) => {
              const active = href === '/hotel' ? pathname === href : pathname.startsWith(href);
              return <Link key={href} href={href} className={active ? 'active' : ''}><Icon size={17}/><span>{label}</span></Link>;
            })}
          </nav>
          <div className="phase7d-hotel-identity">
            <Building2 size={18}/>
            <div>
              <strong>{hotelProfile.propertyName}</strong>
              <span>{approved ? `Approved · ${hotelProfile.commissionRatePct || 0}% CareAtlas fee` : hotelProfile.status.replaceAll('_', ' ')}</span>
            </div>
          </div>
          <button type="button" className="phase7d-hotel-signout" onClick={signOut}><LogOut size={16}/> Sign out</button>
        </aside>

        <main className="phase7d-hotel-main">
          <header className="phase7d-hotel-header">
            <div><span className="eyebrow">CAREATLAS STAY PARTNER</span><h1>{title}</h1><p>{subtitle}</p></div>
            {action || <div className={`phase7d-hotel-status ${approved ? 'approved' : 'pending'}`}>{approved ? 'LIVE PROPERTY' : 'REVIEW PENDING'}</div>}
          </header>

          {!approved && (
            <div className="phase7d-hotel-review-banner">
              <ShieldCheck size={19}/>
              <div>
                <strong>Your property is not public yet.</strong>
                <span>Complete the profile while CareAtlas reviews the property. Rooms, availability and bookings activate after approval.</span>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </section>
  );
}
