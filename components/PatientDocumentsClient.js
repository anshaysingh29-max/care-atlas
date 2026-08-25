'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  FileCheck2,
  FileText,
  FolderLock,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud
} from 'lucide-react';
import PatientShell from '@/components/PatientShell';
import { useAuth } from '@/components/AuthProvider';
import { getPatientCases } from '@/lib/firebase/cases';
import { getPatientCaseConsentState, hasMedicalDataConsent } from '@/lib/firebase/consents';
import {
  createCaseDocumentMetadata,
  formatDocumentDate,
  getPatientDocuments,
  removeCaseDocumentMetadata
} from '@/lib/firebase/documents';
import {
  base64ToBlob,
  callDriveGateway,
  fileToBase64,
  isDriveGatewayConfigured
} from '@/lib/drive/bridge';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function prettyBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function friendlyError(error) {
  if (error?.code === 'careatlas/drive-not-configured') {
    return 'The Google Drive gateway is not configured on this deployment yet.';
  }
  return error?.message || 'Something went wrong while handling this document.';
}

export default function PatientDocumentsClient() {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [cases, setCases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [category, setCategory] = useState('Medical report');
  const [consentState, setConsentState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCase = useMemo(
    () => cases.find(item => item.id === selectedCaseId) || cases[0] || null,
    [cases, selectedCaseId]
  );

  const visibleDocuments = useMemo(() => {
    if (!selectedCase) return documents;
    return documents.filter(item => item.caseId === selectedCase.id);
  }, [documents, selectedCase]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [caseRows, documentRows] = await Promise.all([
        getPatientCases(user.uid),
        getPatientDocuments(user.uid)
      ]);
      setCases(caseRows);
      setDocuments(documentRows);
      if (!selectedCaseId && caseRows.length) setSelectedCaseId(caseRows[0].id);
    } catch (loadError) {
      setError(friendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || !selectedCase?.id) {
      setConsentState(null);
      return;
    }
    let active = true;
    getPatientCaseConsentState(selectedCase.id, user.uid)
      .then(state => { if (active) setConsentState(state); })
      .catch(() => { if (active) setConsentState(null); });
    return () => { active = false; };
  }, [user, selectedCase?.id]);

  async function uploadFile(file) {
    if (!user || !selectedCase || !file) return;
    setError('');
    setNotice('');

    if (!hasMedicalDataConsent(consentState)) {
      setError('Medical document upload is locked until you accept the medical data processing consent for this case.');
      return;
    }
    if (!isDriveGatewayConfigured()) {
      setError('Google Drive uploads are not configured yet. Add NEXT_PUBLIC_DRIVE_GATEWAY_URL after deploying the Apps Script gateway.');
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only PDF, JPG and PNG medical documents are supported.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('For the MVP, each medical document must be 8 MB or smaller.');
      return;
    }

    setBusy('upload');
    try {
      const idToken = await user.getIdToken();
      const base64 = await fileToBase64(file);
      const driveResult = await callDriveGateway('upload', {
        idToken,
        caseId: selectedCase.id,
        caseNumber: selectedCase.caseNumber,
        fileName: file.name,
        mimeType: file.type,
        base64
      });

      await createCaseDocumentMetadata({
        caseId: selectedCase.id,
        caseNumber: selectedCase.caseNumber,
        driveFileId: driveResult.driveFileId,
        driveAccessKey: driveResult.driveAccessKey,
        name: driveResult.name || file.name,
        mimeType: driveResult.mimeType || file.type,
        size: driveResult.size || file.size,
        category
      });

      setNotice(`${file.name} was stored in the private CareAtlas Drive folder for ${selectedCase.caseNumber}.`);
      await loadData();
    } catch (uploadError) {
      setError(friendlyError(uploadError));
    } finally {
      setBusy('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function downloadDocument(document) {
    if (!user) return;
    setBusy(`download:${document.id}`);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const result = await callDriveGateway('download', {
        idToken,
        documentId: document.id
      });
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
      setError(friendlyError(downloadError));
    } finally {
      setBusy('');
    }
  }

  async function deleteDocument(document) {
    if (!user) return;
    const confirmed = window.confirm(`Remove ${document.name} from this CareAtlas case?`);
    if (!confirmed) return;

    setBusy(`delete:${document.id}`);
    setError('');
    setNotice('');
    try {
      const idToken = await user.getIdToken();
      await callDriveGateway('delete', {
        idToken,
        documentId: document.id
      });
      await removeCaseDocumentMetadata(document.id, document.caseId);
      setNotice(`${document.name} was removed from the active case documents.`);
      await loadData();
    } catch (deleteError) {
      setError(friendlyError(deleteError));
    } finally {
      setBusy('');
    }
  }

  return (
    <PatientShell
      title="Medical documents"
      subtitle="Keep your case records organised in your private CareAtlas Drive folder."
      caseNumber={selectedCase?.caseNumber}
    >
      <div className="drive-security-banner">
        <FolderLock size={22}/>
        <div>
          <strong>Private Google Drive storage</strong>
          <span>Files are stored patient-case-wise in CareAtlas Drive. No public Drive links are created; downloads pass through the authenticated document gateway.</span>
        </div>
        <span className={`gateway-pill ${isDriveGatewayConfigured() ? 'ready' : 'pending'}`}>
          {isDriveGatewayConfigured() ? 'Gateway configured' : 'Gateway setup required'}
        </span>
      </div>

      {error && <div className="document-alert error"><ShieldCheck size={18}/><span>{error}</span></div>}
      {notice && <div className="document-alert success"><FileCheck2 size={18}/><span>{notice}</span></div>}
      {selectedCase && !hasMedicalDataConsent(consentState) && <div className="permission-banner phase6f-document-consent"><ShieldCheck size={18}/><div><strong>Medical-data consent required</strong><span>CareAtlas will not accept new medical uploads until you explicitly authorize medical data processing for this case.</span></div><Link href="/patient/consents" className="text-button">Manage consent</Link></div>}

      <section className="portal-card drive-upload-card">
        <div className="portal-card-heading">
          <div><span className="eyebrow">ADD MEDICAL RECORD</span><h2>Upload to a case folder.</h2></div>
          <button className="icon-refresh" type="button" onClick={loadData} disabled={loading || Boolean(busy)} aria-label="Refresh documents"><RefreshCw size={16}/></button>
        </div>

        {cases.length ? (
          <div className="drive-upload-grid">
            <label className="field-label">
              <span>CareAtlas case</span>
              <select value={selectedCase?.id || ''} onChange={event => setSelectedCaseId(event.target.value)}>
                {cases.map(item => <option key={item.id} value={item.id}>{item.caseNumber} · {item.treatmentName}</option>)}
              </select>
            </label>
            <label className="field-label">
              <span>Document category</span>
              <select value={category} onChange={event => setCategory(event.target.value)}>
                <option>Medical report</option>
                <option>MRI / Imaging</option>
                <option>Lab report</option>
                <option>Prescription</option>
                <option>Consultation note</option>
                <option>Discharge summary</option>
                <option>Other</option>
              </select>
            </label>
            <label className={`real-upload-zone ${busy === 'upload' || !hasMedicalDataConsent(consentState) ? 'disabled' : ''}`}>
              {busy === 'upload' ? <LoaderCircle className="spin" size={27}/> : <UploadCloud size={27}/>} 
              <div><strong>{busy === 'upload' ? 'Encrypting the session and uploading…' : 'Choose PDF, JPG or PNG'}</strong><span>Maximum 8 MB per file for this MVP gateway.</span></div>
              <input ref={inputRef} disabled={busy === 'upload' || !hasMedicalDataConsent(consentState)} type="file" accept=".pdf,image/jpeg,image/png" onChange={event => uploadFile(event.target.files?.[0])}/>
            </label>
          </div>
        ) : (
          <div className="empty-documents"><FileText size={28}/><h3>Create a treatment case first.</h3><p>Medical documents are always stored inside a CareAtlas case folder, never as loose patient files.</p></div>
        )}
      </section>

      <section className="portal-card documents-card">
        <div className="portal-card-heading">
          <div><span className="eyebrow">CASE DOCUMENTS</span><h2>{loading ? 'Loading…' : `${visibleDocuments.length} document${visibleDocuments.length === 1 ? '' : 's'}`}</h2></div>
        </div>

        {loading ? (
          <div className="document-loading"><LoaderCircle className="spin" size={22}/> Loading your secured document metadata…</div>
        ) : visibleDocuments.length ? (
          <div className="documents-table drive-documents-table">
            <div className="doc-row doc-head"><span>Document</span><span>Category</span><span>Added</span><span>Size</span><span></span></div>
            {visibleDocuments.map(document => (
              <div className="doc-row" key={document.id}>
                <span className="doc-name"><FileText size={18}/><span><strong>{document.name}</strong><small>{document.mimeType}</small></span></span>
                <span>{document.category}</span>
                <span>{formatDocumentDate(document.createdAt)}</span>
                <span>{prettyBytes(document.size)}</span>
                <span className="doc-actions">
                  <button type="button" onClick={() => downloadDocument(document)} disabled={Boolean(busy)} aria-label={`Download ${document.name}`}>
                    {busy === `download:${document.id}` ? <LoaderCircle className="spin" size={15}/> : <Download size={15}/>} 
                  </button>
                  <button type="button" onClick={() => deleteDocument(document)} disabled={Boolean(busy)} aria-label={`Remove ${document.name}`}>
                    {busy === `delete:${document.id}` ? <LoaderCircle className="spin" size={15}/> : <Trash2 size={15}/>} 
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-documents"><FileText size={28}/><h3>No medical documents yet.</h3><p>Upload only the records relevant to this treatment request.</p></div>
        )}
      </section>

      <div className="document-trust-grid">
        <div><ShieldCheck/><strong>No public file links</strong><span>Drive IDs stay behind CareAtlas access checks instead of being exposed as shareable URLs.</span></div>
        <div><FileCheck2/><strong>Patient-case folders</strong><span>Each case receives its own Medical Reports folder under the private CareAtlas Patients Drive root.</span></div>
      </div>

      <p className="phase6c-safety-note">Phase 6F adds versioned consent, role-based access and audit controls around the low-cost Drive gateway. Real-world healthcare use still requires your legal, privacy, security and regulatory review.</p>
    </PatientShell>
  );
}
