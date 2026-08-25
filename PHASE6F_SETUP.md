# CareAtlas Phase 6F Setup

Phase 6F assumes the Firebase project, patient journey, Google Drive gateway, admin operations and hospital portal from Phases 6A–6E are present locally.

If your local folder is uncertain, use the **full Phase 6F ZIP** rather than the update ZIP. It contains the complete Phase 6E code plus Phase 6F.

## 1. Overlay the files

Extract the Phase 6F package over:

```text
C:\Users\ansha\NextJS Projects\careatlas
```

Do not replace `.env.local` with a blank template.

## 2. Deploy Firestore rules and indexes

From PowerShell:

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Wait for `Deploy complete!` before testing the new pages.

## 3. Update the Google Drive gateway

Phase 6F makes the Apps Script gateway consent-aware.

Open the existing **CareAtlas Drive Gateway** Apps Script project and replace its `Code.gs` with:

```text
apps-script/Code.gs
```

`Bridge.html` can also be recopied from the repository if you want the project to exactly match the source package.

Then use:

```text
Deploy → Manage deployments → Edit → New version → Deploy
```

Keep:

```text
Execute as: Me
Who has access: Anyone
```

Keep the existing `/exec` URL. The existing Script Properties remain:

```text
FIREBASE_API_KEY
FIREBASE_PROJECT_ID = care-atlas
ALLOWED_ORIGINS = https://anshaysingh29-max.github.io,http://localhost:3000
DRIVE_ROOT_FOLDER_ID = <created automatically earlier>
```

## 4. Record patient consent

Start the app:

```powershell
npm run dev
```

Sign in as the test patient and open:

```text
/patient/consents
```

Choose the test case and enable all three test permissions:

1. Medical data processing
2. Sharing with assigned hospitals
3. Care coordination messaging

Click **Save consent choices**.

Firestore should now contain:

```text
caseConsentStates/{caseId}
```

and immutable event rows under:

```text
consents/{eventId}
```

Every future change writes another consent event instead of editing old events.

## 5. Re-test documents

Open:

```text
/patient/documents
```

Upload only a small, non-sensitive test PDF/JPG/PNG.

Confirm:

```text
Google Drive
CareAtlas Patients
└── <CASE NUMBER>
    └── Medical Reports
        └── test-file.pdf
```

If Medical data processing is disabled, new upload must be blocked.

Sign in as an assigned hospital. With Hospital sharing disabled, hospital document access must remain locked. With both Medical data processing and Hospital sharing enabled, the assigned hospital can retrieve the test document through the authenticated Drive gateway.

## 6. Test real messaging

### Patient → CareAtlas

Open:

```text
/patient/messages
```

Choose the case and send a message to **CareAtlas team**.

### CareAtlas → Patient

Sign in to:

```text
/admin-login
```

Open the same case. The case detail now contains a CareAtlas patient messaging panel. Send a reply.

The patient should receive:

- the Firestore message;
- a notification bell item.

### Hospital ↔ Patient

Open:

```text
/hospital/messages
```

Choose an assigned case and send a test message. The patient should see the hospital conversation and a new notification.

New message creation is blocked if the patient withdraws Care coordination messaging consent.

## 7. Test notifications

Patient notifications are stored under:

```text
notifications/{notificationId}
```

They are created for important client-side MVP events such as:

- CareAtlas case stage/status updates;
- CareAtlas staff messages;
- hospital messages;
- hospital treatment-plan submissions;
- consultation proposals/status updates.

Only the intended patient can mark their notification as read. The notification contents cannot be edited by the patient.

## 8. Test the audit viewer

Sign in as a user whose Firestore role is:

```text
careatlas_admin
```

or:

```text
super_admin
```

Open:

```text
/admin/audit
```

The page reads immutable `auditLogs` created by CareAtlas and hospital actions. Coordinator/operations roles do not have audit-log read permission.

## 9. Optional Firebase App Check

Phase 6F includes App Check code but does not force you to enable it immediately.

When ready:

1. Open Firebase Console → **App Check**.
2. Register the CareAtlas Web App with a **reCAPTCHA v3** provider.
3. Copy the site key.
4. Add it locally:

```env
NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY=YOUR_RECAPTCHA_V3_SITE_KEY
```

For local development only, you can set:

```env
NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG=true
```

Start the app, copy the App Check debug token shown by Firebase in the browser console, and register that debug token in Firebase Console.

Never set the App Check debug flag to `true` in `.env.production`.

For GitHub Pages, add the real public site key to `.env.production` and rebuild. The site key is public browser configuration; it is not a server secret.

**Do not enable App Check enforcement for Firestore until the production deployment is successfully returning App Check tokens.** Enabling enforcement too early can block the entire portal.

## 10. Build

```powershell
npm run build
```

Then test all three roles once:

```text
Patient
CareAtlas admin
Hospital partner
```

## 11. Commit

Once the tests pass:

```powershell
git add .
git commit -m "Build CareAtlas Phase 6F production controls"
git push
```

Do not commit `.env.local`, service-account JSON, OAuth refresh tokens or Google account credentials.

## Production note

Phase 6F materially improves technical controls, but GitHub Pages + Firebase + Apps Script is still an MVP architecture. Before collecting real medical records, define and validate retention/deletion procedures, user access reviews, breach/incident procedures, legal consent wording, cross-border data handling, vendor agreements and the regulatory/privacy requirements that apply to the jurisdictions you operate in.
