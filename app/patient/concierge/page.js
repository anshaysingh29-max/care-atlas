import PatientShell from '@/components/PatientShell';
import CareNavigatorClient from '@/components/CareNavigatorClient';

export const metadata = { title: 'AI Concierge | CareAtlas Patient' };

export default function PatientConciergePage() {
  return <PatientShell title="AI Care Concierge" subtitle="Explore live CareAtlas hospital matches using your preferences, then save a shortlist or start a treatment request."><CareNavigatorClient mode="patient"/></PatientShell>;
}
