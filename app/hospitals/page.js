import SectionTitle from '@/components/SectionTitle';
import { HospitalCard } from '@/components/Cards';
import { hospitals } from '@/lib/data';

export const metadata = { title: 'Hospitals | CareAtlas' };

export default function HospitalsPage() {
  return (
    <>
      <section className="page-hero compact-hero"><div className="container"><span className="eyebrow">HOSPITAL DISCOVERY</span><h1>Hospitals selected for international care.</h1><p>Compare specialties, location, response times and international patient support before deciding where to take the next step.</p></div></section>
      <section className="section"><div className="container"><SectionTitle title="CareAtlas hospital network" text="The names, ratings, metrics and pricing below are demonstration data for the CareAtlas prototype and must be replaced with verified partner data before launch."/><div className="cards-grid hospital-grid">{hospitals.map(h => <HospitalCard key={h.slug} hospital={h}/>)}</div></div></section>
    </>
  );
}
