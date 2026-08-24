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
          <h2>One secure account for your international care journey.</h2>
          <p>Sign in to access your real CareAtlas cases, journey status and the patient services being connected phase by phase.</p>
          <div className="auth-story-points"><span>01 <strong>Firebase-secured identity</strong></span><span>02 <strong>Private patient cases</strong></span><span>03 <strong>One coordinated journey</strong></span></div>
        </div>
        <AuthForm mode="login" />
      </div>
    </section>
  );
}
