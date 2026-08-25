'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, Play, Save, ShieldCheck, Zap } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { useAuth } from '@/components/AuthProvider';
import { isAdminRole, formatAdminTimestamp } from '@/lib/firebase/admin';
import { getWorkflowAutomationConfig, getWorkflowAutomationRuns, saveWorkflowAutomationConfig, syncWorkflowAutomation } from '@/lib/firebase/workflowAutomation';

export default function AdminAutomationClient() {
  const { userProfile } = useAuth();
  const [rules, setRules] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const permitted = isAdminRole(userProfile?.role);

  async function load() {
    setLoading(true); setError('');
    try {
      const [config, recentRuns] = await Promise.all([getWorkflowAutomationConfig(), getWorkflowAutomationRuns()]);
      setRules(config.resolvedRules || []);
      setRuns(recentRuns);
    } catch (e) { setError(e?.message || 'Could not load automation settings.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (permitted) load(); else setLoading(false); }, [permitted]);

  function patchRule(id, changes) { setRules(prev => prev.map(rule => rule.id === id ? { ...rule, ...changes } : rule)); }

  async function save() {
    setSaving(true); setError(''); setNotice('');
    try {
      const ruleMap = Object.fromEntries(rules.map(rule => [rule.id, { enabled: rule.enabled, slaHours: Number(rule.slaHours), priority: rule.priority, owner: rule.owner }]));
      const result = await saveWorkflowAutomationConfig(ruleMap);
      setRules(result.resolvedRules || []);
      setNotice('Workflow automation settings saved.');
    } catch (e) { setError(e?.message || 'Could not save automation settings.'); }
    finally { setSaving(false); }
  }

  async function runNow() {
    setRunning(true); setError(''); setNotice('');
    try {
      const result = await syncWorkflowAutomation();
      setNotice(`Sync complete: ${result.created} created, ${result.refreshed} refreshed, ${result.resolved} automatically resolved by source signals.`);
      setRuns(await getWorkflowAutomationRuns());
    } catch (e) { setError(e?.message || 'Workflow sync failed.'); }
    finally { setRunning(false); }
  }

  return <AdminShell title="Workflow automation" subtitle="Configure CareAtlas operational task rules and SLA targets. Clinical and case decisions remain human-controlled." action={permitted ? <button type="button" className="button button-sm" onClick={runNow} disabled={running}>{running ? <LoaderCircle className="spin" size={15}/> : <Play size={15}/>} Run now</button> : null}>
    {!permitted ? <div className="phase8e-info"><ShieldCheck size={18}/><div><strong>Admin access required</strong><span>Workflow rule configuration is restricted to CareAtlas admins.</span></div></div> : <>
      <div className="phase8e-info"><Zap size={18}/><div><strong>Browser-run automation for the Firebase/GitHub Pages MVP</strong><span>Rules are deterministic and idempotent. A staff member must run sync for new tasks to be materialized or source-resolved. This avoids pretending there is a background scheduler where none exists.</span></div></div>
      {error && <div className="document-alert error"><AlertTriangle size={16}/><span>{error}</span></div>}
      {notice && <div className="document-alert success"><CheckCircle2 size={16}/><span>{notice}</span></div>}
      {loading ? <div className="admin-live-loading"><LoaderCircle className="spin" size={20}/> Loading automation rules…</div> : <>
        <section className="portal-card phase8e-rules-card">
          <div className="portal-card-heading"><div><span className="eyebrow">AUTOMATION RULES</span><h2>Operational triggers and SLA targets.</h2></div><button className="button button-sm" type="button" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="spin" size={15}/> : <Save size={15}/>} Save rules</button></div>
          <div className="phase8e-rules">
            {rules.map(rule => <article key={rule.id} className={rule.enabled ? 'enabled' : 'disabled'}>
              <label className="phase8e-toggle"><input type="checkbox" checked={rule.enabled} onChange={e => patchRule(rule.id, { enabled: e.target.checked })}/><span></span></label>
              <div><strong>{rule.name}</strong><p>{rule.description}</p><small>{rule.id}</small></div>
              <label><span>SLA hours</span><input type="number" min="1" max="720" value={rule.slaHours} onChange={e => patchRule(rule.id, { slaHours: e.target.value })}/></label>
              <label><span>Priority</span><select value={rule.priority} onChange={e => patchRule(rule.id, { priority: e.target.value })}><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label>
            </article>)}
          </div>
        </section>
        <section className="portal-card phase8e-run-history">
          <div className="portal-card-heading"><div><span className="eyebrow">AUTOMATION HISTORY</span><h2>Recent workflow sync runs.</h2></div><Clock3 size={20}/></div>
          <div>{runs.length ? runs.map(run => <article key={run.id}><span><strong>{formatAdminTimestamp(run.createdAt)}</strong><small>{run.mode || 'browser_sync'} · {run.automationVersion}</small></span><span><b>{run.createdTasks || 0}</b> created</span><span><b>{run.refreshedTasks || 0}</b> refreshed</span><span><b>{run.resolvedTasks || 0}</b> resolved</span><span><b>{run.evaluatedCaseCount || 0}</b> cases</span></article>) : <div className="phase8e-empty"><Zap size={23}/><strong>No sync runs yet.</strong><span>Run the workflow engine to create the first task set.</span></div>}</div>
        </section>
      </>}
    </>}
  </AdminShell>;
}
