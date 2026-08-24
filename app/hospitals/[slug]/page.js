import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BadgeCheck, Check, Clock3, Languages, MapPin, Star } from 'lucide-react';
import { hospitals, doctors } from '@/lib/data';

export function generateStaticParams() { return hospitals.map(h => ({ slug: h.slug })); }

export default async function HospitalProfilePage({ params }) {
  const { slug } = await params;
  const hospital = hospitals.find(h => h.slug === slug);
  if (!hospital) notFound();
  const team = doctors.filter(d => hospital.doctorSlugs.includes(d.slug));

  return (
    <>
      <section className="hospital-profile-hero">
        <div className="hospital-profile-image" style={{ backgroundImage: `linear-gradient(180deg, rgba(7,25,42,.05), rgba(7,25,42,.72)), url(${hospital.image})` }}/>
        <div className="container hospital-profile-heading">
          <div>
            <span className="verified-line"><BadgeCheck size={18}/> Verified demo profile</span>
            <h1>{hospital.name}</h1>
            <p><MapPin size={17}/> {hospital.city}, {hospital.country} {hospital.flag}</p>
          </div>
          <div className="profile-rating"><Star size={18} fill="currentColor"/> <strong>{hospital.rating}</strong><span>{hospital.reviews} reviews</span></div>
        </div>
      </section>

      <section className="profile-nav"><div className="container"><a href="#overview">Overview</a><a href="#specialties">Specialties</a><a href="#doctors">Doctors</a><a href="#services">International Services</a></div></section>

      <section className="section" id="overview"><div className="container profile-layout"><div><span className="eyebrow">OVERVIEW</span><h2>Built to support international patients.</h2><p className="large-copy">{hospital.name} is represented here as a demonstration provider profile for CareAtlas Phase 1. The layout is ready for verified hospital descriptions, accreditations, treatment pricing, facilities and patient-service information.</p><div className="metrics-grid">{hospital.metrics.map(([v,l]) => <div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div></div><aside className="profile-action-card"><span className="mini-label">CARE COORDINATION</span><h3>Interested in this hospital?</h3><p>Start a CareAtlas enquiry and request a structured treatment plan from the provider.</p><div className="side-fact"><Clock3 size={17}/><div><small>Typical response</small><strong>{hospital.response}</strong></div></div><a className="button full-button" href={`mailto:concierge@careatlas.example?subject=${encodeURIComponent('Treatment plan request — ' + hospital.name)}`}>Request treatment plan <ArrowRight size={16}/></a></aside></div></section>

      <section className="section section-soft" id="specialties"><div className="container"><span className="eyebrow">SPECIALTIES</span><h2>Areas of care</h2><div className="feature-chip-grid">{hospital.specialties.map(s => <div key={s}><Check size={18}/><span>{s}</span></div>)}</div></div></section>

      <section className="section" id="doctors"><div className="container"><span className="eyebrow">SPECIALISTS</span><h2>Meet selected doctors</h2>{team.length ? <div className="doctor-grid">{team.map(d => <Link className="doctor-card" href={`/doctors/${d.slug}`} key={d.slug}><div className="doctor-image" style={{backgroundImage:`url(${d.image})`}}/><div><span className="mini-label">{d.title}</span><h3>{d.name}</h3><p><Languages size={15}/> {d.languages.join(' · ')}</p><span className="link-arrow">View doctor <ArrowRight size={16}/></span></div></Link>)}</div> : <div className="empty-state">Doctor profiles are being added for this demonstration provider.</div>}</div></section>

      <section className="section section-soft" id="services"><div className="container"><span className="eyebrow">INTERNATIONAL PATIENT SERVICES</span><h2>Support around the treatment.</h2><div className="service-list">{hospital.services.map(s => <div key={s}><Check size={17}/>{s}</div>)}</div></div></section>
    </>
  );
}
