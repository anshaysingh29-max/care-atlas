import AuthForm from '@/components/AuthForm';

export const metadata = {
  title: 'Patient Sign In — CareAtlas'
};

export default function LoginPage() {
  return (
    <section className="auth-page">
      <div className="container auth-layout">
        <div className="auth-story">
          <span className="eyebrow light">YOUR MEDICAL JOURNEY</span>
          <h2>One place to organise the next steps in international care.</h2>
          <p>CareAtlas patient access is being designed for treatment plans, hospital comparisons, documents and journey tracking.</p>
          <div className="auth-story-points"><span>01 <strong>Structured cases</strong></span><span>02 <strong>Comparable hospital options</strong></span><span>03 <strong>One coordinated journey</strong></span></div>
        </div>
        <AuthForm mode="login" />
      </div>
    </section>
  );
}
