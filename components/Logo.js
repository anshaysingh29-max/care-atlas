import Link from 'next/link';

export default function Logo({ inverted = false }) {
  return (
    <Link href="/" className={`brand ${inverted ? 'brand-inverted' : ''}`} aria-label="CareAtlas home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 42 42" role="img">
          <circle cx="21" cy="21" r="17.5" fill="none" stroke="currentColor" strokeWidth="2.4"/>
          <path d="M9.2 19.5h23.6M11.8 12.7c4.4 2.2 14 2.2 18.4 0M11.8 27.3c4.4-2.2 14-2.2 18.4 0M21 3.5c-4.3 4.4-6.6 10.2-6.6 17.5S16.7 34.1 21 38.5M21 3.5c4.3 4.4 6.6 10.2 6.6 17.5S25.3 34.1 21 38.5" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".62"/>
          <path d="M21 14v14M14 21h14" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round"/>
        </svg>
      </span>
      <span className="brand-word">CARE<span>ATLAS</span></span>
    </Link>
  );
}
