import Link from 'next/link';
import { GitCompareArrows } from 'lucide-react';
import Logo from './Logo';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container nav-shell">
        <Logo />
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/treatments">Treatments</Link>
          <Link href="/destinations">Destinations</Link>
          <Link href="/hospitals">Hospitals</Link>
          <Link href="/compare"><GitCompareArrows size={14}/> Compare</Link>
          <Link href="/how-it-works">How It Works</Link>
          <a href="#hospital-partners">For Hospitals</a>
        </nav>
        <div className="nav-actions">
          <Link className="text-button" href="/login">Sign in</Link>
          <Link className="button button-sm" href="/get-treatment-plan">Get Treatment Plan</Link>
        </div>
      </div>
    </header>
  );
}
