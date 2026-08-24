import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BadgeCheck, Globe2, MapPin } from 'lucide-react';
import { destinations, hospitals, treatments } from '@/lib/data';
import { HospitalCard, TreatmentCard } from '@/components/Cards';

export function generateStaticParams() { return destinations.map(d => ({ country: d.slug })); }

export default async function DestinationPage({ params }) {
  const { country } = await params;
  const destination = destinations.find(d => d.slug === country);
  if (!destination) notFound();
  const localHospitals = hospitals.filter(h => h.country === destination.name);
  const localTreatments = treatments.filter(t => t.destinations.includes(destination.slug)).slice(0,3);

  return (
    <>
      <section className="destination-detail-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,25,43,.92), rgba(8,25,43,.54)), url(${destination.image})` }}>
        <div className="container destination-detail-content">
          <span className="eyebrow light"><Globe2 size={15}/> MEDICAL TRAVEL DESTINATION</span>
          <h1>{destination.flag} Medical treatment in {destination.name}</h1>
          <p>{destination.intro}</p>
          <div className="destination-facts"><span><MapPin size={16}/>{destination.city}</span><span><BadgeCheck size={16}/>{destination.costIndex}</span></div>
        </div>
      </section>
      <section className="section"><div className="container"><div className="split-heading"><div><span className="eyebrow">POPULAR PATHWAYS</span><h2>Explore treatment options in {destination.name}.</h2></div><Link className="link-arrow" href="/treatments">All treatments <ArrowRight size={17}/></Link></div><div className="cards-grid treatments-grid three-col">{localTreatments.map(t => <TreatmentCard key={t.slug} treatment={t}/>)}</div></div></section>
      <section className="section section-soft"><div className="container"><div className="split-heading"><div><span className="eyebrow">PROVIDERS</span><h2>CareAtlas hospitals in {destination.name}.</h2></div></div>{localHospitals.length ? <div className="cards-grid hospital-grid">{localHospitals.map(h => <HospitalCard key={h.slug} hospital={h}/>)}</div> : <div className="empty-state">Provider onboarding for this destination is in progress.</div>}</div></section>
    </>
  );
}
