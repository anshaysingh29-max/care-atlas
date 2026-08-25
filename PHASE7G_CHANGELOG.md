# CareAtlas Phase 7G — Hospital Network & Specialty Marketplace

## Added
- Hospital self-registration at `/hospital-register`.
- Applicant onboarding/status workspace at `/hospital/onboarding`.
- New `hospital_applicant` Firebase role that cannot access patient cases.
- Firestore-backed `hospitalApplications` review workflow.
- Admin hospital application queue at `/admin/hospitals`.
- Admin-only hospital commercial configuration at `/admin/hospital-commercials`.
- Firestore `hospitalCommercials` is unreadable by hospital users.
- Specialty master catalogue at `/admin/specialties`.
- Core specialty seed set plus admin-approved hospital specialty requests.
- Public `/specialties` marketplace and static-export-safe `/specialties/view?id=...` detail route.
- Homepage specialty discovery powered by the same marketplace source.
- Patient `/patient/discover` experience using the same specialties and published hospitals.
- Approved Firestore hospitals now feed `/hospitals` and static-export-safe `/hospitals/profile?id=...`.
- Hospital admin operational profile editing without access to specialty approval or commercials.
- Hospital team access request workflow at `/hospital/team`; privileged account creation remains CareAtlas-admin provisioned.

## Marketplace governance
- Hospital-declared specialties are never automatically published.
- A new specialty requested by a hospital must be approved in `/admin/specialties`.
- A hospital cannot be published until every requested specialty has a corresponding active specialty record.
- Publishing a hospital maps approved specialty IDs/names onto its public Firestore hospital record.
- Public and patient discovery both read the same specialty/hospital records.
- Existing demonstration hospitals and treatment data remain fallback content while real partner inventory grows.

## Commercial separation
Hospital users cannot read or write:
- CareAtlas commission percentage
- fixed referral fee
- revenue-share model
- settlement terms
- contract status
- internal commercial notes

Those fields live only in `hospitalCommercials/{hospitalId}` and are protected by admin-only Firestore rules.
