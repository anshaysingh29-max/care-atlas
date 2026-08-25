# CareAtlas Phase 7B — Patient Affiliates & Growth Tools

Phase 7B expands the Phase 7A referral network without changing the existing patient identity model.

## Added
- Existing patients can apply to become CareAtlas referral partners from `/patient/affiliate`
- One Firebase account can remain a **patient** and also hold an approved `partners/{uid}` profile
- No role-array migration: patient `users/{uid}.role` stays `patient`
- Approved patient-affiliates can open the existing `/partner` workspace with the same login
- Patient dashboard “Earn with CareAtlas” entry point
- Partner warm-lead submission at `/partner/leads`
- Internal CareAtlas lead queue at `/admin/partner-leads`
- Campaign-tagged referral links (`?ref=...&campaign=...`)
- WhatsApp sharing with compensation disclosure language
- Referral campaign persisted into attributed case metadata
- Self-referral signal and commission block
- Referral funnel dashboard
- Derived Starter / Growth / Pro partner levels
- Privacy-safe referral table improvements

## Partner levels
Levels are currently a display metric, not a security entitlement:
- Starter: 0–2 verified conversions
- Growth: 3–9
- Pro: 10+

## Privacy
Partner leads intentionally accept only minimum contact/context fields. Partners still cannot read another patient’s case, messages, consents, clinical records, or Google Drive documents.

## No new infrastructure
Phase 7B uses the existing Firebase Auth + Firestore + GitHub Pages architecture. No Apps Script changes are required.
