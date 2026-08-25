# CareAtlas Phase 6F — Final MVP production layer

Phase 6F closes the planned Phase 6 backend roadmap with consent, communications, notifications, auditing and security hardening while keeping the existing Firebase + Google Drive architecture.

## Added

- Versioned, per-case patient consent state
- Immutable consent-event history
- Medical-data-processing consent before new Drive uploads
- Hospital-sharing consent before hospital document access
- Real Firestore patient ↔ CareAtlas messaging
- Real Firestore patient ↔ assigned-hospital messaging
- Patient in-app notifications for case updates, hospital plans, consultations and incoming messages
- Admin audit-log viewer
- Audit events for staff/hospital messages and existing operational actions
- Optional Firebase App Check bootstrap with reCAPTCHA v3
- Stricter patient role gate on the patient portal
- Stricter Firestore self-update permissions
- Server-timestamp checks for sensitive client-written events
- Consent-aware Google Apps Script document gateway
- One Firestore composite index for hospital case-message threads

## New routes

- `/patient/consents`
- `/hospital/messages`
- `/admin/audit`

`/patient/messages` is now real instead of static demo state.

## Important behavior change

After deploying Phase 6F, a patient must enable **Medical data processing** before uploading new documents. Hospitals can only access those documents after the patient also enables **Sharing with assigned hospitals**. New messages require **Care coordination messaging** consent.

## Not magically solved by code

This phase is the final planned MVP engineering layer, not a healthcare/privacy certification. Production launch with real patient health information still requires legal/privacy review, appropriate contracts, retention/deletion procedures, staff access governance, incident response, vendor assessment and any country-specific healthcare/data obligations that apply.
