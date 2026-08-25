'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, LoaderCircle } from 'lucide-react';
import { getTaskSlaState } from '@/lib/automation/workflow';
import { getMyWorkflowTasks } from '@/lib/firebase/workflowAutomation';

export default function AdminMyTasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; getMyWorkflowTasks({ includeUnassigned: true, limit: 6 }).then(rows => { if (active) setTasks(rows); }).catch(() => {}).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  return <section className="portal-card phase8e-my-tasks">
    <div className="portal-card-heading"><div><span className="eyebrow">MY TASKS</span><h2>What needs attention next.</h2></div><Link className="link-arrow" href="/admin/tasks">Open task queue <ArrowRight size={15}/></Link></div>
    {loading ? <div className="admin-live-loading"><LoaderCircle className="spin" size={18}/> Loading workflow tasks…</div> : <div className="phase8e-dashboard-tasks">{tasks.map(task => { const sla = getTaskSlaState(task); return <Link key={task.id} href={task.caseId ? `/admin/cases/case?id=${encodeURIComponent(task.caseId)}` : '/admin/tasks'} className={sla.state}><span>{sla.state === 'overdue' ? <Clock3 size={15}/> : <CheckCircle2 size={15}/>}<strong>{task.title}</strong></span><small>{task.caseNumber || 'General operations'} · {sla.label}</small></Link>; })}{!tasks.length && <div className="phase8e-empty"><CheckCircle2 size={22}/><strong>No active tasks.</strong><span>Run workflow sync to evaluate current cases.</span></div>}</div>}
  </section>;
}
