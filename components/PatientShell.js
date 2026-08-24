'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderHeart, FileText, Files, MessageCircle, LogOut, ShieldCheck } from 'lucide-react';

const items = [
  ['/patient', 'Overview', LayoutDashboard],
  ['/patient/cases', 'My Case', FolderHeart],
  ['/patient/treatment-plans', 'Treatment Plans', FileText],
  ['/patient/documents', 'Documents', Files],
  ['/patient/messages', 'Messages', MessageCircle],
];

export default function PatientShell({ children, title, subtitle }) {
  const pathname = usePathname();
  return (
    <section className="patient-app">
      <div className="container patient-shell">
        <aside className="patient-sidebar">
          <div className="patient-profile-mini">
            <div className="patient-avatar">JM</div>
            <div><strong>James Miller</strong><span>Patient · United Kingdom</span></div>
          </div>
          <nav className="patient-nav" aria-label="Patient portal navigation">
            {items.map(([href,label,Icon]) => (
              <Link key={href} href={href} className={pathname === href ? 'active' : ''}><Icon size={17}/><span>{label}</span></Link>
            ))}
          </nav>
          <div className="patient-security"><ShieldCheck size={18}/><div><strong>Prototype portal</strong><span>Demo data only. No medical records are transmitted.</span></div></div>
          <Link href="/" className="patient-signout"><LogOut size={16}/> Exit patient portal</Link>
        </aside>
        <main className="patient-main">
          <header className="patient-page-header"><div><span className="eyebrow">PATIENT PORTAL</span><h1>{title}</h1><p>{subtitle}</p></div><div className="case-chip">CA-26082401</div></header>
          {children}
        </main>
      </div>
    </section>
  );
}
