'use client';

import { useEffect, useMemo, useState } from 'react';
import { History, LoaderCircle, Search, ShieldCheck } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { formatAdminTimestamp, getAdminAuditLogs, isAdminRole } from '@/lib/firebase/admin';
import { useAuth } from '@/components/AuthProvider';

export default function AdminAuditClient() {
  const { userProfile } = useAuth();
  const [rows, setRows] = useState([]);
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdminRole(userProfile?.role)) {
      setLoading(false);
      return;
    }
    getAdminAuditLogs().then(setRows).catch(loadError => setError(loadError?.message || 'Could not load audit logs.')).finally(() => setLoading(false));
  }, [userProfile?.role]);

  const filtered = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(item => [item.action, item.actorEmail, item.actorRole, item.caseId, item.entityId, item.hospitalId].some(value => String(value || '').toLowerCase().includes(needle)));
  }, [rows, queryText]);

  return <AdminShell title="Audit trail" subtitle="Review immutable operational events written by CareAtlas staff and hospital partners.">
    {!isAdminRole(userProfile?.role) ? <div className="permission-banner"><ShieldCheck size={18}/><div><strong>Admin role required</strong><span>Audit logs are restricted to CareAtlas admin and super admin roles.</span></div></div> : <>
      {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
      <div className="admin-filter-bar"><div><Search size={15}/><input value={queryText} onChange={event => setQueryText(event.target.value)} placeholder="Search action, actor, case or hospital"/></div></div>
      <section className="portal-card phase6f-audit-card"><div className="portal-card-heading"><div><span className="eyebrow">IMMUTABLE EVENT LOG</span><h2>{loading ? 'Loading…' : `${filtered.length} events`}</h2></div><History size={21}/></div>{loading ? <div className="document-loading"><LoaderCircle className="spin" size={20}/> Loading audit trail…</div> : <div className="phase6f-audit-list">{filtered.length ? filtered.map(item => <article key={item.id}><History size={15}/><div><strong>{item.action || 'activity'}</strong><span>{item.actorEmail || item.actorId || 'Unknown actor'} · {item.actorRole || 'role not set'}</span><small>{item.caseId ? `Case ${item.caseId} · ` : ''}{item.hospitalId ? `${item.hospitalId} · ` : ''}{formatAdminTimestamp(item.createdAt)}</small></div></article>) : <p>No audit events match this search.</p>}</div>}</section>
    </>}
  </AdminShell>;
}
