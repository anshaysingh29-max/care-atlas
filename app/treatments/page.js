import SectionTitle from '@/components/SectionTitle';
import { TreatmentCard } from '@/components/Cards';
import { treatmentCategories, treatments } from '@/lib/data';

export const metadata = { title: 'Treatments | CareAtlas' };

export default function TreatmentsPage() {
  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <span className="eyebrow">TREATMENT DISCOVERY</span>
          <h1>Find care by what you need.</h1>
          <p>Explore high-demand treatment categories and compare suitable international care destinations.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="category-cloud">{treatmentCategories.map(c => <span key={c}>{c}</span>)}</div>
          <SectionTitle title="Featured treatment pathways" text="Indicative prices are for discovery only and are not medical quotations." />
          <div className="cards-grid treatments-grid">{treatments.map(t => <TreatmentCard key={t.slug} treatment={t}/>)}</div>
        </div>
      </section>
    </>
  );
}
