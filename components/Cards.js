import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, Clock3, MapPin, Star } from 'lucide-react';
import CompareButton from './CompareButton';

export function TreatmentCard({ treatment }) {
  return (
    <Link href={`/treatments/${treatment.slug}`} className="treatment-card card-hover">
      <div className="treatment-icon">{treatment.icon}</div>
      <span className="mini-label">{treatment.category}</span>
      <h3>{treatment.name}</h3>
      <p>{treatment.summary}</p>
      <div className="card-meta-row">
        <span>From <strong>{treatment.startingPrice}</strong></span>
        <ArrowUpRight size={19} />
      </div>
    </Link>
  );
}

export function DestinationCard({ destination }) {
  return (
    <Link href={`/destinations/${destination.slug}`} className="destination-card card-hover">
      <div className="destination-image" style={{ backgroundImage: `url(${destination.image})` }}>
        <div className="destination-overlay" />
        <div className="destination-top"><span>{destination.flag}</span><span className="glass-pill">{destination.costIndex}</span></div>
        <div className="destination-bottom">
          <h3>{destination.name}</h3>
          <p>{destination.city}</p>
        </div>
      </div>
      <div className="destination-body">
        <p>{destination.intro}</p>
        <span>{destination.highlight}</span>
      </div>
    </Link>
  );
}

export function HospitalCard({ hospital }) {
  const href = hospital.profileHref || `/hospitals/${hospital.slug}`;
  return (
    <article className="hospital-card card-hover">
      <Link href={href} className="hospital-img-wrap">
        <div className="hospital-image" style={hospital.image ? { backgroundImage: `url(${hospital.image})` } : { background: 'linear-gradient(135deg,#dce9ee,#f5f9fa)' }} />
        {hospital.verified && <span className="verified-badge"><BadgeCheck size={15}/> Verified</span>}
      </Link>
      <div className="hospital-card-body">
        <div className="hospital-heading">
          <div>
            <span className="mini-label"><MapPin size={13}/> {hospital.city}, {hospital.country} {hospital.flag}</span>
            <h3><Link href={href}>{hospital.name}</Link></h3>
          </div>
          <span className="rating"><Star size={15} fill="currentColor"/> {hospital.rating}</span>
        </div>
        <div className="tag-row">{hospital.specialties.slice(0,3).map(item => <span key={item}>{item}</span>)}</div>
        <div className="hospital-card-footer">
          <div><small>Selected treatments from</small><strong>{hospital.price}</strong></div>
          <div className="response"><Clock3 size={15}/> {hospital.response}</div>
        </div>
        {!hospital.firestoreManaged && <div className="hospital-compare-row"><CompareButton hospitalSlug={hospital.slug} /></div>}
      </div>
    </article>
  );
}
