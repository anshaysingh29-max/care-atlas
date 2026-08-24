import Link from 'next/link';
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, FilePlus2, FolderKanban, Globe2, MessageSquareText, UserRoundCheck } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';

export const metadata = { title: 'Hospital Dashboard — CareAtlas' };

const recentCases = [
  ['CA-26082401','Knee Replacement','United Kingdom','Reviewing','2h ago'],
  ['CA-26082318','Cardiac Surgery','Kenya','Need plan','5h ago'],
  ['CA-26082207','Spine Surgery','UAE','Consultation','Yesterday'],
];

export default function HospitalDashboard() {
  return <HospitalShell title="International patient desk" subtitle="Manage new cases, clinical responses and consultations from one workspace.">
    <div className="hospital-stat-grid">
      <div className="hospital-stat"><span><FolderKanban size={18}/></span><strong>13</strong><small>New cases</small><em>+4 this week</em></div>
      <div className="hospital-stat"><span><Clock3 size={18}/></span><strong>5</strong><small>Needs response</small><em>Oldest: 11h</em></div>
      <div className="hospital-stat"><span><FilePlus2 size={18}/></span><strong>21</strong><small>Plans sent</small><em>Last 30 days</em></div>
      <div className="hospital-stat"><span><UserRoundCheck size={18}/></span><strong>7</strong><small>Confirmed patients</small><em>Current pipeline</em></div>
    </div>

    <div className="hospital-grid-main">
      <section className="portal-card hospital-recent-card">
        <div className="portal-card-heading"><div><span className="eyebrow">RECENT CASES</span><h2>Cases needing your team.</h2></div><Link href="/hospital/cases" className="link-arrow">All cases <ArrowRight size={16}/></Link></div>
        <div className="hospital-case-table"><div className="hospital-case-row head"><span>Case</span><span>Treatment</span><span>Patient from</span><span>Status</span><span>Updated</span></div>{recentCases.map(([id,treatment,country,status,updated])=><Link href={id==='CA-26082401'?'/hospital/cases/ca-26082401':'/hospital/cases'} className="hospital-case-row" key={id}><span><strong>{id}</strong></span><span>{treatment}</span><span><Globe2 size={13}/>{country}</span><span><i className="hospital-status">{status}</i></span><span>{updated}</span></Link>)}</div>
      </section>

      <div className="hospital-stack">
        <section className="portal-card response-health"><span className="eyebrow">RESPONSE HEALTH</span><div className="response-ring">92<small>%</small></div><h3>Cases answered within 12 hours</h3><p>Fast, complete responses improve the patient comparison experience.</p></section>
        <section className="portal-card partner-next"><span className="eyebrow">NEXT CONSULTATION</span><CalendarClock size={25}/><h3>James Miller</h3><p>Knee replacement · 1 Sep · 11:00 AM IST</p><Link href="/hospital/consultations" className="link-arrow">Manage availability <ArrowRight size={16}/></Link></section>
        <section className="portal-card partner-note"><MessageSquareText size={20}/><div><strong>CareAtlas coordinator note</strong><span>Patient prefers a video consultation before confirming travel dates.</span></div><CheckCircle2 size={18}/></section>
      </div>
    </div>
  </HospitalShell>;
}
