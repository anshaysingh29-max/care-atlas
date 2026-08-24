import Link from 'next/link';
import { ArrowRight, CalendarDays, FileText, Globe2, Search, ShieldCheck } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';

export const metadata = { title: 'Patient Cases — CareAtlas Hospital Portal' };

const cases = [
  {id:'CA-26082401',name:'James Miller',from:'United Kingdom',treatment:'Total Knee Replacement',travel:'September 2026',docs:4,status:'Reviewing',priority:'New'},
  {id:'CA-26082318',name:'Patient #318',from:'Kenya',treatment:'CABG Evaluation',travel:'Within 1 month',docs:6,status:'Needs treatment plan',priority:'Due soon'},
  {id:'CA-26082207',name:'Patient #207',from:'UAE',treatment:'Lumbar Spine Surgery',travel:'October 2026',docs:3,status:'Consultation requested',priority:'Active'},
  {id:'CA-26082062',name:'Patient #062',from:'Nigeria',treatment:'Hip Replacement',travel:'Exploring options',docs:5,status:'Plan submitted',priority:'Waiting'},
];

export default function HospitalCasesPage(){
  return <HospitalShell title="International patient cases" subtitle="Review cases CareAtlas has explicitly shared with Aster Nova Institute.">
    <div className="hospital-filter-bar"><div><Search size={15}/><span>Search case, treatment or country</span></div><button>All cases</button><button>Needs response</button><button>Consultations</button></div>
    <div className="permission-banner"><ShieldCheck size={18}/><div><strong>Permission-based case access</strong><span>Hospital users should only see patients whose case has been shared with this organization. Demo names and documents below are fictional.</span></div></div>
    <div className="case-card-list">{cases.map(c=><article className="hospital-case-card" key={c.id}><div className="case-card-top"><div><span className="case-priority">{c.priority}</span><h2>{c.id}</h2><p>{c.name}</p></div><span className="hospital-status large">{c.status}</span></div><div className="case-card-facts"><span><Globe2 size={15}/><small>Patient from</small><strong>{c.from}</strong></span><span><FileText size={15}/><small>Treatment</small><strong>{c.treatment}</strong></span><span><CalendarDays size={15}/><small>Travel window</small><strong>{c.travel}</strong></span><span><FileText size={15}/><small>Shared documents</small><strong>{c.docs} files</strong></span></div><Link className="case-open-link" href={c.id==='CA-26082401'?'/hospital/cases/ca-26082401':'/hospital/cases'}>Open case <ArrowRight size={16}/></Link></article>)}</div>
  </HospitalShell>;
}
