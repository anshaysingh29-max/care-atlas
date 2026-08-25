'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BrainCircuit, CheckCircle2, ClipboardCheck, LoaderCircle, MessageSquareText, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { copilotBandLabel } from '@/lib/ai/copilot';
import { getCoordinatorCopilotCase } from '@/lib/firebase/copilot';

function formatGenerated(value) {
  if (!value) return 'just now';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'just now' : date.toLocaleString();
}

export default function AdminCaseCopilotPanel({ caseId, onUseDraft }) {
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftCopied, setDraftCopied] = useState(false);

  async function load() {
    if (!caseId) return;
    setLoading(true);
    setError('');
    setDraftCopied(false);
    try {
      setBundle(await getCoordinatorCopilotCase(caseId));
    } catch (loadError) {
      setError(loadError?.message || 'Could not calculate the case Copilot view.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [caseId]);

  const analysis = bundle?.analysis;

  function useDraft() {
    if (!analysis?.patientDraft || !onUseDraft) return;
    onUseDraft(analysis.patientDraft);
    setDraftCopied(true);
  }

  return (
    <section className="portal-card phase8b-case-copilot">
      <div className="portal-card-heading">
        <div><span className="eyebrow">COORDINATOR COPILOT</span><h2>Operational next-step assistant.</h2></div>
        <button type="button" className="phase8b-icon-button" onClick={load} disabled={loading} aria-label="Recalculate Copilot"><RefreshCw className={loading ? 'spin' : ''} size={18}/></button>
      </div>

      <div className="phase8b-case-safety"><ShieldCheck size={16}/><span>Suggestions are generated from CareAtlas workflow records. Review the actual case, documents and message thread before taking action.</span></div>

      {error && <div className="document-alert error"><AlertTriangle size={16}/><span>{error}</span></div>}
      {loading && <div className="admin-live-loading"><LoaderCircle className="spin" size={19}/> Calculating case signals…</div>}

      {!loading && analysis && <>
        <div className="phase8b-case-priority">
          <div><BrainCircuit size={21}/><span><small>OPERATIONAL PRIORITY</small><strong>{copilotBandLabel(analysis.priorityBand)}</strong></span></div>
          <b>{analysis.priorityScore}<small>/100</small></b>
        </div>

        <p className="phase8b-summary">{analysis.summary}</p>

        <div className="phase8b-case-columns">
          <div>
            <h3><AlertTriangle size={16}/> Blockers</h3>
            <div className="phase8b-signal-stack">{analysis.blockers?.length ? analysis.blockers.map(item => <article key={item.code} className={item.severity}><strong>{item.title}</strong><span>{item.detail}</span></article>) : <article className="ready"><strong>No major blocker detected</strong><span>Continue routine human review of the case.</span></article>}</div>
          </div>
          <div>
            <h3><ClipboardCheck size={16}/> Next actions</h3>
            <div className="phase8b-action-stack">{analysis.nextActions?.map((item, index) => <article key={`${item.code}-${index}`}><b>{index + 1}</b><span><strong>{item.title}</strong><small>{item.detail}</small></span></article>)}</div>
          </div>
        </div>

        <div className="phase8b-readiness">
          <h3>Journey readiness</h3>
          <div>{analysis.readiness?.map(item => <span key={item.id} className={item.ready ? 'ready' : 'missing'}>{item.ready ? <CheckCircle2 size={14}/> : <XCircle size={14}/>} {item.label}</span>)}</div>
        </div>

        {analysis.patientDraft && <div className="phase8b-draft-card">
          <div className="phase8b-draft-heading"><div><MessageSquareText size={18}/><span><small>OPTIONAL PATIENT MESSAGE DRAFT</small><strong>Review every word before sending.</strong></span></div><button type="button" className="button button-sm" onClick={useDraft}>Use in composer</button></div>
          <pre>{analysis.patientDraft}</pre>
          {draftCopied && <small className="phase8b-draft-success">Draft inserted below. CareAtlas has not sent anything.</small>}
        </div>}

        <small className="phase8b-case-version">Generated {formatGenerated(analysis.generatedAt)} · {analysis.algorithmVersion}. This is operational decision support, not medical advice.</small>
      </>}
    </section>
  );
}
