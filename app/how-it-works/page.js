import { ArrowRight, Building2, FileSearch, HeartHandshake, PlaneTakeoff, SearchCheck, Stethoscope } from 'lucide-react';

export const metadata = { title: 'How It Works | CareAtlas' };

const steps = [
  [SearchCheck, 'Explore your options', 'Start from a treatment, destination or hospital and understand the broad choices available.'],
  [FileSearch, 'Share your case', 'In Phase 2, patients will securely submit their medical details and documents for structured review.'],
  [Building2, 'Match with suitable hospitals', 'CareAtlas will route eligible cases to relevant partner hospitals rather than broadcasting every case everywhere.'],
  [Stethoscope, 'Receive treatment plans', 'Hospitals respond with the treating doctor, recommended procedure, expected stay and an estimated quotation.'],
  [HeartHandshake, 'Choose with support', 'Compare plans and continue with a human CareAtlas coordinator for non-clinical guidance and logistics.'],
  [PlaneTakeoff, 'Prepare for travel', 'Travel, visa, accommodation and arrival support are planned for later product phases.']
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="page-hero compact-hero"><div className="container"><span className="eyebrow">THE CAREATLAS JOURNEY</span><h1>From uncertainty to a clearer care plan.</h1><p>CareAtlas is designed around a simple principle: patients should understand their options before they are pushed toward a provider.</p></div></section>
      <section className="section"><div className="container process-grid">{steps.map(([Icon,title,text],i) => <article className="process-card" key={title}><div className="process-number">0{i+1}</div><Icon size={25}/><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="section section-soft"><div className="container partner-shell"><div><span className="eyebrow">READY TO BEGIN?</span><h2>Explore treatment options first.</h2><p>Phase 1 lets you browse the discovery experience while the case-management journey is prepared for the next build phase.</p></div><a className="button" href="/treatments">Explore treatments <ArrowRight size={17}/></a></div></section>
    </>
  );
}
