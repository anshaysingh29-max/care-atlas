import CareNavigatorClient from '@/components/CareNavigatorClient';

export const metadata = {
  title: 'AI Care Navigator — CareAtlas',
  description: 'Use explainable CareAtlas matching to explore approved international hospital partners by specialty and travel preferences.'
};

export default function CareNavigatorPage() {
  return <>
    <section className="phase8a-public-hero">
      <div className="container"><span className="eyebrow">AI CARE NAVIGATOR</span><h1>Find a clearer path to the right CareAtlas options.</h1><p>Start with a specialty or treatment you already know, add your travel preferences, and see explainable matches from the live CareAtlas hospital network.</p></div>
    </section>
    <section className="section phase8a-public-section"><div className="container"><CareNavigatorClient mode="public"/></div></section>
  </>;
}
