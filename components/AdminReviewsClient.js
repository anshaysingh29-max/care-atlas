'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, MessageSquareWarning, ShieldCheck, Star } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { CONCERN_STATUSES, REVIEW_MODERATION_STATUSES, getAdminConcerns, getAdminReviews, moderateReview, updateConcern } from '@/lib/firebase/trustAdmin';

export default function AdminReviewsClient() {
  const [reviews, setReviews] = useState([]);
  const [concerns, setConcerns] = useState([]);
  const [tab, setTab] = useState('reviews');
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    const [reviewRows, concernRows] = await Promise.all([getAdminReviews(), getAdminConcerns()]);
    setReviews(reviewRows); setConcerns(concernRows);
  }
  useEffect(() => { refresh().catch(err => setError(err.message || 'Could not load trust operations.')); }, []);

  const pending = useMemo(() => reviews.filter(item => item.status === 'pending_review').length, [reviews]);
  const open = useMemo(() => concerns.filter(item => !['resolved','closed'].includes(item.status)).length, [concerns]);

  async function setReviewStatus(reviewId, status) {
    setError(''); setNotice('');
    try { await moderateReview({ reviewId, status }); setNotice('Review updated.'); await refresh(); }
    catch (err) { setError(err.message || 'Could not update review.'); }
  }

  async function saveConcern(item) {
    const draft = drafts[item.id] || {};
    setError(''); setNotice('');
    try {
      await updateConcern({ concernId: item.id, status: draft.status || item.status, assignedTo: draft.assignedTo ?? item.assignedTo, resolutionSummary: draft.resolutionSummary ?? item.resolutionSummary });
      setNotice('Concern updated and patient notified.'); await refresh();
    } catch (err) { setError(err.message || 'Could not update concern.'); }
  }

  return <AdminShell title="Reviews & trust" subtitle="Moderate verified patient feedback and manage private support concerns.">
    <div className="phase7f-admin-stats"><div><Star size={20}/><strong>{pending}</strong><span>Reviews awaiting moderation</span></div><div><MessageSquareWarning size={20}/><strong>{open}</strong><span>Open patient concerns</span></div><div><ShieldCheck size={20}/><strong>{reviews.filter(r=>r.status==='published').length}</strong><span>Published verified reviews</span></div></div>
    {notice && <div className="phase7f-success"><CheckCircle2 size={17}/>{notice}</div>}
    {error && <div className="phase7f-error"><AlertTriangle size={17}/>{error}</div>}
    <div className="phase7f-tabs"><button className={tab==='reviews'?'active':''} onClick={()=>setTab('reviews')}>Review moderation</button><button className={tab==='concerns'?'active':''} onClick={()=>setTab('concerns')}>Patient concerns</button></div>

    {tab === 'reviews' ? <section className="portal-card"><div className="phase7f-admin-list">{reviews.map(item => <article key={item.id}>
      <div className="phase7f-admin-review-main"><header><div><strong>{item.targetName}</strong><span>{item.targetType} · {item.caseNumber} · {'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</span></div><i className={`phase7f-chip ${item.status}`}>{item.status.replaceAll('_',' ')}</i></header><h4>{item.title || 'Patient experience review'}</h4><p>{item.body}</p><small>Patient-reported outcome: {String(item.patientReportedOutcome || 'not shared').replaceAll('_',' ')} · {item.wouldRecommend ? 'Would recommend' : 'Would not recommend'} · Verified journey: {item.verifiedJourney ? 'yes' : 'no'}</small></div>
      <div className="phase7f-admin-actions">{REVIEW_MODERATION_STATUSES.map(status => <button key={status} className={status==='published'?'button small':'button secondary small'} onClick={()=>setReviewStatus(item.id,status)}>{status.replaceAll('_',' ')}</button>)}</div>
    </article>)}{!reviews.length && <p>No reviews yet.</p>}</div></section> :
    <section className="portal-card"><div className="phase7f-admin-list">{concerns.map(item => { const draft = drafts[item.id] || {}; return <article key={item.id}>
      <div className="phase7f-admin-review-main"><header><div><strong>{item.subject}</strong><span>{item.caseNumber} · {item.category}</span></div><i className={`phase7f-chip ${item.status}`}>{item.status.replaceAll('_',' ')}</i></header><p>{item.description}</p></div>
      <div className="phase7f-concern-editor"><label>Status<select value={draft.status ?? item.status} onChange={e=>setDrafts({...drafts,[item.id]:{...draft,status:e.target.value}})}>{CONCERN_STATUSES.map(status=><option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}</select></label><label>Assigned to<input value={draft.assignedTo ?? item.assignedTo ?? ''} onChange={e=>setDrafts({...drafts,[item.id]:{...draft,assignedTo:e.target.value}})}/></label><label>Resolution / patient update<textarea rows={3} value={draft.resolutionSummary ?? item.resolutionSummary ?? ''} onChange={e=>setDrafts({...drafts,[item.id]:{...draft,resolutionSummary:e.target.value}})}/></label><button className="button small" onClick={()=>saveConcern(item)}>Save & notify patient</button></div>
    </article>})}{!concerns.length && <p>No patient concerns.</p>}</div></section>}
  </AdminShell>;
}
