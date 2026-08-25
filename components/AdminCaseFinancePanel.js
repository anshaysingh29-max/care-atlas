'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, LoaderCircle, Save, ShieldCheck } from 'lucide-react';
import {
  businessFinanceCurrencies,
  businessFinanceStatuses,
  getAdminCaseFinancial,
  saveAdminCaseFinancial
} from '@/lib/firebase/businessIntelligenceAdmin';

const STATUS_LABELS = {
  forecast: 'Forecast',
  invoiced: 'Invoiced / receivable',
  received: 'Received',
  refunded: 'Refunded',
  cancelled: 'Cancelled / void'
};

const initial = {
  status: 'forecast',
  hospitalId: '',
  currency: 'USD',
  treatmentValue: '',
  careAtlasRevenue: '',
  directCost: '',
  eventDate: '',
  note: ''
};

export default function AdminCaseFinancePanel({ record, providerRows = [] }) {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [exists, setExists] = useState(false);

  const assigned = useMemo(() => (record?.assignedHospitalIds || []).map(id => ({
    id,
    name: providerRows.find(row => (row.slug || row.id || row.hospitalId) === id)?.name || id
  })), [record?.assignedHospitalIds, providerRows]);

  useEffect(() => {
    if (!record?.id) return;
    let active = true;
    setLoading(true);
    getAdminCaseFinancial(record.id)
      .then(finance => {
        if (!active) return;
        if (finance) {
          setExists(true);
          setForm({
            status: finance.status || 'forecast',
            hospitalId: finance.hospitalId || '',
            currency: finance.currency || 'USD',
            treatmentValue: finance.treatmentValue ?? '',
            careAtlasRevenue: finance.careAtlasRevenue ?? '',
            directCost: finance.directCost ?? '',
            eventDate: finance.eventDate || '',
            note: finance.note || ''
          });
        } else {
          setExists(false);
          setForm(prev => ({ ...prev, hospitalId: assigned.length === 1 ? assigned[0].id : '' }));
        }
      })
      .catch(loadError => { if (active) setError(loadError?.message || 'Could not load case finance.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [record?.id]);

  async function save() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await saveAdminCaseFinancial({ caseId: record.id, ...form });
      setExists(true);
      setNotice('Case finance saved. Business Intelligence will use this as the canonical case revenue record.');
    } catch (saveError) {
      setError(saveError?.message || 'Could not save case finance.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="portal-card phase8d-case-finance">
    <div className="portal-card-heading"><div><span className="eyebrow">ADMIN-ONLY FINANCE</span><h2>Case economics.</h2></div><BadgeDollarSign size={22}/></div>
    <div className="phase8d-finance-guard"><ShieldCheck size={16}/><span>This record is hidden from hospitals, hotels, affiliates and patients. It is reporting data only and never affects AI matching or clinical operations.</span></div>
    {error && <div className="document-alert error"><span>{error}</span></div>}
    {notice && <div className="document-alert success"><span>{notice}</span></div>}
    {loading ? <div className="admin-live-loading"><LoaderCircle className="spin" size={18}/> Loading finance…</div> : <>
      <div className="phase8d-case-finance-grid">
        <label className="field-label"><span>Finance status</span><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{businessFinanceStatuses().map(status => <option key={status} value={status}>{STATUS_LABELS[status] || status}</option>)}</select></label>
        <label className="field-label"><span>Revenue hospital</span><select value={form.hospitalId} onChange={event => setForm({ ...form, hospitalId: event.target.value })}><option value="">Not attributed</option>{assigned.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field-label"><span>Currency</span><select value={form.currency} onChange={event => setForm({ ...form, currency: event.target.value })}>{businessFinanceCurrencies().map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="field-label"><span>Treatment value / GMV</span><input min="0" type="number" value={form.treatmentValue} onChange={event => setForm({ ...form, treatmentValue: event.target.value })} placeholder="Optional"/></label>
        <label className="field-label"><span>CareAtlas revenue</span><input min="0" type="number" value={form.careAtlasRevenue} onChange={event => setForm({ ...form, careAtlasRevenue: event.target.value })} placeholder="Actual fee earned"/></label>
        <label className="field-label"><span>Direct CareAtlas cost (excl. affiliate)</span><input min="0" type="number" value={form.directCost} onChange={event => setForm({ ...form, directCost: event.target.value })} placeholder="Optional direct cost"/></label>
        <label className="field-label phase8d-finance-wide"><span>Finance date</span><input type="date" value={form.eventDate} onChange={event => setForm({ ...form, eventDate: event.target.value })}/></label>
        <label className="field-label phase8d-finance-wide"><span>Finance note</span><textarea rows="3" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder="Invoice/payment reference or internal finance context. Do not enter card/bank credentials."/></label>
      </div>
      {!assigned.length && ['invoiced', 'received'].includes(form.status) && <div className="phase8d-finance-warning">Assign a hospital to the case before recording recognized revenue.</div>}
      <button type="button" className="button button-sm" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="spin" size={15}/> : <Save size={15}/>} {saving ? 'Saving…' : exists ? 'Update finance' : 'Create finance record'}</button>
    </>}
  </section>;
}
