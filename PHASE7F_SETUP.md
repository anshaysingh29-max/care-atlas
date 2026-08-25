# CareAtlas Phase 7F Setup & Test Guide

## 1. Overlay the update

Copy the contents of `careatlas-phase7f-update` over the current Phase 7E project.

## 2. Deploy Firestore security rules and indexes

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

No Google Drive / Apps Script redeployment is required for Phase 7F.

## 3. Start locally

```powershell
npm run dev
```

## 4. Test a hospital review

1. Sign in as a patient with a real Firestore case.
2. In admin, move the test case to `treatment` or `follow_up` and make sure at least one hospital is assigned.
3. Open `/patient/reviews`.
4. Choose the assigned hospital and submit a review.
5. Verify Firestore creates `experienceReviews/{deterministicReviewId}` with `status = pending_review`.
6. Sign in as CareAtlas admin and open `/admin/reviews`.
7. Publish the review.
8. Sign in as the assigned hospital and open `/hospital/reviews`.
9. Confirm the published review is visible without patient identity/contact details.
10. Save a provider response and verify `reviewResponses/{reviewId}` and an audit event.

## 5. Test a Stay Partner review

1. Use a patient with a real hotel booking.
2. Move the booking to `completed` using the Stay Partner/Admin workflow.
3. Open `/patient/reviews` and submit the hotel review.
4. Publish it from `/admin/reviews`.
5. Sign in as that hotel and verify it under `/hotel/reviews`.

## 6. Test a private patient concern

1. Patient opens `/patient/reviews`.
2. Submit a concern linked to one of the patient's cases.
3. Verify `patientConcerns/{id}` is created with `status = open`.
4. Admin opens `/admin/reviews` → Patient concerns.
5. Change the status, assignee and resolution/patient update.
6. Verify the patient receives an in-app notification and sees the updated concern history.

## 7. Test Experience Quality

Open `/admin/quality` after publishing several reviews. The page groups experience signals by hospital/Stay Partner and marks providers with fewer than 5 published reviews as a small sample.

Do not describe these metrics as clinical outcomes, provider accreditation or safety certification.

## 8. Production compile

```powershell
npm run build
```

Then commit and push:

```powershell
git add .
git commit -m "Build CareAtlas Phase 7F reviews and trust layer"
git push
```

## Collections added

- `experienceReviews` (private patient + CareAtlas moderation record)
- `publishedExperienceReviews` (sanitized provider-facing copy)
- `reviewResponses`
- `patientConcerns`

Existing collections reused:

- `cases`
- `hotelBookings`
- `notifications`
- `auditLogs`
