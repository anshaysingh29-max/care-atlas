'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, Landmark, ReceiptText, ShieldCheck, WalletCards } from 'lucide-react';
import PartnerShell from '@/components/PartnerShell';
import { formatPartnerDate, formatPartnerMoney } from '@/lib/firebase/partners';
import { getPartnerPayoutSnapshot, requestPartnerPayout } from '@/lib/firebase/partnerFinance';

function downloadStatement(rows) {
  if (!rows.length || typeof window === 'undefined') return;
  const quote = value => `"${String(value ?? '').replaceAll('"','""')}"`;
  const lines = [
    ['Paid date','Settlement ID','Gross','Tax withheld','Net paid','Currency','Payment reference'].map(quote).join(','),
    ...rows.map(row => [formatPartnerDate(row.paidAt),row.settlementId || row.id,row.grossAmount,row.taxWithheld,row.netAmount,row.currency,row.paymentReference].map(quote).join(','))
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'careatlas-partner-payout-statement.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PartnerPayoutsClient() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function load() {
    const next = await getPartnerPayoutSnapshot();
    setData(next);
  }
  useEffect(() => { load().catch(error => setNotice(error?.message || 'Could not load payout data.')); }, []);

  const activeRequest = useMemo(() => data?.payoutRequest && ['requested','on_hold'].includes(data.payoutRequest.status) ? data.payoutRequest : null, [data]);
  const threshold = data?.settings?.minPayoutAmount || 1000;
  const verified = data?.kyc?.status === 'verified' && data?.payoutProfile?.status === 'verified';
  const canRequest = verified && !activeRequest && Number(data?.available || 0) >= Number(threshold);

  async function request() {
    setBusy(true); setNotice('');
    try {
      await requestPartnerPayout();
      await load();
      setNotice('Payout requested. CareAtlas finance will verify the current approved commission ledger before settlement.');
    } catch (error) {
      setNotice(error?.message || 'Could not request payout.');
    } finally { setBusy(false); }
  }

  if (!data) return <PartnerShell title="Payouts" subtitle="Loading your verified earnings and settlement history…"><section className="portal-card"><strong>Loading payout ledger…</strong></section></PartnerShell>;

  return <PartnerShell title="Payouts" subtitle="Approved commissions become withdrawable after Partner KYC and payout-destination verification.">
    {notice && <div className="document-alert success">{notice}</div>}

    <div className="phase7c-wallet-grid">
      <article><span><ReceiptText size={17}/></span><small>Pending approval</small><strong>{formatPartnerMoney(data.pending,'INR')}</strong></article>
      <article className="available"><span><WalletCards size={17}/></span><small>Available for payout</small><strong>{formatPartnerMoney(data.available,'INR')}</strong></article>
      <article><span><Landmark size={17}/></span><small>Paid lifetime</small><strong>{formatPartnerMoney(data.paid,'INR')}</strong></article>
      <article><span><ShieldCheck size={17}/></span><small>Minimum payout</small><strong>{formatPartnerMoney(threshold,data.settings?.currency || 'INR')}</strong></article>
    </div>

    <div className="phase7c-payout-grid">
      <section className="portal-card phase7c-request-card">
        <span className="eyebrow">PAYOUT READINESS</span>
        <h2>{verified ? 'Verification complete' : 'Complete verification before withdrawing.'}</h2>
        <div className="phase7c-readiness-list">
          <span className={data.kyc?.status === 'verified' ? 'ok' : ''}><ShieldCheck size={16}/><b>KYC</b><small>{data.kyc?.status || 'not started'}</small></span>
          <span className={data.payoutProfile?.status === 'verified' ? 'ok' : ''}><Landmark size={16}/><b>Payout destination</b><small>{data.payoutProfile?.status || 'not started'}</small></span>
          <span className={Number(data.available)>=Number(threshold) ? 'ok' : ''}><WalletCards size={16}/><b>Available balance</b><small>{formatPartnerMoney(data.available,'INR')}</small></span>
        </div>
        {!verified && <Link href="/partner/verification" className="button">Complete verification <ArrowRight size={16}/></Link>}
        {activeRequest ? <div className={`phase7c-active-request ${activeRequest.status}`}><strong>Payout {activeRequest.status === 'on_hold' ? 'on hold' : 'requested'}</strong><span>{formatPartnerMoney(activeRequest.grossAmountSnapshot,activeRequest.currency)} · {activeRequest.commissionCount} approved commission{activeRequest.commissionCount===1?'':'s'}</span>{activeRequest.settlementNote && <small>{activeRequest.settlementNote}</small>}</div> : verified && <button className="button" type="button" disabled={!canRequest || busy} onClick={request}>{busy?'Requesting…':`Request ${formatPartnerMoney(data.available,'INR')}`}</button>}
        {verified && !activeRequest && Number(data.available) < Number(threshold) && <p className="phase7c-threshold-note">Approved earnings must reach {formatPartnerMoney(threshold,data.settings?.currency || 'INR')} before a payout can be requested.</p>}
      </section>

      <section className="portal-card">
        <div className="portal-card-heading"><div><span className="eyebrow">CURRENT DESTINATION</span><h2>Settlement method</h2></div><Link href="/partner/verification" className="link-arrow">Manage</Link></div>
        {data.payoutProfile ? <div className="phase7c-destination-summary"><Landmark size={24}/><strong>{data.payoutProfile.accountHolder || 'Partner payout account'}</strong><span>{data.payoutProfile.method === 'upi' ? data.payoutProfile.upiId : `${data.payoutProfile.bankName || 'Bank'} · ${data.payoutProfile.accountNumberMasked || 'account submitted'}`}</span><small>{data.payoutProfile.status} · {data.payoutProfile.payoutCurrency || 'INR'}</small></div> : <p>No payout destination submitted yet.</p>}
      </section>
    </div>

    <section className="portal-card phase7c-settlement-history">
      <div className="portal-card-heading"><div><span className="eyebrow">PAYOUT HISTORY</span><h2>Settlements</h2></div>{data.settlements.length>0 && <button className="text-button" type="button" onClick={()=>downloadStatement(data.settlements)}><Download size={15}/> Download CSV statement</button>}</div>
      {data.settlements.map(row => <article key={row.id}><div><strong>{formatPartnerMoney(row.netAmount,row.currency)}</strong><span>{formatPartnerDate(row.paidAt)} · {row.paymentReference}</span></div><div><small>Gross {formatPartnerMoney(row.grossAmount,row.currency)}</small><small>Tax withheld {formatPartnerMoney(row.taxWithheld,row.currency)}</small></div></article>)}
      {!data.settlements.length && <p className="phase7a-empty">No completed payouts yet.</p>}
    </section>
  </PartnerShell>;
}
