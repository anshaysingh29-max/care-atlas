'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, CreditCard, FileCheck2, ShieldCheck } from 'lucide-react';
import PartnerShell from '@/components/PartnerShell';
import {
  getPartnerKyc,
  getPartnerPayoutProfile,
  maskAccount,
  maskTaxId,
  submitPartnerKyc,
  submitPartnerPayoutProfile
} from '@/lib/firebase/partnerFinance';

function statusLabel(value) {
  const map = {
    submitted: 'Submitted for review',
    needs_correction: 'Needs correction',
    verified: 'Verified',
    rejected: 'Rejected'
  };
  return map[value] || 'Not started';
}

export default function PartnerVerificationClient() {
  const [kyc, setKyc] = useState(null);
  const [payout, setPayout] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [kycForm, setKycForm] = useState({
    entityType: 'individual',
    legalName: '',
    country: 'India',
    taxIdType: 'PAN',
    taxId: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    region: '',
    postalCode: ''
  });
  const [payoutForm, setPayoutForm] = useState({
    method: 'bank',
    payoutCurrency: 'INR',
    payoutCountry: 'India',
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    routingCode: '',
    swiftCode: '',
    upiId: ''
  });

  async function load() {
    const [kycRow, payoutRow] = await Promise.all([getPartnerKyc(), getPartnerPayoutProfile()]);
    setKyc(kycRow);
    setPayout(payoutRow);
    if (kycRow) {
      setKycForm({
        entityType: kycRow.entityType || 'individual',
        legalName: kycRow.legalName || '',
        country: kycRow.country || 'India',
        taxIdType: kycRow.taxIdType || 'PAN',
        taxId: kycRow.status === 'verified' ? '' : (kycRow.taxId || ''),
        addressLine1: kycRow.addressLine1 || '',
        addressLine2: kycRow.addressLine2 || '',
        city: kycRow.city || '',
        region: kycRow.region || '',
        postalCode: kycRow.postalCode || ''
      });
    }
    if (payoutRow) {
      setPayoutForm({
        method: payoutRow.method || 'bank',
        payoutCurrency: payoutRow.payoutCurrency || 'INR',
        payoutCountry: payoutRow.payoutCountry || 'India',
        accountHolder: payoutRow.accountHolder || '',
        bankName: payoutRow.bankName || '',
        accountNumber: payoutRow.status === 'verified' ? '' : (payoutRow.accountNumber || ''),
        confirmAccountNumber: payoutRow.status === 'verified' ? '' : (payoutRow.accountNumber || ''),
        routingCode: payoutRow.routingCode || '',
        swiftCode: payoutRow.swiftCode || '',
        upiId: payoutRow.upiId || ''
      });
    }
  }

  useEffect(() => { load().catch(error => setNotice(error?.message || 'Could not load verification details.')); }, []);

  async function saveKyc(event) {
    event.preventDefault();
    setBusy('kyc'); setNotice('');
    try {
      const next = await submitPartnerKyc(kycForm);
      setKyc(next);
      setNotice('Identity details submitted to CareAtlas for manual review.');
    } catch (error) {
      setNotice(error?.message || 'Could not submit identity details.');
    } finally { setBusy(''); }
  }

  async function savePayout(event) {
    event.preventDefault();
    setBusy('payout'); setNotice('');
    try {
      if (payoutForm.method === 'bank' && payoutForm.accountNumber !== payoutForm.confirmAccountNumber) {
        throw new Error('Bank account numbers do not match.');
      }
      const next = await submitPartnerPayoutProfile(payoutForm);
      setPayout(next);
      setNotice('Payout destination submitted to CareAtlas for verification.');
    } catch (error) {
      setNotice(error?.message || 'Could not submit payout details.');
    } finally { setBusy(''); }
  }

  const kycLocked = kyc?.status === 'verified';
  const payoutLocked = payout?.status === 'verified';

  return <PartnerShell title="Verification & payout setup" subtitle="Complete identity verification and add the destination where approved referral earnings should be settled.">
    <div className="phase7c-sensitive-note"><AlertTriangle size={18}/><div><strong>MVP data handling</strong><span>Use test information while validating CareAtlas. Production launch should move sensitive tax/bank verification to a compliant KYC/payout provider or encrypted server-side workflow.</span></div></div>
    {notice && <div className="document-alert success">{notice}</div>}

    <div className="phase7c-verification-grid">
      <form className="portal-card phase7c-finance-form" onSubmit={saveKyc}>
        <div className="phase7c-card-title"><FileCheck2 size={22}/><div><span className="eyebrow">PARTNER KYC</span><h2>Identity / business verification</h2></div><b className={`phase7c-review-pill ${kyc?.status || 'not_started'}`}>{statusLabel(kyc?.status)}</b></div>
        {kyc?.reviewNote && <div className="phase7c-review-note"><ShieldCheck size={16}/><span>{kyc.reviewNote}</span></div>}
        {kycLocked && <div className="phase7c-verified-summary"><CheckCircle2 size={18}/><div><strong>{kyc.legalName}</strong><span>{kyc.entityType} · {kyc.country} · {kyc.taxIdType} {kyc.taxIdMasked || maskTaxId(kyc.taxId)}</span></div></div>}
        <div className="phase7c-form-two">
          <label className="field-label"><span>Entity type</span><select disabled={kycLocked} value={kycForm.entityType} onChange={e=>setKycForm({...kycForm,entityType:e.target.value})}><option value="individual">Individual</option><option value="business">Business / Agency</option></select></label>
          <label className="field-label"><span>Country</span><input disabled={kycLocked} value={kycForm.country} onChange={e=>setKycForm({...kycForm,country:e.target.value})}/></label>
        </div>
        <label className="field-label"><span>Legal name</span><input disabled={kycLocked} value={kycForm.legalName} onChange={e=>setKycForm({...kycForm,legalName:e.target.value})} placeholder="As shown on tax / identity records"/></label>
        <div className="phase7c-form-two">
          <label className="field-label"><span>Tax ID type</span><input disabled={kycLocked} value={kycForm.taxIdType} onChange={e=>setKycForm({...kycForm,taxIdType:e.target.value})} placeholder="PAN / Tax ID"/></label>
          <label className="field-label"><span>Tax identifier</span><input disabled={kycLocked} type="password" value={kycForm.taxId} onChange={e=>setKycForm({...kycForm,taxId:e.target.value})} placeholder={kycLocked ? (kyc.taxIdMasked || maskTaxId(kyc.taxId)) : 'For manual review'}/></label>
        </div>
        <label className="field-label"><span>Address</span><input disabled={kycLocked} value={kycForm.addressLine1} onChange={e=>setKycForm({...kycForm,addressLine1:e.target.value})}/></label>
        <label className="field-label"><span>Address line 2</span><input disabled={kycLocked} value={kycForm.addressLine2} onChange={e=>setKycForm({...kycForm,addressLine2:e.target.value})}/></label>
        <div className="phase7c-form-three">
          <label className="field-label"><span>City</span><input disabled={kycLocked} value={kycForm.city} onChange={e=>setKycForm({...kycForm,city:e.target.value})}/></label>
          <label className="field-label"><span>State / Region</span><input disabled={kycLocked} value={kycForm.region} onChange={e=>setKycForm({...kycForm,region:e.target.value})}/></label>
          <label className="field-label"><span>Postal code</span><input disabled={kycLocked} value={kycForm.postalCode} onChange={e=>setKycForm({...kycForm,postalCode:e.target.value})}/></label>
        </div>
        {!kycLocked && <button className="button full-button" disabled={busy==='kyc'}>{busy==='kyc'?'Submitting…':kyc?'Resubmit KYC':'Submit KYC'}</button>}
      </form>

      <form className="portal-card phase7c-finance-form" onSubmit={savePayout}>
        <div className="phase7c-card-title"><Banknote size={22}/><div><span className="eyebrow">PAYOUT DESTINATION</span><h2>Where should we pay you?</h2></div><b className={`phase7c-review-pill ${payout?.status || 'not_started'}`}>{statusLabel(payout?.status)}</b></div>
        {payout?.reviewNote && <div className="phase7c-review-note"><ShieldCheck size={16}/><span>{payout.reviewNote}</span></div>}
        {payoutLocked && <div className="phase7c-verified-summary"><CheckCircle2 size={18}/><div><strong>{payout.accountHolder}</strong><span>{payout.method === 'upi' ? payout.upiId : `${payout.bankName} · ${payout.accountNumberMasked || maskAccount(payout.accountNumber)}`}</span></div></div>}
        <div className="phase7c-method-tabs"><button type="button" disabled={payoutLocked} className={payoutForm.method==='bank'?'active':''} onClick={()=>setPayoutForm({...payoutForm,method:'bank'})}><CreditCard size={17}/> Bank transfer</button><button type="button" disabled={payoutLocked} className={payoutForm.method==='upi'?'active':''} onClick={()=>setPayoutForm({...payoutForm,method:'upi'})}>₹ UPI</button></div>
        <div className="phase7c-form-two">
          <label className="field-label"><span>Payout country</span><input disabled={payoutLocked} value={payoutForm.payoutCountry} onChange={e=>setPayoutForm({...payoutForm,payoutCountry:e.target.value})}/></label>
          <label className="field-label"><span>Currency</span><input disabled={payoutLocked} value={payoutForm.payoutCurrency} onChange={e=>setPayoutForm({...payoutForm,payoutCurrency:e.target.value.toUpperCase()})}/></label>
        </div>
        <label className="field-label"><span>Account holder</span><input disabled={payoutLocked} value={payoutForm.accountHolder} onChange={e=>setPayoutForm({...payoutForm,accountHolder:e.target.value})}/></label>
        {payoutForm.method === 'bank' ? <>
          <label className="field-label"><span>Bank name</span><input disabled={payoutLocked} value={payoutForm.bankName} onChange={e=>setPayoutForm({...payoutForm,bankName:e.target.value})}/></label>
          <div className="phase7c-form-two">
            <label className="field-label"><span>Account number</span><input disabled={payoutLocked} type="password" value={payoutForm.accountNumber} onChange={e=>setPayoutForm({...payoutForm,accountNumber:e.target.value})} placeholder={payoutLocked ? (payout.accountNumberMasked || maskAccount(payout.accountNumber)) : ''}/></label>
            <label className="field-label"><span>Confirm account number</span><input disabled={payoutLocked} type="password" value={payoutForm.confirmAccountNumber} onChange={e=>setPayoutForm({...payoutForm,confirmAccountNumber:e.target.value})}/></label>
          </div>
          <div className="phase7c-form-two">
            <label className="field-label"><span>IFSC / routing code</span><input disabled={payoutLocked} value={payoutForm.routingCode} onChange={e=>setPayoutForm({...payoutForm,routingCode:e.target.value})}/></label>
            <label className="field-label"><span>SWIFT (optional)</span><input disabled={payoutLocked} value={payoutForm.swiftCode} onChange={e=>setPayoutForm({...payoutForm,swiftCode:e.target.value})}/></label>
          </div>
        </> : <label className="field-label"><span>UPI ID</span><input disabled={payoutLocked} value={payoutForm.upiId} onChange={e=>setPayoutForm({...payoutForm,upiId:e.target.value})} placeholder="name@bank"/></label>}
        {!payoutLocked && <button className="button full-button" disabled={busy==='payout'}>{busy==='payout'?'Submitting…':payout?'Resubmit payout destination':'Submit payout destination'}</button>}
      </form>
    </div>
  </PartnerShell>;
}
