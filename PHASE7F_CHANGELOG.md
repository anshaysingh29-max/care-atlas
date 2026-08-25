# CareAtlas Phase 7F — Reviews, Trust & Patient Outcomes

Phase 7F adds a trust layer on top of the real CareAtlas patient, hospital, hotel and operations flows.

## Added

- Patient `/patient/reviews` experience and support hub.
- Verified-journey review eligibility:
  - hospital/CareAtlas reviews only after a case reaches `treatment` or `follow_up`;
  - Stay Partner reviews only after a completed hotel booking.
- 1–5 star experience rating, recommendation flag and patient-reported outcome.
- Patient-reported outcome choices: much better, better, same, worse, prefer not to say.
- CareAtlas moderation lifecycle: pending review, published, rejected, hidden.
- Published provider copies are sanitized into a separate `publishedExperienceReviews` collection so hospital/hotel portals never receive patient UID, case ID or booking ID.
- Private patient concerns with operations workflow: open, in review, waiting on patient, resolved, closed.
- Hospital `/hospital/reviews` portal for published verified feedback and partner responses.
- Hotel `/hotel/reviews` portal for published verified Stay Network feedback and partner responses.
- Admin `/admin/reviews` moderation and concern-management console.
- Admin `/admin/quality` experience-quality dashboard.
- Internal provider signals: average rating, recommendation rate, patient-reported improvement rate, accurately targeted concerns and small-sample warning.
- Internal CareAtlas coordination experience summary with rating, recommendation rate and open CareAtlas concerns.
- Patient notifications for moderation and support-concern updates.
- Audit events for moderation, concern operations and provider responses.
- Firestore rules for `experienceReviews`, `reviewResponses` and `patientConcerns`.
- Firestore composite index for provider review queries.

## Privacy and clinical-safety decisions

- Hospitals and hotels do not receive patient contact details through the review module.
- Private concerns are visible only to the patient and CareAtlas staff.
- Provider portals see only CareAtlas-moderated published reviews for their own entity.
- Patient-reported outcome data is explicitly labelled as self-reported experience data, not independently verified clinical outcome evidence.
- The internal Experience Quality page is not a clinical certification, provider accreditation or safety score.
