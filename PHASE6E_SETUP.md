# CareAtlas Phase 6E Setup

Phase 6E assumes the Phase 6D update is already overlaid in your local repository.

## 1. Overlay Phase 6E
Extract this ZIP over:

`C:\Users\ansha\NextJS Projects\careatlas`

Do not delete your `.env.local` or your working `NEXT_PUBLIC_DRIVE_GATEWAY_URL`.

## 2. Deploy Firestore rules

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Wait for `Deploy complete!`.

## 3. Update the Google Drive gateway
Phase 6E allows an assigned hospital to download patient documents through the same authenticated Apps Script gateway.

Open your `CareAtlas Drive Gateway` Apps Script project.

Replace:
- `Code.gs` with `apps-script/Code.gs` from this update
- `Bridge.html` with `apps-script/Bridge.html` from this update (this keeps the fixed iframe bridge)

Then:

`Deploy -> Manage deployments -> Edit -> New version -> Deploy`

Keep:
- Execute as: **Me**
- Who has access: **Anyone**

Your existing `/exec` URL can remain the same.

Your existing Script Properties remain:
- `FIREBASE_API_KEY`
- `FIREBASE_PROJECT_ID = care-atlas`
- `ALLOWED_ORIGINS = https://anshaysingh29-max.github.io,http://localhost:3000`

## 4. Provision one hospital account
Hospital users must NOT self-register.

### Firebase Authentication -> Users -> Add user
Create a test hospital work email/password and copy its UID.

### Firestore -> `users` -> Add document
Use the Firebase UID as the document ID.

Add:
- `userId` string = exact Firebase UID
- `email` string = hospital login email
- `displayName` string = e.g. `Aster Nova International Desk`
- `role` string = `hospital_admin`
- `hospitalId` string = `aster-nova-institute`
- `status` string = `active`
- `createdAt` timestamp = now
- `updatedAt` timestamp = now

Do not create a `patients/{uid}` document for this account.

Valid Phase 6E hospital roles:
- `hospital_admin`
- `hospital_doctor`
- `hospital_coordinator`

Only `hospital_admin` and `hospital_doctor` can submit treatment plans. All three hospital roles can review assigned cases and manage consultations.

The current demo catalogue hospital IDs are:
- `aster-nova-institute`
- `bosporus-medical-centre`
- `siam-international-hospital`
- `harbour-health-dubai`

The `hospitalId` must match exactly.

## 5. Assign that hospital to a real case
Sign in to your Phase 6D CareAtlas admin account:

`http://localhost:3000/admin-login`

Open the real patient case and assign the same hospital, for example **Aster Nova Institute**, then save operations.

Firestore `cases/{caseId}.assignedHospitalIds` must include:

`aster-nova-institute`

## 6. Test hospital login

```powershell
npm run dev
```

Open:

`http://localhost:3000/hospital-login`

Sign in with the hospital Firebase account.

Expected:
1. `/hospital` shows live assigned-case counts.
2. `/hospital/cases` shows only cases assigned to this hospital.
3. Open a case and verify the patient's test documents are listed.
4. Download a test document. The Apps Script gateway verifies both the Firebase hospital identity and case assignment before reading Drive.
5. Create a treatment plan.
6. Open the patient account -> `/patient/treatment-plans`; the submitted plan should appear.
7. Propose a consultation from `/hospital/consultations`.
8. Verify Firestore collections `treatmentPlans`, `consultations`, and `auditLogs` receive real records.

## 7. Build

```powershell
npm run build
```

## 8. Push Phase 6D + 6E together
Your GitHub remote may still show Phase 6C if you have not pushed the local Phase 6D work yet. After 6E passes locally:

```powershell
git add .
git commit -m "Build CareAtlas Phase 6E real hospital portal"
git push
```

This can include your local 6D changes and the already-fixed 6C bridge in the same push if they were not pushed earlier.

## Important MVP safety note
Continue using test/non-sensitive medical information. Phase 6E introduces real access controls but does not yet complete all production healthcare privacy/compliance work. Phase 6F will add final consent, audit, notification and security hardening.
