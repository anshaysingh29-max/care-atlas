'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BadgeIndianRupee, BedDouble, FileText, Files, FolderHeart, LayoutDashboard, LogOut, MessageCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import PatientNotificationBell from '@/components/PatientNotificationBell';
import { USER_ROLES } from '@/lib/firebase/roles';

const items = [
  ['/patient', 'Overview', LayoutDashboard],
  ['/patient/cases', 'My Cases', FolderHeart],
  ['/patient/treatment-plans', 'Treatment Plans', FileText],
  ['/patient/documents', 'Documents', Files],
  ['/patient/messages', 'Messages', MessageCircle],
  ['/patient/consents', 'Consent & Privacy', UserCheck],
  ['/patient/stays', 'Stays', BedDouble],
  ['/patient/affiliate', 'Earn with CareAtlas', BadgeIndianRupee]
];

function initials(name, email) {
  const source = (name || email || 'Patient').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function PatientShell({ children, title, subtitle, caseNumber }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, patientProfile, loading, error, logout } = useAuth();
  const permitted = Boolean(user && userProfile?.role === USER_ROLES.PATIENT && userProfile?.status !== 'disabled');

  useEffect(() => {
    if (loading) return;
    if (!permitted) router.replace('/login');
  }, [loading, permitted, router]);

  async function exitPortal(event) {
    event.preventDefault();
    await logout();
    router.replace('/');
  }

  if (loading || !permitted) {
    return (
      <section className="patient-app">
        <div className="container patient-shell">
          <main className="patient-main">
            <section className="portal-card"><span className="eyebrow">PATIENT PORTAL</span><h2>Verifying your secure CareAtlas session…</h2></section>
          </main>
        </div>
      </section>
    );
  }

  const displayName = patientProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Patient';
  const country = patientProfile?.country || 'Country not added';

  return (
    <section className="patient-app">
      <div className="container patient-shell">
        <aside className="patient-sidebar">
          <div className="patient-profile-mini">
            <div className="patient-avatar">{initials(displayName, user.email)}</div>
            <div><strong>{displayName}</strong><span>Patient · {country}</span></div>
          </div>
          <nav className="patient-nav" aria-label="Patient portal navigation">
            {items.map(([href,label,Icon]) => (
              <Link key={href} href={href} className={pathname === href ? 'active' : ''}><Icon size={17}/><span>{label}</span></Link>
            ))}
          </nav>
          <div className="patient-security"><ShieldCheck size={18}/><div><strong>Secure patient session</strong><span>Firebase Authentication, Firestore rules, consent records and optional App Check protect portal access.</span></div></div>
          <Link href="/" className="patient-signout" onClick={exitPortal}><LogOut size={16}/> Sign out</Link>
        </aside>
        <main className="patient-main">
          <header className="patient-page-header">
            <div><span className="eyebrow">PATIENT PORTAL</span><h1>{title}</h1><p>{subtitle}</p></div>
            <div className="phase6f-patient-header-actions"><PatientNotificationBell/><div className="case-chip">{caseNumber || 'SECURE ACCOUNT'}</div></div>
          </header>
          {error && <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Account notice</strong><span>{error}</span></div></div>}
          {children}
        </main>
      </div>
    </section>
  );
}
