import SectionTitle from '@/components/SectionTitle';
import { DestinationCard } from '@/components/Cards';
import { destinations } from '@/lib/data';

export const metadata = { title: 'Destinations | CareAtlas' };

export default function DestinationsPage() {
  return (
    <>
      <section className="page-hero compact-hero"><div className="container"><span className="eyebrow">GLOBAL CARE, SELECTIVELY CURATED</span><h1>Explore CareAtlas destinations.</h1><p>We start with a smaller number of established medical-travel destinations so patients can compare meaningful options instead of scrolling through an endless directory.</p></div></section>
      <section className="section"><div className="container"><SectionTitle title="Our Phase 1 destination network" text="Patients can originate from anywhere; provider coverage begins with these selected destinations."/><div className="cards-grid destination-grid">{destinations.map(d => <DestinationCard key={d.slug} destination={d}/>)}</div></div></section>
    </>
  );
}
