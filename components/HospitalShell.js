'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Building2, CalendarClock, FilePlus2, FolderKanban, LayoutDashboard, LogOut, MessageCircle, ShieldCheck, Star, Stethoscope, UsersRound } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getHospitalCatalogueProfile, isHospitalUserRole } from '@/lib/firebase/hospital';

const items = [
  ['/hospital', 'Overview', LayoutDashboard],
  ['/hospital/cases', 'Patient Cases', FolderKanban],
  ['/hospital/treatment-plans', 'Treatment Plans', FilePlus2],
  ['/hospital/consultations', 'Consultations', CalendarClock],
  ['/hospital/messages', 'Messages', MessageCircle],
  ['/hospital/reviews', 'Patient Feedback', Star],
  ['/hospital/team', 'Hospital Team', UsersRound],
  ['/hospital/profile', 'Hospital Profile', Building2]
];

export default function HospitalShell({ children, title, subtitle, action }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, loading, logout } = useAuth();
  const permitted = Boolean(user && userProfile && isHospitalUserRole(userProfile.role) && userProfile.hospitalId && userProfile.status !== 'disabled');
  const hospital = useMemo(() => getHospitalCatalogueProfile(userProfile?.hospitalId), [userProfile?.hospitalId]);

  useEffect(() => {
    if (loading) return;
    if (!permitted) router.replace('/hospital-login');
  }, [loading, permitted, router]);

  async function signOut() {
    await logout();
    router.replace('/hospital-login');
  }

  if (loading || !permitted) {
    return <section className="hospital-auth-gate"><ShieldCheck size={25}/><strong>Verifying hospital partner access…</strong></section>;
  }

  const hospitalName = hospital?.name || userProfile.hospitalName || userProfile.hospitalId;
  const hospitalMeta = hospital ? `${hospital.city}, ${hospital.country}` : 'CareAtlas partner';

  return (
    <section className="hospital-app">
      <div className="container hospital-shell">
        <aside className="hospital-sidebar">
          <div className="hospital-brand-mini">
            <div className="hospital-brand-icon"><Stethoscope size={20}/></div>
            <div><strong>{hospitalName}</strong><span>{hospitalMeta}</span></div>
          </div>
          <nav className="hospital-nav" aria-label="Hospital portal navigation">
            {items.map(([href, label, Icon]) => {
              const active = href === '/hospital' ? pathname === href : pathname.startsWith(href);
              return <Link key={href} href={href} className={active ? 'active' : ''}><Icon size={17}/><span>{label}</span></Link>;
            })}
          </nav>
          <div className="hospital-security phase6e-hospital-identity"><ShieldCheck size={18}/><div><strong>{userProfile.displayName || user.email}</strong><span>{userProfile.role} · assigned-case access · consent-aware documents</span></div></div>
          <button type="button" className="hospital-signout phase6e-signout-button" onClick={signOut}><LogOut size={16}/> Sign out</button>
        </aside>
        <main className="hospital-main">
          <header className="hospital-page-header">
            <div><span className="eyebrow">HOSPITAL PARTNER PORTAL</span><h1>{title}</h1><p>{subtitle}</p></div>
            {action || <div className="partner-chip">LIVE FIRESTORE · {hospital?.country || 'PARTNER'}</div>}
          </header>
          {children}
        </main>
      </div>
    </section>
  );
}
