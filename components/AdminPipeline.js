'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, GripVertical } from 'lucide-react';

const initial = [
  {id:'CA-26082401',patient:'James Miller',treatment:'Knee Replacement',country:'United Kingdom',stage:'Hospital review',age:'2h'},
  {id:'CA-26082318',patient:'Patient #318',treatment:'CABG Evaluation',country:'Kenya',stage:'Needs plan',age:'5h'},
  {id:'CA-26082207',patient:'Patient #207',treatment:'Spine Surgery',country:'UAE',stage:'Consultation',age:'1d'},
  {id:'CA-26082142',patient:'Patient #142',treatment:'IVF',country:'Tanzania',stage:'New case',age:'1d'},
  {id:'CA-26082062',patient:'Patient #062',treatment:'Hip Replacement',country:'Nigeria',stage:'Patient reviewing',age:'2d'},
  {id:'CA-26081911',patient:'Patient #911',treatment:'Oncology',country:'Oman',stage:'Travel prep',age:'3d'},
];

const stages=['New case','Hospital review','Needs plan','Consultation','Patient reviewing','Travel prep'];

export default function AdminPipeline(){
  const [cases,setCases]=useState(initial);
  function nextCase(id){
    setCases(list=>list.map(item=>{ if(item.id!==id) return item; const idx=stages.indexOf(item.stage); return {...item,stage:stages[Math.min(idx+1,stages.length-1)]}; }));
  }
  return <div className="admin-pipeline">{stages.map(stage=><section key={stage} className="pipeline-column"><header><strong>{stage}</strong><span>{cases.filter(c=>c.stage===stage).length}</span></header><div className="pipeline-stack">{cases.filter(c=>c.stage===stage).map(c=><article className="pipeline-card" key={c.id}><div className="pipeline-card-top"><span><GripVertical size={13}/>{c.id}</span><small>{c.age}</small></div><h3>{c.treatment}</h3><p>{c.patient} · {c.country}</p><div className="pipeline-actions"><Link href={c.id==='CA-26082401'?'/admin/cases/ca-26082401':'/admin/cases'}>Open</Link>{stage!=='Travel prep'&&<button onClick={()=>nextCase(c.id)}>Advance <ArrowRight size={12}/></button>}</div></article>)}</div></section>)}</div>;
}
