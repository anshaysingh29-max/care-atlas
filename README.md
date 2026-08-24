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
