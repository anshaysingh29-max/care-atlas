'use client';

import { useState } from 'react';
import { CheckCircle2, UserRoundCheck } from 'lucide-react';

export default function CoordinatorAssignment(){
  const [assigned,setAssigned]=useState('Sarah Chen');
  const coordinators=['Sarah Chen','Amina Rahman','Daniel Thomas','Priya Menon'];
  return <div className="assign-widget"><div><UserRoundCheck size={18}/><span><small>Case coordinator</small><strong>{assigned}</strong></span></div><select aria-label="Assign coordinator" value={assigned} onChange={e=>setAssigned(e.target.value)}>{coordinators.map(name=><option key={name}>{name}</option>)}</select><span className="assign-saved"><CheckCircle2 size={13}/> Demo assignment</span></div>;
}
