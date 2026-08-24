import TreatmentPlanForm from '@/components/TreatmentPlanForm';

export const metadata = {
  title: 'Get a Treatment Plan — CareAtlas',
  description: 'Create a structured CareAtlas treatment request and prepare your medical travel case.'
};

export default function GetTreatmentPlanPage() {
  return (
    <section className="intake-page">
      <div className="container">
        <TreatmentPlanForm />
      </div>
    </section>
  );
}
