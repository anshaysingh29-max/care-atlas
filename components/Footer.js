import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div><Logo inverted /><p className="footer-copy">A clearer way to explore international healthcare, compare options and coordinate your medical journey.</p></div>
        <div><h4>Explore</h4><Link href="/treatments">Treatments</Link><Link href="/destinations">Destinations</Link><Link href="/hospitals">Hospitals</Link><Link href="/compare">Compare hospitals</Link></div>
        <div><h4>CareAtlas</h4><Link href="/how-it-works">How it works</Link><Link href="/hospital-login">For hospitals</Link><Link href="/admin-login">Operations</Link><a href="mailto:hello@careatlas.example">Contact</a></div>
        <div><h4>Important</h4><p>CareAtlas supports medical travel planning and coordination. It does not replace medical advice from qualified clinicians.</p></div>
      </div>
      <div className="container footer-bottom">© 2026 CareAtlas. Phase 5 prototype.</div>
    </footer>
  );
}
