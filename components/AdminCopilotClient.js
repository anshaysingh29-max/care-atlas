'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, Clock3, LoaderCircle, Search, ShieldCheck, Sparkles, UserRoundCheck, UsersRound } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { copilotBandLabel } from '@/lib/ai/copilot';
import { getCoordinatorCopilotWorkspace } from '@/lib/firebase/copilot';
import { formatAdminTimestamp, stageLabel } from '@/lib/firebase/admin';

const FILTERS = [
  ['all', 'All active'],
  ['urgent', 'Urgent / high'],
  ['blocked', 'Blocked'],
  ['unassigned', 'Unassigned'],
  ['stale', 'Stale']
];

function topBlocker(row) {
  return row.analysis?.blockers?.[0] || null;
}

function topAction(row) {
  return row.analysis?.nextActions?.[0] || null;
}

function isFinalStatus(status) {
  return ['completed', 'cancelled'].includes(status);
}

export default function AdminCopilotClient() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queryText, setQueryText] = useState('');
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRows(await getCoordinatorCopilotWorkspace());
    } catch (loadError) {
      setError(loadError?.message || 'Could not load Coordinator Copilot.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const activeRows = useMemo(() => rows.filter(row => !isFinalStatus(row.caseRecord?.status)), [rows]);

  const metrics = useMemo(() => ({
    urgent: activeRows.filter(row => ['urgent', 'high'].includes(row.analysis?.priorityBand)).length,
    blocked: activeRows.filter(row => (row.analysis?.blockers || []).length > 0).length,
    unassigned: activeRows.filter(row => !row.caseRecord?.coordinatorId).length,
    stale: activeRows.filter(row => Number(row.analysis?.staleDays) >= 3).length
  }), [activeRows]);

  const filteredRows = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    return activeRows.filter(row => {
      const record = row.caseRecord || {};
      if (needle) {
        const haystack = [record.caseNumber, record.patientName, record.patientCountry, record.treatmentName, record.currentStage, record.status]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (filter === 'urgent' && !['urgent', 'high'].includes(row.analysis?.priorityBand)) return false;
      if (filter === 'blocked' && !(row.analysis?.blockers || []).length) return false;
      if (filter === 'unassigned' && record.coordinatorId) return false;
      if (filter === 'stale' && !(Number(row.analysis?.staleDays) >= 3)) return false;
      return true;
    });
  }, [activeRows, queryText, filter]);

  return (
    <AdminShell
      title="Coordinator Copilot"
      subtitle="Prioritize operational work from structured CareAtlas workflow signals. Every suggested action requires staff review."
      action={<button type="button" className="text-button phase8b-refresh" onClick={load} disabled={loading}><Sparkles size={15}/> Recalculate</button>}
    >
      <div className="phase8b-safety-banner"><ShieldCheck size={19}/><div><strong>Human-in-control operations assistant</strong><span>Copilot does not diagnose, choose a hospital, read hospital commercials, or send messages automatically. Open the real case and verify the source data before acting.</span></div></div>

      {error && <div className="document-alert error"><AlertTriangle size={17}/><span>{error}</span></div>}

      <section className="phase8b-metric-grid" aria-label="Coordinator Copilot queue summary">
        <article><AlertTriangle size={19}/><span>Urgent / high</span><strong>{metrics.urgent}</strong></article>
        <article><BrainCircuit size={19}/><span>Cases with blockers</span><strong>{metrics.blocked}</strong></article>
        <article><UsersRound size={19}/><span>Unassigned</span><strong>{metrics.unassigned}</strong></article>
        <article><Clock3 size={19}/><span>Stale 3+ days</span><strong>{metrics.stale}</strong></article>
      </section>

      <section className="portal-card phase8b-queue-card">
        <div className="phase8b-queue-toolbar">
          <label className="phase8b-search"><Search size={16}/><input value={queryText} onChange={event => setQueryText(event.target.value)} placeholder="Search case, patient, country or treatment"/></label>
          <div className="phase8b-filter-row">{FILTERS.map(([value, label]) => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
        </div>

        {loading ? <div className="admin-live-loading"><LoaderCircle className="spin" size={21}/> Recalculating operations queue…</div> : (
          <div className="phase8b-queue-list">
            {filteredRows.map(row => {
              const record = row.caseRecord || {};
              const analysis = row.analysis || {};
              const blocker = topBlocker(row);
              const nextAction = topAction(row);
              return <article key={record.id} className={`phase8b-queue-row ${analysis.priorityBand || 'normal'}`}>
                <div className="phase8b-priority-badge"><strong>{analysis.priorityScore ?? 0}</strong><span>{copilotBandLabel(analysis.priorityBand)}</span></div>
                <div className="phase8b-queue-main">
                  <div className="phase8b-queue-title"><div><strong>{record.caseNumber || record.id}</strong><span>{record.patientName || 'Patient'} · {record.patientCountry || 'Country not set'}</span></div><i>{stageLabel(record.currentStage)}</i></div>
                  <p>{record.treatmentName || 'Treatment request'} · Updated {formatAdminTimestamp(record.updatedAt || record.createdAt)}</p>
                  <div className="phase8b-queue-signals">
                    <span className={blocker ? 'warning' : 'ready'}><AlertTriangle size={14}/><b>{blocker ? blocker.title : 'No major blocker detected'}</b></span>
                    <span><UserRoundCheck size={14}/><b>{record.coordinatorName || 'Coordinator unassigned'}</b></span>
                  </div>
                  {nextAction && <div className="phase8b-next-action"><small>NEXT BEST OPERATIONAL ACTION</small><strong>{nextAction.title}</strong><span>{nextAction.detail}</span></div>}
                </div>
                <Link className="button button-sm" href={`/admin/cases/case?id=${encodeURIComponent(record.id)}`}>Open case</Link>
              </article>;
            })}
            {!filteredRows.length && <div className="phase8b-empty"><BrainCircuit size={24}/><strong>No cases match this filter.</strong><span>Try another filter or recalculate the queue.</span></div>}
          </div>
        )}
      </section>
      <small className="phase8b-version">Coordinator Copilot engine: careatlas-8b-2026-08-25-v1 · deterministic workflow analysis, not clinical AI.</small>
    </AdminShell>
  );
}
