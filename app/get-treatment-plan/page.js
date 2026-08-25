import { Suspense } from 'react';
import TreatmentPlanForm from '@/components/TreatmentPlanForm';

export const metadata = {
  title: 'Get a Treatment Plan — CareAtlas',
  description: 'Create a structured CareAtlas treatment request and prepare your medical travel case.'
};

export default function GetTreatmentPlanPage() {
  return (
    <section className="intake-page">
      <div className="container">
        <Suspense fallback={<div className="portal-card">Loading treatment request…</div>}><TreatmentPlanForm /></Suspense>
      </div>
    </section>
  );
}
