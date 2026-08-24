# CareAtlas Phase 6D — Real Admin Operations

Phase 6D replaces the main static operations prototype with Firebase-backed admin workflows.

## Added
- Real Firebase admin/staff sign-in with Firestore role verification
- Admin route guard using the shared AuthProvider
- Live Firestore operations dashboard
- Live all-case queue with search and operational filters
- Generic static-export-safe case detail route using `/admin/cases/case?id=<firestore-id>`
- Real journey stage and case status updates
- Real coordinator assignment
- Real multi-hospital assignment using the current demo catalogue IDs
- Real patient directory from Firestore
- Real case document metadata visibility for staff
- Immutable Firestore audit events for admin case updates
- Firestore rule alignment for `careatlas_operations`
- Stronger audit log create validation

## Intentionally still later
- Hospital user provisioning and partner login against assigned cases (6E)
- Real hospital catalogue CRUD / verification workflows
- Hospital access to Google Drive documents
- Treatment plan creation by authenticated hospital users
- Messaging/notifications and final compliance hardening (6F)

The corrected Phase 6C Apps Script iframe bridge is included again in this overlay so applying 6D does not regress the working document gateway.
