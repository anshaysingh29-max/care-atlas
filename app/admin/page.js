import Link from 'next/link';
import { Activity, ArrowRight, Building2, Clock3, FileCheck2, HeartHandshake, PlaneTakeoff, TrendingUp, UsersRound } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import AdminPipeline from '@/components/AdminPipeline';

export const metadata={title:'CareAtlas Operations Dashboard'};

export default function AdminDashboard(){return <AdminShell title="Global operations" subtitle="See every active patient journey, partner response and bottleneck across CareAtlas.">
  <div className="admin-stat-grid">
    <article><span><UsersRound size={18}/></span><strong>184</strong><small>Active cases</small><em>+17 this week</em></article>
    <article><span><Clock3 size={18}/></span><strong>31</strong><small>Plans pending</small><em>8 over SLA</em></article>
    <article><span><Building2 size={18}/></span><strong>24</strong><small>Partner hospitals</small><em>4 onboarding</em></article>
    <article><span><PlaneTakeoff size={18}/></span><strong>11</strong><small>Travel confirmed</small><em>Next 30 days</em></article>
  </div>
  <div className="admin-grid-main">
    <section className="portal-card admin-pipeline-card"><div className="portal-card-heading"><div><span className="eyebrow">LIVE CASE PIPELINE</span><h2>Where every patient journey stands.</h2></div><Link className="link-arrow" href="/admin/cases">Case list <ArrowRight size={15}/></Link></div><AdminPipeline/></section>
    <aside className="admin-stack">
      <section className="portal-card ops-health"><span className="eyebrow">OPERATIONS HEALTH</span><div className="ops-score">88<small>%</small></div><h3>Within service targets</h3><p>Hospital response, coordinator follow-up and plan turnaround combined.</p></section>
      <section className="portal-card admin-mini-list"><span className="eyebrow">ATTENTION NEEDED</span><h3>8 cases beyond response target</h3><p>Oldest open hospital request: 19 hours.</p><Link href="/admin/cases" className="link-arrow">Review queue <ArrowRight size={14}/></Link></section>
      <section className="portal-card admin-mini-list"><span className="eyebrow">PARTNER QUALITY</span><h3>3 hospitals need verification updates</h3><p>Accreditation or international-desk information is incomplete.</p><Link href="/admin/hospitals" className="link-arrow">Partner review <ArrowRight size={14}/></Link></section>
    </aside>
  </div>
  <div className="admin-bottom-grid">
    <section className="portal-card"><div className="portal-card-heading"><div><span className="eyebrow">NETWORK MOMENTUM</span><h2>Current funnel.</h2></div><TrendingUp size={22}/></div><div className="funnel-bars"><span style={{'--bar':'100%'}}><i>New enquiries</i><strong>412</strong></span><span style={{'--bar':'72%'}}><i>Cases qualified</i><strong>296</strong></span><span style={{'--bar':'41%'}}><i>Plans received</i><strong>168</strong></span><span style={{'--bar':'18%'}}><i>Patients selected</i><strong>74</strong></span><span style={{'--bar':'8%'}}><i>Travel confirmed</i><strong>31</strong></span></div></section>
    <section className="portal-card admin-activity"><span className="eyebrow">RECENT OPERATIONS</span>{[[FileCheck2,'Treatment plan TP-260824-01 submitted','Aster Nova · 18 min ago'],[HeartHandshake,'Coordinator assigned to CA-26082318','Amina Rahman · 42 min ago'],[Building2,'Hospital verification document updated','Istanbul Medica · 1h ago'],[Activity,'Case CA-26082401 moved to hospital review','Sarah Chen · 2h ago']].map(([Icon,title,meta])=><article key={title}><Icon size={16}/><div><strong>{title}</strong><span>{meta}</span></div></article>)}</section>
  </div>
</AdminShell>}
