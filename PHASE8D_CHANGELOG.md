# CareAtlas Phase 8D — Revenue & Business Intelligence

Phase 8D adds an admin-only financial intelligence layer across treatment cases, hospitals, affiliates, the Stay Network, destinations and treatment lines.

## New admin route

- `/admin/business-intelligence` — executive revenue and contribution dashboard

## Canonical case finance

A new admin-only collection is introduced:

- `caseFinancials/{caseId}`

One finance record per CareAtlas case stores:

- finance status: Forecast / Invoiced / Received / Refunded / Cancelled
- attributed hospital
- destination country derived from the hospital
- currency
- treatment value / GMV (optional)
- actual CareAtlas revenue
- direct CareAtlas case cost
- finance date
- internal finance note

The case detail screen now contains an **Admin-only Finance** panel for CareAtlas admin and super-admin users.

Hospitals, hotels, affiliates and patients cannot read this collection.

## Executive dashboard

The Business Intelligence workspace shows, per selected currency:

- recorded CareAtlas revenue
- case revenue
- affiliate-linked revenue fallback
- Stay Network commission revenue
- net contribution
- contribution margin
- accrued affiliate commission cost
- direct case costs
- forecast pipeline
- finance coverage of treatment-stage cases
- commercial-contract coverage

## Hospital performance

For each published hospital:

- assigned cases
- cases with treatment plans
- treatment-plan rate
- consultation cases
- treatment/follow-up associated cases
- treatment-stage rate
- recorded CareAtlas revenue
- direct costs
- attributable affiliate commission cost
- net contribution
- commercial model / contract status

Operational conversion can include a case against more than one hospital if several hospitals remain assigned. Financial attribution uses the canonical case-finance hospital when available.

## Affiliate economics

Affiliate ROI is calculated only from recorded commission ledgers in the selected currency:

`(CareAtlas revenue - affiliate commission) / affiliate commission`

The workspace also shows:

- referrals
- treatment-verified referrals
- CareAtlas revenue recorded during commission creation
- affiliate commission accrued
- retained revenue
- revenue per unit of affiliate commission

## Stay Network economics

Completed stay bookings show:

- gross booking value
- CareAtlas booking commission revenue
- hotel payable amount
- settled hotel amount
- pending hotel settlement
- effective commission rate
- room nights

Hotel gross booking value is **not** counted as CareAtlas revenue. Only the CareAtlas commission amount is revenue.

## Destination and treatment profitability

Financial records, affiliate cost and Stay Network commission are aggregated by:

- destination
- treatment line

This produces revenue, direct cost, affiliate cost and net-contribution views without using clinical severity or commercial ranking signals.

## Currency handling

Phase 8D intentionally performs **no automatic FX conversion**.

All monetary dashboards are filtered to one reporting currency at a time. This prevents misleading cross-currency totals until CareAtlas adds a controlled accounting/FX layer.

## Data-quality controls

The dashboard flags:

- treatment-stage cases with no case finance
- cases relying only on affiliate commission ledgers for revenue attribution
- ambiguous multi-hospital financial attribution
- completed stays missing a commission amount
- affiliate ledgers with missing CareAtlas revenue
- recognized finance without destination attribution
- published hospitals without a signed commercial contract recorded

## Revenue fallback

Existing affiliate commission creation already records `careAtlasRevenue` after a referral reaches `treatment_verified`.

Phase 8D uses this as a fallback revenue signal only when the same case has no recognized canonical `caseFinancials` record. Once canonical case finance exists, it takes precedence to avoid double-counting.

## Security / product boundaries

- Business Intelligence is admin-only.
- Hospitals cannot see CareAtlas commercials or case economics.
- Affiliates cannot see CareAtlas margin.
- Revenue or commission values do not influence Care Navigator ranking.
- Revenue does not influence Coordinator Copilot priority.
- Revenue does not influence Growth CRM patient prioritization.
- No financial result is presented as clinical quality or medical outcome data.

## Backend impact

Phase 8D adds:

- `caseFinancials` Firestore collection
- Firestore rule allowing only CareAtlas admin / super-admin access

It adds no Firestore composite index, no Apps Script change, no Google Drive gateway change and no paid AI API.

## New files

- `app/admin/business-intelligence/page.js`
- `app/phase8d.css`
- `components/AdminBusinessIntelligenceClient.js`
- `components/AdminCaseFinancePanel.js`
- `lib/bi/revenue.js`
- `lib/firebase/businessIntelligenceAdmin.js`
- `PHASE8D_CHANGELOG.md`
- `PHASE8D_SETUP.md`
- `README_PHASE8D.txt`

Updated:

- `app/layout.js`
- `components/AdminCaseDetailClient.js`
- `components/AdminShell.js`
- `firestore.rules`
- `README.md`
