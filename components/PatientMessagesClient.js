'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LoaderCircle, Send, ShieldCheck } from 'lucide-react';
import PatientShell from '@/components/PatientShell';
import { useAuth } from '@/components/AuthProvider';
import { hospitals } from '@/lib/data';
import { getPatientCases } from '@/lib/firebase/cases';
import { getPatientCaseConsentState, hasMessagingConsent } from '@/lib/firebase/consents';
import { formatMessageTimestamp, getPatientMessages, sendPatientMessage } from '@/lib/firebase/communications';

export default function PatientMessagesClient() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [target, setTarget] = useState('careatlas');
  const [consent, setConsent] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedCase = useMemo(() => cases.find(item => item.id === selectedCaseId) || cases[0] || null, [cases, selectedCaseId]);
  const threadHospitalId = target === 'careatlas' ? '' : target;
  const visible = useMemo(() => messages.filter(item => item.caseId === selectedCase?.id && (threadHospitalId ? item.hospitalId === threadHospitalId : !item.hospitalId)), [messages, selectedCase?.id, threadHospitalId]);

  function hospitalName(slug) {
    return hospitals.find(item => item.slug === slug)?.name || slug;
  }

  async function load() {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [caseRows, messageRows] = await Promise.all([getPatientCases(user.uid), getPatientMessages(user.uid)]);
      setCases(caseRows);
      setMessages(messageRows);
      if (!selectedCaseId && caseRows.length) setSelectedCaseId(caseRows[0].id);
    } catch (loadError) {
      setError(loadError?.message || 'Could not load CareAtlas messages.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    if (!selectedCase?.id || !user) return;
    getPatientCaseConsentState(selectedCase.id, user.uid).then(setConsent).catch(() => setConsent(null));
    setTarget('careatlas');
  }, [selectedCase?.id, user]);

  async function send(event) {
    event.preventDefault();
    if (!text.trim() || !selectedCase) return;
    setBusy(true);
    setError('');
    try {
      await sendPatientMessage({ caseId: selectedCase.id, hospitalId: threadHospitalId, body: text });
      setText('');
      setMessages(await getPatientMessages(user.uid));
    } catch (sendError) {
      setError(sendError?.message || 'Could not send message.');
    } finally {
      setBusy(false);
    }
  }

  const messagingEnabled = hasMessagingConsent(consent);

  return <PatientShell title="Messages" subtitle="Keep case coordination with CareAtlas and assigned hospitals in one secured thread." caseNumber={selectedCase?.caseNumber}>
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
    {!messagingEnabled && selectedCase && <div className="permission-banner phase6f-message-consent"><ShieldCheck size={18}/><div><strong>Messaging consent required</strong><span>Enable care coordination messaging before sending or receiving new case messages.</span></div><Link href="/patient/consents" className="text-button">Manage consent</Link></div>}

    <div className="message-layout phase6f-message-layout">
      <aside className="conversation-list">
        <span className="eyebrow">CONVERSATIONS</span>
        {loading ? <div className="phase6f-thread-loading"><LoaderCircle className="spin" size={18}/></div> : cases.length ? <>
          <label className="field-label"><span>Case</span><select value={selectedCase?.id || ''} onChange={event => setSelectedCaseId(event.target.value)}>{cases.map(item => <option key={item.id} value={item.id}>{item.caseNumber}</option>)}</select></label>
          <button className={`conversation ${target === 'careatlas' ? 'active' : ''}`} type="button" onClick={() => setTarget('careatlas')}><div className="coordinator-avatar small">CA</div><div><strong>CareAtlas team</strong><span>Care coordination</span><small>Case thread</small></div></button>
          {(selectedCase?.assignedHospitalIds || []).map(slug => <button key={slug} className={`conversation ${target === slug ? 'active' : ''}`} type="button" onClick={() => setTarget(slug)}><div className="coordinator-avatar small">H</div><div><strong>{hospitalName(slug)}</strong><span>Assigned hospital</span><small>Clinical coordination</small></div></button>)}
        </> : <p className="phase6f-thread-empty">Create a treatment case first.</p>}
      </aside>
      <section className="chat-panel">
        <header><div className="coordinator-avatar small">{target === 'careatlas' ? 'CA' : 'H'}</div><div><strong>{target === 'careatlas' ? 'CareAtlas team' : hospitalName(target)}</strong><span>{target === 'careatlas' ? 'Care coordinator thread' : 'Assigned hospital thread'}</span></div><div className="secure-chat"><ShieldCheck size={15}/> Firestore secured</div></header>
        <div className="chat-messages phase6f-chat-messages">{visible.length ? visible.map(item => <div key={item.id} className={`chat-bubble ${item.senderRole === 'patient' ? 'patient' : 'coordinator'}`}><strong>{item.senderName || item.senderRole}</strong><p>{item.body}</p><small>{formatMessageTimestamp(item.createdAt)}</small></div>) : <div className="phase6f-chat-empty">No messages in this thread yet.</div>}</div>
        <form className="chat-composer" onSubmit={send}><input disabled={!messagingEnabled || busy || !selectedCase} value={text} maxLength={4000} onChange={event => setText(event.target.value)} placeholder={messagingEnabled ? 'Write a case message…' : 'Enable messaging consent first'}/><button className="button" disabled={!messagingEnabled || busy || !text.trim()} type="submit">{busy ? <LoaderCircle className="spin" size={16}/> : <Send size={16}/>} Send</button></form>
        <p className="chat-disclaimer">Messages are stored in Firestore with role-based case access. Do not use chat for emergencies.</p>
      </section>
    </div>
  </PatientShell>;
}
