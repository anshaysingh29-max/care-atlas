'use client';

import { useEffect, useMemo, useState } from 'react';
import { BedDouble, CalendarDays, CheckCircle2, Loader2, MapPin, Plane, XCircle } from 'lucide-react';
import PatientShell from '@/components/PatientShell';
import { useAuth } from '@/components/AuthProvider';
import { getPatientCases } from '@/lib/firebase/cases';
import {
  cancelPatientHotelBooking,
  createPatientHotelBooking,
  formatHotelMoney,
  formatStayDate,
  getApprovedStayHotels,
  getHotelRooms,
  getPatientHotelBookings
} from '@/lib/firebase/hotel';

const emptyForm = {
  caseId: '',
  hotelId: '',
  roomId: '',
  checkInDate: '',
  checkOutDate: '',
  guests: 1,
  companions: 0,
  accessibilityNeeds: ''
};

export default function PatientStaysClient() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [roomsByHotel, setRoomsByHotel] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    if (!user) return;
    const [caseRows, hotelRows, bookingRows] = await Promise.all([
      getPatientCases(user.uid),
      getApprovedStayHotels(),
      getPatientHotelBookings()
    ]);
    setCases(caseRows);
    setHotels(hotelRows);
    setBookings(bookingRows);
    setForm(current => ({ ...current, caseId: current.caseId || caseRows[0]?.id || '' }));
  }

  useEffect(() => {
    load().catch(err => setMessage(err?.message || 'Unable to load stays.'));
  }, [user]);

  const selectedCase = useMemo(() => cases.find(item => item.id === form.caseId) || cases[0] || null, [cases, form.caseId]);

  const matchedHotels = useMemo(() => {
    if (!selectedCase) return hotels;
    const assigned = selectedCase.assignedHospitalIds || [];
    if (!assigned.length) return hotels;
    const mapped = hotels.filter(hotel => (hotel.nearbyHospitalIds || []).some(id => assigned.includes(id)));
    return mapped.length ? mapped : hotels;
  }, [hotels, selectedCase]);

  async function chooseHotel(hotel) {
    setMessage('');
    let rooms = roomsByHotel[hotel.id];
    if (!rooms) {
      try {
        rooms = await getHotelRooms(hotel.id, { includeInactive: false });
        setRoomsByHotel(current => ({ ...current, [hotel.id]: rooms }));
      } catch (err) {
        setMessage(err?.message || 'Unable to load rooms for this property.');
        return;
      }
    }
    setForm(current => ({
      ...current,
      hotelId: hotel.id,
      roomId: rooms[0]?.id || ''
    }));
  }

  async function requestStay(event) {
    event.preventDefault();
    setWorking(true);
    setMessage('');
    try {
      const bookingId = await createPatientHotelBooking(form);
      setMessage(`Stay request ${bookingId} sent to the property.`);
      setForm(current => ({ ...emptyForm, caseId: current.caseId }));
      await load();
    } catch (err) {
      setMessage(err?.message || 'Unable to request this stay.');
    } finally {
      setWorking(false);
    }
  }

  async function cancel(bookingId) {
    setWorking(true);
    setMessage('');
    try {
      await cancelPatientHotelBooking(bookingId);
      setMessage('Stay request cancelled.');
      await load();
    } catch (err) {
      setMessage(err?.message || 'Unable to cancel this stay.');
    } finally {
      setWorking(false);
    }
  }

  const selectedRooms = form.hotelId ? (roomsByHotel[form.hotelId] || []) : [];
  const selectedHotel = hotels.find(item => item.id === form.hotelId);

  return (
    <PatientShell title="Stays" subtitle="Find recovery-friendly accommodation connected to your CareAtlas journey." caseNumber={selectedCase?.caseNumber}>
      {message && <div className={message.includes('sent') || message.includes('cancelled') ? 'phase7d-form-success' : 'phase7d-form-error'}>{message}</div>}

      <section className="portal-card phase7d-patient-stay-intro">
        <div>
          <span className="eyebrow">CAREATLAS STAY NETWORK</span>
          <h2>Accommodation around your treatment journey.</h2>
          <p>Stay Partners publish rooms, accessibility features and longer-stay rates. They do not receive your medical records through this module.</p>
        </div>
        <BedDouble size={34}/>
      </section>

      {cases.length > 1 && (
        <section className="portal-card">
          <label>Treatment case
            <select value={form.caseId} onChange={e => setForm(v => ({ ...v, caseId: e.target.value }))}>
              {cases.map(item => <option value={item.id} key={item.id}>{item.caseNumber} · {item.treatmentName}</option>)}
            </select>
          </label>
        </section>
      )}

      <div className="phase7d-stay-cards">
        {matchedHotels.map(hotel => (
          <article className={`portal-card phase7d-stay-card ${form.hotelId === hotel.id ? 'selected' : ''}`} key={hotel.id}>
            <div className="phase7d-stay-card-top">
              <div className="phase7d-stay-icon"><BedDouble size={22}/></div>
              <div><strong>{hotel.propertyName}</strong><span><MapPin size={14}/>{hotel.city}, {hotel.country}</span></div>
            </div>
            <p>{hotel.description || `${hotel.propertyType || 'Stay'} partner available for CareAtlas medical travellers and companions.`}</p>
            <div className="phase7d-chip-wrap">
              {(hotel.medicalStayFeatures || []).slice(0, 4).map(item => <span key={item}>{item}</span>)}
              {hotel.medicalStayFeatures?.length > 4 && <span>+{hotel.medicalStayFeatures.length - 4} more</span>}
            </div>
            <button type="button" className="button secondary" onClick={() => chooseHotel(hotel)}>View rooms</button>
          </article>
        ))}
        {!matchedHotels.length && <section className="portal-card"><h3>No Stay Partners are live yet.</h3><p>CareAtlas operations can still coordinate accommodation manually for your case.</p></section>}
      </div>

      {selectedHotel && (
        <form className="portal-card phase7d-stay-request" onSubmit={requestStay}>
          <div className="portal-card-heading">
            <div><span className="eyebrow">REQUEST A STAY</span><h2>{selectedHotel.propertyName}</h2></div>
            <Plane size={23}/>
          </div>
          <div className="phase7d-form-grid-two">
            <label>Room type
              <select value={form.roomId} onChange={e => setForm(v => ({ ...v, roomId: e.target.value }))} required>
                <option value="">Select room</option>
                {selectedRooms.map(room => <option value={room.id} key={room.id}>{room.name} · {formatHotelMoney(room.nightlyRate, room.currency)}/night</option>)}
              </select>
            </label>
            <label>Guests<input type="number" min="1" max="10" value={form.guests} onChange={e => setForm(v => ({ ...v, guests: e.target.value }))} /></label>
            <label>Check-in<input type="date" value={form.checkInDate} onChange={e => setForm(v => ({ ...v, checkInDate: e.target.value }))} required /></label>
            <label>Check-out<input type="date" value={form.checkOutDate} onChange={e => setForm(v => ({ ...v, checkOutDate: e.target.value }))} required /></label>
            <label>Companions<input type="number" min="0" max="9" value={form.companions} onChange={e => setForm(v => ({ ...v, companions: e.target.value }))} /></label>
          </div>
          <label>Accessibility / stay needs <small>Do not enter diagnosis or medical reports here.</small>
            <textarea rows="3" value={form.accessibilityNeeds} onChange={e => setForm(v => ({ ...v, accessibilityNeeds: e.target.value }))} placeholder="Wheelchair access, caregiver room, kitchenette, late check-out..." />
          </label>
          {!selectedRooms.length && <div className="phase7d-form-error">This property has not published an active room yet.</div>}
          <button className="button" disabled={working || !form.roomId}>{working ? <Loader2 size={16} className="phase7d-spin"/> : <CalendarDays size={16}/>} Send booking request</button>
        </form>
      )}

      <section className="portal-card">
        <span className="eyebrow">MY STAY REQUESTS</span>
        <h2>{bookings.length} request{bookings.length === 1 ? '' : 's'}</h2>
        <div className="phase7d-patient-bookings">
          {bookings.map(row => (
            <article key={row.id}>
              <div><strong>{row.hotelName}</strong><span>{row.roomName} · {formatStayDate(row.checkInDate)} → {formatStayDate(row.checkOutDate)}</span></div>
              <div>
                <i className={`phase7d-booking-status ${row.status}`}>{row.status.replaceAll('_', ' ')}</i>
                {row.totalAmount ? <strong>{formatHotelMoney(row.totalAmount, row.currency)}</strong> : <span>Estimate {formatHotelMoney(row.estimatedSubtotal, row.currency)}</span>}
              </div>
              {['requested', 'quoted'].includes(row.status)
                ? <button type="button" onClick={() => cancel(row.id)} disabled={working}><XCircle size={15}/> Cancel</button>
                : row.status === 'confirmed' || row.status === 'completed'
                  ? <span className="phase7d-confirmed"><CheckCircle2 size={15}/> {row.status === 'completed' ? 'Stay completed' : 'Confirmed'}</span>
                  : null}
            </article>
          ))}
          {!bookings.length && <p>No accommodation requests yet.</p>}
        </div>
      </section>
    </PatientShell>
  );
}
