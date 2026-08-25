# CareAtlas Phase 7A — Partner / Referral Network

Phase 7A adds a fourth CareAtlas actor: acquisition/referral partners.

## Added
- Partner application + Firebase login
- Admin approval before a referral code becomes active
- Unique partner referral code and tracked `?ref=CODE` links
- First-valid-referrer attribution stored for 60 days in the browser
- Referral automatically attached when the patient creates a CareAtlas case
- One referral record per case, preventing duplicate partner claims on the same case
- Partner dashboard with referral funnel, earnings and payout status
- Partner referrals screen exposing only minimum commercial journey data
- Marketing link + WhatsApp sharing
- Admin partner review and commission-rate configuration
- Admin referral-status management
- Revenue-share commission ledger based on eligible CareAtlas revenue
- Admin approve / hold / reject / paid states
- Manual payout tracking
- Audit events for partner, referral and commission changes
- Firestore rules separating partner data from patient medical records

## Privacy / commercial model
Partners do **not** receive diagnosis notes, patient files, direct contact details, treatment-plan documents, or consent records. Partner compensation is an acquisition arrangement and must not influence clinical recommendations, hospital ranking or patient treatment price.

Phase 7A does not automate bank/UPI payouts and is not a substitute for legal review of healthcare-referral compensation in every country where CareAtlas or a partner operates.
