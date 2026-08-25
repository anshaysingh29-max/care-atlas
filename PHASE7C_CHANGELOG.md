# CareAtlas Phase 7C Changelog

Phase 7C closes the affiliate money loop with manual KYC review, verified payout destinations, withdrawal requests and audited settlement records.

## Partner-facing
- Added `/partner/verification`.
- Added Individual vs Business / Agency KYC details.
- Added tax-ID/manual-review fields with masked display after verification.
- Added Bank Transfer and UPI payout-destination setup.
- Upgraded `/partner/payouts` into a wallet-style view:
  - pending commission value
  - approved/available balance
  - paid lifetime
  - minimum payout threshold
  - active payout request
  - payout history
  - downloadable CSV payout statement
- A payout can only be requested when:
  - the partner is approved,
  - Partner KYC is verified,
  - the payout destination is verified,
  - approved earnings meet the configured threshold.
- Patient-affiliates use the exact same verification and payout flow under their existing Firebase UID.

## Admin-facing
- Added `/admin/partner-kyc`.
- Admin can verify, request correction, or reject KYC and payout destinations.
- Duplicate tax IDs and duplicate bank/UPI destinations are flagged for manual fraud review.
- Commission approval now requires verified Partner KYC.
- Upgraded `/admin/payouts` with:
  - configurable minimum payout threshold,
  - payout-request queue,
  - manual tax-withholding amount,
  - UTR/bank/UPI payment reference,
  - hold/reject controls,
  - audited `Mark paid` settlement,
  - completed settlement history.
- Paying a request atomically marks all included approved commissions as paid and writes a settlement record.

## Firestore collections
- `partnerKyc/{partnerId}`
- `partnerPayoutProfiles/{partnerId}`
- `partnerPayoutRequests/{partnerId}`
- `payoutSettlements/{settlementId}`
- `systemSettings/partnerPayouts`

## Security model
- Partners can only read their own KYC, payout profile, payout request and settlement history.
- Only CareAtlas admins can review KYC/payout profiles and settle payouts.
- Settlement recalculates the approved commission ledger before payment can be recorded.
- Direct commission `paid` transition was removed from the normal commission UI workflow; settlement should go through `/admin/payouts`.

## Important MVP limitation
Phase 7C stores manual verification data in Firestore. Use test/non-sensitive identifiers during MVP validation. Before production, move sensitive tax/bank verification to a compliant KYC/payout provider or a properly encrypted server-side workflow and complete jurisdiction-specific tax/referral-payment review.
