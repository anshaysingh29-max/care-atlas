'use client';

import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Send, ShieldCheck } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';
import { useAuth } from '@/components/AuthProvider';
import { formatMessageTimestamp, getHospitalMessages, sendHospitalMessage } from '@/lib/firebase/communications';
import { getHospitalCases } from '@/lib/firebase/hospital';

export default function HospitalMessagesClient() {
  const { userProfile } = useAuth();
  const [cases, setCases] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedCase = useMemo(() => cases.find(item => item.id === selectedCaseId) || cases[0] || null, [cases, selectedCaseId]);
  const visible = useMemo(() => messages.filter(item => item.caseId === selectedCase?.id), [messages, selectedCase?.id]);

  async function load() {
    if (!userProfile?.hospitalId) return;
    setLoading(true);
    setError('');
    try {
      const caseRows = await getHospitalCases(userProfile.hospitalId);
      setCases(caseRows);
      const initialCaseId = selectedCaseId || caseRows[0]?.id || '';
      if (!selectedCaseId && initialCaseId) setSelectedCaseId(initialCaseId);
      setMessages(initialCaseId ? await getHospitalMessages(userProfile.hospitalId, initialCaseId) : []);
    } catch (loadError) {
      setError(loadError?.message || 'Could not load hospital messages.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (userProfile?.hospitalId) load(); }, [userProfile?.hospitalId]);

  useEffect(() => {
    if (!userProfile?.hospitalId || !selectedCaseId) return;
    getHospitalMessages(userProfile.hospitalId, selectedCaseId)
      .then(setMessages)
      .catch(loadError => setError(loadError?.message || 'Could not load this hospital message thread.'));
  }, [userProfile?.hospitalId, selectedCaseId]);

  async function send(event) {
    event.preventDefault();
    if (!selectedCase || !text.trim()) return;
    setBusy(true);
    setError('');
    try {
      await sendHospitalMessage({ caseId: selectedCase.id, hospitalId: userProfile.hospitalId, body: text });
      setText('');
      setMessages(await getHospitalMessages(userProfile.hospitalId, selectedCase.id));
    } catch (sendError) {
      setError(sendError?.message || 'Could not send hospital message.');
    } finally {
      setBusy(false);
    }
  }

  return <HospitalShell title="Patient messages" subtitle="Communicate only within CareAtlas cases assigned to your hospital.">
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
    <div className="message-layout phase6f-message-layout">
      <aside className="conversation-list"><span className="eyebrow">ASSIGNED CASES</span>{loading ? <div className="phase6f-thread-loading"><LoaderCircle className="spin" size={18}/></div> : cases.length ? cases.map(item => <button key={item.id} type="button" className={`conversation ${selectedCase?.id === item.id ? 'active' : ''}`} onClick={() => setSelectedCaseId(item.id)}><div className="coordinator-avatar small">{(item.patientName || 'P').slice(0, 1)}</div><div><strong>{item.caseNumber || item.id}</strong><span>{item.patientName || 'Patient'}</span><small>{item.treatmentName || 'Treatment case'}</small></div></button>) : <p className="phase6f-thread-empty">No assigned cases.</p>}</aside>
      <section className="chat-panel"><header><div className="coordinator-avatar small">H</div><div><strong>{selectedCase?.patientName || 'Patient thread'}</strong><span>{selectedCase?.caseNumber || 'Choose an assigned case'}</span></div><div className="secure-chat"><ShieldCheck size={15}/> Assigned-case only</div></header><div className="chat-messages phase6f-chat-messages">{visible.length ? visible.map(item => <div key={item.id} className={`chat-bubble ${item.senderRole === 'patient' ? 'patient' : 'coordinator'}`}><strong>{item.senderName || item.senderRole}</strong><p>{item.body}</p><small>{formatMessageTimestamp(item.createdAt)}</small></div>) : <div className="phase6f-chat-empty">No hospital messages for this case yet.</div>}</div><form className="chat-composer" onSubmit={send}><input disabled={busy || !selectedCase} value={text} maxLength={4000} onChange={event => setText(event.target.value)} placeholder="Write a case-related message…"/><button className="button" disabled={busy || !selectedCase || !text.trim()} type="submit">{busy ? <LoaderCircle className="spin" size={16}/> : <Send size={16}/>} Send</button></form><p className="chat-disclaimer">The patient must enable CareAtlas messaging consent before new messages can be sent.</p></section>
    </div>
  </HospitalShell>;
}
