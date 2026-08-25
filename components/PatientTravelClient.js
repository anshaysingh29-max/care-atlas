'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Plane,
  Route,
  ShieldCheck,
  Suitcase,
  XCircle
} from 'lucide-react';
import PatientShell from '@/components/PatientShell';
import { useAuth } from '@/components/AuthProvider';
import { getPatientCases } from '@/lib/firebase/cases';
import {
  cancelPatientTravelRequest,
  createPatientTravelRequest,
  formatTravelDate,
  formatTravelMoney,
  getPatientTravelItinerary,
  getPatientTravelProfile,
  getPatientTravelRequests,
  savePatientTravelProfile,
  travelRequestLabel
} from '@/lib/firebase/travel';

const requestDefaults = {
  requestType: 'visa_assistance',
  destinationCountry: '',
  originCity: '',
  destinationCity: '',
  travelDate: '',
  travelTime: '',
  arrivalAirport: '',
  arrivalDate: '',
  arrivalTime: '',
  departureDate: '',
  airline: '',
  flightNumber: '',
  passengers: 1,
  mobilitySupport: false,
  note: ''
};

const services = [
  ['visa_assistance', 'Visa support', ShieldCheck, 'Track document readiness and ask CareAtlas for visa coordination.'],
  ['flight_assistance', 'Flights', Plane, 'Share preferred travel dates and request flight coordination.'],
  ['airport_pickup', 'Airport pickup', Car, 'Arrange an accessible pickup after your arrival.'],
  ['local_transport', 'Local transport', Route, 'Coordinate hotel, hospital and local transfers.']
];

function destinationFromCase(careCase) {
  const first = careCase?.preferredDestinationSlugs?.[0] || '';
  return first ? first.replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase()) : '';
}

function statusClass(status) {
  if (['arranged', 'confirmed', 'completed'].includes(status)) return 'positive';
  if (['declined', 'cancelled'].includes(status)) return 'negative';
  return 'pending';
}

export default function PatientTravelClient() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  const [profileForm, setProfileForm] = useState({ homeCity: '', destinationCountry: '', passportReady: false, companionCount: 0, mobilitySupport: false, notes: '' });
  const [requestForm, setRequestForm] = useState(requestDefaults);
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');

  const selectedCase = useMemo(() => cases.find(item => item.id === caseId) || cases[0] || null, [cases, caseId]);

  async function loadCases() {
    if (!user) return;
    const rows = await getPatientCases(user.uid);
    setCases(rows);
    if (!caseId && rows[0]?.id) setCaseId(rows[0].id);
  }

  async function loadCase(targetCaseId) {
    if (!targetCaseId) return;
    const careCase = cases.find(item => item.id === targetCaseId) || selectedCase;
    const [travelProfile, requestRows, itineraryRows] = await Promise.all([
      getPatientTravelProfile(targetCaseId),
      getPatientTravelRequests(targetCaseId),
      getPatientTravelItinerary(targetCaseId)
    ]);
    setProfile(travelProfile);
    setRequests(requestRows);
    setItinerary(itineraryRows);
    const destinationCountry = travelProfile?.destinationCountry || destinationFromCase(careCase);
    setProfileForm({
      homeCity: travelProfile?.homeCity || '',
      destinationCountry,
      passportReady: Boolean(travelProfile?.passportReady),
      companionCount: travelProfile?.companionCount || 0,
      mobilitySupport: Boolean(travelProfile?.mobilitySupport),
      notes: travelProfile?.notes || ''
    });
    setRequestForm(current => ({
      ...requestDefaults,
      requestType: current.requestType || 'visa_assistance',
      destinationCountry,
      originCity: travelProfile?.homeCity || '',
      mobilitySupport: Boolean(travelProfile?.mobilitySupport),
      passengers: Math.max(1, Number(travelProfile?.companionCount || 0) + 1)
    }));
  }

  useEffect(() => {
    loadCases().catch(error => setMessage(error?.message || 'Unable to load travel concierge.'));
  }, [user]);

  useEffect(() => {
    if (!caseId) return;
    loadCase(caseId).catch(error => setMessage(error?.message || 'Unable to load travel details.'));
  }, [caseId, cases.length]);

  async function saveProfile(event) {
    event.preventDefault();
    setWorking('profile');
    setMessage('');
    try {
      await savePatientTravelProfile({ caseId, ...profileForm });
      setMessage('Travel profile saved.');
      await loadCase(caseId);
    } catch (error) {
      setMessage(error?.message || 'Unable to save travel profile.');
    } finally {
      setWorking('');
    }
  }

  function startService(type) {
    setMessage('');
    setRequestForm(current => ({
      ...requestDefaults,
      requestType: type,
      destinationCountry: profileForm.destinationCountry,
      originCity: profileForm.homeCity,
      passengers: Math.max(1, Number(profileForm.companionCount || 0) + 1),
      mobilitySupport: profileForm.mobilitySupport
    }));
    document.getElementById('phase7e-request-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submitRequest(event) {
    event.preventDefault();
    setWorking('request');
    setMessage('');
    try {
      const id = await createPatientTravelRequest({ caseId, ...requestForm });
      setMessage(`Travel request ${id.slice(0, 8).toUpperCase()} submitted.`);
      setRequestForm(current => ({ ...requestDefaults, requestType: current.requestType, destinationCountry: profileForm.destinationCountry, originCity: profileForm.homeCity }));
      await loadCase(caseId);
    } catch (error) {
      setMessage(error?.message || 'Unable to submit travel request.');
    } finally {
      setWorking('');
    }
  }

  async function cancelRequest(id) {
    setWorking(id);
    setMessage('');
    try {
      await cancelPatientTravelRequest(id);
      setMessage('Travel request cancelled.');
      await loadCase(caseId);
    } catch (error) {
      setMessage(error?.message || 'Unable to cancel travel request.');
    } finally {
      setWorking('');
    }
  }

  if (!cases.length) {
    return <PatientShell title="Travel concierge" subtitle="Coordinate travel after creating a CareAtlas treatment case."><section className="portal-card"><h2>Create a treatment case first.</h2><p>Travel coordination is linked to a real CareAtlas case so your itinerary stays together.</p></section></PatientShell>;
  }

  const confirmedStay = itinerary.some(item => item.sourceType === 'stay');
  const openRequests = requests.filter(item => !['completed', 'declined', 'cancelled'].includes(item.status)).length;

  return (
    <PatientShell title="Travel concierge" subtitle="Coordinate visas, flights and ground travel around your treatment journey." caseNumber={selectedCase?.caseNumber}>
      {message && <div className={message.includes('saved') || message.includes('submitted') || message.includes('cancelled') ? 'phase7e-form-success' : 'phase7e-form-error'}>{message}</div>}

      <section className="portal-card phase7e-travel-hero">
        <div><span className="eyebrow">TRAVEL PREPARATION</span><h2>Your medical trip, in one place.</h2><p>CareAtlas can coordinate logistics without exposing your medical records to travel providers. Do not enter passport numbers, scans or clinical details here.</p></div>
        <Suitcase size={36}/>
      </section>

      {cases.length > 1 && <section className="portal-card phase7e-case-picker"><label>Treatment case<select value={caseId} onChange={event => setCaseId(event.target.value)}>{cases.map(item => <option value={item.id} key={item.id}>{item.caseNumber} · {item.treatmentName}</option>)}</select></label></section>}

      <div className="phase7e-readiness-grid">
        <div className="phase7e-readiness-card"><ShieldCheck size={20}/><strong>{profileForm.passportReady ? 'Ready' : 'Not marked ready'}</strong><span>Passport readiness</span></div>
        <div className="phase7e-readiness-card"><MapPin size={20}/><strong>{selectedCase?.assignedHospitalIds?.length || 0}</strong><span>Hospital partners assigned</span></div>
        <div className="phase7e-readiness-card"><BedDouble size={20}/><strong>{confirmedStay ? 'Confirmed' : 'Not confirmed'}</strong><span>Stay itinerary</span></div>
        <div className="phase7e-readiness-card"><Clock3 size={20}/><strong>{openRequests}</strong><span>Open travel requests</span></div>
      </div>

      <form className="portal-card phase7e-profile-form" onSubmit={saveProfile}>
        <div className="portal-card-heading"><div><span className="eyebrow">TRAVEL PROFILE</span><h2>Basic trip preferences</h2></div><ShieldCheck size={23}/></div>
        <div className="phase7e-form-grid">
          <label>Home / departure city<input value={profileForm.homeCity} onChange={e => setProfileForm(v => ({ ...v, homeCity: e.target.value }))} placeholder="London" /></label>
          <label>Destination country<input value={profileForm.destinationCountry} onChange={e => setProfileForm(v => ({ ...v, destinationCountry: e.target.value }))} placeholder="India" /></label>
          <label>Companions<input type="number" min="0" max="10" value={profileForm.companionCount} onChange={e => setProfileForm(v => ({ ...v, companionCount: e.target.value }))} /></label>
        </div>
        <div className="phase7e-check-row">
          <label><input type="checkbox" checked={profileForm.passportReady} onChange={e => setProfileForm(v => ({ ...v, passportReady: e.target.checked }))} /> I have a valid passport ready for travel</label>
          <label><input type="checkbox" checked={profileForm.mobilitySupport} onChange={e => setProfileForm(v => ({ ...v, mobilitySupport: e.target.checked }))} /> Mobility / accessible transport support may be needed</label>
        </div>
        <label>General travel note <small>No passport number, scans or medical diagnosis.</small><textarea rows="3" value={profileForm.notes} onChange={e => setProfileForm(v => ({ ...v, notes: e.target.value }))} placeholder="Preferred travel window, caregiver needs, luggage considerations..." /></label>
        <button className="button" disabled={working === 'profile'}>{working === 'profile' ? <Loader2 size={16} className="phase7e-spin"/> : <CheckCircle2 size={16}/>} Save travel profile</button>
      </form>

      <div className="phase7e-service-grid">
        {services.map(([type, title, Icon, copy]) => {
          const serviceRequests = requests.filter(item => item.requestType === type);
          const latest = serviceRequests[0];
          return <article className="portal-card phase7e-service-card" key={type}><div className="phase7e-service-icon"><Icon size={22}/></div><div><strong>{title}</strong><p>{copy}</p></div>{latest && <span className={`phase7e-status ${statusClass(latest.status)}`}>{latest.status.replaceAll('_', ' ')}</span>}<button className="button secondary" type="button" onClick={() => startService(type)}>{latest ? 'New request' : 'Request help'}</button></article>;
        })}
      </div>

      <form id="phase7e-request-form" className="portal-card phase7e-request-form" onSubmit={submitRequest}>
        <div className="portal-card-heading"><div><span className="eyebrow">NEW REQUEST</span><h2>{travelRequestLabel(requestForm.requestType)}</h2></div><Plane size={23}/></div>
        <div className="phase7e-form-grid">
          <label>Service<select value={requestForm.requestType} onChange={e => setRequestForm(v => ({ ...v, requestType: e.target.value }))}>{services.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          {requestForm.requestType === 'visa_assistance' && <label>Destination country<input value={requestForm.destinationCountry} onChange={e => setRequestForm(v => ({ ...v, destinationCountry: e.target.value }))} required /></label>}
          {['flight_assistance', 'local_transport'].includes(requestForm.requestType) && <><label>{requestForm.requestType === 'flight_assistance' ? 'Departure city' : 'Pickup location'}<input value={requestForm.originCity} onChange={e => setRequestForm(v => ({ ...v, originCity: e.target.value }))} required /></label><label>{requestForm.requestType === 'flight_assistance' ? 'Destination city' : 'Drop location'}<input value={requestForm.destinationCity} onChange={e => setRequestForm(v => ({ ...v, destinationCity: e.target.value }))} required /></label><label>Preferred date<input type="date" value={requestForm.travelDate} onChange={e => setRequestForm(v => ({ ...v, travelDate: e.target.value }))} required /></label><label>Preferred time<input type="time" value={requestForm.travelTime} onChange={e => setRequestForm(v => ({ ...v, travelTime: e.target.value }))} /></label></>}
          {requestForm.requestType === 'airport_pickup' && <><label>Arrival airport<input value={requestForm.arrivalAirport} onChange={e => setRequestForm(v => ({ ...v, arrivalAirport: e.target.value }))} placeholder="DEL / Delhi Airport" required /></label><label>Arrival date<input type="date" value={requestForm.arrivalDate} onChange={e => setRequestForm(v => ({ ...v, arrivalDate: e.target.value }))} required /></label><label>Arrival time<input type="time" value={requestForm.arrivalTime} onChange={e => setRequestForm(v => ({ ...v, arrivalTime: e.target.value }))} /></label><label>Airline<input value={requestForm.airline} onChange={e => setRequestForm(v => ({ ...v, airline: e.target.value }))} /></label><label>Flight number<input value={requestForm.flightNumber} onChange={e => setRequestForm(v => ({ ...v, flightNumber: e.target.value }))} /></label></>}
          {requestForm.requestType !== 'visa_assistance' && <label>Travellers<input type="number" min="1" max="12" value={requestForm.passengers} onChange={e => setRequestForm(v => ({ ...v, passengers: e.target.value }))} /></label>}
        </div>
        <label>Request note<textarea rows="3" value={requestForm.note} onChange={e => setRequestForm(v => ({ ...v, note: e.target.value }))} placeholder="Preferences, baggage, wheelchair-accessible vehicle, flexible dates..." /></label>
        <label className="phase7e-inline-check"><input type="checkbox" checked={requestForm.mobilitySupport} onChange={e => setRequestForm(v => ({ ...v, mobilitySupport: e.target.checked }))} /> Accessible / mobility support requested</label>
        <button className="button" disabled={working === 'request'}>{working === 'request' ? <Loader2 size={16} className="phase7e-spin"/> : <CalendarDays size={16}/>} Submit request</button>
      </form>

      <section className="portal-card">
        <span className="eyebrow">TRAVEL REQUESTS</span><h2>{requests.length} request{requests.length === 1 ? '' : 's'}</h2>
        <div className="phase7e-request-list">
          {requests.map(row => <article key={row.id}><div><strong>{travelRequestLabel(row.requestType)}</strong><span>{row.caseNumber} · {row.providerName || 'CareAtlas coordination'}</span>{row.adminNote && <small>{row.adminNote}</small>}</div><div><i className={`phase7e-status ${statusClass(row.status)}`}>{row.status.replaceAll('_', ' ')}</i>{row.estimatedAmount !== null && row.estimatedAmount !== undefined && <strong>{formatTravelMoney(row.estimatedAmount, row.currency)}</strong>}{row.confirmationReference && <span>Ref: {row.confirmationReference}</span>}</div>{['requested', 'in_review', 'documents_needed'].includes(row.status) && <button type="button" onClick={() => cancelRequest(row.id)} disabled={working !== ''}>{working === row.id ? <Loader2 size={15} className="phase7e-spin"/> : <XCircle size={15}/>} Cancel</button>}</article>)}
          {!requests.length && <p>No travel support requests yet.</p>}
        </div>
      </section>

      <section className="portal-card phase7e-itinerary-card">
        <div className="portal-card-heading"><div><span className="eyebrow">LIVE ITINERARY</span><h2>{itinerary.length ? 'Your coordinated journey' : 'Your itinerary will appear here'}</h2></div><Route size={24}/></div>
        <div className="phase7e-itinerary-list">
          {itinerary.map((event, index) => <article key={event.id}><div className="phase7e-itinerary-marker"><span>{String(index + 1).padStart(2, '0')}</span></div><div><small>{formatTravelDate(event.eventDate)}{event.eventTime ? ` · ${event.eventTime}` : ''}</small><strong>{event.title}</strong><span>{event.location || 'Location to be confirmed'}</span>{event.note && <p>{event.note}</p>}</div><i className={`phase7e-event-status ${event.status}`}>{event.status}</i></article>)}
          {!itinerary.length && <div className="phase7e-empty-itinerary"><Plane size={26}/><p>Confirmed flights, Stay Network bookings, consultations and CareAtlas travel events will combine here automatically.</p></div>}
        </div>
      </section>
    </PatientShell>
  );
}
