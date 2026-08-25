'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, FileCheck2, RefreshCw, ShieldAlert } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { getAdminPartnerVerificationRows, reviewPartnerKyc, reviewPartnerPayoutProfile } from '@/lib/firebase/affiliateAdmin';

const reviewOptions = [
  ['verified','Verify'],
  ['needs_correction','Needs correction'],
  ['rejected','Reject']
];

export default function AdminPartnerKycClient() {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const next = await getAdminPartnerVerificationRows();
    setRows(next);
    setDrafts(current => {
      const copy = { ...current };
      for (const row of next) {
        copy[row.id] = copy[row.id] || {
          kycStatus: row.kyc?.status === 'verified' ? 'verified' : 'needs_correction',
          payoutStatus: row.payoutProfile?.status === 'verified' ? 'verified' : 'needs_correction',
          kycNote: row.kyc?.reviewNote || '',
          payoutNote: row.payoutProfile?.reviewNote || ''
        };
      }
      return copy;
    });
  }
  useEffect(() => { load().catch(error => setNotice(error?.message || 'Could not load partner verification queue.')); }, []);

  function patch(id, values) { setDrafts(current => ({ ...current, [id]: { ...current[id], ...values } })); }

  async function applyKyc(row) {
    setBusy(`kyc-${row.id}`); setNotice('');
    try {
      const draft = drafts[row.id] || {};
      await reviewPartnerKyc({ partnerId: row.id, status: draft.kycStatus, reviewNote: draft.kycNote });
      await load();
      setNotice(`KYC review saved for ${row.displayName || row.email}.`);
    } catch (error) { setNotice(error?.message || 'Could not save KYC review.'); }
    finally { setBusy(''); }
  }

  async function applyPayout(row) {
    setBusy(`payout-${row.id}`); setNotice('');
    try {
      const draft = drafts[row.id] || {};
      await reviewPartnerPayoutProfile({ partnerId: row.id, status: draft.payoutStatus, reviewNote: draft.payoutNote });
      await load();
      setNotice(`Payout destination review saved for ${row.displayName || row.email}.`);
    } catch (error) { setNotice(error?.message || 'Could not save payout review.'); }
    finally { setBusy(''); }
  }

  return <AdminShell title="Partner KYC" subtitle="Review referral-partner identity and payout destinations before commissions can be approved or settled." action={<button className="text-button" onClick={()=>load()}><RefreshCw size={15}/> Refresh</button>}>
    <div className="phase7c-sensitive-note admin"><ShieldAlert size={18}/><div><strong>Sensitive operations view</strong><span>Tax and payout identifiers shown here are for manual MVP testing only. Restrict admin access and do not use real identifiers until the production verification architecture is approved.</span></div></div>
    {notice && <div className="document-alert success">{notice}</div>}

    <div className="phase7c-admin-kyc-list">
      {rows.map(row => {
        const draft = drafts[row.id] || {};
        return <article className="portal-card phase7c-admin-kyc-card" key={row.id}>
          <header><div><span className="eyebrow">{row.partnerType || 'REFERRAL PARTNER'}</span><h2>{row.displayName || row.email}</h2><p>{row.email} · {row.country || 'Country not set'} · Partner {row.status}</p></div><div className="phase7c-fraud-chips">{row.duplicateTaxId && <b><AlertTriangle size={13}/> Duplicate tax ID</b>}{row.duplicatePayoutDestination && <b><AlertTriangle size={13}/> Duplicate payout destination</b>}</div></header>

          <div className="phase7c-admin-review-grid">
            <section>
              <div className="phase7c-subhead"><FileCheck2 size={18}/><strong>Identity / tax</strong><span>{row.kyc?.status || 'not submitted'}</span></div>
              {row.kyc ? <div className="phase7c-admin-data">
                <span><small>Legal name</small><b>{row.kyc.legalName}</b></span>
                <span><small>Entity</small><b>{row.kyc.entityType}</b></span>
                <span><small>{row.kyc.taxIdType || 'Tax ID'}</small><b>{row.kyc.taxId || '—'}</b></span>
                <span><small>Address</small><b>{[row.kyc.addressLine1,row.kyc.city,row.kyc.region,row.kyc.postalCode].filter(Boolean).join(', ')}</b></span>
              </div> : <p>No KYC submission.</p>}
              {row.kyc && row.kyc.status !== 'verified' && <div className="phase7c-review-controls"><select value={draft.kycStatus || 'needs_correction'} onChange={e=>patch(row.id,{kycStatus:e.target.value})}>{reviewOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><input value={draft.kycNote || ''} onChange={e=>patch(row.id,{kycNote:e.target.value})} placeholder="Review note / correction required"/><button className="button button-sm" disabled={busy===`kyc-${row.id}`} onClick={()=>applyKyc(row)}>{busy===`kyc-${row.id}`?'Saving…':'Apply KYC review'}</button></div>}
              {row.kyc?.status === 'verified' && <div className="phase7c-admin-verified"><CheckCircle2 size={16}/> Verified</div>}
            </section>

            <section>
              <div className="phase7c-subhead"><CreditCard size={18}/><strong>Payout destination</strong><span>{row.payoutProfile?.status || 'not submitted'}</span></div>
              {row.payoutProfile ? <div className="phase7c-admin-data">
                <span><small>Method</small><b>{row.payoutProfile.method}</b></span>
                <span><small>Account holder</small><b>{row.payoutProfile.accountHolder}</b></span>
                {row.payoutProfile.method === 'upi' ? <span><small>UPI ID</small><b>{row.payoutProfile.upiId}</b></span> : <><span><small>Bank</small><b>{row.payoutProfile.bankName}</b></span><span><small>Account</small><b>{row.payoutProfile.accountNumber}</b></span><span><small>Routing / IFSC</small><b>{row.payoutProfile.routingCode}</b></span></>}
              </div> : <p>No payout destination submitted.</p>}
              {row.payoutProfile && row.payoutProfile.status !== 'verified' && <div className="phase7c-review-controls"><select value={draft.payoutStatus || 'needs_correction'} onChange={e=>patch(row.id,{payoutStatus:e.target.value})}>{reviewOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><input value={draft.payoutNote || ''} onChange={e=>patch(row.id,{payoutNote:e.target.value})} placeholder="Review note / correction required"/><button className="button button-sm" disabled={busy===`payout-${row.id}`} onClick={()=>applyPayout(row)}>{busy===`payout-${row.id}`?'Saving…':'Apply payout review'}</button></div>}
              {row.payoutProfile?.status === 'verified' && <div className="phase7c-admin-verified"><CheckCircle2 size={16}/> Verified</div>}
            </section>
          </div>
        </article>;
      })}
      {!rows.length && <section className="portal-card"><p>No partner verification records yet.</p></section>}
    </div>
  </AdminShell>;
}
