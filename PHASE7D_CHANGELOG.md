# CareAtlas Phase 7D Changelog

Phase 7D adds the CareAtlas Stay Network: property onboarding, partner operations, patient accommodation requests and internal hotel booking operations.

## Added
- Self-service Stay Partner registration and Firebase login.
- New `hotel_partner` user role.
- Property application workflow with admin approval, correction, rejection and suspension.
- Property profile fields for location, room count, amenities, medical-travel-friendly features, meal options and image URLs.
- CareAtlas hospital-proximity mapping controlled during admin review.
- Hotel rooms and base nightly rates.
- Date-specific availability windows and optional rate overrides.
- Patient `/patient/stays` experience with approved property matching, room selection and booking requests.
- Hotel booking workflow: requested → quoted → confirmed → checked in → completed.
- Hotel settlement tracking with CareAtlas booking-fee calculation.
- Admin hotel application and hotel booking operations screens.
- Immutable hotel-partner audit events for room and booking actions.

## Security boundaries
- Stay Partners do not gain access to patient cases, treatment plans, medical documents, consent records or clinical messages.
- A hotel booking exposes only accommodation data required to fulfil the stay: patient alias, dates, guests, room, case reference and non-clinical accessibility/stay notes.
- Hotel publishing is blocked until CareAtlas approval.
- Patient booking requests can target approved properties and active rooms only.
- Hotel settlement remains manually recorded in this MVP.

## New routes
### Stay Partner
- `/hotel-register`
- `/hotel-login`
- `/hotel`
- `/hotel/bookings`
- `/hotel/rates`
- `/hotel/availability`
- `/hotel/payouts`
- `/hotel/profile`

### Patient
- `/patient/stays`

### Admin
- `/admin/hotels`
- `/admin/hotel-bookings`
