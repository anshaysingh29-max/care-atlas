# CareAtlas Phase 6E — Real Hospital Partner Portal

Phase 6E turns the Phase 4 hospital prototype into Firebase-backed partner operations.

## Added
- Real Firebase hospital sign-in with role + hospital ID verification
- Hospital RBAC for `hospital_admin`, `hospital_doctor`, `hospital_coordinator`
- Assigned-case-only Firestore queries
- Real hospital dashboard counts
- Real assigned patient case list and case detail
- Assigned hospital access to patient document metadata
- Authenticated Google Drive document download for assigned hospitals
- Hospital treatment-plan creation and Firestore persistence
- Patient portal now shows real submitted treatment plans
- Hospital consultation proposal and status tracking
- Hospital action audit logs
- Stronger Firestore rules for treatment plans and consultations
- Real partner identity/profile screen

## Security model
Hospital accounts are manually provisioned. A hospital user's `users/{uid}.hospitalId` must match a case's `assignedHospitalIds` entry. Hospital users never receive Google Drive credentials or raw public Drive links.

## Still later
Phase 6F remains the final production layer: consent versioning, notifications/messaging, fuller audit coverage, App Check, production security hardening and operational safeguards.
