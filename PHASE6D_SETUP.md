# CareAtlas Phase 6D Setup

## 1. Overlay this update
Extract the Phase 6D update ZIP over your existing local CareAtlas repository.

The update contains the corrected 6C Drive bridge as well, so keep your existing `.env.local` / `.env.production` gateway URL.

## 2. Deploy the Phase 6D Firestore rules

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Wait for `Deploy complete!`.

## 3. Provision the first admin manually
Privileged CareAtlas roles must NOT self-register.

In Firebase Console:

### Authentication -> Users -> Add user
Create a staff email/password account. Copy its Firebase UID.

### Firestore -> `users` -> Add document
Use the Firebase UID as the document ID.

Add these fields:

- `userId` (string): the exact Firebase UID
- `email` (string): the same staff email
- `displayName` (string): e.g. `CareAtlas Admin`
- `role` (string): `careatlas_admin`
- `status` (string): `active`
- `createdAt` (timestamp): current time
- `updatedAt` (timestamp): current time

Do not create a `patients/{uid}` document for the admin.

Valid CareAtlas staff roles supported by 6D are:
- `careatlas_coordinator`
- `careatlas_operations`
- `careatlas_admin`
- `super_admin`

Use `careatlas_admin` for the first operations account.

## 4. Test locally

```powershell
npm run dev
```

Open:

`http://localhost:3000/admin-login`

Sign in with the staff account you just created.

Expected:
1. `/admin` shows live Firestore case counts.
2. `/admin/cases` shows the real patient case created during 6B.
3. Open that case.
4. Assign a coordinator.
5. Assign one or more demo partner hospitals.
6. Change journey stage/status.
7. Click **Save operations**.

Then verify Firestore:
- `cases/{caseId}` has updated operational fields.
- `auditLogs/{autoId}` contains `case.operations_updated` with the admin UID.

## 5. Patient-side verification
After an admin changes `currentStage`, sign in as that patient and confirm the patient dashboard reflects the new journey stage.

## 6. Build

```powershell
npm run build
```

## 7. Commit everything, including the already-working 6C bridge fix

```powershell
git add .
git commit -m "Build CareAtlas Phase 6D real admin operations"
git push
```

`.env.local` remains ignored. `.env.production` contains only browser-public Firebase web configuration and the public Apps Script `/exec` URL; never add service-account credentials or private keys.

## Security note
Phase 6D is stronger than the prototype but is still MVP infrastructure. Continue using test/non-sensitive medical data until 6F adds final audit/consent/notification/security hardening and the deployment has been reviewed for your production compliance obligations.
