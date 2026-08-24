'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Activity, Building2, ClipboardList, FileCheck2, HeartHandshake, LayoutDashboard, LogOut, MapPinned, ShieldCheck, Stethoscope, UserCog, UsersRound } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { isCareAtlasStaffRole } from '@/lib/firebase/admin';

const items = [
  ['/admin', 'Overview', LayoutDashboard],
  ['/admin/cases', 'Cases', ClipboardList],
  ['/admin/patients', 'Patients', UsersRound],
  ['/admin/hospitals', 'Hospitals', Building2],
  ['/admin/doctors', 'Doctors', Stethoscope],
  ['/admin/treatment-plans', 'Treatment Plans', FileCheck2],
  ['/admin/coordinators', 'Coordinators', HeartHandshake],
  ['/admin/content', 'Content', MapPinned],
  ['/admin/analytics', 'Analytics', Activity]
];

export default function AdminShell({ children, title, subtitle, action }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, loading, logout } = useAuth();
  const permitted = Boolean(user && userProfile && isCareAtlasStaffRole(userProfile.role));

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
          <div className="admin-security phase6d-admin-identity"><UserCog size={18}/><div><strong>{userProfile.displayName || user.email}</strong><span>{userProfile.role} · Firebase RBAC active</span></div></div>
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
