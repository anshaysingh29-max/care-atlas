# CareAtlas Phase 6A — Firebase Setup

This repository is prepared for Firebase Authentication + Cloud Firestore. Medical files are **not** stored in Firebase Storage in this phase; the planned document layer will use controlled Google Drive storage later.

## 1. Create the Firebase project

1. Open Firebase Console.
2. Create a project named **CareAtlas** (project ID can be different if `careatlas` is unavailable).
3. Google Analytics is optional for now; you can leave it off.

## 2. Register the web app

1. Project Overview -> **Add app** -> Web (`</>`).
2. App nickname: `CareAtlas Web`.
3. You do not need to enable Firebase Hosting during this registration screen.
4. Firebase will show a `firebaseConfig` object.

Create `.env.local` at the project root by copying `.env.example` and filling in the values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

The Firebase web config identifies your Firebase project; it is not a service-account secret. **Never put a Firebase service-account private key in `NEXT_PUBLIC_*` variables or commit one to Git.**

## 3. Enable Authentication

Firebase Console -> Build -> Authentication -> Get started -> Sign-in method.

Enable:

- **Email/Password**

Do not enable phone/SMS login yet.

## 4. Create Firestore

Firebase Console -> Build -> Firestore Database -> Create database.

Recommended initial location for an India-first operation: **`asia-south1` (Mumbai)**. The Firestore database location is an important long-term choice, so confirm it before creating the database.

Choose **Production mode**. The repository contains our own rules in `firestore.rules`.

## 5. Install dependencies locally

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npm install
```

## 6. Connect Firebase CLI

```powershell
npx firebase-tools login
npx firebase-tools use --add
```

Select the CareAtlas Firebase project and use alias `default`.

The CLI will create/update `.firebaserc`. Commit `.firebaserc` only if it contains only the public Firebase project ID (never credentials).

## 7. Deploy Firestore rules

```powershell
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

This does **not** move the website away from GitHub Pages. The existing GitHub Pages workflow can remain active while we implement the real backend.

## 8. Optional Firebase Hosting later

`firebase.json` is already prepared for the Next.js static `out` directory. When we deliberately choose to move the frontend from GitHub Pages:

```powershell
npm run build
npx firebase-tools deploy --only hosting
```

Do not switch hosting just for Phase 6A.

## Phase 6A files

- `.env.example` — Firebase browser environment template.
- `lib/firebase/client.js` — lazy Firebase app/Auth/Firestore initialization.
- `lib/firebase/auth.js` — patient auth/profile foundation for Phase 6B.
- `lib/firebase/roles.js` — canonical role names.
- `lib/firebase/collections.js` — canonical collection names.
- `firestore.rules` — least-privilege starter rules.
- `firestore.indexes.json` — index configuration.
- `firebase.json` — Firestore + optional Hosting configuration.

## Security notes

- GitHub Pages must still be treated as a prototype until Phase 6B replaces the demo login/session behavior.
- No real patient medical documents should be uploaded yet.
- Hospital/admin accounts must not self-register with privileged roles. Those roles will be provisioned by a trusted admin path later.
- Firestore rules, not page visibility, are the actual authorization boundary.
