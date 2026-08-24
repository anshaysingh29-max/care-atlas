'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Building2, ClipboardList, FileCheck2, HeartHandshake, LayoutDashboard, LogOut, MapPinned, Stethoscope, UserCog, UsersRound } from 'lucide-react';

const items = [
  ['/admin', 'Overview', LayoutDashboard],
  ['/admin/cases', 'Cases', ClipboardList],
  ['/admin/patients', 'Patients', UsersRound],
  ['/admin/hospitals', 'Hospitals', Building2],
  ['/admin/doctors', 'Doctors', Stethoscope],
  ['/admin/treatment-plans', 'Treatment Plans', FileCheck2],
  ['/admin/coordinators', 'Coordinators', HeartHandshake],
  ['/admin/content', 'Content', MapPinned],
  ['/admin/analytics', 'Analytics', Activity],
];

export default function AdminShell({ children, title, subtitle, action }) {
  const pathname = usePathname();
  return (
    <section className="admin-app">
      <div className="container admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand-mini"><span>CA</span><div><strong>CareAtlas Ops</strong><small>Internal command centre</small></div></div>
          <nav className="admin-nav" aria-label="CareAtlas operations navigation">
            {items.map(([href,label,Icon]) => {
              const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
              return <Link key={href} href={href} className={active ? 'active' : ''}><Icon size={17}/><span>{label}</span></Link>;
            })}
          </nav>
          <div className="admin-security"><UserCog size={18}/><div><strong>Operations prototype</strong><span>Fictional patients and providers only. Production requires RBAC, audit logs and secure infrastructure.</span></div></div>
          <Link href="/" className="admin-signout"><LogOut size={16}/> Exit operations</Link>
        </aside>
        <main className="admin-main">
          <header className="admin-page-header">
            <div><span className="eyebrow">CAREATLAS OPERATIONS</span><h1>{title}</h1><p>{subtitle}</p></div>
            {action || <div className="admin-env-chip">DEMO · GLOBAL OPS</div>}
          </header>
          {children}
        </main>
      </div>
    </section>
  );
}
