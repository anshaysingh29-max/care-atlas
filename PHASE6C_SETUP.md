# CareAtlas Phase 6C — Google Drive Document Gateway Setup

Phase 6C stores medical files in a private Google Drive folder while Firebase Auth + Firestore remain the identity and data layer.

No Firebase Storage is required.

## Architecture

```text
Patient browser
  -> Firebase Auth ID token
  -> hidden CareAtlas Apps Script bridge
  -> Apps Script validates the Firebase token
  -> Apps Script checks the Firestore case with the same token
  -> private Google Drive case folder

Firestore stores document metadata only:
caseDocuments/{documentId}
```

The Drive folder layout is created automatically:

```text
CareAtlas Patients/
  CA-260824-AB12/
    Medical Reports/
      MRI.pdf
      Blood Report.pdf
```

Files are not set to "Anyone with the link". The UI never opens raw Drive URLs.

## 1. Create the Apps Script project

Open https://script.google.com and create a new project called:

`CareAtlas Drive Gateway`

Create these three files in that project and copy them from this repository:

- `apps-script/Code.gs`
- `apps-script/Bridge.html`
- `apps-script/appsscript.json` (Project Settings -> Show `appsscript.json` manifest file first)

## 2. Configure Script Properties

Apps Script -> Project Settings -> Script Properties.

Add:

- `FIREBASE_API_KEY` = your Firebase web API key
- `FIREBASE_PROJECT_ID` = `care-atlas`
- `ALLOWED_ORIGINS` = `https://anshaysingh29-max.github.io,http://localhost:3000`

Do not put a Google password, OAuth refresh token, Firebase service-account JSON, or private key in the website.

`DRIVE_ROOT_FOLDER_ID` is optional. If omitted, the setup function creates `CareAtlas Patients` and stores its folder ID automatically.

## 3. Authorize Drive and create the root folder

In Apps Script select the function:

`setupCareAtlasDrive`

Click **Run** once.

Google will ask the script owner to authorize Drive access and outbound HTTPS requests. Approve it only on the Google account that should own the CareAtlas patient files.

The function creates:

`My Drive / CareAtlas Patients`

You can move this root folder to another private location in the same Drive later; the script stores the folder ID.

## 4. Deploy as a Web App

Apps Script -> Deploy -> New deployment -> Web app.

Use:

- Execute as: **Me**
- Who has access: **Anyone**

Why "Anyone"? The iframe gateway must be reachable by CareAtlas patients who may not use Google accounts. The endpoint itself does not trust anonymous callers: every upload/download/delete operation verifies the patient's Firebase ID token and checks Firestore access before touching Drive.

Copy the production URL ending in `/exec`.

Do not use the `/dev` test deployment URL in production.

## 5. Configure CareAtlas

In `.env.local` add:

```env
NEXT_PUBLIC_DRIVE_GATEWAY_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

For the current GitHub Pages deployment, also put the same public gateway URL in `.env.production` so GitHub Actions has it at build time.

This URL is not a secret. Do not put Drive credentials or script OAuth tokens in browser environment variables.

## 6. Deploy updated Firestore rules

```powershell
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

The new `caseDocuments` rules require:

- patient owns the case when creating metadata;
- patients only read/delete their own document metadata;
- CareAtlas staff can read metadata;
- assigned hospitals are already structurally supported for the later hospital phase;
- metadata cannot be edited client-side after creation.

## 7. Build and test

```powershell
npm run build
npm run dev
```

Test with a non-sensitive PDF/JPG/PNG under 8 MB:

1. Sign in as a patient.
2. Ensure the patient already has a CareAtlas case.
3. Open `/patient/documents`.
4. Choose a case and category.
5. Upload the test file.
6. Confirm Drive contains `CareAtlas Patients/<case number>/Medical Reports/<file>`.
7. Confirm Firestore contains a `caseDocuments` record.
8. Refresh the page and confirm the document remains listed.
9. Download it through CareAtlas.
10. Remove it and confirm the Drive file is moved to Trash and Firestore metadata is removed.

## Security design in 6C

- Apps Script runs as the Drive owner so patients never receive Google Drive credentials.
- Firebase ID tokens are verified through Firebase Auth's account lookup endpoint.
- Case access is checked through Firestore using the same patient's token, so deployed Firestore Rules remain part of the authorization decision.
- Each uploaded Drive file gets a random capability marker in its Drive description. Download/delete requires the matching unguessable value from the protected Firestore metadata, preventing a fabricated Drive file ID from being used to fetch unrelated Drive content.
- The Apps Script iframe accepts requests only from configured CareAtlas origins.
- Google Drive files remain private and no shareable Drive URL is returned to the browser.

## MVP limits

Phase 6C deliberately caps each file at 8 MB. This keeps base64 transfer through the free Apps Script bridge predictable. Larger radiology archives, DICOM studies and bulk uploads should later move to proper object storage or a dedicated healthcare document service.

Use test/non-sensitive records until consent, hospital permissions, audit logging, incident controls and the final production-hardening phase are complete.
