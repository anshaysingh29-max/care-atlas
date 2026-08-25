# CareAtlas Phase 8D Setup & Test Guide

Phase 8D is built on top of Phase 8C.

## 1. Install

Overlay the Phase 8D update ZIP onto the existing CareAtlas project.

```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
```

Phase 8D adds the admin-only `caseFinancials` collection, so deploy Firestore rules:

```powershell
npx firebase-tools deploy --only firestore:rules
```

No Firestore composite-index deployment is required.
No Apps Script / Google Drive gateway redeployment is required.

Then run:

```powershell
npm run dev
```

## 2. Open Business Intelligence

Sign in with `careatlas_admin` or `super_admin` and open:

```text
/admin/business-intelligence
```

Initially, a project with no canonical finance records may show zero case revenue and a Finance Quality warning. This is intentional; 8D does not invent revenue from treatment-plan prices.

## 3. Record canonical finance for a test case

Open a non-production case that has reached Treatment or Follow-up:

```text
/admin/cases/case?id=<caseId>
```

In **Admin-only Finance**, select:

- Finance status: `Invoiced / receivable` or `Received`
- Revenue hospital: one of the hospitals assigned to the case
- Currency
- Treatment value / GMV (optional)
- Actual CareAtlas revenue
- Direct CareAtlas cost (optional; exclude affiliate commissions because 8D reads those separately)
- Finance date
- Internal note

Save.

The record is written to:

```text
caseFinancials/<caseId>
```

and an audit event is created.

## 4. Verify executive revenue

Return to:

```text
/admin/business-intelligence
```

Select the same currency as the case finance record.

Confirm:

- Recorded revenue increases by the CareAtlas revenue amount.
- Direct cost reduces net contribution.
- Received cases contribute to the received-case revenue signal.
- Treatment value / GMV is stored but is not treated as CareAtlas revenue.

## 5. Test affiliate economics

Use an existing test referral that has reached:

```text
treatment_verified
```

and has a commission ledger.

The Affiliates tab should show, for the commission currency:

- recorded CareAtlas revenue
- commission cost
- retained revenue
- affiliate ROI

If the referred case has no canonical recognized `caseFinancials` record, the commission ledger's `careAtlasRevenue` may appear as **referral-ledger fallback revenue**.

After you add canonical case finance for the same case, the fallback must stop contributing to revenue so it is not double-counted.

## 6. Test Stay Network economics

Use a completed test hotel booking with:

- `totalAmount`
- `careAtlasCommissionAmount`
- `settlementStatus`

Open the **Stay Network** tab.

Confirm:

- Gross booking value equals the completed stay total.
- CareAtlas revenue equals only the booking commission.
- Hotel payable is total amount minus CareAtlas commission.
- Paid and pending settlement amounts follow the booking settlement status.

## 7. Test destination and treatment performance

After case finance, affiliate and/or stay data exists, review:

```text
Destinations
Treatments
```

Confirm that revenue/costs are grouped using the selected reporting currency only.

## 8. Test Finance Quality

Open:

```text
Finance Quality
```

Treatment-stage cases without finance should show `Missing`.

Cases supported only by a commission ledger should show `Affiliate ledger only`.

Open a case from this queue and create/update canonical case finance.

## 9. Currency safety check

Create two test finance records in different currencies, for example USD and INR.

Switch the dashboard reporting currency.

Confirm that Phase 8D never adds USD and INR into one monetary total. No live FX conversion is performed.

## 10. Access-control check

Confirm that these accounts cannot read `caseFinancials`:

- patient
- partner / patient-affiliate
- hospital admin / doctor / coordinator
- hotel partner
- CareAtlas coordinator / operations

Only:

- `careatlas_admin`
- `super_admin`

may read or write the collection.

## 11. AI independence check

Verify that no Phase 8D finance values are imported into:

- Care Navigator hospital matching
- Coordinator Copilot priority
- Growth CRM opportunity scores

Financial economics must remain separate from clinical/provider matching and patient prioritization.

## 12. Production build

```powershell
npm run build
```

Then push:

```powershell
git add .
git commit -m "Build CareAtlas Phase 8D Revenue Business Intelligence"
git push
```

## Notes

Phase 8D is an MVP management-reporting layer, not an accounting ledger, statutory financial report, tax engine or audited financial system. Before using it for formal accounting or settlement decisions, integrate controlled invoices/payments, accounting policies, refunds/credit notes, FX treatment, tax/GST/VAT rules, reconciliation and finance access reviews.
