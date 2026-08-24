import { ArrowRight, BedDouble, Check, Clock3, DollarSign, FileText, Plane, ShieldCheck, Video } from 'lucide-react';
import PatientShell from '@/components/PatientShell';
export const metadata={title:'Treatment Plans — CareAtlas'};
export default function PlansPage(){return <PatientShell title="Treatment plans" subtitle="Compare structured proposals from hospitals reviewing your case.">
  <div className="plan-summary-strip"><span><FileText size={18}/>1 plan received</span><span><Clock3 size={18}/>2 hospitals reviewing</span><span><ShieldCheck size={18}/>CareAtlas structured format</span></div>
  <section className="treatment-plan-card">
    <div className="plan-head"><div><span className="eyebrow">TREATMENT PLAN · RECEIVED</span><h2>Aster Nova Institute</h2><p>New Delhi, India 🇮🇳</p></div><div className="plan-price"><small>ESTIMATED TREATMENT</small><strong>$5,450</strong><span>Final price subject to clinical review</span></div></div>
    <div className="plan-procedure"><span><strong>Recommended procedure</strong>Total Knee Replacement · Right Knee</span><span><strong>Proposed specialist</strong>Dr. Arjun Mehta · Joint Replacement</span></div>
    <div className="plan-metrics"><div><BedDouble/><strong>5 days</strong><small>Hospital stay</small></div><div><Plane/><strong>16 days</strong><small>Suggested trip</small></div><div><Clock3/><strong>Sep 2026</strong><small>Indicative window</small></div><div><DollarSign/><strong>$5,450</strong><small>Medical estimate</small></div></div>
    <div className="plan-inclusions"><div><h3>Included in estimate</h3>{['Surgeon and clinical team fees','Operating theatre charges','Standard implant allowance','5-day hospital stay','Routine medicines during admission'].map(x=><span key={x}><Check size={14}/>{x}</span>)}</div><div><h3>Not included</h3>{['International flights','Hotel after discharge','Additional investigations if clinically required','Companion expenses'].map(x=><span key={x}>— {x}</span>)}</div></div>
    <div className="plan-actions"><button className="button"><Video size={16}/> Request video consultation</button><button className="button button-secondary">Shortlist this hospital <ArrowRight size={16}/></button></div>
  </section>
  <div className="pending-plan-grid"><div><span>🇹🇷</span><div><strong>Bosporus Medical Centre</strong><small>Clinical team reviewing your case</small></div><Clock3 size={18}/></div><div><span>🇹🇭</span><div><strong>Siam International Hospital</strong><small>Clinical team reviewing your case</small></div><Clock3 size={18}/></div></div>
</PatientShell>}
