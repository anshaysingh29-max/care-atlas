'use client';

import { Building2, Globe2, ShieldCheck, Stethoscope } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';
import { useAuth } from '@/components/AuthProvider';
import { getHospitalCatalogueProfile } from '@/lib/firebase/hospital';

export default function HospitalProfileClient() {
  const { user, userProfile } = useAuth();
  const hospital = getHospitalCatalogueProfile(userProfile?.hospitalId);
  return <HospitalShell title="Hospital profile" subtitle="Partner identity used for assigned cases and submitted clinical responses.">
    <div className="phase6e-profile-grid">
      <section className="portal-card"><div className="portal-card-heading"><div><span className="eyebrow">PARTNER IDENTITY</span><h2>{hospital?.name || userProfile?.hospitalId}</h2></div><Building2 size={22}/></div><div className="admin-detail-facts"><span><Globe2 size={15}/><small>Location</small><strong>{hospital ? `${hospital.city}, ${hospital.country}` : 'Not in catalogue'}</strong></span><span><Stethoscope size={15}/><small>Hospital ID</small><strong>{userProfile?.hospitalId}</strong></span><span><ShieldCheck size={15}/><small>User role</small><strong>{userProfile?.role}</strong></span><span><ShieldCheck size={15}/><small>Account</small><strong>{user?.email}</strong></span></div>{hospital?.specialties?.length ? <div className="phase6e-specialty-chips">{hospital.specialties.map(item => <span key={item}>{item}</span>)}</div> : null}</section>
      <section className="portal-card"><span className="eyebrow">ACCESS MODEL</span><h2>Assignment-scoped access.</h2><p>Hospital users can only read cases assigned to their exact <strong>hospitalId</strong>. Medical files remain private in Google Drive and are downloaded only through the authenticated CareAtlas gateway.</p><div className="permission-banner"><ShieldCheck size={18}/><div><strong>No self-service privilege escalation</strong><span>Hospital roles and hospital IDs must be provisioned by CareAtlas in Firebase Authentication + Firestore.</span></div></div></section>
    </div>
  </HospitalShell>;
}
