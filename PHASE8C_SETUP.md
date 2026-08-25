# CareAtlas Phase 8C Setup & Test Guide

Phase 8C is built on top of Phase 8B.

## 1. Install

Overlay the Phase 8C update ZIP onto your existing CareAtlas project.

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npm run dev
```

There is **no Firestore rules/index deployment required for 8C**.
There is **no Apps Script / Google Drive gateway redeployment required**.

## 2. Open the Growth CRM

Sign in with a CareAtlas staff/admin account and open:

```text
/admin/growth
```

You should see:

- active cases
- open partner leads
- hot recovery opportunities
- stale recoverable cases
- unconverted Care Navigator opportunities
- patient conversion funnel
- partner campaign performance
- recovery queue

## 3. Test a stale patient case

Use a non-production/test case and make sure it is active and either:

- has no coordinator, or
- has status `awaiting_patient`, or
- has not been updated for at least 3 days.

Open `/admin/growth` and recalculate.

The case should appear in the recovery queue with an explainable reason.

Use **Open case** to review the real case before contacting the patient.

If a recovery draft is shown, **Copy follow-up draft** only copies text to the clipboard. It does not send anything.

## 4. Test a partner lead

Create a test lead from an approved partner at:

```text
/partner/leads
```

The lead must have contact consent.

Then open:

```text
/admin/growth
```

The lead should appear as a Partner lead opportunity when it qualifies for follow-up.

Use `/admin/partner-leads` for actual lead status management.

## 5. Test campaign attribution

Create test partner links using campaign values such as:

```text
?ref=CA123&campaign=whatsapp
?ref=CA123&campaign=kenya-september
?ref=CA123&campaign=orthopedics
```

After attributed leads/cases exist, the Growth CRM campaign table should aggregate them by campaign.

## 6. Test AI Care Navigator recovery signal

Use the Care Navigator as a signed-in patient, save a shortlist, and do not create a treatment case.

The patient may appear as an unconverted Navigator engagement signal in `/admin/growth`.

This is not permission to contact the patient outside an appropriate CareAtlas communication basis.

## 7. Safety checks

Confirm all of the following:

- Growth scores do not read hospital commercials.
- Growth scores do not use medical severity or urgency.
- No patient message is sent automatically.
- No lead message is sent automatically.
- No case stage/status is changed automatically.
- Navigator engagement is not treated as clinical urgency.

## 8. Production build

```powershell
npm run build
```

Then push:

```powershell
git add .
git commit -m "Build CareAtlas Phase 8C Growth CRM Engine"
git push
```

## Notes

Phase 8C is an MVP growth-operations assistant. Before large-scale outreach, CareAtlas should define country-specific communication consent, marketing rules, retention periods, opt-out handling and CRM access policies.
