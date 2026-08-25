# CareAtlas Phase 8A — AI Care Navigator & Explainable Hospital Matching

## Added
- Public AI Care Navigator at `/care-navigator`.
- Patient AI Care Concierge at `/patient/concierge`.
- Admin match-audit view at `/admin/ai-matching`.
- Explainable matching engine in `lib/ai/matching.js`.
- Live Firestore hospital + specialty marketplace data is used for candidate selection.
- Only published, non-suspended CareAtlas hospital partners are eligible for recommendations.
- Demo hospitals are deliberately excluded from AI recommendation results.
- Controlled catalogue search for specialties and known treatments without symptom diagnosis.
- Preference inputs for destination, language, international-patient support and budget band.
- Hospital fit score with visible reasons and missing-information gaps.
- Patient shortlist saving to secure Firestore records.
- Immutable saved match-run snapshots for CareAtlas audit/review.
- AI shortlist context can be carried into `/get-treatment-plan` through static-export-safe query parameters.
- Submitted cases may record patient-preferred hospital IDs and the Care Navigator algorithm version without auto-assigning a hospital.
- Admin case operations show patient Care Navigator context while keeping final provider assignment under CareAtlas operations control.
- Homepage and patient discovery CTA into the AI Care Navigator.

## Matching governance
CareAtlas 8A is intentionally an explainable decision-support engine, not a diagnosis engine.

The ranking uses only:
- CareAtlas-approved specialty capability
- published provider status
- provider-profile completeness
- patient-selected destination preference
- patient-selected language preference
- patient-selected international support priorities
- provider-specific pricing only when that price is actually published

The ranking does **not** use:
- CareAtlas hospital commission
- hospital revenue-share percentage
- affiliate/referral payout
- internal commercial notes
- unpublished hospitals
- patient medical-document contents
- predicted clinical outcomes

Commercial terms remain admin-only and are never imported into the matching module.

## Data minimisation
Public Care Navigator sessions are not persisted.

Patient shortlist saving stores normalized fields such as specialty ID, treatment slug, destinations, languages, support priorities, budget band and ranked hospital IDs. Raw free-text symptoms/medical narratives are not stored by the Care Navigator module.

## New Firestore collections
- `careNavigatorProfiles/{patientUid}` — latest saved normalized shortlist/preferences.
- `careMatchRuns/{matchRunId}` — immutable patient-saved matching audit snapshot.
