import Link from 'next/link';
import { ArrowRight, FileUp } from 'lucide-react';

export default function CTA() {
  return (
    <section className="cta-section">
      <div className="container cta-shell">
        <div>
          <span className="eyebrow light">YOUR CASE, ONE CLEAR NEXT STEP</span>
          <h2>Already have medical reports?</h2>
          <p>Prepare a structured CareAtlas case and see how your documents, travel needs and treatment preferences will come together.</p>
        </div>
        <Link className="button button-light" href="/get-treatment-plan"><FileUp size={18}/> Start my case <ArrowRight size={18}/></Link>
      </div>
    </section>
  );
}
