import Link from 'next/link';
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
          <Link href="/how-it-works">How It Works</Link>
          <a href="#hospital-partners">For Hospitals</a>
        </nav>
        <div className="nav-actions">
          <button className="text-button">Sign in</button>
          <a className="button button-sm" href="mailto:concierge@careatlas.example?subject=Treatment%20Plan%20Request">Get Treatment Plan</a>
        </div>
      </div>
    </header>
  );
}
