'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileCheck2, LoaderCircle, ShieldCheck } from 'lucide-react';
import PatientShell from '@/components/PatientShell';
import { useAuth } from '@/components/AuthProvider';
import { getPatientCases } from '@/lib/firebase/cases';
import {
  CONSENT_DEFINITIONS,
  CONSENT_VERSION,
  formatConsentTimestamp,
  getPatientCaseConsentState,
  getPatientConsentEvents,
  savePatientCaseConsents
} from '@/lib/firebase/consents';

const EMPTY = {
  medicalDataProcessing: false,
  hospitalSharing: false,
  careCoordinationMessaging: false
};

export default function PatientConsentsClient() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [state, setState] = useState(EMPTY);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCase = useMemo(() => cases.find(item => item.id === selectedCaseId) || cases[0] || null, [cases, selectedCaseId]);
  const caseEvents = useMemo(() => events.filter(item => item.caseId === selectedCase?.id), [events, selectedCase?.id]);

  async function loadBase() {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [caseRows, eventRows] = await Promise.all([
        getPatientCases(user.uid),
        getPatientConsentEvents(user.uid)
      ]);
      setCases(caseRows);
      setEvents(eventRows);
      if (!selectedCaseId && caseRows.length) setSelectedCaseId(caseRows[0].id);
    } catch (loadError) {
      setError(loadError?.message || 'Could not load consent settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (user) loadBase(); }, [user]);

  useEffect(() => {
    if (!selectedCase?.id || !user) return;
    let active = true;
    getPatientCaseConsentState(selectedCase.id, user.uid)
      .then(row => {
        if (!active) return;
        setState({
          medicalDataProcessing: Boolean(row?.medicalDataProcessing),
          hospitalSharing: Boolean(row?.hospitalSharing),
          careCoordinationMessaging: Boolean(row?.careCoordinationMessaging),
          updatedAt: row?.updatedAt || null
        });
      })
      .catch(loadError => active && setError(loadError?.message || 'Could not load this case consent.'));
    return () => { active = false; };
  }, [selectedCase?.id, user]);

  async function save() {
    if (!selectedCase) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await savePatientCaseConsents({ caseId: selectedCase.id, decisions: state });
      setState(prev => ({ ...prev, ...updated }));
      const eventRows = await getPatientConsentEvents(user.uid);
      setEvents(eventRows);
      setNotice('Your consent choices were saved. Each change is recorded as an immutable consent event.');
    } catch (saveError) {
      setError(saveError?.message || 'Could not save consent choices.');
    } finally {
      setSaving(false);
    }
  }

  return <PatientShell title="Consent & privacy" subtitle="Control how CareAtlas processes and shares information for each treatment case." caseNumber={selectedCase?.caseNumber}>
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
    {notice && <div className="document-alert success"><FileCheck2 size={17}/><span>{notice}</span></div>}

    <section className="portal-card phase6f-consent-card">
      <div className="portal-card-heading"><div><span className="eyebrow">CASE CONSENT</span><h2>Explicit, versioned permission.</h2></div><span className="phase6f-version">{CONSENT_VERSION}</span></div>
      {loading ? <div className="document-loading"><LoaderCircle className="spin" size={20}/> Loading consent state…</div> : cases.length ? <>
        <label className="field-label phase6f-consent-case"><span>CareAtlas case</span><select value={selectedCase?.id || ''} onChange={event => setSelectedCaseId(event.target.value)}>{cases.map(item => <option key={item.id} value={item.id}>{item.caseNumber} · {item.treatmentName}</option>)}</select></label>
        <div className="phase6f-consent-list">
          {CONSENT_DEFINITIONS.map(definition => <label key={definition.key} className={state[definition.key] ? 'accepted' : ''}>
            <input type="checkbox" checked={Boolean(state[definition.key])} onChange={event => setState(prev => ({ ...prev, [definition.key]: event.target.checked }))}/>
            <span><strong>{definition.title}</strong><small>{definition.text}</small></span>
          </label>)}
        </div>
        <div className="phase6f-consent-actions"><button className="button" type="button" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="spin" size={16}/> : <ShieldCheck size={16}/>} {saving ? 'Saving…' : 'Save consent choices'}</button><small>Last updated: {formatConsentTimestamp(state.updatedAt)}</small></div>
      </> : <div className="empty-documents"><ShieldCheck size={27}/><h3>Create a treatment case first.</h3><p>Consent is recorded per case so access can be tied to a specific medical-travel request.</p></div>}
    </section>

    <section className="portal-card">
      <div className="portal-card-heading"><div><span className="eyebrow">CONSENT HISTORY</span><h2>Immutable decision log.</h2></div></div>
      <div className="phase6f-consent-history">{caseEvents.length ? caseEvents.map(item => <article key={item.id}><span className={item.decision === 'accepted' ? 'accepted' : 'withdrawn'}>{item.decision}</span><div><strong>{item.consentType?.replaceAll('_', ' ')}</strong><small>{formatConsentTimestamp(item.createdAt)} · {item.version}</small></div></article>) : <p>No consent decisions have been recorded for this case yet.</p>}</div>
    </section>
  </PatientShell>;
}
