'use client';

import { useState } from 'react';
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from 'lucide-react';

export default function AdminHospitalReview(){
  const [status,setStatus]=useState('Verification pending');
  return <div className="hospital-review-widget"><div><span className={`review-state ${status==='Approved'?'approved':status==='Needs changes'?'changes':''}`}>{status==='Approved'?<CheckCircle2 size={14}/>:status==='Needs changes'?<XCircle size={14}/>:<Clock3 size={14}/>} {status}</span><small>Demo moderation state only</small></div><div className="review-buttons"><button onClick={()=>setStatus('Approved')}><ShieldCheck size={14}/> Approve</button><button onClick={()=>setStatus('Needs changes')}>Request changes</button></div></div>;
}
