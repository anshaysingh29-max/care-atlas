'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, Download, FileCheck2, FileText, Globe2, LoaderCircle, Mail, Phone, ShieldCheck, Stethoscope } from 'lucide-react';
import HospitalShell from '@/components/HospitalShell';
import { useAuth } from '@/components/AuthProvider';
import { base64ToBlob, callDriveGateway, isDriveGatewayConfigured } from '@/lib/drive/bridge';
import {
  formatHospitalTimestamp,
  getHospitalCase,
  getHospitalCaseDocuments,
  getHospitalConsultations,
  getHospitalTreatmentPlans
} from '@/lib/firebase/hospital';

export default function HospitalCaseDetailClient() {
  const { user, userProfile } = useAuth();
  const [caseId, setCaseId] = useState('');
  const [record, setRecord] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userProfile?.hospitalId) return;
    const target = new URLSearchParams(window.location.search).get('id') || '';
    setCaseId(target);
    if (!target) {
      setLoading(false);
      setError('No case ID was supplied. Return to the assigned case list.');
      return;
    }

    let active = true;
    Promise.all([
      getHospitalCase(target, userProfile.hospitalId),
      getHospitalCaseDocuments(target, userProfile.hospitalId),
      getHospitalTreatmentPlans(userProfile.hospitalId),
      getHospitalConsultations(userProfile.hospitalId)
    ]).then(([caseRecord, docs, allPlans, allConsultations]) => {
      if (!active) return;
      setRecord(caseRecord);
      setDocuments(docs);
      setPlans(allPlans.filter(item => item.caseId === target));
      setConsultations(allConsultations.filter(item => item.caseId === target));
    }).catch(loadError => {
      if (active) setError(loadError?.message || 'Could not load this assigned case.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [userProfile?.hospitalId]);

  async function downloadDocument(document) {
    if (!user) return;
    if (!isDriveGatewayConfigured()) {
      setError('The Google Drive gateway is not configured on this deployment.');
      return;
    }

    setBusy(`download:${document.id}`);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const result = await callDriveGateway('download', { idToken, documentId: document.id });
      const blob = base64ToBlob(result.base64, result.mimeType);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = result.name || document.name || 'CareAtlas-document';
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError?.message || 'Could not download this shared medical document.');
    } finally {
      setBusy('');
    }
  }

  const action = <Link href="/hospital/cases" className="text-button"><ArrowLeft size={15}/> Back to assigned cases</Link>;

  return <HospitalShell title={record ? `${record.caseNumber || record.id} · ${record.patientName || 'Patient'}` : 'Assigned case'} subtitle={record ? `${record.treatmentName || 'Treatment request'} · ${record.patientCountry || 'Country not set'}` : 'Review a CareAtlas patient case.'} action={action}>
    {error && <div className="document-alert error"><ShieldCheck size={17}/><span>{error}</span></div>}
    {loading ? <div className="hospital-live-loading"><LoaderCircle className="spin" size={22}/> Verifying assignment and loading case…</div> : record && <div className="phase6e-case-detail-grid">
      <div className="hospital-case-column">
        <section className="portal-card">
          <div className="portal-card-heading"><div><span className="eyebrow">CLINICAL REQUEST</span><h2>Patient-submitted context.</h2></div><Stethoscope size={22}/></div>
          <div className="case-narrative"><strong>Diagnosis / request</strong><p>{record.diagnosis || 'No diagnosis text supplied.'}</p><strong>Urgency</strong><p>{record.urgency || 'Not set'}</p><strong>Preferred destinations</strong><p>{Array.isArray(record.preferredDestinationSlugs) && record.preferredDestinationSlugs.length ? record.preferredDestinationSlugs.join(', ') : 'Not specified'}</p></div>
          <div className="admin-detail-facts phase6e-case-facts"><span><Globe2 size={15}/><small>Patient from</small><strong>{record.patientCountry || 'Not set'}</strong></span><span><FileText size={15}/><small>Documents</small><strong>{documents.length}</strong></span><span><ShieldCheck size={15}/><small>Case status</small><strong>{record.status || 'active'}</strong></span><span><ShieldCheck size={15}/><small>Updated</small><strong>{formatHospitalTimestamp(record.updatedAt || record.createdAt)}</strong></span></div>
        </section>

        <section className="portal-card">
          <div className="portal-card-heading"><div><span className="eyebrow">SHARED DOCUMENTS</span><h2>Records available to your hospital.</h2></div><span className={`gateway-pill ${isDriveGatewayConfigured() ? 'ready' : 'pending'}`}>{isDriveGatewayConfigured() ? 'Drive gateway ready' : 'Gateway missing'}</span></div>
          <div className="phase6e-shared-docs">{documents.length ? documents.map(document => <article key={document.id}><FileText size={18}/><div><strong>{document.name}</strong><span>{document.category || 'Medical report'} · {document.mimeType}</span></div><button type="button" onClick={() => downloadDocument(document)} disabled={Boolean(busy)} aria-label={`Download ${document.name}`}>{busy === `download:${document.id}` ? <LoaderCircle className="spin" size={15}/> : <Download size={15}/>}</button></article>) : <div className="empty-documents"><FileText size={27}/><h3>No shared documents yet.</h3><p>The patient has not uploaded records for this case.</p></div>}</div>
        </section>
      </div>

      <aside className="hospital-case-column">
        <section className="portal-card phase6e-response-card">
          <span className="eyebrow">HOSPITAL RESPONSE</span><h2>{plans.length ? `${plans.length} plan${plans.length === 1 ? '' : 's'} submitted` : 'Treatment plan required'}</h2><p>Submit a structured clinical and commercial response for CareAtlas and the patient to review.</p><Link href={`/hospital/treatment-plans/new?case=${encodeURIComponent(caseId)}`} className="button admin-full"><FileCheck2 size={16}/> Create treatment plan</Link>
        </section>
        <section className="portal-card phase6e-response-card"><span className="eyebrow">CONSULTATION</span><h2>{consultations.length ? `${consultations.length} consultation${consultations.length === 1 ? '' : 's'}` : 'No consultation proposed'}</h2><p>Propose a doctor consultation after reviewing the shared records.</p><Link href={`/hospital/consultations?case=${encodeURIComponent(caseId)}`} className="button button-secondary admin-full"><CalendarClock size={16}/> Manage consultation</Link></section>
        <section className="portal-card"><span className="eyebrow">PATIENT CONTACT</span><div className="contact-mini"><span><Mail size={15}/> {record.patientEmail || 'Email not set'}</span><span><Phone size={15}/> {record.patientPhone || 'Phone not set'}</span></div><p className="admin-small-note">Access is limited to cases assigned to your hospital. Use test/non-sensitive patient records until production compliance hardening is complete.</p></section>
      </aside>
    </div>}
  </HospitalShell>;
}
