# CareAtlas Phase 8C — AI Growth & CRM Engine

Phase 8C adds an explainable growth operations layer across direct patient journeys, affiliate/partner leads, referral campaigns and Care Navigator engagement.

## New admin route

- `/admin/growth` — Growth & CRM Engine

## Growth workspace

The workspace combines existing Firestore data from:

- `cases`
- `partnerLeads`
- `referrals`
- `careMatchRuns`

It does not create a duplicate CRM database.

## Explainable opportunity scoring

The Growth Engine creates operational priority scores from non-clinical signals such as:

- journey stage
- recency / inactivity
- coordinator assignment
- patient-selected hospital preferences
- document-count signal
- Care Navigator engagement
- partner lead status
- consented partner-lead contact data
- campaign attribution

The score is a prioritization signal, **not a conversion probability** and **not medical triage**.

The engine intentionally does **not** use:

- clinical severity
- diagnosis severity
- patient health-risk scoring
- hospital commission percentage
- hospital commercial terms
- affiliate payout size

## Abandoned-journey recovery

CareAtlas operations can identify recoverable cases such as:

- patient input pending
- partner/provider input pending
- no coordinator assigned
- case inactive for 3+ days
- stale journey 7+ days

Patient-case follow-up drafts are copy-only. Staff must open the real case, review the message history and send through the existing CareAtlas messaging flow manually.

## Partner lead recovery

Consented partner leads receive explainable prioritization based on lead status, recency, campaign context and whether a treatment interest was supplied.

A safe outreach draft can be copied, but Phase 8C does not send WhatsApp, email, SMS or any other external message automatically.

## AI Care Navigator opportunity signal

Care Navigator match runs with a shortlist but no subsequent CareAtlas case are surfaced as discovery-engagement signals. These do not grant a new communication basis and must not be treated as clinical urgency.

## Conversion funnel

The admin workspace shows movement through:

Case created → Records review → Hospital matching → Treatment plans → Consultation → Hospital selected → Treatment

## Campaign attribution

Referral and partner-lead campaigns are aggregated with:

- introductions
- referred cases
- qualified signals
- treatment-verified referrals
- self-referral flags
- treatment-verified rate

## Backend impact

Phase 8C is read-only over existing business collections and therefore adds:

- no new Firestore collection
- no Firestore rules change
- no Firestore index change
- no Apps Script change
- no Google Drive gateway change
- no paid AI API

## New files

- `app/admin/growth/page.js`
- `app/phase8c.css`
- `components/AdminGrowthClient.js`
- `lib/ai/growth.js`
- `lib/firebase/growthAdmin.js`
- `PHASE8C_CHANGELOG.md`
- `PHASE8C_SETUP.md`
- `README_PHASE8C.txt`

Updated:

- `app/layout.js`
- `components/AdminShell.js`
- `README.md`
