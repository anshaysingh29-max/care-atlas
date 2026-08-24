'use client';

import { useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Video } from 'lucide-react';

const initial = [
  { id:1, date:'Tue, 1 Sep', time:'11:00 AM IST', doctor:'Dr. Arjun Mehta', enabled:true },
  { id:2, date:'Wed, 2 Sep', time:'4:30 PM IST', doctor:'Dr. Arjun Mehta', enabled:true },
  { id:3, date:'Fri, 4 Sep', time:'10:00 AM IST', doctor:'Dr. Nisha Kapoor', enabled:false },
];

export default function ConsultationAvailability() {
  const [slots,setSlots] = useState(initial);
  const [notice,setNotice] = useState(false);
  return <>
    <div className="consultation-slot-list">
      {slots.map(slot=><div className="consultation-slot" key={slot.id}><div className="slot-icon"><Video size={18}/></div><div><strong>{slot.date} · {slot.time}</strong><span>{slot.doctor} · Video consultation · 30 min</span></div><button type="button" className={slot.enabled ? 'slot-toggle enabled' : 'slot-toggle'} onClick={()=>setSlots(s=>s.map(x=>x.id===slot.id?{...x,enabled:!x.enabled}:x))}>{slot.enabled ? 'Available' : 'Unavailable'}</button></div>)}
    </div>
    <div className="consultation-save"><button className="button" type="button" onClick={()=>setNotice(true)}><CalendarClock size={16}/> Save availability</button>{notice&&<span><CheckCircle2 size={14}/> Saved in prototype view</span>}</div>
    <p className="case-action-note"><Clock3 size={13}/> Production scheduling will sync hospital availability and patient timezone before confirmation.</p>
  </>;
}
