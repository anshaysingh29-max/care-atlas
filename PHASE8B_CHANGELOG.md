# CareAtlas Phase 8B — Coordinator Copilot

Phase 8B adds an explainable operations copilot for CareAtlas staff. It is intentionally human-in-control and uses structured CareAtlas workflow records rather than an external generative-model API.

## New admin route

- `/admin/copilot` — prioritized live case queue with operational blockers and next-best-action suggestions.

## Case-level Copilot

Every real admin case can now show:

- operational priority score and band;
- concise journey summary;
- detected blockers;
- ordered next actions;
- journey-readiness checklist;
- optional patient-safe message draft;
- algorithm version and generated timestamp.

The draft can be inserted into the existing CareAtlas message composer, but it is never sent automatically. Existing messaging consent, notification and audit behavior continues to apply.

## Signals checked

The deterministic engine can flag scenarios such as:

- active case without a coordinator;
- case with no update for 3+ days;
- case awaiting patient input;
- records-review stage without uploaded documents;
- records present without Medical Data Processing consent;
- hospital-matching stage without an assigned hospital;
- assigned hospital/documents without Hospital Sharing consent;
- treatment-plan stage without a recorded treatment plan;
- consultation stage without an active consultation;
- travel-preparation stage without travel/stay activity;
- a patient message that may still need a staff response.

## Safety boundaries

Coordinator Copilot does not:

- diagnose a patient;
- recommend clinical treatment;
- automatically select or assign a hospital;
- read hospital commercial terms for prioritization;
- inspect document contents to make clinical judgments;
- automatically send patient messages;
- replace the CareAtlas coordinator or clinical team.

## Data architecture

8B reuses existing Firestore collections and does not create a new Copilot-data store. Analysis is calculated live to reduce duplicated sensitive information. Existing case-message sending remains the auditable write path.

Algorithm version: `careatlas-8b-2026-08-25-v1`.
