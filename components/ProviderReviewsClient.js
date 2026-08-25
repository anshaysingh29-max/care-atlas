'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageCircleReply, ShieldCheck, Star } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import HospitalShell from '@/components/HospitalShell';
import HotelPartnerShell from '@/components/HotelPartnerShell';
import { getHospitalCatalogueProfile } from '@/lib/firebase/hospital';
import { getPublishedProviderReviews, getReviewResponses, saveProviderReviewResponse } from '@/lib/firebase/trust';

export default function ProviderReviewsClient({ providerType }) {
  const { userProfile, hotelProfile } = useAuth();
  const hospital = providerType === 'hospital' ? getHospitalCatalogueProfile(userProfile?.hospitalId) : null;
  const providerId = providerType === 'hospital' ? userProfile?.hospitalId : hotelProfile?.hotelId;
  const providerName = providerType === 'hospital'
    ? (hospital?.name || userProfile?.hospitalName || providerId)
    : (hotelProfile?.propertyName || 'CareAtlas Stay Partner');
  const [reviews, setReviews] = useState([]);
  const [responses, setResponses] = useState({});
  const [drafts, setDrafts] = useState({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    if (!providerId) return;
    const rows = await getPublishedProviderReviews(providerType, providerId);
    const responseRows = await getReviewResponses(rows.map(item => item.id));
    setReviews(rows);
    setResponses(Object.fromEntries(responseRows.map(item => [item.reviewId, item])));
  }

  useEffect(() => { refresh().catch(err => setError(err.message || 'Could not load reviews.')); }, [providerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const average = useMemo(() => reviews.length ? reviews.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / reviews.length : 0, [reviews]);

  async function saveResponse(review) {
    setError(''); setNotice('');
    try {
      await saveProviderReviewResponse({
        reviewId: review.id,
        responseText: drafts[review.id] ?? responses[review.id]?.responseText ?? '',
        providerType,
        providerId,
        providerName
      });
      setNotice('Response saved.');
      await refresh();
    } catch (err) { setError(err.message || 'Could not save response.'); }
  }

  const content = <>
    <div className="phase7f-provider-summary"><div><Star size={24}/><strong>{average ? average.toFixed(1) : '—'}</strong><span>Average published rating</span></div><div><ShieldCheck size={24}/><strong>{reviews.length}</strong><span>Verified CareAtlas journey reviews</span></div></div>
    {notice && <div className="phase7f-success">{notice}</div>}
    {error && <div className="phase7f-error">{error}</div>}
    <section className="portal-card">
      <span className="eyebrow">PUBLISHED PATIENT FEEDBACK</span>
      <h2>Verified journey reviews</h2>
      <p>Only reviews tied to a real CareAtlas treatment case or completed stay appear here. Patient identities are not exposed.</p>
      <div className="phase7f-provider-reviews">{reviews.map(review => <article key={review.id}>
        <header><div><strong>{review.title || `${review.rating}/5 experience`}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)} · {review.caseNumber}</span></div><i>VERIFIED JOURNEY</i></header>
        <p>{review.body}</p>
        <small>Patient-reported outcome: {String(review.patientReportedOutcome || 'not shared').replaceAll('_',' ')} · {review.wouldRecommend ? 'Would recommend' : 'Would not recommend'}</small>
        <div className="phase7f-response-box"><MessageCircleReply size={18}/><div><strong>Partner response</strong><textarea rows={3} maxLength={1200} value={drafts[review.id] ?? responses[review.id]?.responseText ?? ''} placeholder="Respond professionally to this feedback" onChange={e => setDrafts({ ...drafts, [review.id]: e.target.value })}/><button type="button" className="button small" onClick={() => saveResponse(review)}>Save response</button></div></div>
      </article>)}{!reviews.length && <div className="phase7f-empty"><Star size={25}/><strong>No published reviews yet</strong><span>CareAtlas moderation is required before feedback appears in this portal.</span></div>}</div>
    </section>
  </>;

  if (providerType === 'hospital') return <HospitalShell title="Patient feedback" subtitle="View and respond to published, verified CareAtlas journey reviews.">{content}</HospitalShell>;
  return <HotelPartnerShell title="Guest feedback" subtitle="View and respond to published CareAtlas Stay Network reviews.">{content}</HotelPartnerShell>;
}
