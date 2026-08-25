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


## Phase 7A — CareAtlas Partner Network
Referral-partner signup/approval, 60-day first-valid attribution, partner dashboards, commission ledger, admin approval and manual payout tracking are included. See `PHASE7A_SETUP.md`. Partners cannot access medical records.


## Phase 7B — Patient affiliates & growth tools
Patients can now keep their patient role and apply for a second referral-partner profile under the same Firebase UID. Phase 7B also adds warm leads, campaign-tagged referral links, partner levels, funnel reporting and self-referral commission blocking. See `PHASE7B_SETUP.md`.

## Phase 7C — Partner KYC & payouts
Phase 7C adds partner identity/business verification, bank/UPI payout destinations, KYC-gated commission approval, withdrawal requests, configurable payout thresholds, tax/payment-reference fields, admin settlement controls, fraud flags and partner payout statements. See `PHASE7C_SETUP.md`.


## Phase 7D — Stay Network
Phase 7D adds self-service accommodation partner onboarding, property review, rooms/rates, availability windows, patient stay requests, hotel booking operations and manual settlement tracking. Stay Partners do not receive patient medical records. See `PHASE7D_SETUP.md`.

## Phase 7E — Travel Concierge
Phase 7E adds case-linked travel readiness, visa/flight/airport-pickup/local-transport requests, CareAtlas travel operations, patient notifications and a combined itinerary that merges Stay Network bookings, consultations and confirmed travel services. Passport numbers and scans are intentionally not collected. See `PHASE7E_SETUP.md`.

## Phase 7F — Reviews, Trust & Patient Outcomes
Phase 7F adds verified-journey patient reviews, moderation, patient-reported outcomes, private concerns, provider responses and internal experience-quality signals. These metrics are not clinical outcome verification or accreditation. See `PHASE7F_SETUP.md`.

## Phase 7G — Hospital Network & Specialty Marketplace
Hospital self-registration now feeds an admin verification workflow. Approved specialties are normalized into a Firestore master catalogue and automatically power the public specialty marketplace, homepage discovery, patient Discover Care area, and approved hospital listings. CareAtlas commercial terms remain in a separate admin-only collection.

## Phase 8A — AI Care Navigator
CareAtlas now includes an explainable Care Navigator at `/care-navigator` and `/patient/concierge`. It ranks only live, published CareAtlas hospital partners using approved specialty capability and user-selected journey preferences. Hospital commercials and affiliate economics are excluded from ranking. Patient-saved shortlists are auditable in `/admin/ai-matching` and never auto-assign a provider.

## Phase 8B — Coordinator Copilot
CareAtlas operations now has `/admin/copilot` plus a case-level Copilot panel. It calculates live operational priority, identifies workflow blockers, suggests next actions, checks journey readiness and can place a patient-safe draft into the existing message composer for human review. It does not make clinical decisions, auto-assign hospitals or auto-send communications. See `PHASE8B_SETUP.md`.

## Phase 8C — Growth & CRM Engine
CareAtlas operations now has `/admin/growth` for explainable patient-journey recovery, partner lead prioritization, Care Navigator engagement signals, conversion funnels and campaign attribution. Scores are operational signals rather than medical triage or conversion probabilities. Hospital commercials, affiliate payout size and clinical severity are excluded, and all follow-up remains manual. See `PHASE8C_SETUP.md`.
