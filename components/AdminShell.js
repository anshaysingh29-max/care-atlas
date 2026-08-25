'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Activity, BadgeIndianRupee, BedDouble, Bot, BrainCircuit, Building2, CalendarDays, ClipboardList, FileCheck2, Handshake, HeartHandshake, History, IdCard, LayoutDashboard, LogOut, MapPinned, Plane, ReceiptText, ShieldCheck, Sparkles, Star, Stethoscope, TrendingUp, UserCog, UserRoundPlus, UsersRound } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { isAdminRole, isCareAtlasStaffRole } from '@/lib/firebase/admin';

const baseItems = [
  ['/admin', 'Overview', LayoutDashboard],
  ['/admin/cases', 'Cases', ClipboardList],
  ['/admin/copilot', 'Coordinator Copilot', BrainCircuit],
  ['/admin/patients', 'Patients', UsersRound],
  ['/admin/hospitals', 'Hospitals', Building2],
  ['/admin/doctors', 'Doctors', Stethoscope],
  ['/admin/treatment-plans', 'Treatment Plans', FileCheck2],
  ['/admin/coordinators', 'Coordinators', HeartHandshake],
  ['/admin/partner-leads', 'Partner Leads', UserRoundPlus],
  ['/admin/hotel-bookings', 'Hotel Bookings', CalendarDays],
  ['/admin/travel', 'Travel Concierge', Plane],
  ['/admin/reviews', 'Reviews & Trust', Star],
  ['/admin/quality', 'Experience Quality', TrendingUp],
  ['/admin/ai-matching', 'AI Matching', Bot],
  ['/admin/referrals', 'Referrals', UsersRound],
  ['/admin/content', 'Content', MapPinned],
  ['/admin/analytics', 'Analytics', Activity]
];

export default function AdminShell({ children, title, subtitle, action }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, loading, logout } = useAuth();
  const permitted = Boolean(user && userProfile && isCareAtlasStaffRole(userProfile.role));
  const items = isAdminRole(userProfile?.role) ? [...baseItems, ['/admin/specialties', 'Specialties', Sparkles], ['/admin/hospital-commercials', 'Hospital Commercials', BadgeIndianRupee], ['/admin/hotels', 'Stay Partners', BedDouble], ['/admin/partners', 'Partners', Handshake], ['/admin/partner-kyc', 'Partner KYC', IdCard], ['/admin/commissions', 'Commissions', BadgeIndianRupee], ['/admin/payouts', 'Payouts', ReceiptText], ['/admin/audit', 'Audit Trail', History]] : baseItems;

  useEffect(() => {
    if (loading) return;
    if (!user || !userProfile || !isCareAtlasStaffRole(userProfile.role)) {
      router.replace('/admin-login');
    }
  }, [loading, user, userProfile, router]);

  async function signOut() {
    await logout();
    router.replace('/admin-login');
  }

  if (loading || !permitted) {
    return <section className="admin-auth-gate"><ShieldCheck size={25}/><strong>Verifying CareAtlas operations access…</strong></section>;
  }

  return (
    <section className="admin-app">
      <div className="container admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand-mini"><span>CA</span><div><strong>CareAtlas Ops</strong><small>Internal command centre</small></div></div>
          <nav className="admin-nav" aria-label="CareAtlas operations navigation">
            {items.map(([href, label, Icon]) => {
              const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
              return <Link key={href} href={href} className={active ? 'active' : ''}><Icon size={17}/><span>{label}</span></Link>;
            })}
          </nav>
          <div className="admin-security phase6d-admin-identity"><UserCog size={18}/><div><strong>{userProfile.displayName || user.email}</strong><span>{userProfile.role} · Firebase RBAC · immutable audit events</span></div></div>
          <button type="button" className="admin-signout admin-signout-button" onClick={signOut}><LogOut size={16}/> Sign out</button>
        </aside>
        <main className="admin-main">
          <header className="admin-page-header">
            <div><span className="eyebrow">CAREATLAS OPERATIONS</span><h1>{title}</h1><p>{subtitle}</p></div>
            {action || <div className="admin-env-chip">LIVE FIRESTORE · MVP</div>}
          </header>
          {children}
        </main>
      </div>
    </section>
  );
}
