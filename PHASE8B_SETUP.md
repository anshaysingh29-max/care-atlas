# CareAtlas Phase 8B Setup & Test Guide

Phase 8B is an overlay on top of Phase 8A.

## 1. Install

Extract the contents of `careatlas-phase8b-update.zip` over the existing CareAtlas project.

No new Firebase collection, Firestore composite index, Firestore rule deployment, Google Drive gateway deployment, or Apps Script deployment is required for 8B.

Run:

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npm run dev
```

## 2. Test the operations queue

Sign in with a CareAtlas staff/admin account and open:

```text
/admin/copilot
```

Confirm that active Firestore cases appear with:

- priority score/band;
- journey stage;
- patient/case summary;
- top blocker;
- assigned coordinator state;
- next operational action.

Try filters for urgent/high, blocked, unassigned and stale cases.

## 3. Create useful test conditions

Use test data only. In an existing case, try one or more of these conditions:

- remove the assigned coordinator;
- set stage to `records_review` while `documentCount` is zero;
- set status to `awaiting_patient`;
- set stage to `hospital_matching` without an assigned hospital;
- assign a hospital while Hospital Sharing consent remains inactive;
- set stage to `treatment_plans` without a treatment plan;
- set stage to `travel_preparation` without a stay/travel request.

Re-open `/admin/copilot` and select **Recalculate**.

## 4. Test the case Copilot

Open a real Firestore-backed case:

```text
/admin/cases/case?id=<firestoreCaseId>
```

The **Coordinator Copilot** panel should show:

- priority;
- summary;
- blockers;
- next actions;
- readiness checklist;
- optional patient-message draft.

Use **Refresh** after changing case operations.

## 5. Test draft handoff safely

If a patient-facing follow-up is appropriate, choose **Use in composer**.

Expected result:

1. the text appears in the existing Patient Messaging composer;
2. nothing is sent automatically;
3. staff can edit or delete the draft;
4. the staff member must click **Send message** manually;
5. normal CareAtlas messaging-consent validation still applies;
6. only the existing send action creates the patient notification/audit event.

Always read the full case and message thread before sending a Copilot draft.

## 6. Safety test

Confirm:

- no hospital is assigned by Copilot;
- no stage/status is changed by Copilot;
- no message is auto-sent;
- no `hospitalCommercials` values appear in Copilot output;
- the system does not produce diagnosis or treatment advice;
- passport numbers/scans are not requested through message templates.

## 7. Production build and push

```powershell
npm run build

git add .
git commit -m "Build CareAtlas Phase 8B Coordinator Copilot"
git push
```

GitHub Pages should deploy the static `/admin/copilot/` route after the build succeeds.
