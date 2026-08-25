# CareAtlas Phase 7E Changelog

Phase 7E adds the CareAtlas Travel Concierge: patient travel readiness, visa/flight/ground-transport requests, CareAtlas operations coordination and a combined medical-travel itinerary.

## Added
- Patient `/patient/travel` workspace linked to each real treatment case.
- Travel profile with departure city, destination country, passport-readiness flag, companion count and mobility-support preference.
- Travel service requests for:
  - visa assistance,
  - flight assistance,
  - airport pickup,
  - local transport.
- CareAtlas operations queue at `/admin/travel`.
- Request lifecycle: requested → in review → documents needed → arranged → confirmed → completed, with decline/cancel paths.
- Provider/operator name, confirmation reference, estimate, currency and patient-visible operations note.
- Patient notifications whenever CareAtlas updates a travel request.
- CareAtlas itinerary builder for patient-visible travel/treatment events.
- Combined patient itinerary automatically merges:
  - CareAtlas-created itinerary events,
  - confirmed Stay Network check-in/check-out,
  - hospital consultations,
  - arranged/confirmed flight and ground-transport requests.
- Immutable audit events for CareAtlas travel operations.

## Privacy boundaries
- Phase 7E intentionally does not collect passport numbers or passport scans.
- Travel notes warn patients not to enter diagnosis, medical reports or passport identifiers.
- Transport/flight providers are not given Firestore access in this phase.
- CareAtlas staff remains the intermediary for manual concierge coordination.
- Travel records are case-linked but separate from clinical documents.

## New Firestore collections
- `travelProfiles`
- `travelRequests`
- `travelItineraryEvents`

## New routes
### Patient
- `/patient/travel`

### CareAtlas operations
- `/admin/travel`
