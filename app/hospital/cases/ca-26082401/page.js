import { CalendarDays, CheckCircle2, FileHeart, FileText, Globe2, Languages, LockKeyhole, Plane, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';
import HospitalCaseActions from '@/components/HospitalCaseActions';

export const metadata = { title: 'Case CA-26082401 — CareAtlas Hospital Portal' };

const docs = [
  ['MRI_Right_Knee_Demo.pdf','Imaging report','24 Aug 2026'],
  ['Orthopedic_Consult_Demo.pdf','Specialist note','23 Aug 2026'],
  ['Medication_List_Demo.pdf','Medication','23 Aug 2026'],
  ['Medical_History_Demo.pdf','History','23 Aug 2026'],
];

export default function CaseDetailPage(){
  return <HospitalShell title="Case CA-26082401" subtitle="Orthopedic evaluation · shared with Aster Nova Institute">
    <div className="case-detail-grid">
      <div className="case-detail-main">
        <section className="portal-card case-patient-summary"><div className="portal-card-heading"><div><span className="eyebrow">PATIENT SUMMARY</span><h2>James Miller</h2></div><span className="status-pill">New international case</span></div><div className="case-summary-grid"><span><UserRound size={16}/><small>Patient</small><strong>Male · 57 years</strong></span><span><Globe2 size={16}/><small>Country</small><strong>United Kingdom</strong></span><span><Languages size={16}/><small>Language</small><strong>English</strong></span><span><Plane size={16}/><small>Travel window</small><strong>September 2026</strong></span></div></section>

        <section className="portal-card clinical-request"><div className="portal-card-heading"><div><span className="eyebrow">MEDICAL REQUIREMENT</span><h2>Total Knee Replacement</h2></div><Stethoscope size={24}/></div><div className="clinical-request-grid"><div><small>PATIENT-PROVIDED DIAGNOSIS</small><p>Advanced right-knee osteoarthritis with increasing pain and reduced mobility. Patient is seeking a specialist review and treatment options.</p></div><div><small>PREFERRED TIMING</small><p>Within 1–2 months, subject to treatment plan and consultation.</p></div></div><div className="clinical-disclaimer"><ShieldCheck size={16}/><span>CareAtlas organizes patient-submitted information. Diagnosis, suitability and treatment decisions remain with the treating clinical team.</span></div></section>

        <section className="portal-card shared-records"><div className="portal-card-heading"><div><span className="eyebrow">SHARED MEDICAL RECORDS</span><h2>4 documents available</h2></div><LockKeyhole size={21}/></div><div className="record-permission-note"><ShieldCheck size={17}/><div><strong>Patient-authorized access</strong><span>Only these demo files are represented as shared with your hospital. A production portal must log every record access and revoke access when authorization ends.</span></div></div><div className="shared-doc-table"><div className="shared-doc-row head"><span>Document</span><span>Type</span><span>Shared</span><span>Access</span></div>{docs.map(([name,type,date])=><div className="shared-doc-row" key={name}><span><FileText size={15}/>{name}</span><span>{type}</span><span>{date}</span><span><CheckCircle2 size={14}/> View allowed</span></div>)}</div></section>

        <section className="portal-card travel-needs"><span className="eyebrow">TRAVEL & SUPPORT</span><div className="travel-needs-grid"><span><CalendarDays size={17}/><strong>September 2026</strong><small>Preferred travel</small></span><span><Plane size={17}/><strong>Patient + 1 attendant</strong><small>Travelling party</small></span><span><FileHeart size={17}/><strong>Visa + hotel + pickup</strong><small>Support requested</small></span></div></section>
      </div>
      <aside className="case-detail-side"><HospitalCaseActions/><section className="portal-card coordinator-side"><span className="eyebrow">CAREATLAS COORDINATOR</span><div className="coordinator-person"><div className="coordinator-avatar">SA</div><div><h3>Sarah Ahmed</h3><p>International Patient Coordinator</p><small>Case coordination contact</small></div></div><p className="side-note">Use the portal response workflow for clinical information. Direct patient contact will be coordinated after consent and consultation confirmation.</p></section></aside>
    </div>
  </HospitalShell>;
}
