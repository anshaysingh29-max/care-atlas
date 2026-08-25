# CareAtlas Phase 7D Setup — Stay Network

Phase 7D runs on the existing Firebase project and GitHub Pages architecture. No Google Drive / Apps Script changes are required.

## 1. Overlay the update

Extract the contents of `careatlas-phase7d-update.zip` over the existing CareAtlas repository.

## 2. Deploy Firestore rules

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Phase 7D does not require a new composite Firestore index, but deploying both keeps local Firebase configuration synchronized.

## 3. Start the app

```powershell
npm run dev
```

## 4. Register a Stay Partner

Open:

```text
http://localhost:3000/hotel-register
```

Create a test property. Firebase will create:

```text
users/{uid}
  role: hotel_partner
  hotelId: {same uid}
  status: active

hotels/{uid}
  ownerUserId: {same uid}
  status: pending_review
  commissionRatePct: 0
```

The hotel can sign in while pending, but it cannot publish rooms until approval.

## 5. Complete the property profile

Open:

```text
/hotel/profile
```

Add:
- property address
- room count
- amenities
- medical-travel-friendly features
- meal information
- optional external image URLs
- requested nearby CareAtlas-listed hospitals

For this MVP, direct hotel photo upload is intentionally not connected.

## 6. Approve the property

Sign in as a CareAtlas admin and open:

```text
/admin/hotels
```

Select the approved nearby hospital mapping, choose a CareAtlas booking commission (for example 12%), and approve the property.

The hotel document becomes:

```text
status: approved
commissionModel: booking_revenue_share
commissionRatePct: 12
nearbyHospitalIds: [...]
```

## 7. Publish rooms and availability

Sign back into the Stay Partner portal:

```text
/hotel/rates
/hotel/availability
```

Create at least one active room with a nightly rate, then optionally add date-specific availability.

## 8. Test the patient journey

Sign in as a patient with an existing CareAtlas case and open:

```text
/patient/stays
```

The patient can:
1. see approved Stay Partners,
2. see hospital-matched properties first when mappings exist,
3. choose a room,
4. enter check-in/check-out dates,
5. enter guests/companions,
6. add non-clinical accessibility or stay needs,
7. send a booking request.

A Firestore document is created in:

```text
hotelBookings/{HB-...}
```

The Stay Partner does **not** receive medical reports or diagnosis data.

## 9. Test the hotel booking workflow

Open:

```text
/hotel/bookings
```

Move the booking through:

```text
requested
→ quoted
→ confirmed
→ checked_in
→ completed
```

On completion, CareAtlas commission is calculated from the approved property commission rate and the settlement status becomes `pending`.

## 10. Test CareAtlas operations

Open:

```text
/admin/hotel-bookings
```

Operations can review booking status and, after manual payment to the hotel, set:

```text
settlementStatus: paid
settlementReference: <UTR / payment reference>
```

The hotel sees this under:

```text
/hotel/payouts
```

Automated hotel bank payouts are intentionally not connected in 7D.

## 11. Build and push

```powershell
npm run build

git add .
git commit -m "Build CareAtlas Phase 7D Stay Network"
git push
```

## Firestore collections added

```text
hotels
hotelRooms
hotelAvailability
hotelBookings
```

## Important MVP limitations
- Property identity and licensing are manually reviewed by CareAtlas.
- Hotel photos use external URLs only.
- Availability windows are partner-entered; there is no PMS/channel-manager sync yet.
- Booking requests are not card payments or instant reservations.
- Hotel settlement is manually recorded.
- The existing hospital catalogue is still demo data unless you replace it with verified providers.

Use test/non-sensitive data until production legal, tax, privacy, hotel contracting and payment controls are completed.
