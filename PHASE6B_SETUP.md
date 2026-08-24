# CareAtlas Phase 6B — Real Patient Journey

Phase 6B replaces the patient-side demo authentication and demo case submission with Firebase Authentication + Cloud Firestore.

## Before pushing

1. Make sure Firebase Authentication > Email/Password is enabled.
2. Make sure Firestore exists in the `care-atlas` Firebase project.
3. Add the GitHub Pages host to Firebase Authentication > Settings > Authorized domains:

   `anshaysingh29-max.github.io`

4. Keep your local `.env.local` file. Phase 6B also includes `.env.production` containing the Firebase **web** configuration so GitHub Actions can build the public client. Firebase web config is not a service-account secret.

## Deploy updated Firestore rules

```powershell
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

The Phase 6B rules tighten patient case creation so patients cannot self-assign hospitals, coordinators or workflow stages.

## Test locally

```powershell
npm install
npm run dev
```

Test this flow:

1. Open `/register`.
2. Create a new test patient account.
3. Confirm the user appears in Firebase Authentication.
4. Confirm matching documents appear in Firestore under `users/{uid}` and `patients/{uid}`.
5. Open `/get-treatment-plan`.
6. Complete the form and submit.
7. Confirm a document appears in `cases` with the same patient UID.
8. Open `/patient` and `/patient/cases` and confirm the case is loaded from Firestore.
9. Sign out and confirm `/patient` redirects to `/login`.

## Build and push

```powershell
npm run build
git add .
git commit -m "Build CareAtlas Phase 6B real patient journey"
git push
```

GitHub Pages should redeploy automatically.

## What remains intentionally disabled

- Medical file upload: Phase 6C (Google Drive patient folders)
- Real CareAtlas admin case assignment: Phase 6D
- Real hospital users and treatment-plan submissions: Phase 6E
- Realtime messaging, notifications, formal consent/audit hardening: Phase 6F

## Development safety

Phase 6B makes authentication and case persistence real, but CareAtlas is still in development. Use test/non-sensitive patient data until the later consent, audit, admin access, hospital access and production-hardening work is completed.
