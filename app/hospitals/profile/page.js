import { Suspense } from 'react';
import PublicHospitalProfileClient from '@/components/PublicHospitalProfileClient';
export const metadata={title:'Hospital Partner | CareAtlas'};
export default function Page(){return <Suspense fallback={<section className="section"><div className="container">Loading hospital…</div></section>}><PublicHospitalProfileClient/></Suspense>;}
