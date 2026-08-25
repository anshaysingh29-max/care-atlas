# CareAtlas Phase 7B Setup

Phase 7B assumes Phase 7A is already in your repository.

## 1. Overlay the update
Extract `careatlas-phase7b-update.zip` over:

```text
C:\Users\ansha\NextJS Projects\careatlas
```

## 2. Deploy Firestore rules
Phase 7B changes partner permissions so a user can remain a patient while also holding a partner profile.

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

No Google Apps Script redeploy is required.

## 3. Test patient → affiliate
Run:

```powershell
npm run dev
```

Sign in with an existing patient account and open:

```text
/patient/affiliate
```

Submit the application.

Expected Firestore behavior:
- `users/{uid}.role` remains `patient`
- the existing `patients/{uid}` stays untouched
- a new `partners/{uid}` is created with `status = pending_review`
- the same UID is used everywhere

This is deliberate. Do not change the patient’s role to `partner`.

## 4. Approve from admin
Sign in as a CareAtlas admin and open:

```text
/admin/partners
```

Approve the patient’s partner application and choose the commission rate.

Admin approval activates:

```text
referralCodes/{CODE}
```

## 5. Verify dual access
Using the same patient login:
- `/patient` must still work
- `/patient/affiliate` should show the active partner code
- `/partner` must now work without another Firebase account
- Partner workspace has a `Back to patient portal` link

## 6. Test campaign tracking
Open:

```text
/partner/marketing
```

Choose a campaign or type a custom tag.

Example:

```text
https://anshaysingh29-max.github.io/care-atlas/?ref=CA...&campaign=community
```

Open the link in a clean/incognito browser, create/sign in as another patient, and create a treatment case.

The corresponding `referrals/{caseId}` should contain:
- `campaign`
- `selfReferral`
- original attribution fields

## 7. Self-referral test
If an approved patient-affiliate uses their own referral code for their own treatment case, the referral is marked:

```text
selfReferral = true
```

It remains visible for audit/fraud review but commission creation is blocked.

## 8. Test warm leads
As an approved partner open:

```text
/partner/leads
```

Submit only a consenting test contact. Do not enter real clinical records.

Admin/staff can review it at:

```text
/admin/partner-leads
```

Partner leads support:
`new → contacted → qualified → converted / closed`.

## 9. Build and push

```powershell
npm run build

git add .
git commit -m "Build CareAtlas Phase 7B patient affiliates and growth tools"
git push
```

## Security / compliance note
Referral compensation and healthcare marketing rules vary by jurisdiction. Before real launch, review the commercial arrangement, disclosures, tax/KYC/payout requirements, anti-kickback/referral restrictions, advertising rules, and privacy obligations in every market where CareAtlas operates.
