# CareAtlas Phase 8E Setup

## 1. Overlay the update
Copy the contents of `careatlas-phase8e-update` over the existing Phase 8D project.

## 2. Deploy Firestore rules
Phase 8E adds internal workflow collections, so deploy the updated rules:

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules
```

No Firestore index deployment is required for 8E.
No Google Drive / Apps Script redeployment is required.

## 3. Run locally

```powershell
npm run dev
```

Open:

```text
/admin/tasks
/admin/automation
```

`/admin/automation` requires `careatlas_admin` or `super_admin`.

## 4. First functional test
1. Create or use an active patient case with no coordinator.
2. Open `/admin/tasks`.
3. Click **Run workflow sync**.
4. Confirm an `Assign a CareAtlas coordinator` task appears.
5. Open the case and assign a coordinator through the normal Case Control section.
6. Run workflow sync again.
7. Confirm the automation task is marked completed with `signal_resolved` rather than changing the case itself.

## 5. SLA test
In `/admin/automation` reduce one safe test rule to 1 hour and save it. Create a matching test case or temporarily use an old test case whose source timestamp is already past the SLA, run sync, then verify `/admin/tasks` shows the task as overdue with an escalation level.

Do not manipulate real patient cases only to test an SLA.

## 6. Manual task test
From `/admin/tasks` or a case Tasks & SLA panel:
- create a manual task;
- take ownership;
- mark it In progress;
- complete it;
- reopen it.

Verify corresponding `auditLogs` entries appear for task changes.

## 7. Browser-run MVP limitation
Phase 8E intentionally does **not** claim background automation. With GitHub Pages + Firebase alone there is no trusted scheduled process running while nobody is signed in.

Current behavior:

```text
Staff opens CareAtlas operations
        ↓
Run workflow sync
        ↓
Current Firestore workflow signals evaluated
        ↓
Tasks created/refreshed/resolved idempotently
        ↓
SLA timers + overdue escalation calculated live
```

A future production version can move the sync invocation to a secure Cloud Scheduler / Cloud Function or another approved server-side job if budget and compliance requirements justify it.

## 8. Production compile

```powershell
npm run build

git add .
git commit -m "Build CareAtlas Phase 8E Workflow Automation SLA Engine"
git push
```

## Collections

```text
workflowTasks/{taskId}
workflowAutomationConfig/default
workflowAutomationRuns/{runId}
```

All three are internal CareAtlas operations collections. Patients, hospital users, hotel partners and affiliates have no access.
