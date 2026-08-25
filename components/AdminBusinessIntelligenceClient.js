'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  BarChart3,
  BedDouble,
  Building2,
  CircleAlert,
  CircleDollarSign,
  Coins,
  FileWarning,
  Gauge,
  Handshake,
  Landmark,
  LoaderCircle,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  TrendingUp
} from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { getBusinessIntelligenceWorkspace } from '@/lib/firebase/businessIntelligenceAdmin';

const TABS = [
  ['overview', 'Executive'],
  ['hospitals', 'Hospitals'],
  ['affiliates', 'Affiliates'],
  ['stays', 'Stay Network'],
  ['destinations', 'Destinations'],
  ['treatments', 'Treatments'],
  ['finance', 'Finance Quality']
];

function money(value, currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value) || 0);
  } catch {
    return `${currency} ${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
}

function pct(value) {
  return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}%`;
}

function compact(value) {
  const number = Number(value) || 0;
  return number.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function contributionClass(value) {
  return Number(value) < 0 ? 'negative' : Number(value) > 0 ? 'positive' : '';
}

function Kpi({ icon: Icon, label, value, note, tone = '' }) {
  return <article className={`phase8d-kpi ${tone}`}><div className="phase8d-kpi-icon"><Icon size={19}/></div><div><small>{label}</small><strong>{value}</strong><span>{note}</span></div></article>;
}

function Empty({ children }) {
  return <div className="phase8d-empty"><BarChart3 size={24}/><span>{children}</span></div>;
}

function PerformanceBar({ value, max, label, currency }) {
  const width = max > 0 ? Math.max(3, Math.min(100, (Number(value) / max) * 100)) : 0;
  return <div className="phase8d-bar-row"><div><span>{label}</span><strong>{money(value, currency)}</strong></div><i><b style={{ width: `${width}%` }}/></i></div>;
}

export default function AdminBusinessIntelligenceClient() {
  const [workspace, setWorkspace] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(nextCurrency = currency) {
    setLoading(true);
    setError('');
    try {
      const data = await getBusinessIntelligenceWorkspace({ currency: nextCurrency });
      setWorkspace(data);
    } catch (loadError) {
      setError(loadError?.message || 'Could not load Business Intelligence.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load('USD'); }, []);

  function changeCurrency(event) {
    const next = event.target.value;
    setCurrency(next);
    load(next);
  }

  const headline = workspace?.headline || {};
  const maxHospitalRevenue = useMemo(() => Math.max(0, ...(workspace?.hospitalPerformance || []).map(row => Number(row.revenue) || 0)), [workspace]);
  const maxDestinationRevenue = useMemo(() => Math.max(0, ...(workspace?.destinationPerformance || []).map(row => Number(row.revenue) || 0)), [workspace]);
  const maxTreatmentRevenue = useMemo(() => Math.max(0, ...(workspace?.treatmentPerformance || []).map(row => Number(row.revenue) || 0)), [workspace]);

  return <AdminShell
    title="Revenue & Business Intelligence"
    subtitle="Executive economics across treatment cases, hospitals, affiliates, stays, destinations and treatment lines — using recorded finance only."
    action={<button className="text-button" type="button" onClick={() => load(currency)} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={15}/> Recalculate</button>}
  >
    <div className="phase8d-guard"><ShieldCheck size={19}/><div><strong>Admin-only financial intelligence</strong><span>Commercials and finance remain hidden from hospitals, hotels, affiliates and patients. No FX conversion is applied: every monetary view is filtered to one reporting currency.</span></div></div>

    <div className="phase8d-toolbar">
      <div className="phase8d-tabs">{TABS.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
      <label><span>Reporting currency</span><select value={currency} onChange={changeCurrency}>{(workspace?.currencies?.length ? workspace.currencies : ['USD','INR','EUR','AED','THB','TRY','GBP']).map(item => <option key={item}>{item}</option>)}</select></label>
    </div>

    {error && <div className="document-alert error"><CircleAlert size={17}/><span>{error}</span></div>}
    {loading || !workspace ? <div className="admin-live-loading"><LoaderCircle className="spin" size={22}/> Building executive intelligence…</div> : <>
      <section className="phase8d-kpis">
        <Kpi icon={CircleDollarSign} label="Recorded revenue" value={money(headline.recognizedRevenue, currency)} note={`${money(headline.caseRevenue, currency)} case finance + ${money(headline.referralRevenueFallback, currency)} referral-ledger fallback + ${money(headline.stayRevenue, currency)} stays`}/>
        <Kpi icon={TrendingUp} label="Net contribution" value={money(headline.netContribution, currency)} note={`${pct(headline.contributionMarginPct)} contribution margin`} tone={contributionClass(headline.netContribution)}/>
        <Kpi icon={Handshake} label="Affiliate commission accrued" value={money(headline.affiliateCommissionCost, currency)} note="Pending, approved, on-hold and paid commission ledgers"/>
        <Kpi icon={BedDouble} label="Stay commission revenue" value={money(headline.stayRevenue, currency)} note={`${compact(headline.completedStays)} completed stays in ${currency}`}/>
        <Kpi icon={Gauge} label="Finance coverage" value={pct(headline.financeCoveragePct)} note={`${headline.treatmentStageFinanceCovered || 0} of ${headline.treatmentStageCases || 0} treatment-stage cases financially documented`}/>
        <Kpi icon={Coins} label="Forecast pipeline" value={money(headline.forecastRevenue, currency)} note="Manual forecast records only — excluded from recognized revenue"/>
      </section>

      {tab === 'overview' && <>
        <section className="phase8d-overview-grid">
          <article className="portal-card phase8d-waterfall">
            <div className="portal-card-heading"><div><span className="eyebrow">CONTRIBUTION VIEW</span><h2>What CareAtlas retains.</h2></div><Landmark size={21}/></div>
            <div className="phase8d-waterfall-row"><span>Case revenue</span><strong>{money(headline.caseRevenue + headline.referralRevenueFallback, currency)}</strong></div>
            <div className="phase8d-waterfall-row"><span>Stay commission revenue</span><strong>+ {money(headline.stayRevenue, currency)}</strong></div>
            <div className="phase8d-waterfall-row cost"><span>Direct case costs</span><strong>− {money(headline.directCosts, currency)}</strong></div>
            <div className="phase8d-waterfall-row cost"><span>Affiliate commissions</span><strong>− {money(headline.affiliateCommissionCost, currency)}</strong></div>
            <div className={`phase8d-waterfall-total ${contributionClass(headline.netContribution)}`}><span>Net contribution</span><strong>{money(headline.netContribution, currency)}</strong></div>
            <p>Hotel gross booking value is not counted as CareAtlas revenue. Only the recorded CareAtlas booking commission enters revenue.</p>
          </article>

          <article className="portal-card phase8d-commercial-coverage">
            <div className="portal-card-heading"><div><span className="eyebrow">NETWORK READINESS</span><h2>Commercial coverage.</h2></div><Building2 size={21}/></div>
            <div className="phase8d-coverage-stat"><strong>{headline.publishedHospitals || 0}</strong><span>Published hospitals</span></div>
            <div className="phase8d-coverage-stat"><strong>{headline.configuredCommercials || 0}</strong><span>Commercial model configured</span></div>
            <div className="phase8d-coverage-stat"><strong>{headline.signedCommercials || 0}</strong><span>Signed contract recorded</span></div>
            <p>Commercial percentages are used for contract administration only. 8D does not use them to rank hospitals or prioritize patients.</p>
          </article>
        </section>

        <section className="portal-card phase8d-warning-card">
          <div className="portal-card-heading"><div><span className="eyebrow">DATA QUALITY</span><h2>Numbers that still need finance attention.</h2></div><FileWarning size={21}/></div>
          {workspace.warnings.length ? <div className="phase8d-warning-list">{workspace.warnings.map(item => <div key={item.code} className={item.severity}><i>{item.count}</i><span>{item.message}</span></div>)}</div> : <div className="phase8d-good"><ShieldCheck size={18}/> No material finance data-quality warnings were detected.</div>}
        </section>
      </>}

      {tab === 'hospitals' && <section className="portal-card phase8d-table-card">
        <div className="portal-card-heading"><div><span className="eyebrow">HOSPITAL PERFORMANCE</span><h2>Conversion and contribution.</h2></div><Building2 size={21}/></div>
        <p className="phase8d-explain">Treatment-stage rate means a case assigned to that hospital reached Treatment or Follow-up. If a case remains assigned to multiple hospitals, it can appear in multiple operational conversion counts; revenue attribution uses the canonical finance hospital when available.</p>
        {(workspace.hospitalPerformance || []).length ? <div className="phase8d-table"><div className="phase8d-table-head"><span>Hospital</span><span>Assigned</span><span>Plans</span><span>Treatment-stage</span><span>Revenue</span><span>Net contribution</span></div>{workspace.hospitalPerformance.map(row => <div className="phase8d-table-row" key={row.hospitalId}><span><strong>{row.name}</strong><small>{row.country || 'Country not recorded'} · {row.contractStatus.replaceAll('_',' ')}</small></span><span>{row.assignedCases}</span><span>{row.treatmentPlanCases}<small>{pct(row.treatmentPlanRate)}</small></span><span>{row.treatmentStageCases}<small>{pct(row.treatmentStageRate)}</small></span><span>{money(row.revenue, currency)}</span><span className={contributionClass(row.netContribution)}>{money(row.netContribution, currency)}</span></div>)}</div> : <Empty>No published hospital performance is available yet.</Empty>}
        <div className="phase8d-bars">{workspace.hospitalPerformance.slice(0, 6).map(row => <PerformanceBar key={row.hospitalId} label={row.name} value={row.revenue} max={maxHospitalRevenue} currency={currency} />)}</div>
      </section>}

      {tab === 'affiliates' && <section className="portal-card phase8d-table-card">
        <div className="portal-card-heading"><div><span className="eyebrow">AFFILIATE ECONOMICS</span><h2>Revenue versus referral cost.</h2></div><Handshake size={21}/></div>
        <p className="phase8d-explain">Affiliate ROI = (recorded CareAtlas revenue − affiliate commission) ÷ affiliate commission. It is calculated only from commission ledgers in the selected currency.</p>
        {(workspace.affiliatePerformance || []).length ? <div className="phase8d-table phase8d-affiliate-table"><div className="phase8d-table-head"><span>Partner</span><span>Referrals</span><span>Treatment verified</span><span>CareAtlas revenue</span><span>Commission</span><span>ROI</span></div>{workspace.affiliatePerformance.map(row => <div className="phase8d-table-row" key={row.partnerId}><span><strong>{row.name}</strong><small>{row.partnerId}</small></span><span>{row.referrals}</span><span>{row.treatmentVerified}</span><span>{money(row.revenue, currency)}</span><span>{money(row.commissionCost, currency)}<small>{row.revenuePerCommission ? `${row.revenuePerCommission}× revenue / commission` : '—'}</small></span><span className={contributionClass(row.retainedRevenue)}>{pct(row.roiPct)}<small>{money(row.retainedRevenue, currency)} retained</small></span></div>)}</div> : <Empty>No affiliate commission economics exist in {currency} yet.</Empty>}
      </section>}

      {tab === 'stays' && <section className="portal-card phase8d-table-card">
        <div className="portal-card-heading"><div><span className="eyebrow">STAY NETWORK ECONOMICS</span><h2>Booking value, commission and settlement.</h2></div><BedDouble size={21}/></div>
        {(workspace.stayPerformance || []).length ? <div className="phase8d-table phase8d-stay-table"><div className="phase8d-table-head"><span>Stay partner</span><span>Completed</span><span>Room nights</span><span>GBV</span><span>CareAtlas revenue</span><span>Pending hotel settlement</span></div>{workspace.stayPerformance.map(row => <div className="phase8d-table-row" key={row.hotelId}><span><strong>{row.name}</strong><small>{row.country || 'Country not recorded'}</small></span><span>{row.completedStays}</span><span>{row.roomNights}</span><span>{money(row.grossBookingValue, currency)}</span><span>{money(row.revenue, currency)}<small>{pct(row.effectiveCommissionRatePct)} effective commission</small></span><span>{money(row.pendingSettlement, currency)}<small>{money(row.settledToHotel, currency)} settled</small></span></div>)}</div> : <Empty>No completed stay economics exist in {currency} yet.</Empty>}
      </section>}

      {tab === 'destinations' && <section className="portal-card phase8d-table-card">
        <div className="portal-card-heading"><div><span className="eyebrow">DESTINATION ECONOMICS</span><h2>Where the business is contributing.</h2></div><MapPinned size={21}/></div>
        {(workspace.destinationPerformance || []).length ? <><div className="phase8d-table phase8d-destination-table"><div className="phase8d-table-head"><span>Destination</span><span>Cases</span><span>Case revenue</span><span>Stay revenue</span><span>Affiliate cost</span><span>Net contribution</span></div>{workspace.destinationPerformance.map(row => <div className="phase8d-table-row" key={row.country}><span><strong>{row.country}</strong></span><span>{row.cases}</span><span>{money(row.caseRevenue, currency)}</span><span>{money(row.stayRevenue, currency)}</span><span>{money(row.affiliateCost, currency)}</span><span className={contributionClass(row.netContribution)}>{money(row.netContribution, currency)}</span></div>)}</div><div className="phase8d-bars">{workspace.destinationPerformance.slice(0, 6).map(row => <PerformanceBar key={row.country} label={row.country} value={row.revenue} max={maxDestinationRevenue} currency={currency}/>)}</div></> : <Empty>No destination revenue is attributable in {currency} yet.</Empty>}
      </section>}

      {tab === 'treatments' && <section className="portal-card phase8d-table-card">
        <div className="portal-card-heading"><div><span className="eyebrow">TREATMENT-LINE ECONOMICS</span><h2>Demand, progression and contribution.</h2></div><Stethoscope size={21}/></div>
        {(workspace.treatmentPerformance || []).length ? <><div className="phase8d-table phase8d-treatment-table"><div className="phase8d-table-head"><span>Treatment</span><span>Cases</span><span>Treatment-stage</span><span>Revenue</span><span>Affiliate cost</span><span>Net contribution</span></div>{workspace.treatmentPerformance.map(row => <div className="phase8d-table-row" key={row.treatment}><span><strong>{row.treatment}</strong></span><span>{row.cases}</span><span>{row.treatmentStageCases}<small>{pct(row.treatmentStageRate)}</small></span><span>{money(row.revenue, currency)}<small>{money(row.stayRevenue, currency)} from stays</small></span><span>{money(row.affiliateCost, currency)}</span><span className={contributionClass(row.netContribution)}>{money(row.netContribution, currency)}</span></div>)}</div><div className="phase8d-bars">{workspace.treatmentPerformance.slice(0, 6).map(row => <PerformanceBar key={row.treatment} label={row.treatment} value={row.revenue} max={maxTreatmentRevenue} currency={currency}/>)}</div></> : <Empty>No treatment-line performance is available yet.</Empty>}
      </section>}

      {tab === 'finance' && <section className="portal-card phase8d-table-card">
        <div className="portal-card-heading"><div><span className="eyebrow">FINANCE COVERAGE QUEUE</span><h2>Treatment-stage cases needing canonical economics.</h2></div><BadgeDollarSign size={21}/></div>
        <p className="phase8d-explain">Open a case to record the actual CareAtlas revenue, direct cost, hospital attribution and currency. Affiliate-ledger fallback keeps existing referral economics visible but should be replaced with a canonical case finance record.</p>
        {(workspace.financeQueue || []).length ? <div className="phase8d-finance-queue">{workspace.financeQueue.map(row => <article key={row.caseId} className={row.needsCanonicalFinance ? 'needs' : 'covered'}><div><strong>{row.caseNumber}</strong><span>{row.treatmentName} · {row.patientCountry || 'Country not set'}</span></div><div><i>{row.financeStatusLabel}</i>{row.currency && <small>{money(row.revenue, row.currency)}</small>}</div><Link className="text-button" href={`/admin/cases/case?id=${encodeURIComponent(row.caseId)}`}>Open case →</Link></article>)}</div> : <Empty>No treatment-stage cases exist yet.</Empty>}
      </section>}

      <div className="phase8d-footer"><ShieldCheck size={15}/><span>Engine {workspace.algorithmVersion}. Recorded revenue is not estimated from hospital pricing. Cross-currency totals are intentionally disabled until a controlled FX/accounting layer is introduced.</span></div>
    </>}
  </AdminShell>;
}
