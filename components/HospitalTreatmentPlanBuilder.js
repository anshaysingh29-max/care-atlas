'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock3, DollarSign, FileCheck2, Hospital, Plane, Save, Send, Stethoscope } from 'lucide-react';

export default function HospitalTreatmentPlanBuilder() {
  const [saved, setSaved] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    doctor: 'Dr. Arjun Mehta', procedure: 'Total Knee Replacement', implant: 'Premium cemented implant',
    price: '5450', hospitalStay: '5', travelStay: '16', response: 'Patient appears suitable for surgical evaluation subject to in-person examination and updated pre-operative investigations.',
    included: 'Surgeon fees\nOperating theatre\nImplant\nHospital stay\nMedicines during admission',
    excluded: 'Flights\nHotel after discharge\nAdditional investigations if clinically required'
  });
  const price = useMemo(() => Number(form.price || 0).toLocaleString('en-US'), [form.price]);
  const update = (field,value) => { setForm(prev => ({...prev,[field]:value})); setSaved(false); setSent(false); };

  return <div className="plan-builder-layout">
    <div className="plan-builder-form portal-card">
      <div className="builder-back"><Link href="/hospital/cases/ca-26082401"><ArrowLeft size={15}/> Back to case CA-26082401</Link></div>
      <div className="portal-card-heading"><div><span className="eyebrow">CLINICAL PROPOSAL</span><h2>Create structured treatment plan</h2></div><span className="status-pill">Draft</span></div>
      <div className="builder-grid-two">
        <label className="field-label"><span>Treating doctor</span><select value={form.doctor} onChange={e=>update('doctor',e.target.value)}><option>Dr. Arjun Mehta</option><option>Dr. Nisha Kapoor</option></select></label>
        <label className="field-label"><span>Recommended procedure</span><input value={form.procedure} onChange={e=>update('procedure',e.target.value)}/></label>
      </div>
      <div className="builder-grid-two">
        <label className="field-label"><span>Implant / technique</span><input value={form.implant} onChange={e=>update('implant',e.target.value)}/></label>
        <label className="field-label"><span>Estimated treatment cost (USD)</span><input type="number" min="0" value={form.price} onChange={e=>update('price',e.target.value)}/></label>
      </div>
      <div className="builder-grid-two">
        <label className="field-label"><span>Hospital stay (days)</span><input type="number" min="1" value={form.hospitalStay} onChange={e=>update('hospitalStay',e.target.value)}/></label>
        <label className="field-label"><span>Recommended total stay (days)</span><input type="number" min="1" value={form.travelStay} onChange={e=>update('travelStay',e.target.value)}/></label>
      </div>
      <label className="field-label"><span>Clinical response</span><textarea rows="4" value={form.response} onChange={e=>update('response',e.target.value)}/></label>
      <div className="builder-grid-two">
        <label className="field-label"><span>Included — one item per line</span><textarea rows="6" value={form.included} onChange={e=>update('included',e.target.value)}/></label>
        <label className="field-label"><span>Not included — one item per line</span><textarea rows="6" value={form.excluded} onChange={e=>update('excluded',e.target.value)}/></label>
      </div>
      <div className="builder-actions">
        <button className="secondary-button" type="button" onClick={()=>setSaved(true)}><Save size={15}/> Save draft</button>
        <button className="button" type="button" onClick={()=>{setSaved(true);setSent(true);}}><Send size={15}/> Submit demo plan</button>
      </div>
      {(saved || sent) && <div className="builder-feedback"><CheckCircle2 size={17}/><div><strong>{sent ? 'Demo plan submitted.' : 'Draft saved in this browser view.'}</strong><span>No data was transmitted. Production submission will create an auditable versioned treatment plan.</span></div></div>}
    </div>

    <aside className="plan-preview portal-card">
      <span className="eyebrow">LIVE PREVIEW</span>
      <div className="preview-hospital"><Hospital size={20}/><div><strong>Aster Nova Institute</strong><span>New Delhi, India</span></div></div>
      <div className="preview-price"><small>ESTIMATED TREATMENT</small><strong>${price}</strong><span>USD · indicative until final clinical review</span></div>
      <div className="preview-procedure"><Stethoscope size={18}/><div><small>PROCEDURE</small><strong>{form.procedure}</strong><span>{form.doctor}</span></div></div>
      <div className="preview-metrics"><div><Clock3 size={16}/><strong>{form.hospitalStay} days</strong><small>Hospital stay</small></div><div><Plane size={16}/><strong>{form.travelStay} days</strong><small>Recommended trip</small></div><div><DollarSign size={16}/><strong>${price}</strong><small>Estimate</small></div></div>
      <div className="preview-clinical"><small>CLINICAL RESPONSE</small><p>{form.response}</p></div>
      <div className="preview-list"><h4><FileCheck2 size={15}/> Included</h4>{form.included.split('\n').filter(Boolean).map(x=><span key={x}><CheckCircle2 size={13}/>{x}</span>)}</div>
      <div className="preview-list excluded"><h4>Not included</h4>{form.excluded.split('\n').filter(Boolean).map(x=><span key={x}>— {x}</span>)}</div>
    </aside>
  </div>;
}
