import HospitalShell from '@/components/HospitalShell';
import HospitalTreatmentPlanBuilder from '@/components/HospitalTreatmentPlanBuilder';

export const metadata = { title: 'Create Treatment Plan — CareAtlas Hospital Portal' };

export default function NewTreatmentPlanPage(){
  return <HospitalShell title="Treatment plan builder" subtitle="Case CA-26082401 · James Miller · Knee Replacement"><HospitalTreatmentPlanBuilder/></HospitalShell>;
}
