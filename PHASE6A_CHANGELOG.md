# CareAtlas Phase 6A — Firebase Foundation

## Added

- Firebase JavaScript SDK (`firebase` 12.17.1).
- Firebase CLI development dependency.
- Environment-variable template for the Firebase Web App configuration.
- Lazy Firebase client initialization for Auth and Firestore.
- Canonical CareAtlas role constants and collection names.
- Patient registration/sign-in service foundation for Phase 6B.
- Firestore security rules covering patients, cases, hospitals, treatment plans, consultations, content, consent and audit boundaries.
- Firestore index configuration.
- Firebase Hosting configuration for a future migration from GitHub Pages.
- `.gitignore` protection for local environment files and Firebase local state.
- Step-by-step `FIREBASE_SETUP.md`.

## Not changed yet

- Patient login/register screens still use prototype behavior. Phase 6B will wire them to Firebase Auth.
- Current patient/case/dashboard data remains demo data until Phase 6B.
- Google Drive medical-document storage is not part of 6A.
- GitHub Pages remains the active frontend host.
