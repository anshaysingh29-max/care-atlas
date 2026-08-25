'use client';

import { useEffect, useState } from 'react';
import { Banknote, CheckCircle2, Landmark, RefreshCw, Settings2, ShieldAlert, WalletCards } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import {
  getAdminPayoutRequests,
  getAdminPayoutSettlements,
  getAdminPayoutSettings,
  settlePayoutRequest,
  updateAdminPayoutSettings,
  updatePayoutRequestStatus
} from '@/lib/firebase/affiliateAdmin';
import { formatPartnerDate, formatPartnerMoney } from '@/lib/firebase/partners';

export default function AdminPayoutsClient() {
  const [requests, setRequests] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [settings, setSettings] = useState({ minPayoutAmount: 1000, currency: 'INR' });
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const [r,s,config] = await Promise.all([getAdminPayoutRequests(), getAdminPayoutSettlements(), getAdminPayoutSettings()]);
    setRequests(r);
    setSettlements(s);
    setSettings(config);
    setDrafts(current => {
      const copy = { ...current };
      for (const row of r) copy[row.partnerId] = copy[row.partnerId] || { paymentReference: '', settlementNote: '', taxWithheld: '0' };
      return copy;
    });
  }
  useEffect(()=>{load().catch(error=>setNotice(error?.message || 'Could not load payout queue.'));},[]);

  function patch(id, values){setDrafts(current=>({...current,[id]:{...current[id],...values}}));}

  async function saveSettings(event){
    event.preventDefault(); setBusy('settings'); setNotice('');
    try { await updateAdminPayoutSettings(settings); await load(); setNotice('Partner payout settings updated.'); }
    catch(error){setNotice(error?.message || 'Could not update payout settings.');}
    finally{setBusy('');}
  }

  async function changeStatus(row,status){
    setBusy(`${status}-${row.partnerId}`); setNotice('');
    try { await updatePayoutRequestStatus({partnerId:row.partnerId,status,settlementNote:drafts[row.partnerId]?.settlementNote || ''}); await load(); setNotice(`Payout request ${status.replace('_',' ')}.`); }
    catch(error){setNotice(error?.message || 'Could not update payout request.');}
    finally{setBusy('');}
  }

  async function pay(row){
    const draft=drafts[row.partnerId] || {};
    setBusy(`pay-${row.partnerId}`); setNotice('');
    try {
      await settlePayoutRequest({partnerId:row.partnerId,paymentReference:draft.paymentReference,settlementNote:draft.settlementNote,taxWithheld:draft.taxWithheld});
      await load(); setNotice(`Payout settled for ${row.partnerName || row.partnerId}.`);
    } catch(error){setNotice(error?.message || 'Could not settle payout.');}
    finally{setBusy('');}
  }

  const actionable=requests.filter(row=>['requested','on_hold'].includes(row.status));

  return <AdminShell title="Partner payouts" subtitle="Settle verified affiliate earnings against the approved commission ledger and preserve tax/payment references." action={<button className="text-button" onClick={()=>load()}><RefreshCw size={15}/> Refresh</button>}>
    <div className="phase7c-sensitive-note admin"><ShieldAlert size={18}/><div><strong>Manual payout control</strong><span>Phase 7C does not move money automatically. Finance sends the bank/UPI payment outside CareAtlas, then records the reference here. Use test payout data until production controls are approved.</span></div></div>
    {notice && <div className="document-alert success">{notice}</div>}

    <form className="portal-card phase7c-payout-settings" onSubmit={saveSettings}>
      <div><Settings2 size={20}/><div><span className="eyebrow">PAYOUT POLICY</span><h2>Minimum withdrawal threshold</h2></div></div>
      <label className="field-label"><span>Minimum payout</span><input type="number" min="1" step="1" value={settings.minPayoutAmount} onChange={e=>setSettings({...settings,minPayoutAmount:e.target.value})}/></label>
      <label className="field-label"><span>Currency</span><input value={settings.currency || 'INR'} onChange={e=>setSettings({...settings,currency:e.target.value.toUpperCase()})}/></label>
      <button className="button button-sm" disabled={busy==='settings'}>{busy==='settings'?'Saving…':'Save policy'}</button>
    </form>

    <section className="portal-card phase7c-admin-payouts">
      <div className="portal-card-heading"><div><span className="eyebrow">PAYOUT QUEUE</span><h2>{actionable.length} request{actionable.length===1?'':'s'} awaiting finance</h2></div></div>
      {actionable.map(row=>{
        const draft=drafts[row.partnerId] || {};
        const tax=Math.max(0,Number(draft.taxWithheld)||0);
        const net=Math.max(0,Number(row.grossAmountSnapshot||0)-tax);
        return <article className="phase7c-admin-payout-row" key={row.partnerId}>
          <div className="phase7c-payout-person"><WalletCards size={19}/><div><strong>{row.partnerName || row.partnerId}</strong><span>{row.commissionCount} commission{row.commissionCount===1?'':'s'} · {row.payoutDestinationSnapshot}</span><small>Status: {row.status}</small></div></div>
          <div className="phase7c-money-breakdown"><span><small>Gross</small><strong>{formatPartnerMoney(row.grossAmountSnapshot,row.currency)}</strong></span><span><small>Tax withheld</small><input type="number" min="0" step="0.01" value={draft.taxWithheld ?? '0'} onChange={e=>patch(row.partnerId,{taxWithheld:e.target.value})}/></span><span><small>Net settlement</small><strong>{formatPartnerMoney(net,row.currency)}</strong></span></div>
          <div className="phase7c-settle-fields"><input value={draft.paymentReference || ''} onChange={e=>patch(row.partnerId,{paymentReference:e.target.value})} placeholder="UTR / bank / UPI reference"/><input value={draft.settlementNote || ''} onChange={e=>patch(row.partnerId,{settlementNote:e.target.value})} placeholder="Settlement note (optional)"/></div>
          <div className="phase7c-payout-actions"><button className="button button-sm" disabled={busy===`pay-${row.partnerId}`} onClick={()=>pay(row)}><Banknote size={15}/>{busy===`pay-${row.partnerId}`?'Saving…':'Mark paid'}</button><button className="text-button" disabled={busy===`on_hold-${row.partnerId}`} onClick={()=>changeStatus(row,'on_hold')}>Hold</button><button className="text-button danger" disabled={busy===`rejected-${row.partnerId}`} onClick={()=>changeStatus(row,'rejected')}>Reject</button></div>
        </article>;
      })}
      {!actionable.length && <p className="phase7a-empty">No active payout requests.</p>}
    </section>

    <section className="portal-card phase7c-admin-settlements">
      <div className="portal-card-heading"><div><span className="eyebrow">SETTLEMENT HISTORY</span><h2>Completed payouts</h2></div></div>
      {settlements.map(row=><article key={row.id}><CheckCircle2 size={17}/><div><strong>{row.partnerName || row.partnerId}</strong><span>{formatPartnerDate(row.paidAt)} · {row.paymentReference}</span></div><div><strong>{formatPartnerMoney(row.netAmount,row.currency)}</strong><small>Gross {formatPartnerMoney(row.grossAmount,row.currency)} · Tax {formatPartnerMoney(row.taxWithheld,row.currency)}</small></div></article>)}
      {!settlements.length && <p className="phase7a-empty">No completed settlements yet.</p>}
    </section>
  </AdminShell>;
}
