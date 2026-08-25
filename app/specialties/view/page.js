import { Suspense } from 'react';
import PublicSpecialtyDetailClient from '@/components/PublicSpecialtyDetailClient';
export const metadata={title:'Specialty | CareAtlas'};
export default function Page(){return <Suspense fallback={<section className="section"><div className="container">Loading specialty…</div></section>}><PublicSpecialtyDetailClient/></Suspense>;}
