'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle, Send, ShieldCheck } from 'lucide-react';
import { formatMessageTimestamp, getStaffCaseMessages, sendStaffMessage } from '@/lib/firebase/communications';

export default function AdminCaseMessagingPanel({ caseId, suggestedDraft = null }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draftInserted, setDraftInserted] = useState(false);

  async function load() {
    if (!caseId) return;
    setLoading(true);
    try {
      const rows = await getStaffCaseMessages(caseId);
      setMessages(rows.filter(item => !item.hospitalId));
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Could not load case messages.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [caseId]);

  useEffect(() => {
    if (!suggestedDraft?.text) return;
    setText(suggestedDraft.text);
    setDraftInserted(true);
  }, [suggestedDraft]);

  async function send(event) {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      await sendStaffMessage({ caseId, body: text });
      setText('');
      await load();
    } catch (sendError) {
      setError(sendError?.message || 'Could not send CareAtlas message.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="portal-card phase6f-admin-messaging"><div className="portal-card-heading"><div><span className="eyebrow">PATIENT MESSAGING</span><h2>CareAtlas coordination thread.</h2></div><ShieldCheck size={20}/></div>{error && <div className="document-alert error"><ShieldCheck size={16}/><span>{error}</span></div>}{draftInserted && <div className="phase8b-draft-inserted"><ShieldCheck size={14}/><span>Copilot draft inserted. Review it against the full case before sending.</span><button type="button" onClick={() => setDraftInserted(false)}>Dismiss</button></div>}<div className="phase6f-admin-message-list">{loading ? <div className="document-loading"><LoaderCircle className="spin" size={18}/> Loading messages…</div> : messages.length ? messages.map(item => <article key={item.id} className={item.senderRole === 'patient' ? 'patient' : 'staff'}><div><strong>{item.senderName || item.senderRole}</strong><small>{formatMessageTimestamp(item.createdAt)}</small></div><p>{item.body}</p></article>) : <p>No CareAtlas-team messages yet.</p>}</div><form className="phase6f-admin-message-form" onSubmit={send}><textarea rows="3" maxLength={4000} value={text} onChange={event => setText(event.target.value)} placeholder="Send a case update to the patient…"/><button className="button" type="submit" disabled={busy || !text.trim()}>{busy ? <LoaderCircle className="spin" size={16}/> : <Send size={16}/>} Send message</button></form><small className="phase6f-helper">Sending creates a patient notification and an audit event. Patient messaging consent is required.</small></section>;
}
