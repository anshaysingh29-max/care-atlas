import { CalendarCheck2, Clock3, Globe2, Video } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';
import ConsultationAvailability from '@/components/ConsultationAvailability';

export const metadata = { title: 'Consultations — CareAtlas Hospital Portal' };

export default function ConsultationsPage(){
  return <HospitalShell title="Consultations" subtitle="Offer suitable clinical slots and coordinate confirmed video consultations.">
    <div className="hospital-stat-grid consultation-stats"><div className="hospital-stat"><span><Video size={18}/></span><strong>4</strong><small>Requested</small><em>Awaiting slots</em></div><div className="hospital-stat"><span><CalendarCheck2 size={18}/></span><strong>3</strong><small>Confirmed</small><em>Next 7 days</em></div><div className="hospital-stat"><span><Clock3 size={18}/></span><strong>30m</strong><small>Default duration</small><em>Video consult</em></div><div className="hospital-stat"><span><Globe2 size={18}/></span><strong>5</strong><small>Patient timezones</small><em>Auto-convert later</em></div></div>
    <div className="hospital-consult-grid"><section className="portal-card"><div className="portal-card-heading"><div><span className="eyebrow">AVAILABILITY</span><h2>Offer consultation slots</h2></div></div><ConsultationAvailability/></section><section className="portal-card consultation-queue"><span className="eyebrow">UPCOMING</span><article><div className="queue-date">01<small>SEP</small></div><div><strong>James Miller</strong><span>Knee replacement · United Kingdom</span><small>Dr. Arjun Mehta · 11:00 AM IST</small></div><i>Awaiting patient</i></article><article><div className="queue-date">03<small>SEP</small></div><div><strong>Patient #207</strong><span>Spine surgery · UAE</span><small>Dr. Nisha Kapoor · 3:00 PM IST</small></div><i>Confirmed</i></article></section></div>
  </HospitalShell>;
}
