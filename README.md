# CareAtlas

CareAtlas is a medical-travel marketplace and coordination platform built with Next.js.

## Product phases

### Phase 1 — Public marketplace
Treatments, destinations, hospitals, doctors and discovery.

### Phase 2 — Conversion
Treatment-plan intake, hospital comparison and patient sign-in/register prototypes.

### Phase 3 — Patient portal
Patient dashboard, cases, treatment plans, documents, messages and journey tracking.

### Phase 4 — Hospital partner portal
Hospital case inbox, shared-record review, treatment-plan creation, consultations and hospital profile management.

### Phase 5 — CareAtlas operations
Admin dashboard, CRM case pipeline, patients, hospital onboarding, doctors, treatment-plan oversight, coordinators, content governance and analytics.

### Phase 6A — Firebase foundation
Firebase Auth + Firestore SDK foundation, environment configuration, role model, Firestore security rules and deployment configuration. See `FIREBASE_SETUP.md`.

## Run locally

```bash
npm install
npm run dev
```

For Firebase-backed work, copy `.env.example` to `.env.local` and enter the Firebase Web App configuration from Firebase Console.

## Current hosting

The frontend continues to use Next.js static export and the existing GitHub Pages workflow. `firebase.json` is included so we can move the static frontend to Firebase Hosting later without redesigning it.

## Medical data safety

Until the Firebase-backed patient flow and controlled Drive document layer are completed, the public deployment remains a prototype. Do not collect real medical documents or real patient health information through the current demo flows.

## Phase 6C — Google Drive medical documents
CareAtlas now includes a zero/near-zero-cost private Google Drive document gateway for patient case files. See `PHASE6C_SETUP.md` before enabling real uploads. Firebase Storage is not used.

## Phase 6D — Real CareAtlas operations
Firebase staff RBAC, live Firestore case operations, coordinator/hospital assignment, patient notifications and audit events.

## Phase 6E — Real hospital portal
Firebase hospital accounts, assigned-case access, consent-aware document review, treatment-plan submission and consultation workflows.

## Phase 6F — Consent, messaging, notifications and hardening
Phase 6F adds versioned patient consent, real case messaging, patient in-app notifications, an admin audit viewer, stricter Firestore rules, consent-gated Drive upload/download and optional Firebase App Check initialization. See `PHASE6F_SETUP.md`.

CareAtlas is still an application MVP, not a regulatory certification. Before collecting real patient health data, complete legal/privacy review, data-retention policies, incident response, vendor agreements, access reviews and any healthcare/privacy obligations that apply to the countries in which you operate.
