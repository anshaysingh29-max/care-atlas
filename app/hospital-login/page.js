import HospitalAuthForm from '@/components/HospitalAuthForm';

export const metadata = { title: 'Hospital Partner Sign In — CareAtlas' };

export default function HospitalLoginPage() {
  return <section className="auth-page hospital-auth-page"><div className="container auth-layout">
    <div className="auth-story hospital-auth-story"><span className="eyebrow light">CAREATLAS PARTNER NETWORK</span><h2>Respond to international patients with one structured workflow.</h2><p>Review only the records shared with your hospital, assign clinical teams, submit comparable treatment plans and coordinate consultations.</p><div className="auth-story-points"><span>01 <strong>Permissioned records</strong></span><span>02 <strong>Structured plans</strong></span><span>03 <strong>Case coordination</strong></span></div></div>
    <HospitalAuthForm />
  </div></section>;
}
