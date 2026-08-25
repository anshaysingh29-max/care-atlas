# CareAtlas Phase 7A Setup — Partner Network

## 1. Overlay the update
Extract `careatlas-phase7a-update.zip` over the current Phase 6F repository.

## 2. Deploy Firestore rules
```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

## 3. Build and run
```powershell
npm run build
npm run dev
```

## 4. Create a partner
Open:
`http://localhost:3000/partner-register`

Register a test partner. The partner can sign in immediately, but the referral code remains **pending** and cannot attribute patients yet.

Firestore creates:
- `users/{uid}` with role `partner`
- `partners/{uid}` with status `pending_review`

No patient document is created for this account.

## 5. Approve the partner
Sign into CareAtlas operations and open:
`/admin/partners`

Set the desired revenue-share rate (for example 20%) and click **Approve**.

Approval creates/activates:
`referralCodes/{CODE}`

Only the exact code can be publicly validated; Firestore rules do not allow public code enumeration.

## 6. Test attribution
Sign out of the partner account or use another browser/incognito window.

Copy the partner link from `/partner/marketing`, for example:
`http://localhost:3000/?ref=CAxxxxxxxxx`

The first valid referral code is retained in localStorage for 60 days.

Create/sign into a patient account and submit a treatment request. After the case is created, Firestore should contain:
`referrals/{caseId}`

The referral contains privacy-safe commercial tracking data only. The partner does not get access to the underlying `cases/{caseId}` document or medical documents.

## 7. Partner view
Sign back in at:
`/partner-login`

Verify:
- `/partner`
- `/partner/referrals`
- `/partner/earnings`
- `/partner/payouts`
- `/partner/marketing`
- `/partner/profile`

## 8. Admin referral and commission flow
Open:
- `/admin/referrals`
- `/admin/commissions`
- `/admin/payouts`

Recommended flow:
1. Case created
2. Mark referral `Qualified`
3. Continue normal hospital/case operations
4. When the commercial outcome is verified, enter **eligible CareAtlas revenue**
5. Create pending commission
6. Approve commission
7. Finance settles it outside CareAtlas
8. Mark commission `Paid`

The partner sees each commission state in their own portal.

## Attribution rules in 7A
- Attribution model: first valid referrer
- Browser attribution window: 60 days
- One referral document per CareAtlas case (`referrals/{caseId}`)
- A second referral cannot overwrite that case's attribution
- Admin changes are audited

This is an MVP attribution mechanism. Future anti-fraud hardening should add server-side lead identity matching, duplicate-phone/email checks, campaign rules, device/risk signals and stronger cross-device attribution.

## Healthcare referral compliance note
Do not assume every partner type can legally receive healthcare referral commissions in every jurisdiction. Clinical professionals, regulated intermediaries, government-linked entities and certain healthcare arrangements may require stricter rules or may prohibit fee-splitting/referral payments. Keep admin approval and jurisdiction review mandatory before enabling real-money payouts.

## Commit
```powershell
git add .
git commit -m "Build CareAtlas Phase 7A partner referral network"
git push
```
