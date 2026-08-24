import { ArrowRight, FileUp } from 'lucide-react';

export default function CTA() {
  return (
    <section className="cta-section">
      <div className="container cta-shell">
        <div>
          <span className="eyebrow light">YOUR CASE, ONE CLEAR NEXT STEP</span>
          <h2>Already have medical reports?</h2>
          <p>Share your records securely with the CareAtlas coordination team and start comparing suitable treatment options.</p>
        </div>
        <a className="button button-light" href="mailto:concierge@careatlas.example?subject=Medical%20Reports%20for%20Treatment%20Plan"><FileUp size={18}/> Start my case <ArrowRight size={18}/></a>
      </div>
    </section>
  );
}
