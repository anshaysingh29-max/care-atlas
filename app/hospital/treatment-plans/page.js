import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, FilePlus2, Send, Stethoscope } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';

export const metadata = { title: 'Treatment Plans — CareAtlas Hospital Portal' };

const plans = [
  ['TP-260824-01','CA-26082401','James Miller','Total Knee Replacement','$5,450','Draft'],
  ['TP-260822-07','CA-26082207','Patient #207','Lumbar Spine Surgery','$7,200','Submitted'],
  ['TP-260820-62','CA-26082062','Patient #062','Hip Replacement','$6,100','Patient reviewing'],
];

export default function TreatmentPlansPage(){
  const action=<Link className="button button-sm" href="/hospital/treatment-plans/new"><FilePlus2 size={15}/> New plan</Link>;
  return <HospitalShell title="Treatment plans" subtitle="Create consistent, comparable clinical proposals for international patients." action={action}>
    <div className="plan-guidance"><Stethoscope size={20}/><div><strong>Structured plans, not sales quotes.</strong><span>CareAtlas separates clinical recommendations, estimated treatment charges, inclusions and travel assumptions so patients can compare providers more clearly.</span></div></div>
    <div className="hospital-plan-table portal-card"><div className="hospital-plan-row head"><span>Plan</span><span>Case</span><span>Patient</span><span>Procedure</span><span>Estimate</span><span>Status</span></div>{plans.map(([id,caseId,patient,procedure,price,status])=><div className="hospital-plan-row" key={id}><span><strong>{id}</strong></span><span>{caseId}</span><span>{patient}</span><span>{procedure}</span><span>{price}</span><span className="plan-status-cell">{status==='Draft'?<Clock3 size={14}/>:status==='Submitted'?<Send size={14}/>:<CheckCircle2 size={14}/>} {status}</span></div>)}</div>
    <div className="plan-create-cta"><div><span className="eyebrow">CASE CA-26082401</span><h2>James Miller is waiting for your clinical proposal.</h2><p>Build the structured treatment plan and preview exactly what the patient will compare.</p></div><Link className="button" href="/hospital/treatment-plans/new">Create plan <ArrowRight size={16}/></Link></div>
  </HospitalShell>;
}
