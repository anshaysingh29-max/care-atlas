'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, ShieldCheck, Star, TrendingUp } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { getQualityDashboard } from '@/lib/firebase/trustAdmin';

export default function AdminQualityClient() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getQualityDashboard().then(setData).catch(err => setError(err.message || 'Could not build quality dashboard.')); }, []);
  return <AdminShell title="Experience quality" subtitle="Internal trust signals from verified journey reviews and CareAtlas support concerns.">
    <div className="phase7f-quality-note"><ShieldCheck size={20}/><div><strong>Experience signals, not clinical quality certification</strong><span>Scores below are patient-reported experience indicators. They do not independently verify clinical outcomes, safety or provider accreditation. Small samples are explicitly marked.</span></div></div>
    {error && <div className="phase7f-error"><AlertTriangle size={17}/>{error}</div>}
    {!data ? <section className="portal-card"><p>Loading quality signals…</p></section> : <>
      <div className="phase7f-admin-stats"><div><Star size={20}/><strong>{data.publishedReviewCount}</strong><span>Published verified reviews</span></div><div><BarChart3 size={20}/><strong>{data.pendingReviewCount}</strong><span>Pending moderation</span></div><div><AlertTriangle size={20}/><strong>{data.openConcernCount}</strong><span>Open concerns</span></div><div><TrendingUp size={20}/><strong>{data.resolvedConcernCount}</strong><span>Resolved concerns</span></div></div>
      <section className="portal-card phase7f-careatlas-score"><span className="eyebrow">CAREATLAS COORDINATION EXPERIENCE</span><h2>{data.careAtlasReviewCount ? `${data.careAtlasAverage.toFixed(1)} / 5` : 'No published feedback yet'}</h2><div><span><strong>{data.careAtlasReviewCount}</strong> verified reviews</span><span><strong>{data.careAtlasRecommendationRate}%</strong> would recommend</span><span><strong>{data.careAtlasOpenConcerns}</strong> open CareAtlas concerns</span></div><small>Patient-reported service experience only; not a clinical outcome measure.</small></section>
      <section className="portal-card"><span className="eyebrow">PROVIDER EXPERIENCE SIGNALS</span><h2>Hospital & Stay Partner feedback</h2><div className="phase7f-quality-table"><div className="head"><span>Provider</span><span>Rating</span><span>Recommend</span><span>Reported improvement</span><span>Concerns</span><span>Sample</span></div>{data.providers.map(row => <div key={row.key}><span><strong>{row.targetName}</strong><small>{row.targetType}</small></span><span>{row.reviewCount ? `${row.averageRating.toFixed(1)} / 5` : '—'} <small>{row.reviewCount} reviews</small></span><span>{row.recommendationRate}%</span><span>{row.improvementRate === null ? '—' : `${row.improvementRate}%`}<small>patient-reported</small></span><span>{row.unresolvedConcerns} open <small>{row.concerns} linked</small></span><span><i className={`phase7f-chip ${row.sampleStatus}`}>{row.sampleStatus === 'small_sample' ? 'small sample' : '5+ reviews'}</i></span></div>)}{!data.providers.length && <p>No published provider reviews yet.</p>}</div></section>
    </>}
  </AdminShell>;
}
