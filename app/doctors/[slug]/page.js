import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BriefcaseMedical, Languages, MapPin, Star } from 'lucide-react';
import { doctors } from '@/lib/data';

export function generateStaticParams() { return doctors.map(d => ({ slug: d.slug })); }

export default async function DoctorProfilePage({ params }) {
  const { slug } = await params;
  const doctor = doctors.find(d => d.slug === slug);
  if (!doctor) notFound();
  return (
    <>
      <section className="page-hero doctor-profile-hero"><div className="container doctor-profile-grid"><div className="doctor-portrait" style={{backgroundImage:`url(${doctor.image})`}}/><div><span className="eyebrow">SPECIALIST PROFILE</span><h1>{doctor.name}</h1><p className="doctor-title">{doctor.title}</p><div className="doctor-facts"><span><Star size={17} fill="currentColor"/> {doctor.rating}</span><span><BriefcaseMedical size={17}/> {doctor.experience}</span><span><MapPin size={17}/> {doctor.location}</span><span><Languages size={17}/> {doctor.languages.join(', ')}</span></div><div className="doctor-buttons"><Link className="button" href="/get-treatment-plan">Request consultation <ArrowRight size={16}/></Link><Link className="button button-ghost" href={`/hospitals/${doctor.hospitalSlug}`}>View {doctor.hospital}</Link></div></div></div></section>
      <section className="section"><div className="container narrow"><span className="eyebrow">CLINICAL FOCUS</span><h2>Areas of expertise</h2><div className="feature-chip-grid">{doctor.specialties.map(s => <div key={s}><span>{s}</span></div>)}</div><div className="content-note"><strong>Prototype note</strong><p>Qualifications, registrations, procedure volumes, publications and real appointment availability should be verified before any doctor profile is published to patients.</p></div></div></section>
    </>
  );
}
