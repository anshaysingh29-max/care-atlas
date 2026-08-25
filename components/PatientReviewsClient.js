'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, MessageSquareWarning, ShieldCheck, Star } from 'lucide-react';
import PatientShell from '@/components/PatientShell';
import { useAuth } from '@/components/AuthProvider';
import {
  COMPLAINT_CATEGORIES,
  PATIENT_OUTCOMES,
  createPatientConcern,
  formatTrustDate,
  getPatientConcernTargets,
  getPatientConcerns,
  getPatientReviewEligibility,
  getPatientReviews,
  getReviewResponses,
  outcomeLabel,
  savePatientReview
} from '@/lib/firebase/trust';

const emptyReview = { optionKey: '', rating: 5, title: '', body: '', outcome: 'prefer_not_to_say', wouldRecommend: true };
const emptyConcern = { targetKey: '', category: 'Communication', subject: '', description: '' };

function Stars({ value, onChange }) {
  return <div className="phase7f-stars" aria-label={`${value} out of 5 stars`}>{[1,2,3,4,5].map(star => <button key={star} type="button" className={star <= value ? 'active' : ''} onClick={() => onChange(star)} aria-label={`${star} stars`}><Star size={23}/></button>)}</div>;
}

export default function PatientReviewsClient() {
  const { user } = useAuth();
  const [eligibility, setEligibility] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [responses, setResponses] = useState({});
  const [concerns, setConcerns] = useState([]);
  const [concernTargets, setConcernTargets] = useState([]);
  const [reviewForm, setReviewForm] = useState(emptyReview);
  const [concernForm, setConcernForm] = useState(emptyConcern);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    if (!user) return;
    const [eligibleRows, reviewRows, concernRows, targetRows] = await Promise.all([
      getPatientReviewEligibility(), getPatientReviews(), getPatientConcerns(), getPatientConcernTargets()
    ]);
    const responseRows = await getReviewResponses(reviewRows.map(item => item.id));
    setEligibility(eligibleRows);
    setReviews(reviewRows);
    setResponses(Object.fromEntries(responseRows.map(item => [item.reviewId, item])));
    setConcerns(concernRows);
    setConcernTargets(targetRows);
    if (!reviewForm.optionKey && eligibleRows[0]) setReviewForm(current => ({ ...current, optionKey: eligibleRows[0].key }));
    if (!concernForm.targetKey && targetRows[0]) setConcernForm(current => ({ ...current, targetKey: targetRows[0].key }));
  }

  useEffect(() => { refresh().catch(err => setError(err.message || 'Could not load feedback tools.')); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedOption = useMemo(() => eligibility.find(item => item.key === reviewForm.optionKey), [eligibility, reviewForm.optionKey]);
  const selectedConcernTarget = useMemo(() => concernTargets.find(item => item.key === concernForm.targetKey), [concernTargets, concernForm.targetKey]);

  async function submitReview(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await savePatientReview({ option: selectedOption, ...reviewForm });
      setNotice('Thank you. Your verified-journey review is waiting for CareAtlas moderation.');
      setReviewForm(current => ({ ...emptyReview, optionKey: current.optionKey }));
      await refresh();
    } catch (err) { setError(err.message || 'Could not save your review.'); }
    finally { setBusy(false); }
  }

  async function submitConcern(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await createPatientConcern({ target: selectedConcernTarget, category: concernForm.category, subject: concernForm.subject, description: concernForm.description });
      setNotice('Your concern has been sent to CareAtlas operations.');
      setConcernForm(current => ({ ...emptyConcern, targetKey: current.targetKey }));
      await refresh();
    } catch (err) { setError(err.message || 'Could not submit your concern.'); }
    finally { setBusy(false); }
  }

  return <PatientShell title="Reviews & support" subtitle="Share verified journey feedback or raise a concern with CareAtlas operations.">
    <div className="phase7f-trust-note"><ShieldCheck size={20}/><div><strong>Verified CareAtlas journey feedback</strong><span>Reviews are tied to real CareAtlas cases or completed stays. Patient-reported outcomes are experience feedback, not independently verified clinical outcomes.</span></div></div>
    {notice && <div className="phase7f-success"><CheckCircle2 size={18}/>{notice}</div>}
    {error && <div className="phase7f-error"><AlertTriangle size={18}/>{error}</div>}

    <div className="phase7f-grid-two">
      <section className="portal-card phase7f-form-card">
        <span className="eyebrow">SHARE YOUR EXPERIENCE</span>
        <h2>Write a verified review</h2>
        <p>Hospital and CareAtlas reviews unlock once your case reaches treatment or follow-up. Stay reviews unlock after a completed booking.</p>
        {eligibility.length ? <form onSubmit={submitReview}>
          <label>Experience<select value={reviewForm.optionKey} onChange={e => setReviewForm({ ...reviewForm, optionKey: e.target.value })}>{eligibility.map(item => <option key={item.key} value={item.key}>{item.targetName} · {item.caseNumber}</option>)}</select></label>
          <label>Rating<Stars value={reviewForm.rating} onChange={rating => setReviewForm({ ...reviewForm, rating })}/></label>
          <label>Headline<input value={reviewForm.title} maxLength={140} placeholder="A short summary" onChange={e => setReviewForm({ ...reviewForm, title: e.target.value })}/></label>
          <label>Your review<textarea value={reviewForm.body} maxLength={1600} rows={5} placeholder="What went well? What could have been better?" onChange={e => setReviewForm({ ...reviewForm, body: e.target.value })}/></label>
          <label>How do you feel after this treatment journey?<select value={reviewForm.outcome} onChange={e => setReviewForm({ ...reviewForm, outcome: e.target.value })}>{PATIENT_OUTCOMES.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="phase7f-check"><input type="checkbox" checked={reviewForm.wouldRecommend} onChange={e => setReviewForm({ ...reviewForm, wouldRecommend: e.target.checked })}/> I would recommend this experience to another CareAtlas patient</label>
          <button className="button" type="submit" disabled={busy}>Submit review</button>
        </form> : <div className="phase7f-empty"><Star size={25}/><strong>No reviewable journey yet</strong><span>Reviews become available after treatment/follow-up or after a completed Stay Network booking.</span></div>}
      </section>

      <section className="portal-card phase7f-form-card">
        <span className="eyebrow">NEED HELP?</span>
        <h2>Raise a concern</h2>
        <p>This creates a private operations case. It is not shown publicly or sent directly to a hospital or hotel.</p>
        <form onSubmit={submitConcern}>
          <label>Concern about<select value={concernForm.targetKey} onChange={e => setConcernForm({ ...concernForm, targetKey: e.target.value })}>{concernTargets.map(item => <option key={item.key} value={item.key}>{item.targetName} · {item.caseNumber}</option>)}</select></label>
          <label>Category<select value={concernForm.category} onChange={e => setConcernForm({ ...concernForm, category: e.target.value })}>{COMPLAINT_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Subject<input value={concernForm.subject} maxLength={160} onChange={e => setConcernForm({ ...concernForm, subject: e.target.value })}/></label>
          <label>What happened?<textarea value={concernForm.description} maxLength={1800} rows={6} onChange={e => setConcernForm({ ...concernForm, description: e.target.value })}/></label>
          <button className="button secondary" type="submit" disabled={busy || !concernTargets.length}><MessageSquareWarning size={17}/> Send to CareAtlas</button>
        </form>
        <small className="phase7f-emergency-note">CareAtlas support is not an emergency service. For urgent medical needs, contact the treating hospital or local emergency services.</small>
      </section>
    </div>

    <div className="phase7f-grid-two phase7f-history-grid">
      <section className="portal-card"><span className="eyebrow">YOUR REVIEWS</span><h3>Review history</h3><div className="phase7f-list">{reviews.map(item => <article key={item.id}><div><strong>{item.targetName}</strong><span>{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)} · {outcomeLabel(item.patientReportedOutcome)}</span><small>{item.body}</small>{responses[item.id]?.responseText && <small className="phase7f-patient-response"><b>{responses[item.id].providerName || 'Partner'} response:</b> {responses[item.id].responseText}</small>}</div><i className={`phase7f-chip ${item.status}`}>{item.status.replaceAll('_',' ')}</i></article>)}{!reviews.length && <p>No reviews submitted yet.</p>}</div></section>
      <section className="portal-card"><span className="eyebrow">PRIVATE SUPPORT</span><h3>Concern history</h3><div className="phase7f-list">{concerns.map(item => <article key={item.id}><div><strong>{item.subject}</strong><span>{item.caseNumber} · {item.targetName || 'CareAtlas'} · {item.category}</span><small>{item.resolutionSummary || 'CareAtlas operations will update this record as it is reviewed.'}</small></div><div><i className={`phase7f-chip ${item.status}`}>{item.status.replaceAll('_',' ')}</i><small>{formatTrustDate(item.updatedAt)}</small></div></article>)}{!concerns.length && <p>No support concerns raised.</p>}</div></section>
    </div>
  </PatientShell>;
}
