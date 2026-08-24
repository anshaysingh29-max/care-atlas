import Link from 'next/link';
import { ArrowRight, BadgeCheck, FileCheck2, Globe2, HeartHandshake, ShieldCheck } from 'lucide-react';
import SearchPlanner from '@/components/SearchPlanner';
import SectionTitle from '@/components/SectionTitle';
import { TreatmentCard, DestinationCard, HospitalCard } from '@/components/Cards';
import CTA from '@/components/CTA';
import { treatments, destinations, hospitals } from '@/lib/data';

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="container hero-grid">
          <div className="hero-content">
            <span className="eyebrow"><Globe2 size={15}/> INTERNATIONAL MEDICAL TRAVEL, MADE CLEARER</span>
            <h1>World-class healthcare, <span>wherever you need it.</span></h1>
            <p>Compare trusted hospitals, specialists and treatment options across selected global destinations — with one coordinated journey from first enquiry to treatment.</p>
            <div className="hero-proof">
              <span><ShieldCheck size={18}/> Verified providers</span>
              <span><HeartHandshake size={18}/> Human coordination</span>
              <span><FileCheck2 size={18}/> Clear treatment plans</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-photo" />
            <div className="floating-card floating-card-top">
              <span className="floating-icon"><BadgeCheck size={18}/></span>
              <div><strong>Hospital verified</strong><small>Provider review complete</small></div>
            </div>
            <div className="floating-card floating-card-bottom">
              <small>Typical pathway</small>
              <strong>Compare → Consult → Travel</strong>
            </div>
          </div>
        </div>
        <div className="container planner-wrap"><SearchPlanner /></div>
      </section>

      <section className="trust-strip">
        <div className="container trust-grid">
          <span>Built for international patients</span>
          <span>Transparent starting estimates</span>
          <span>Medical records stay private</span>
          <span>One CareAtlas journey</span>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionTitle eyebrow="EXPLORE BY NEED" title="Start with the treatment, not the hospital." text="Understand typical costs, travel time and destinations before deciding where to seek care." />
          <div className="cards-grid treatments-grid">
            {treatments.slice(0,6).map(t => <TreatmentCard key={t.slug} treatment={t} />)}
          </div>
          <div className="section-action"><Link className="link-arrow" href="/treatments">Explore all treatments <ArrowRight size={17}/></Link></div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <SectionTitle eyebrow="SELECTED DESTINATIONS" title="Care worth travelling for." text="CareAtlas begins with a focused network of destinations known for international patient services." />
          <div className="cards-grid destination-grid">
            {destinations.map(d => <DestinationCard key={d.slug} destination={d} />)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="split-heading">
            <SectionTitle eyebrow="HOSPITAL DISCOVERY" title="Compare more than a logo and a price." text="Explore specialties, international-patient support, response times and the doctors behind the care." />
            <Link className="button button-ghost" href="/hospitals">Browse hospitals <ArrowRight size={17}/></Link>
          </div>
          <div className="cards-grid hospital-grid">
            {hospitals.slice(0,3).map(h => <HospitalCard key={h.slug} hospital={h} />)}
          </div>
        </div>
      </section>

      <section className="section journey-section">
        <div className="container journey-shell">
          <SectionTitle eyebrow="HOW CAREATLAS WORKS" title="A medical journey with fewer unknowns." text="Phase 2 adds structured treatment requests, hospital comparison and patient access while keeping the public discovery experience simple." align="center" />
          <div className="journey-grid">
            {[
              ['01', 'Tell us what you need', 'Explore by treatment or submit your case with the details you already have.'],
              ['02', 'Compare suitable options', 'Review destinations, hospitals, specialists and estimated treatment ranges.'],
              ['03', 'Move forward with confidence', 'Request a treatment plan and continue with a CareAtlas coordinator.']
            ].map(([n,t,d]) => <div className="journey-step" key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></div>)}
          </div>
          <div className="section-action"><Link className="link-arrow" href="/how-it-works">See the full journey <ArrowRight size={17}/></Link></div>
        </div>
      </section>

      <section className="section partner-section" id="hospital-partners">
        <div className="container partner-shell">
          <div>
            <span className="eyebrow">FOR HOSPITALS</span>
            <h2>Meet international patients with clearer cases.</h2>
            <p>CareAtlas is being designed to send hospitals structured patient enquiries, relevant documents and treatment requests — not unqualified lead spreadsheets.</p>
          </div>
          <a className="button" href="mailto:partners@careatlas.example?subject=CareAtlas%20Hospital%20Partnership">Become a founding hospital <ArrowRight size={17}/></a>
        </div>
      </section>

      <CTA />
    </>
  );
}
