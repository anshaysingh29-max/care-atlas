# Phase 6B Changelog

## Real Firebase patient authentication
- Patient registration now creates a Firebase Authentication user.
- Registration atomically creates matching `users/{uid}` and `patients/{uid}` Firestore documents.
- Patient login now uses Firebase Authentication.
- Password reset is enabled.
- Patient sessions persist through Firebase Auth.
- Patient portal routes redirect unauthenticated visitors to `/login`.
- Patient sign-out is real.

## Real Firestore patient cases
- Treatment-plan intake now creates a real Firestore `cases` document.
- Cases are linked to the authenticated Firebase UID.
- Human-friendly case references are generated as `CA-YYMMDD-XXXX`.
- Patient profile details are updated when a case is submitted.
- Case stage starts at `case_submitted`.
- Patients cannot self-assign hospitals, coordinators or operational workflow stages.

## Real patient dashboard
- `/patient` loads the authenticated patient's Firestore cases.
- Journey state is driven by `currentStage` rather than demo constants.
- Hospital assignment count, case count and coordinator status come from Firestore.
- Fake patient/provider information was removed from the overview.

## Real case page
- `/patient/cases` lists cases belonging to the logged-in patient.
- Multiple cases can be selected.
- Treatment, destinations, timing, diagnosis and stage come from Firestore.

## Safe continuation of the intake flow
- If a visitor completes a treatment request before signing in, the form is temporarily saved in browser `sessionStorage`.
- After account creation/sign-in, the draft is restored for final submission.
- Medical files remain browser-preview-only and are not stored yet.

## GitHub Pages / production Firebase config
- `.env.production` supplies Firebase's public web configuration to the GitHub Actions build.
- No service-account credentials or server secrets are included.
