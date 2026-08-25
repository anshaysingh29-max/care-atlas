'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Filter, LoaderCircle, Play, Plus, Search, UserCheck, XCircle } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { useAuth } from '@/components/AuthProvider';
import { getTaskSlaState, summarizeTasks } from '@/lib/automation/workflow';
import { createManualWorkflowTask, getWorkflowTasks, syncWorkflowAutomation, takeWorkflowTask, updateWorkflowTask } from '@/lib/firebase/workflowAutomation';
import { getAdminCase } from '@/lib/firebase/admin';

const FILTERS = [
  ['active', 'Active'],
  ['overdue', 'Overdue'],
  ['unassigned', 'Unassigned'],
  ['mine', 'My tasks'],
  ['completed', 'Completed']
];

function dueLabel(task) {
  return getTaskSlaState(task).label;
}

export default function AdminTasksClient() {
  const { user, userProfile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('active');
  const [queryText, setQueryText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ caseId: '', title: '', detail: '', priority: 'normal', dueHours: 24 });

  async function load() {
    setLoading(true);
    setError('');
    try { setTasks(await getWorkflowTasks({ includeResolved: true })); }
    catch (e) { setError(e?.message || 'Could not load workflow tasks.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => summarizeTasks(tasks), [tasks]);
  const myIds = useMemo(() => new Set([user?.uid, userProfile?.coordinatorId].filter(Boolean)), [user, userProfile]);
  const filtered = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    return tasks.filter(task => {
      const resolved = ['completed', 'dismissed'].includes(task.status);
      const sla = getTaskSlaState(task);
      if (filter === 'active' && resolved) return false;
      if (filter === 'overdue' && sla.state !== 'overdue') return false;
      if (filter === 'unassigned' && (resolved || task.assignedTo)) return false;
      if (filter === 'mine' && (resolved || !myIds.has(task.assignedTo))) return false;
      if (filter === 'completed' && !resolved) return false;
      if (needle) {
        const haystack = [task.title, task.detail, task.caseNumber, task.patientName, task.treatmentName, task.assignedToName, task.ruleName].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [tasks, filter, queryText, myIds]);

  async function runSync() {
    setSyncing(true); setError(''); setNotice('');
    try {
      const result = await syncWorkflowAutomation();
      setTasks(result.tasks);
      setNotice(`Workflow sync complete: ${result.created} created, ${result.refreshed} refreshed, ${result.resolved} resolved by source signals.`);
    } catch (e) { setError(e?.message || 'Workflow sync failed.'); }
    finally { setSyncing(false); }
  }

  async function patchTask(id, changes) {
    setError('');
    try {
      const updated = await updateWorkflowTask(id, changes);
      setTasks(prev => prev.map(row => row.id === id ? updated : row));
    } catch (e) { setError(e?.message || 'Could not update task.'); }
  }

  async function takeTask(id) {
    try {
      const updated = await takeWorkflowTask(id);
      setTasks(prev => prev.map(row => row.id === id ? updated : row));
    } catch (e) { setError(e?.message || 'Could not take task.'); }
  }

  async function createTask(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setError(''); setNotice('');
    try {
      const caseRecord = form.caseId.trim() ? await getAdminCase(form.caseId.trim()) : null;
      await createManualWorkflowTask({
        caseRecord,
        title: form.title,
        detail: form.detail,
        priority: form.priority,
        dueAtMillis: Date.now() + Math.max(1, Number(form.dueHours) || 24) * 3600000
      });
      setForm({ caseId: '', title: '', detail: '', priority: 'normal', dueHours: 24 });
      setShowCreate(false);
      setNotice('Manual workflow task created.');
      await load();
    } catch (e) { setError(e?.message || 'Could not create task.'); }
  }

  return (
    <AdminShell title="Tasks & SLAs" subtitle="One operational queue for automated and manual CareAtlas work, with due dates and escalation visibility." action={<button type="button" className="button button-sm" onClick={runSync} disabled={syncing}>{syncing ? <LoaderCircle className="spin" size={15}/> : <Play size={15}/>} {syncing ? 'Running…' : 'Run workflow sync'}</button>}>
      <div className="phase8e-info"><Clock3 size={18}/><div><strong>SLA engine is human-controlled in this MVP.</strong><span>Rules create and resolve tasks when a CareAtlas staff member runs workflow sync. Overdue escalation is calculated live. Background execution will require a secure scheduled backend later.</span></div></div>
      {error && <div className="document-alert error"><AlertTriangle size={16}/><span>{error}</span></div>}
      {notice && <div className="document-alert success"><CheckCircle2 size={16}/><span>{notice}</span></div>}

      <section className="phase8e-metrics">
        <article><strong>{metrics.open}</strong><span>Active tasks</span></article>
        <article><strong>{metrics.overdue}</strong><span>Overdue</span></article>
        <article><strong>{metrics.dueSoon}</strong><span>Due soon</span></article>
        <article><strong>{metrics.unassigned}</strong><span>Unassigned</span></article>
        <article><strong>{metrics.urgent}</strong><span>Urgent / high</span></article>
      </section>

      <section className="portal-card phase8e-task-card">
        <div className="phase8e-toolbar">
          <label><Search size={15}/><input value={queryText} onChange={e => setQueryText(e.target.value)} placeholder="Search tasks, cases or patients"/></label>
          <div className="phase8e-filter"><Filter size={14}/>{FILTERS.map(([value, label]) => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
          <button type="button" className="text-button" onClick={() => setShowCreate(v => !v)}><Plus size={15}/> Manual task</button>
        </div>

        {showCreate && <form className="phase8e-create-form" onSubmit={createTask}>
          <label className="field-label"><span>Case ID (optional)</span><input value={form.caseId} onChange={e => setForm({ ...form, caseId: e.target.value })} placeholder="Firestore case ID"/></label>
          <label className="field-label phase8e-wide"><span>Task title</span><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Follow up with patient"/></label>
          <label className="field-label phase8e-wide"><span>Details</span><textarea rows="3" value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} placeholder="What needs to happen?"/></label>
          <label className="field-label"><span>Priority</span><select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label>
          <label className="field-label"><span>Due in hours</span><input type="number" min="1" max="720" value={form.dueHours} onChange={e => setForm({ ...form, dueHours: e.target.value })}/></label>
          <button type="submit" className="button button-sm">Create task</button>
        </form>}

        {loading ? <div className="admin-live-loading"><LoaderCircle className="spin" size={20}/> Loading task queue…</div> : <div className="phase8e-task-list">
          {filtered.map(task => {
            const sla = getTaskSlaState(task);
            const resolved = ['completed', 'dismissed'].includes(task.status);
            return <article key={task.id} className={`phase8e-task ${sla.state} ${task.priority}`}>
              <div className="phase8e-task-main">
                <div className="phase8e-task-title"><span><i>{task.source === 'automation' ? 'AUTO' : 'MANUAL'}</i><b>{task.priority}</b><em>{task.status?.replaceAll('_', ' ')}</em></span><strong>{task.title}</strong></div>
                <p>{task.detail}</p>
                <div className="phase8e-task-meta"><span><Clock3 size={13}/>{dueLabel(task)}{sla.escalationLevel ? ` · Escalation L${sla.escalationLevel}` : ''}</span><span><UserCheck size={13}/>{task.assignedToName || 'Unassigned'}</span>{task.caseNumber && <span>{task.caseNumber} · {task.patientName || 'Patient'}</span>}</div>
              </div>
              <div className="phase8e-task-actions">
                {task.caseId && <Link className="text-button" href={`/admin/cases/case?id=${encodeURIComponent(task.caseId)}`}>Open case</Link>}
                {!resolved && !task.assignedTo && <button type="button" onClick={() => takeTask(task.id)}>Take task</button>}
                {!resolved && task.status !== 'in_progress' && <button type="button" onClick={() => patchTask(task.id, { status: 'in_progress' })}>Start</button>}
                {!resolved && <button type="button" className="complete" onClick={() => patchTask(task.id, { status: 'completed' })}><CheckCircle2 size={14}/> Complete</button>}
                {!resolved && <button type="button" onClick={() => patchTask(task.id, { status: 'blocked' })}>Block</button>}
                {!resolved && <button type="button" className="dismiss" onClick={() => patchTask(task.id, { status: 'dismissed' })}><XCircle size={14}/> Dismiss</button>}
                {resolved && <button type="button" onClick={() => patchTask(task.id, { status: 'open' })}>Reopen</button>}
              </div>
            </article>;
          })}
          {!filtered.length && <div className="phase8e-empty"><CheckCircle2 size={24}/><strong>No tasks match this view.</strong><span>Run workflow sync or create a manual task.</span></div>}
        </div>}
      </section>
    </AdminShell>
  );
}
