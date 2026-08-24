'use client';
import { useState } from 'react';
import { FileCheck2, FileText, FolderLock, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import PatientShell from '@/components/PatientShell';

const initial=[['Knee MRI Report.pdf','MRI / Imaging','24 Aug 2026'],['Orthopedic Consultation.pdf','Consultation','24 Aug 2026'],['Recent Blood Tests.pdf','Lab report','24 Aug 2026']];
export default function DocumentsPage(){const [docs,setDocs]=useState(initial);function addDemo(){setDocs(d=>[...d,[`Demo Medical Document ${d.length+1}.pdf`,'Other','Today']])}return <PatientShell title="Medical documents" subtitle="Organise the records attached to your CareAtlas case.">
  <div className="privacy-warning"><FolderLock size={22}/><div><strong>Static prototype — do not upload real medical records</strong><span>This GitHub Pages preview does not have encrypted medical storage. The button below only creates a demo document row in your browser.</span></div></div>
  <section className="portal-card documents-card"><div className="portal-card-heading"><div><span className="eyebrow">CASE DOCUMENTS</span><h2>{docs.length} documents</h2></div><button onClick={addDemo} className="button button-sm"><Plus size={16}/> Add demo document</button></div><div className="documents-table"><div className="doc-row doc-head"><span>Document</span><span>Category</span><span>Added</span><span></span></div>{docs.map((d,i)=><div className="doc-row" key={`${d[0]}-${i}`}><span className="doc-name"><FileText size={18}/><strong>{d[0]}</strong></span><span>{d[1]}</span><span>{d[2]}</span><button onClick={()=>setDocs(x=>x.filter((_,idx)=>idx!==i))} aria-label="Remove demo document"><Trash2 size={15}/></button></div>)}</div></section>
  <div className="document-trust-grid"><div><ShieldCheck/><strong>Private by design</strong><span>Production document access will be scoped to explicitly shared hospital cases.</span></div><div><FileCheck2/><strong>Structured records</strong><span>CareAtlas categorises reports so coordinators and hospital teams can review the right information faster.</span></div></div>
</PatientShell>}
