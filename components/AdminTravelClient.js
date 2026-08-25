'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Car, Loader2, Plane, Route, Save, ShieldCheck } from 'lucide-react';
import AdminShell from '@/components/AdminShell';
import { formatTravelDate, formatTravelMoney, travelRequestLabel } from '@/lib/firebase/travel';
import {
  createAdminItineraryEvent,
  getAdminTravelDashboard,
  ITINERARY_EVENT_STATUSES,
  ITINERARY_EVENT_TYPES,
  updateAdminTravelRequest
} from '@/lib/firebase/travelAdmin';

const itineraryDefaults = {
  caseId: '',
  eventType: 'airport_pickup',
  title: '',
  eventDate: '',
  eventTime: '',
  location: '',
  note: '',
  status: 'confirmed'
};

const requestStatuses = ['requested', 'in_review', 'documents_needed', 'arranged', 'confirmed', 'completed', 'declined', 'cancelled'];

function initialDraft(row) {
  return {
    status: row.status || 'requested',
    providerName: row.providerName || '',
    confirmationReference: row.confirmationReference || '',
    estimatedAmount: row.estimatedAmount ?? '',
    currency: row.currency || 'INR',
    adminNote: row.adminNote || '',
    destinationCountry: row.destinationCountry || '',
    originCity: row.originCity || '',
    destinationCity: row.destinationCity || '',
    travelDate: row.travelDate || '',
    travelTime: row.travelTime || '',
    arrivalAirport: row.arrivalAirport || '',
    arrivalDate: row.arrivalDate || '',
    arrivalTime: row.arrivalTime || '',
    airline: row.airline || '',
    flightNumber: row.flightNumber || ''
  };
}

export default function AdminTravelClient() {
  const [data, setData] = useState({ requests: [], profiles: [], events: [], cases: [], openRequests: 0, visaRequests: 0, transportRequests: 0, flightRequests: 0 });
  const [drafts, setDrafts] = useState({});
  const [filters, setFilters] = useState({ status: 'open', type: 'all' });
  const [eventForm, setEventForm] = useState(itineraryDefaults);
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const next = await getAdminTravelDashboard();
    setData(next);
    setEventForm(current => ({ ...current, caseId: current.caseId || next.cases[0]?.id || '' }));
  }

  useEffect(() => { load().catch(error => setMessage(error?.message || 'Unable to load travel operations.')); }, []);

  const visibleRequests = useMemo(() => data.requests.filter(row => {
    const statusMatch = filters.status === 'all'
      || (filters.status === 'open' && !['completed', 'declined', 'cancelled'].includes(row.status))
      || row.status === filters.status;
    const typeMatch = filters.type === 'all' || row.requestType === filters.type;
    return statusMatch && typeMatch;
  }), [data.requests, filters]);

  function draftFor(row) { return drafts[row.id] || initialDraft(row); }
  function patchDraft(id, key, value) { setDrafts(current => ({ ...current, [id]: { ...(current[id] || initialDraft(data.requests.find(item => item.id === id) || {})), [key]: value } })); }

  async function saveRequest(row) {
    setWorking(row.id);
    setMessage('');
    try {
      await updateAdminTravelRequest({ requestId: row.id, ...draftFor(row) });
      setMessage(`${travelRequestLabel(row.requestType)} updated for ${row.caseNumber}.`);
      setDrafts(current => { const next = { ...current }; delete next[row.id]; return next; });
      await load();
    } catch (error) {
      setMessage(error?.message || 'Unable to update travel request.');
    } finally {
      setWorking('');
    }
  }

  async function addItineraryEvent(event) {
    event.preventDefault();
    setWorking('itinerary');
    setMessage('');
    try {
      await createAdminItineraryEvent(eventForm);
      setMessage('Itinerary event added and the patient was notified.');
      setEventForm(current => ({ ...itineraryDefaults, caseId: current.caseId }));
      await load();
    } catch (error) {
      setMessage(error?.message || 'Unable to add itinerary event.');
    } finally {
      setWorking('');
    }
  }

  return (
    <AdminShell title="Travel concierge" subtitle="Coordinate visa support, flights, airport pickup, local transport and patient itineraries.">
      {message && <div className={message.includes('updated') || message.includes('added') ? 'phase7e-form-success' : 'phase7e-form-error'}>{message}</div>}

      <div className="phase7e-admin-stats">
        <div><ShieldCheck size={20}/><strong>{data.visaRequests}</strong><span>Open visa requests</span></div>
        <div><Plane size={20}/><strong>{data.flightRequests}</strong><span>Open flight requests</span></div>
        <div><Car size={20}/><strong>{data.transportRequests}</strong><span>Open ground transport</span></div>
        <div><Route size={20}/><strong>{data.openRequests}</strong><span>Total open requests</span></div>
      </div>

      <section className="portal-card phase7e-admin-controls">
        <div><span className="eyebrow">REQUEST QUEUE</span><h2>Travel operations</h2></div>
        <label>Status<select value={filters.status} onChange={e => setFilters(v => ({ ...v, status: e.target.value }))}><option value="open">Open only</option><option value="all">All statuses</option>{requestStatuses.map(item => <option value={item} key={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
        <label>Service<select value={filters.type} onChange={e => setFilters(v => ({ ...v, type: e.target.value }))}><option value="all">All services</option><option value="visa_assistance">Visa assistance</option><option value="flight_assistance">Flight assistance</option><option value="airport_pickup">Airport pickup</option><option value="local_transport">Local transport</option></select></label>
      </section>

      <div className="phase7e-admin-request-list">
        {visibleRequests.map(row => {
          const draft = draftFor(row);
          return <section className="portal-card phase7e-admin-request" key={row.id}>
            <div className="phase7e-admin-request-head"><div><span className="eyebrow">{row.caseNumber}</span><h2>{travelRequestLabel(row.requestType)}</h2><p>{row.patientAlias} · {row.destinationCountry || row.destinationCity || row.arrivalAirport || 'Destination pending'}</p></div><i className={`phase7e-status ${['arranged','confirmed','completed'].includes(row.status) ? 'positive' : ['declined','cancelled'].includes(row.status) ? 'negative' : 'pending'}`}>{row.status.replaceAll('_', ' ')}</i></div>

            <div className="phase7e-admin-request-summary">
              <div><small>TRAVEL</small><strong>{row.travelDate ? formatTravelDate(row.travelDate) : row.arrivalDate ? formatTravelDate(row.arrivalDate) : 'Flexible'}</strong></div>
              <div><small>ROUTE</small><strong>{[row.originCity, row.destinationCity].filter(Boolean).join(' → ') || row.arrivalAirport || row.destinationCountry || '—'}</strong></div>
              <div><small>TRAVELLERS</small><strong>{row.passengers || 1}</strong></div>
              <div><small>ACCESSIBILITY</small><strong>{row.mobilitySupport ? 'Requested' : 'Not requested'}</strong></div>
            </div>
            {row.note && <div className="phase7e-privacy-note"><strong>Patient travel note</strong><span>{row.note}</span></div>}

            <div className="phase7e-admin-request-form">
              <label>Status<select value={draft.status} onChange={e => patchDraft(row.id, 'status', e.target.value)}>{requestStatuses.map(item => <option value={item} key={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
              <label>Provider / operator<input value={draft.providerName} onChange={e => patchDraft(row.id, 'providerName', e.target.value)} placeholder="CareAtlas desk / transport operator" /></label>
              <label>Confirmation reference<input value={draft.confirmationReference} onChange={e => patchDraft(row.id, 'confirmationReference', e.target.value)} placeholder="Booking / vehicle reference" /></label>
              <label>Estimate<input type="number" min="0" value={draft.estimatedAmount} onChange={e => patchDraft(row.id, 'estimatedAmount', e.target.value)} /></label>
              <label>Currency<input value={draft.currency} maxLength="8" onChange={e => patchDraft(row.id, 'currency', e.target.value.toUpperCase())} /></label>
              {row.requestType === 'flight_assistance' && <><label>Airline<input value={draft.airline} onChange={e => patchDraft(row.id, 'airline', e.target.value)} /></label><label>Flight number<input value={draft.flightNumber} onChange={e => patchDraft(row.id, 'flightNumber', e.target.value)} /></label><label>Departure date<input type="date" value={draft.travelDate} onChange={e => patchDraft(row.id, 'travelDate', e.target.value)} /></label><label>Departure time<input type="time" value={draft.travelTime} onChange={e => patchDraft(row.id, 'travelTime', e.target.value)} /></label></>}
              {row.requestType === 'airport_pickup' && <><label>Arrival airport<input value={draft.arrivalAirport} onChange={e => patchDraft(row.id, 'arrivalAirport', e.target.value)} /></label><label>Arrival date<input type="date" value={draft.arrivalDate} onChange={e => patchDraft(row.id, 'arrivalDate', e.target.value)} /></label><label>Arrival time<input type="time" value={draft.arrivalTime} onChange={e => patchDraft(row.id, 'arrivalTime', e.target.value)} /></label></>}
              <label className="phase7e-admin-note">Patient-visible operations note<textarea rows="2" value={draft.adminNote} onChange={e => patchDraft(row.id, 'adminNote', e.target.value)} placeholder="Documents required, driver details, next step..." /></label>
            </div>
            <button className="button" onClick={() => saveRequest(row)} disabled={working !== ''}>{working === row.id ? <Loader2 size={15} className="phase7e-spin"/> : <Save size={15}/>} Save travel update</button>
          </section>;
        })}
        {!visibleRequests.length && <section className="portal-card"><h2>No travel requests match this filter.</h2></section>}
      </div>

      <div className="phase7e-admin-itinerary-grid">
        <form className="portal-card phase7e-admin-itinerary-form" onSubmit={addItineraryEvent}>
          <div className="portal-card-heading"><div><span className="eyebrow">ITINERARY BUILDER</span><h2>Add a coordinated event</h2></div><CalendarPlus size={23}/></div>
          <label>Patient case<select value={eventForm.caseId} onChange={e => setEventForm(v => ({ ...v, caseId: e.target.value }))} required>{data.cases.map(item => <option value={item.id} key={item.id}>{item.caseNumber} · {item.patientName || item.patientEmail || 'Patient'}</option>)}</select></label>
          <div className="phase7e-form-grid">
            <label>Event type<select value={eventForm.eventType} onChange={e => setEventForm(v => ({ ...v, eventType: e.target.value }))}>{ITINERARY_EVENT_TYPES.map(item => <option value={item} key={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
            <label>Status<select value={eventForm.status} onChange={e => setEventForm(v => ({ ...v, status: e.target.value }))}>{ITINERARY_EVENT_STATUSES.map(item => <option value={item} key={item}>{item}</option>)}</select></label>
            <label>Date<input type="date" value={eventForm.eventDate} onChange={e => setEventForm(v => ({ ...v, eventDate: e.target.value }))} required /></label>
            <label>Time<input type="time" value={eventForm.eventTime} onChange={e => setEventForm(v => ({ ...v, eventTime: e.target.value }))} /></label>
          </div>
          <label>Title<input value={eventForm.title} onChange={e => setEventForm(v => ({ ...v, title: e.target.value }))} placeholder="Airport pickup to CareAtlas Stay" required /></label>
          <label>Location<input value={eventForm.location} onChange={e => setEventForm(v => ({ ...v, location: e.target.value }))} placeholder="Delhi Airport Terminal 3" /></label>
          <label>Patient-visible note<textarea rows="3" value={eventForm.note} onChange={e => setEventForm(v => ({ ...v, note: e.target.value }))} placeholder="Meeting point, coordinator instructions, what to carry..." /></label>
          <button className="button" disabled={working !== ''}>{working === 'itinerary' ? <Loader2 size={15} className="phase7e-spin"/> : <CalendarPlus size={15}/>} Add itinerary event</button>
        </form>

        <section className="portal-card phase7e-admin-events">
          <span className="eyebrow">UPCOMING ITINERARY EVENTS</span><h2>{data.events.filter(item => item.status !== 'cancelled').length} CareAtlas events</h2>
          <div>{data.events.filter(item => item.status !== 'cancelled').slice(0, 14).map(row => <article key={row.id}><div><strong>{row.title}</strong><span>{row.caseNumber} · {formatTravelDate(row.eventDate)} {row.eventTime}</span><small>{row.location}</small></div><i>{row.status}</i></article>)}{!data.events.length && <p>No custom itinerary events yet. Confirmed hotel stays and hospital consultations appear automatically on the patient itinerary without being duplicated here.</p>}</div>
        </section>
      </div>
    </AdminShell>
  );
}
