'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BadgeIndianRupee, CircleDollarSign, Handshake, LayoutDashboard, LogOut, Megaphone, ReceiptText, ShieldCheck, UserRoundCog, UsersRound } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { isPartnerRole } from '@/lib/firebase/partners';

const items = [
  ['/partner', 'Overview', LayoutDashboard],
  ['/partner/referrals', 'Referrals', UsersRound],
  ['/partner/earnings', 'Earnings', CircleDollarSign],
  ['/partner/payouts', 'Payouts', ReceiptText],
  ['/partner/marketing', 'Marketing', Megaphone],
  ['/partner/profile', 'Profile', UserRoundCog]
];

export default function PartnerShell({ children, title, subtitle, action }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, partnerProfile, loading, logout } = useAuth();
  const permitted = Boolean(user && isPartnerRole(userProfile?.role) && partnerProfile && userProfile?.status !== 'disabled' && !['rejected', 'suspended'].includes(partnerProfile?.status));

  useEffect(() => {
    if (!loading && !permitted) router.replace('/partner-login');
  }, [loading, permitted, router]);

  async function signOut() {
    await logout();
    router.replace('/partner-login');
  }

  if (loading || !permitted) return <section className="phase7a-partner-gate"><ShieldCheck size={24}/><strong>Verifying CareAtlas Partner access…</strong></section>;

  const approved = partnerProfile.status === 'approved';
  return <section className="phase7a-partner-app">
    <div className="container phase7a-partner-shell">
      <aside className="phase7a-partner-sidebar">
        <div className="phase7a-partner-brand"><span><Handshake size={20}/></span><div><strong>CareAtlas Partners</strong><small>Referral network</small></div></div>
        <nav className="phase7a-partner-nav" aria-label="CareAtlas partner navigation">{items.map(([href,label,Icon])=>{const active=href==='/partner'?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} className={active?'active':''}><Icon size={17}/><span>{label}</span></Link>})}</nav>
        <div className="phase7a-partner-identity"><BadgeIndianRupee size={18}/><div><strong>{partnerProfile.displayName || user.email}</strong><span>{approved ? `Approved · ${partnerProfile.commissionRatePct || 0}% revenue share` : 'Application under review'}</span></div></div>
        <button type="button" className="phase7a-partner-signout" onClick={signOut}><LogOut size={16}/> Sign out</button>
      </aside>
      <main className="phase7a-partner-main">
        <header className="phase7a-partner-header"><div><span className="eyebrow">CAREATLAS PARTNER NETWORK</span><h1>{title}</h1><p>{subtitle}</p></div>{action || <div className={`phase7a-status-chip ${approved?'approved':'pending'}`}>{approved?'ACTIVE PARTNER':'PENDING REVIEW'}</div>}</header>
        {!approved && <div className="phase7a-review-banner"><ShieldCheck size={18}/><div><strong>Your application is being reviewed.</strong><span>Your referral code is reserved, but attribution only becomes active after CareAtlas approves the account.</span></div></div>}
        {children}
      </main>
    </div>
  </section>;
}
