# CareAtlas Phase 2 — Conversion

## Added
- `/get-treatment-plan` — five-step international patient intake
- `/compare` — up-to-three hospital comparison with browser-saved shortlist
- `/login` — static patient sign-in prototype
- `/register` — static registration prototype
- Browser-only comparison controls on hospital cards and hospital profiles
- Prototype privacy safeguards around medical documents and credentials

## Updated
- Navigation now links to real Sign in, Compare and Get Treatment Plan pages
- Treatment, doctor and hospital CTAs now route into the structured intake
- Search planner uses the Next router for GitHub Pages compatibility
- How It Works reflects the Phase 2 journey
- Footer and prototype labels updated to Phase 2

## Static hosting limitation
GitHub Pages has no secure application backend. The Phase 2 preview intentionally does not transmit medical documents, create real authentication accounts, store passwords, or persist patient cases. Real patient data should only be enabled after a secure backend, encrypted storage, authorization, consent and audit controls are in place.
