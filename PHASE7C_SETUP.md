# CareAtlas Phase 7C Setup

Phase 7C assumes Phase 7B is already present.

## 1. Overlay the update
Extract `careatlas-phase7c-update.zip` over:

```text
C:\Users\ansha\NextJS Projects\careatlas
```

## 2. Deploy Firestore rules
Phase 7C adds restricted KYC and payout collections.

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

No Google Apps Script / Drive gateway redeploy is required for Phase 7C.

## 3. Start locally

```powershell
npm run dev
```

## 4. Complete partner verification
Use an already approved test partner or patient-affiliate and open:

```text
/partner/verification
```

Submit test KYC details and a test bank/UPI payout destination.

Expected Firestore documents:

```text
partnerKyc/{partnerUid}
partnerPayoutProfiles/{partnerUid}
```

Both start with:

```text
status = submitted
```

Do not use real PAN, bank-account or other sensitive identifiers while this is still the MVP architecture.

## 5. Admin review
Sign in as a CareAtlas admin and open:

```text
/admin/partner-kyc
```

Review both sections and set:

```text
KYC status = verified
Payout destination status = verified
```

The page also flags duplicate tax IDs and duplicate payout destinations if the same test value is used by multiple partner profiles.

## 6. Commission approval test
Create a referral commission through the existing Phase 7A/7B flow.

Attempting to change a commission from `pending` to `approved` before KYC verification should fail.

After KYC verification, approval should succeed.

## 7. Configure payout threshold
Open:

```text
/admin/payouts
```

The default threshold is:

```text
INR 1,000
```

Save a different test value if needed. It is stored at:

```text
systemSettings/partnerPayouts
```

## 8. Partner requests payout
As the verified partner, open:

```text
/partner/payouts
```

When approved earnings meet the threshold, click the payout request button.

Expected Firestore document:

```text
partnerPayoutRequests/{partnerUid}
status = requested
```

The request snapshots the IDs and gross amount of currently approved commissions.

## 9. Admin settles payout
Return to:

```text
/admin/payouts
```

For the test request:
1. Enter optional tax withheld.
2. Enter a test UTR / bank / UPI payment reference.
3. Add an optional settlement note.
4. Click `Mark paid`.

Expected results:
- every commission in the request becomes `paid`,
- linked referrals show `commissionStatus = paid`,
- `partnerPayoutRequests/{uid}.status = paid`,
- a new immutable `payoutSettlements/{settlementId}` record is created,
- the operation is recorded in `auditLogs`.

The partner should now see the payment under `/partner/payouts` and can download the CSV statement.

## 10. Test hold/reject
Create another eligible test payout later and verify:

```text
requested -> on_hold
requested/on_hold -> rejected
```

After a rejected or paid request, the same partner can request a new payout once new approved commissions are available.

## 11. Build and push

```powershell
npm run build

git add .
git commit -m "Build CareAtlas Phase 7C partner KYC and payouts"
git push
```

## Production note
This is a functional manual-settlement MVP, not a production banking/KYC system. Before real payouts, complete tax/legal review, vendor due diligence, field-level data protection, finance reconciliation, maker-checker controls, payout-provider integration where appropriate, and healthcare-referral compensation review for each operating jurisdiction.
