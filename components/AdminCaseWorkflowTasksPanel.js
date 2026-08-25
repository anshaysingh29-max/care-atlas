'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, LoaderCircle, Plus, RefreshCw, UserCheck } from 'lucide-react';
import { createManualWorkflowTask, getWorkflowTasks, syncWorkflowAutomation, takeWorkflowTask, updateWorkflowTask } from '@/lib/firebase/workflowAutomation';
import { getTaskSlaState } from '@/lib/automation/workflow';
import { getAdminCase } from '@/lib/firebase/admin';

export default function AdminCaseWorkflowTasksPanel({ caseId }) {
  const [tasks, setTasks] = useState([]);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');

  async function load() {
    if (!caseId) return;
    setLoading(true); setError('');
    try {
      const [rows, caseRecord] = await Promise.all([getWorkflowTasks({ caseId, includeResolved: true }), getAdminCase(caseId)]);
      setTasks(rows); setRecord(caseRecord);
    } catch (e) { setError(e?.message || 'Could not load workflow tasks.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [caseId]);

  async function sync() {
    setLoading(true); setError('');
    try { await syncWorkflowAutomation(); await load(); }
    catch (e) { setError(e?.message || 'Could not sync workflow tasks.'); setLoading(false); }
  }
  async function patch(id, changes) { try { const row = await updateWorkflowTask(id, changes); setTasks(prev => prev.map(item => item.id === id ? row : item)); } catch (e) { setError(e?.message || 'Could not update task.'); } }
  async function take(id) { try { const row = await takeWorkflowTask(id); setTasks(prev => prev.map(item => item.id === id ? row : item)); } catch (e) { setError(e?.message || 'Could not take task.'); } }
  async function addManual() {
    if (!title.trim() || !record) return;
    setCreating(true); setError('');
    try { await createManualWorkflowTask({ caseRecord: record, title, detail: 'Manual task created from the CareAtlas case workspace.', priority: 'normal', dueAtMillis: Date.now() + 24 * 3600000 }); setTitle(''); await load(); }
    catch (e) { setError(e?.message || 'Could not create task.'); }
    finally { setCreating(false); }
  }

  return <section className="portal-card phase8e-case-tasks">
    <div className="portal-card-heading"><div><span className="eyebrow">TASKS & SLA</span><h2>Operational commitments for this case.</h2></div><button type="button" className="phase8b-icon-button" onClick={sync} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={18}/></button></div>
    {error && <div className="document-alert error"><span>{error}</span></div>}
    {loading ? <div className="admin-live-loading"><LoaderCircle className="spin" size={18}/> Loading case tasks…</div> : <div className="phase8e-case-task-list">
      {tasks.map(task => {
        const sla = getTaskSlaState(task); const resolved = ['completed', 'dismissed'].includes(task.status);
        return <article key={task.id} className={sla.state}><span className="phase8e-case-task-status"><Clock3 size={14}/><b>{sla.label}</b>{sla.escalationLevel ? <i>L{sla.escalationLevel}</i> : null}</span><div><strong>{task.title}</strong><small>{task.source === 'automation' ? task.ruleName : 'Manual task'} · {task.assignedToName || 'Unassigned'}</small></div><div className="phase8e-case-task-actions">{!resolved && !task.assignedTo && <button type="button" onClick={() => take(task.id)}><UserCheck size={13}/> Take</button>}{!resolved && <button type="button" onClick={() => patch(task.id, { status: 'completed' })}><CheckCircle2 size={13}/> Done</button>}{resolved && <button type="button" onClick={() => patch(task.id, { status: 'open' })}>Reopen</button>}</div></article>;
      })}
      {!tasks.length && <div className="phase8e-empty"><CheckCircle2 size={22}/><strong>No workflow tasks for this case.</strong><span>Run workflow sync to evaluate automation rules.</span></div>}
    </div>}
    <div className="phase8e-inline-create"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a manual case task"/><button type="button" onClick={addManual} disabled={creating || !title.trim()}>{creating ? <LoaderCircle className="spin" size={14}/> : <Plus size={14}/>} Add task</button></div>
  </section>;
}
