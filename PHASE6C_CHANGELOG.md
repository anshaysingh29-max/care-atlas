# CareAtlas Phase 6C

Google Drive-backed patient document handling added without Firebase Storage.

## Added
- Real patient medical-document screen
- Per-case document selection
- PDF/JPG/PNG uploads up to 8 MB
- Firestore `caseDocuments` metadata
- Private Google Drive folder model
- Zero/near-zero-cost Google Apps Script document gateway
- Firebase ID-token verification inside the gateway
- Firestore case ownership verification before Drive upload
- Authenticated document download through CareAtlas (no raw Drive link)
- Authenticated Drive deletion + Firestore metadata cleanup
- Random per-file Drive capability marker to prevent arbitrary Drive file-ID access
- Case `documentCount` updates
- Firestore rules for patient/staff/assigned-hospital document metadata access
- Apps Script setup and deployment guide

## Drive layout
`CareAtlas Patients/<case number>/Medical Reports/<file>`

## Not included yet
- Hospital-facing document UI and explicit share/revoke controls
- Consent versioning
- Audit-event collection
- DICOM/large imaging archives
- Production compliance certification

Those remain later phases.
