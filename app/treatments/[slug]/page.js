import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Clock3, DollarSign, Plane, ShieldCheck } from 'lucide-react';
import { treatments, destinations, hospitals } from '@/lib/data';
import { DestinationCard, HospitalCard } from '@/components/Cards';
import CTA from '@/components/CTA';

export function generateStaticParams() {
  return treatments.map(t => ({ slug: t.slug }));
}

export default async function TreatmentDetailPage({ params }) {
  const { slug } = await params;
  const treatment = treatments.find(t => t.slug === slug);
  if (!treatment) notFound();
  const relevantDestinations = destinations.filter(d => treatment.destinations.includes(d.slug));
  const relevantHospitals = hospitals.slice(0,3);

  return (
    <>
      <section className="page-hero treatment-detail-hero">
        <div className="container treatment-hero-grid">
          <div>
            <span className="eyebrow">{treatment.category.toUpperCase()}</span>
            <h1>{treatment.name} abroad</h1>
            <p>{treatment.summary}</p>
            <div className="metric-pills">
              <span><DollarSign size={17}/> Indicative from <strong>{treatment.startingPrice}</strong></span>
              <span><Clock3 size={17}/> Travel window <strong>{treatment.stay}</strong></span>
            </div>
          </div>
          <div className="treatment-assurance-card">
            <ShieldCheck size={24}/>
            <h3>Start with information, not pressure.</h3>
            <p>Compare destinations and providers first. Exact suitability, procedure and pricing should be confirmed by the treating clinical team.</p>
            <Link className="button" href="/get-treatment-plan">Request treatment options <ArrowRight size={16}/></Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="split-heading"><div><span className="eyebrow">COMPARE DESTINATIONS</span><h2>Where patients commonly explore care.</h2></div><Plane size={30}/></div>
          <div className="cards-grid destination-grid three-col">{relevantDestinations.map(d => <DestinationCard key={d.slug} destination={d}/>)}</div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="split-heading"><div><span className="eyebrow">RECOMMENDED PROVIDERS</span><h2>Hospitals to explore for this pathway.</h2></div><Link href="/hospitals" className="link-arrow">View all hospitals <ArrowRight size={17}/></Link></div>
          <div className="cards-grid hospital-grid">{relevantHospitals.map(h => <HospitalCard key={h.slug} hospital={h}/>)}</div>
        </div>
      </section>
      <CTA />
    </>
  );
}
