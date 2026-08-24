import AuthForm from '@/components/AuthForm';

export const metadata = {
  title: 'Create Patient Access — CareAtlas'
};

export default function RegisterPage() {
  return (
    <section className="auth-page">
      <div className="container auth-layout">
        <div className="auth-story">
          <span className="eyebrow light">START WITH CLARITY</span>
          <h2>Build your treatment journey around the information that matters.</h2>
          <p>Create prototype access, prepare your structured case and compare hospitals before deciding what to do next.</p>
          <div className="auth-story-points"><span>01 <strong>Patient-first planning</strong></span><span>02 <strong>Transparent comparisons</strong></span><span>03 <strong>Privacy by design</strong></span></div>
        </div>
        <AuthForm mode="register" />
      </div>
    </section>
  );
}
