'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CalendarClock, FilePlus2, FolderKanban, LayoutDashboard, LogOut, ShieldCheck, Stethoscope } from 'lucide-react';

const items = [
  ['/hospital', 'Overview', LayoutDashboard],
  ['/hospital/cases', 'Patient Cases', FolderKanban],
  ['/hospital/treatment-plans', 'Treatment Plans', FilePlus2],
  ['/hospital/consultations', 'Consultations', CalendarClock],
  ['/hospital/profile', 'Hospital Profile', Building2],
];

export default function HospitalShell({ children, title, subtitle, action }) {
  const pathname = usePathname();
  return (
    <section className="hospital-app">
      <div className="container hospital-shell">
        <aside className="hospital-sidebar">
          <div className="hospital-brand-mini">
            <div className="hospital-brand-icon"><Stethoscope size={20}/></div>
            <div><strong>Aster Nova Institute</strong><span>International Patient Desk</span></div>
          </div>
          <nav className="hospital-nav" aria-label="Hospital portal navigation">
            {items.map(([href,label,Icon]) => {
              const active = href === '/hospital' ? pathname === href : pathname.startsWith(href);
              return <Link key={href} href={href} className={active ? 'active' : ''}><Icon size={17}/><span>{label}</span></Link>;
            })}
          </nav>
          <div className="hospital-security"><ShieldCheck size={18}/><div><strong>Partner prototype</strong><span>Demo cases only. No live patient records are available in this static preview.</span></div></div>
          <Link href="/" className="hospital-signout"><LogOut size={16}/> Exit partner portal</Link>
        </aside>
        <main className="hospital-main">
          <header className="hospital-page-header">
            <div><span className="eyebrow">HOSPITAL PARTNER PORTAL</span><h1>{title}</h1><p>{subtitle}</p></div>
            {action || <div className="partner-chip">ASTER NOVA · INDIA</div>}
          </header>
          {children}
        </main>
      </div>
    </section>
  );
}
