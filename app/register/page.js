import AuthForm from '@/components/AuthForm';

export const metadata = {
  title: 'Create Patient Account — CareAtlas'
};

export default function RegisterPage() {
  return (
    <section className="auth-page">
      <div className="container auth-layout">
        <div className="auth-story">
          <span className="eyebrow light">START WITH CAREATLAS</span>
          <h2>Your treatment journey starts with a secure patient identity.</h2>
          <p>Create an account to submit real treatment cases to Firestore and return to your patient dashboard from any browser.</p>
          <div className="auth-story-points"><span>01 <strong>Secure sign-in</strong></span><span>02 <strong>Your own case access</strong></span><span>03 <strong>Persistent journey tracking</strong></span></div>
        </div>
        <AuthForm mode="register" />
      </div>
    </section>
  );
}
