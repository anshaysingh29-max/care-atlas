'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, FilePlus2, ShieldCheck } from 'lucide-react';

export default function HospitalCaseActions() {
  const [status, setStatus] = useState('Reviewing');
  return <div className="case-action-panel">
    <div className="case-action-status"><span className={`status-dot ${status.toLowerCase().replaceAll(' ','-')}`}></span><div><small>CURRENT HOSPITAL STATUS</small><strong>{status}</strong></div></div>
    <div className="case-action-buttons">
      <button type="button" className={status === 'Reviewing' ? 'active' : ''} onClick={() => setStatus('Reviewing')}><Clock3 size={15}/> Reviewing</button>
      <button type="button" className={status === 'Accepted' ? 'active' : ''} onClick={() => setStatus('Accepted')}><CheckCircle2 size={15}/> Accept case</button>
      <button type="button" className={status === 'Need more information' ? 'active' : ''} onClick={() => setStatus('Need more information')}><ShieldCheck size={15}/> Need information</button>
    </div>
    <Link className="button full-button" href="/hospital/treatment-plans/new"><FilePlus2 size={16}/> Create treatment plan <ArrowRight size={16}/></Link>
    <p className="case-action-note">Prototype only — status changes remain in this browser view and are not sent to a patient.</p>
  </div>;
}
