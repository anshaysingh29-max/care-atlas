'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  ClipboardCopy,
  Clock3,
  Flame,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRoundPlus,
  UsersRound
} from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { growthBandLabel } from '@/lib/ai/growth';
import { getGrowthCrmWorkspace } from '@/lib/firebase/growthAdmin';

const FILTERS = [
  ['all', 'All opportunities'],
  ['case', 'Patient cases'],
  ['partner_lead', 'Partner leads'],
  ['navigator', 'Navigator'],
  ['hot', 'Hot'],
  ['stale', 'Stale 7+ days']
];

function compactId(value) {
  const text = String(value || '');
  if (!text) return 'Unknown';
  if (text.length <= 10) return text;
  return `${text.slice(0, 5)}…${text.slice(-4)}`;
}

function labelize(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function typeLabel(type) {
  return ({ case: 'Patient case', partner_lead: 'Partner lead', navigator: 'AI Navigator' })[type] || 'Opportunity';
}

function titleFor(row) {
  if (row.type === 'case') return row.caseNumber || row.id;
  if (row.type === 'partner_lead') return row.firstName || 'Partner lead';
  return `Navigator ${compactId(row.patientId)}`;
}

function subtitleFor(row) {
  if (row.type === 'case') return [row.patientName, row.patientCountry, row.treatmentName].filter(Boolean).join(' · ');
  if (row.type === 'partner_lead') return [row.country, row.treatmentInterest, row.campaign].filter(Boolean).join(' · ');
  return [row.specialtyId || row.treatmentSlug || 'Care discovery', `${row.shortlistCount || row.resultCount || 0} matched options`].join(' · ');
}

export default function AdminGrowthClient() {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setWorkspace(await getGrowthCrmWorkspace());
    } catch (loadError) {
      setError(loadError?.message || 'Could not load Growth CRM.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const opportunities = useMemo(() => {
    const rows = workspace?.opportunities || [];
    const needle = search.trim().toLowerCase();
    return rows.filter(row => {
      if (filter === 'case' && row.type !== 'case') return false;
      if (filter === 'partner_lead' && row.type !== 'partner_lead') return false;
      if (filter === 'navigator' && row.type !== 'navigator') return false;
      if (filter === 'hot' && row.band !== 'hot') return false;
      if (filter === 'stale' && !(Number(row.staleDays) >= 7)) return false;
      if (!needle) return true;
      const haystack = [
        row.caseNumber,
        row.patientName,
        row.patientCountry,
        row.treatmentName,
        row.firstName,
        row.country,
        row.treatmentInterest,
        row.campaign,
        row.specialtyId,
        row.treatmentSlug
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [workspace, filter, search]);

  async function copyDraft(row) {
    if (!row.draft || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(row.draft);
    setCopiedId(row.id);
    window.setTimeout(() => setCopiedId(current => current === row.id ? '' : current), 1800);
  }

  return (
    <AdminShell
      title="Growth & CRM Engine"
      subtitle="Prioritize recoverable journeys, partner leads and campaign opportunities using explainable operational signals."
      action={<button type="button" className="text-button phase8c-refresh" onClick={load} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={15}/> Recalculate</button>}
    >
      <div className="phase8c-safety-banner"><ShieldCheck size={19}/><div><strong>Growth intelligence, not medical prioritization</strong><span>Scores use engagement, journey stage, inactivity and consented lead data. Clinical severity, diagnoses, hospital commissions and affiliate payouts do not influence ranking. Nothing is contacted automatically.</span></div></div>

      {error && <div className="document-alert error"><span>{error}</span></div>}

      {loading || !workspace ? <div className="admin-live-loading"><LoaderCircle className="spin" size={22}/> Building live growth workspace…</div> : <>
        <section className="phase8c-metric-grid">
          <article><UsersRound size={19}/><span>Active cases</span><strong>{workspace.metrics.activeCases}</strong><small>Open treatment journeys</small></article>
          <article><UserRoundPlus size={19}/><span>Open partner leads</span><strong>{workspace.metrics.openPartnerLeads}</strong><small>Not converted or closed</small></article>
          <article><Flame size={19}/><span>Hot recovery opportunities</span><strong>{workspace.metrics.hotOpportunities}</strong><small>Explainable score 75+</small></article>
          <article><Clock3 size={19}/><span>Stale cases</span><strong>{workspace.metrics.abandonedCases}</strong><small>Recoverable · 7+ days</small></article>
          <article><Bot size={19}/><span>Navigator opportunities</span><strong>{workspace.metrics.navigatorUnconverted}</strong><small>Shortlisted but no case yet</small></article>
        </section>

        <div className="phase8c-grid">
          <section className="portal-card phase8c-funnel-card">
            <div className="portal-card-heading"><div><span className="eyebrow">CONVERSION FUNNEL</span><h2>Where patient journeys are progressing or dropping.</h2></div><TrendingUp size={21}/></div>
            <div className="phase8c-funnel">
              {workspace.funnel.map((step, index) => <article key={step.id}>
                <div><strong>{step.count}</strong><span>{step.label}</span></div>
                <div className="phase8c-funnel-bar"><i style={{ width: `${step.rateFromStart}%` }}/></div>
                <small>{step.rateFromStart}% of created cases{index > 0 && step.dropFromPrevious ? ` · ${step.dropFromPrevious} drop from prior step` : ''}</small>
              </article>)}
            </div>
          </section>

          <section className="portal-card phase8c-campaign-card">
            <div className="portal-card-heading"><div><span className="eyebrow">CAMPAIGN ATTRIBUTION</span><h2>Partner campaign performance.</h2></div><BarChart3 size={21}/></div>
            <div className="phase8c-campaign-table">
              <div className="phase8c-campaign-row head"><span>Campaign</span><span>Introductions</span><span>Cases</span><span>Treatment verified</span><span>Rate</span></div>
              {workspace.campaigns.slice(0, 8).map(row => <div className="phase8c-campaign-row" key={row.campaign}>
                <span><strong>{row.campaign}</strong>{row.selfReferrals > 0 && <small>{row.selfReferrals} self-referral flag{row.selfReferrals === 1 ? '' : 's'}</small>}</span>
                <span>{row.totalIntroductions}</span>
                <span>{row.referredCases}</span>
                <span>{row.treatmentVerified}</span>
                <span><b>{row.verifiedRate}%</b></span>
              </div>)}
              {!workspace.campaigns.length && <p className="phase8c-empty-inline">No attributed campaigns yet.</p>}
            </div>
          </section>
        </div>

        <section className="portal-card phase8c-opportunity-card">
          <div className="portal-card-heading"><div><span className="eyebrow">RECOVERY QUEUE</span><h2>Highest-value next conversations.</h2></div><Target size={21}/></div>

          <div className="phase8c-toolbar">
            <label><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search case, patient, treatment, country or campaign"/></label>
            <div>{FILTERS.map(([value, label]) => <button type="button" className={filter === value ? 'active' : ''} key={value} onClick={() => setFilter(value)}>{label}</button>)}</div>
          </div>

          <div className="phase8c-opportunity-list">
            {opportunities.map(row => <article className={`phase8c-opportunity-row ${row.band}`} key={`${row.type}-${row.id}`}>
              <div className="phase8c-score"><strong>{row.score}</strong><span>{growthBandLabel(row.band)}</span></div>
              <div className="phase8c-opportunity-main">
                <div className="phase8c-opportunity-title"><div><small>{typeLabel(row.type)}</small><strong>{titleFor(row)}</strong></div>{row.staleDays !== null && row.staleDays !== undefined && <i>{row.staleDays}d since activity</i>}</div>
                <p>{subtitleFor(row)}</p>
                {row.recoveryReason && <div className="phase8c-reason"><Clock3 size={14}/><strong>{row.recoveryReason}</strong></div>}
                {!!row.signals?.length && <div className="phase8c-signal-row">{row.signals.slice(0, 4).map(signal => <span key={signal}>{signal}</span>)}</div>}
                {row.type === 'navigator' && <div className="phase8c-navigator-note"><Bot size={14}/><span>This is a discovery-engagement signal only. Do not infer medical urgency or contact the patient unless an appropriate CareAtlas communication basis exists.</span></div>}
              </div>
              <div className="phase8c-opportunity-actions">
                {row.type === 'case' && <Link className="button button-sm" href={`/admin/cases/case?id=${encodeURIComponent(row.caseId)}`}>Open case <ArrowRight size={14}/></Link>}
                {row.type === 'partner_lead' && <Link className="button button-sm" href="/admin/partner-leads">Open leads <ArrowRight size={14}/></Link>}
                {row.type === 'navigator' && <Link className="button button-sm" href="/admin/ai-matching">AI matching <ArrowRight size={14}/></Link>}
                {row.draft && <button type="button" className="phase8c-copy-button" onClick={() => copyDraft(row)}><ClipboardCopy size={14}/>{copiedId === row.id ? 'Copied' : 'Copy follow-up draft'}</button>}
              </div>
            </article>)}
            {!opportunities.length && <div className="phase8c-empty"><MessageSquareText size={25}/><strong>No recoverable opportunities match this filter.</strong><span>Change the filter or recalculate the workspace.</span></div>}
          </div>
        </section>

        <div className="phase8c-footer-note"><ShieldCheck size={15}/><span>Engine {workspace.algorithmVersion}. Scores are operational prioritization signals, not conversion probabilities and not clinical triage.</span></div>
      </>}
    </AdminShell>
  );
}
