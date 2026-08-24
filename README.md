# CareAtlas

**Healthcare without borders.**

CareAtlas is a medical-travel product concept for international patients to discover treatments, explore destinations, compare hospitals and prepare a structured treatment request.

## Current build: Phase 2

Phase 1 public discovery:
- Homepage and treatment search
- Treatment pages
- Destination pages
- Hospital directory and profiles
- Doctor profiles
- How it works

Phase 2 conversion experience:
- 5-step Get Treatment Plan intake
- Medical-record selection UI with a prototype privacy safeguard
- Hospital comparison (up to 3 providers)
- Browser-persisted comparison shortlist
- Patient sign-in and registration prototype
- Conversion CTAs wired into hospital, doctor and treatment pages
- GitHub Pages static-export configuration

## Important prototype limitation

The GitHub Pages version is a **static product preview**. It deliberately does **not** upload medical records, store passwords, create real user accounts, or transmit patient medical information. Those capabilities require a secure backend, authentication service, encrypted storage, consent controls and access/audit policies before real patient data is collected.

Provider names, ratings, accreditations, pricing and doctors in the demo dataset are illustrative placeholders and must be replaced with verified partner data before production use.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## GitHub Pages

The project uses `output: 'export'` and the Pages workflow at `.github/workflows/nextjs.yml`. Push to `main` to trigger a deployment.
