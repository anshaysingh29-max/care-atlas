# CareAtlas — Phase 1

A working Next.js prototype for the public CareAtlas medical-travel discovery experience.

## Included routes

- `/` — Homepage and treatment search
- `/treatments` — Treatment discovery
- `/treatments/[slug]` — Treatment detail
- `/destinations` — Destination discovery
- `/destinations/[country]` — Destination detail
- `/hospitals` — Hospital directory
- `/hospitals/[slug]` — Hospital profile
- `/doctors/[slug]` — Doctor profile
- `/how-it-works` — CareAtlas journey

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Important before production

The hospitals, doctors, ratings, prices, accreditations and profile metrics are **demonstration data** created to complete the Phase 1 UX. Replace them with verified partner data before launch.

The current enquiry CTAs use placeholder `@careatlas.example` email addresses so the prototype has visible interaction without requiring backend credentials. These should be replaced by the Phase 2 case intake flow.

## Phase 2 connection points

The data model and route structure are ready for:

- authentication
- multi-step treatment-plan intake
- private document upload
- hospital comparison
- patient dashboard
- real treatment-plan requests
