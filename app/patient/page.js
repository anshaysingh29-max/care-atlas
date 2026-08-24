import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle, Clock3, FileText, Hospital, MessageCircle, Plane, Stethoscope, UserRound } from 'lucide-react';
import PatientShell from '@/components/PatientShell';

const journey = [
  ['Case submitted','complete'],['Records reviewed','complete'],['Hospital matching','current'],['Treatment plans','upcoming'],['Doctor consultation','upcoming'],['Hospital selected','upcoming'],['Travel preparation','upcoming'],['Treatment','upcoming'],['Follow-up','upcoming']
];

export const metadata = { title: 'Patient Dashboard — CareAtlas' };

export default function PatientDashboard() {
  return <PatientShell title="Good afternoon, James." subtitle="Here’s where your CareAtlas journey stands today.">
    <div className="patient-stat-grid">
      <div className="patient-stat"><span><Hospital size={18}/></span><strong>3</strong><small>Hospitals reviewing</small></div>
      <div className="patient-stat"><span><FileText size={18}/></span><strong>1</strong><small>Treatment plan received</small></div>
      <div className="patient-stat"><span><Clock3 size={18}/></span><strong>8h</strong><small>Last CareAtlas update</small></div>
      <div className="patient-stat"><span><UserRound size={18}/></span><strong>Sarah</strong><small>Your coordinator</small></div>
    </div>

    <div className="patient-grid-two">
      <section className="portal-card journey-card">
        <div className="portal-card-heading"><div><span className="eyebrow">YOUR JOURNEY</span><h2>From case review to recovery.</h2></div><span className="status-pill">In progress</span></div>
        <div className="journey-list">{journey.map(([label,status],i)=><div key={label} className={`journey-item ${status}`}><div className="journey-marker">{status==='complete'?<CheckCircle2 size={19}/>:status==='current'?<Clock3 size={18}/>:<Circle size={18}/>}</div><div><small>STEP {String(i+1).padStart(2,'0')}</small><strong>{label}</strong>{status==='current'&&<span>CareAtlas is matching your case with suitable orthopedic teams.</span>}</div></div>)}</div>
      </section>

      <div className="patient-stack">
        <section className="portal-card coordinator-card"><span className="eyebrow">YOUR COORDINATOR</span><div className="coordinator-person"><div className="coordinator-avatar">SA</div><div><h3>Sarah Ahmed</h3><p>International Patient Coordinator</p><small>Usually replies within 2 hours</small></div></div><Link className="button full-button" href="/patient/messages"><MessageCircle size={16}/> Message Sarah</Link></section>
        <section className="portal-card next-action-card"><span className="eyebrow">NEXT ACTION</span><Stethoscope size={28}/><h3>Review your first treatment plan</h3><p>A structured proposal from Aster Nova Institute is ready for you.</p><Link href="/patient/treatment-plans" className="link-arrow">Review treatment plan <ArrowRight size={17}/></Link></section>
        <section className="portal-card trip-mini"><span className="eyebrow">TRAVEL WINDOW</span><Plane size={24}/><h3>September 2026</h3><p>Your preferred treatment travel window. Final travel dates will only be suggested after hospital selection.</p></section>
      </div>
    </div>
  </PatientShell>;
}
