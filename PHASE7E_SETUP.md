# CareAtlas Phase 7E Setup — Travel Concierge

Phase 7E runs on the existing Firebase project and GitHub Pages architecture. No Google Drive / Apps Script changes are required.

## 1. Overlay the update

Extract the contents of `careatlas-phase7e-update.zip` over the existing Phase 7D CareAtlas repository.

## 2. Deploy Firestore rules

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

No new composite index is required in this phase, but deploy both rules and indexes to keep configuration synchronized.

## 3. Start the app

```powershell
npm run dev
```

## 4. Create patient travel readiness

Sign in as an existing patient with a real CareAtlas treatment case and open:

```text
http://localhost:3000/patient/travel
```

Save a travel profile. Firestore creates:

```text
travelProfiles/{caseId}
```

The profile stores travel logistics only. Do not enter passport numbers, scans, visa identifiers or medical diagnosis in these fields.

## 5. Submit travel requests

Test one or more services:

```text
Visa assistance
Flight assistance
Airport pickup
Local transport
```

Each creates:

```text
travelRequests/{requestId}
```

The initial status is:

```text
requested
```

Patients can cancel an early request while it is `requested`, `in_review` or `documents_needed`.

## 6. Coordinate from CareAtlas operations

Sign in as CareAtlas staff and open:

```text
/admin/travel
```

Move a request through the operational lifecycle:

```text
requested
→ in_review
→ documents_needed      (when applicable)
→ arranged
→ confirmed
→ completed
```

You can also record:
- travel/transport provider name,
- booking or vehicle reference,
- estimated amount and currency,
- patient-visible operations note.

Every update sends an in-app patient notification and writes an audit event.

## 7. Build the itinerary

From `/admin/travel`, choose a patient case and add itinerary events such as:

```text
Airport pickup
Hotel check-in
Hospital visit
Consultation
Treatment
Local transport
Flight
Custom event
```

Firestore creates:

```text
travelItineraryEvents/{eventId}
```

The patient itinerary also automatically merges confirmed data already present in CareAtlas:
- Stay Network hotel check-in/check-out,
- hospital consultations,
- arranged/confirmed travel service requests.

This avoids duplicating the same hotel or consultation event manually.

## 8. Verify patient itinerary

Return to:

```text
/patient/travel
```

Confirm that:
1. the request status changed,
2. the patient sees the provider/reference when entered,
3. the in-app notification appears,
4. confirmed travel services appear in the itinerary,
5. confirmed Stay Network dates appear automatically,
6. scheduled hospital consultations appear automatically,
7. CareAtlas-created itinerary events appear in chronological order.

## 9. Build and push

```powershell
npm run build

git add .
git commit -m "Build CareAtlas Phase 7E Travel Concierge"
git push
```

## Important MVP limitations
- Visa processing is coordination/status tracking, not submission to government systems.
- Live airline search, ticket issuance and payment are not connected.
- Transport providers do not have a supplier portal yet.
- No passport number or scan storage is implemented in 7E by design.
- Travel estimates are manually entered by CareAtlas operations.
- Emergency assistance, travel insurance purchase and real-time flight disruption monitoring are not connected yet.

Use test/non-sensitive data until travel-provider contracts, privacy controls, payment terms, travel regulations and support procedures are ready for production use.
