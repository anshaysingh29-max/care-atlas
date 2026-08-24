# CareAtlas Phase 4 — Hospital Partner Portal

## Added
- Hospital partner sign-in prototype (`/hospital-login`)
- Hospital dashboard (`/hospital`)
- Incoming international patient case inbox (`/hospital/cases`)
- Detailed shared-case review (`/hospital/cases/ca-26082401`)
- Explicit record-permission and privacy UI
- Browser-only case status controls
- Treatment-plan list and structured plan builder
- Live treatment-plan preview with costs, stays, inclusions and exclusions
- Consultation availability management prototype
- Hospital profile / international desk preview
- Public header and footer now link "For Hospitals" to the partner sign-in

## Static-host safety
CareAtlas is still deployed to GitHub Pages. Phase 4 therefore contains demo hospital/patient data only. No patient records, credentials, clinical responses, schedules or status changes are transmitted or persisted to a backend.

## Production backend requirements before real use
- Verified hospital organizations and legal entities
- Role-based hospital users and MFA
- Consent-scoped record sharing and revocation
- Encryption at rest/in transit
- Per-record access audit logs
- Versioned treatment plans
- Secure messaging
- Consultation scheduling with timezone handling
- Data retention/deletion policies
- Compliance review for every operating geography
