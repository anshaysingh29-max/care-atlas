# CareAtlas Phase 8A Setup & Test

## 1. Overlay Phase 8A
Extract `careatlas-phase8a-update.zip` over the current Phase 7G project.

## 2. Deploy Firestore rules
```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

No Google Drive / Apps Script redeployment is required for Phase 8A.
No external LLM/API key is required for the Phase 8A matching engine.

## 3. Start locally
```powershell
npm run dev
```

## 4. Public AI Care Navigator
Open:
`http://localhost:3000/care-navigator`

Test a known catalogue term such as:
- Cardiology
- Knee Replacement
- IVF
- Oncology

Expected behaviour:
- CareAtlas may map a known treatment term to an existing specialty.
- It does not diagnose a symptom-only free-text entry.
- Only published Firestore hospital partners with the approved specialty are recommended.
- Demo providers do not appear as AI recommendations.
- Each hospital shows an explainable fit score, reasons and gaps.

## 5. Commercial neutrality test
Set or change hospital commission details in:
`/admin/hospital-commercials`

Run the exact same Care Navigator search again.
The hospital order/fit score must remain unchanged.

`lib/ai/matching.js` must not import or read `hospitalCommercials`.

## 6. Patient AI Concierge
Sign in as a patient and open:
`/patient/concierge`

Choose a specialty and preferences, run matching, then click **Save this shortlist**.

Expected Firestore:
```text
careNavigatorProfiles/{patientUid}
  patientId: <uid>
  algorithmVersion: careatlas-8a-2026-08-25-v1
  specialtyId: ...
  treatmentSlug: ...
  destinationIds: [...]
  preferredLanguages: [...]
  priorityIds: [...]
  budgetBandId: ...
  shortlistedHospitalIds: [...]
  matchSummaries: [...]

careMatchRuns/{runId}
  matchRunId: <runId>
  patientId: <uid>
  ...same normalized matching snapshot...
```

No raw symptom/diagnosis narrative is written by this module.

## 7. Start treatment request from a match
From a matched hospital click **Request plan**.

Expected route resembles:
```text
/get-treatment-plan?treatment=...&specialty=...&destinations=...&hospital=...&source=care-navigator&matchVersion=...
```

The intake form should display a Care Navigator context notice and carry safe structured preferences forward.
The patient must still provide/confirm their actual medical request before submission.

After case submission, expected optional fields include:
```text
patientPreferredHospitalIds: [...]
careNavigatorContext:
  specialtyId: ...
  algorithmVersion: ...
  source: care-navigator
```

These are preferences only. `assignedHospitalIds` still starts empty.

## 8. Admin AI audit
Open:
`/admin/ai-matching`

CareAtlas staff can see saved match runs, algorithm version and shortlisted provider scores without a raw medical narrative.

Also open the submitted case under `/admin/cases/case?id=<caseId>` and confirm the patient AI shortlist appears separately from actual hospital assignment.

## 9. Safety checks
- A patient cannot read another patient's Care Navigator profile or match runs.
- Hospital users cannot read Care Navigator profiles/match runs.
- A Care Navigator result never auto-assigns a hospital.
- Commercial fields cannot affect ranking.
- The UI clearly states that fit score is not a clinical outcome or medical-quality prediction.

## 10. Production build + push
```powershell
npm run build

git add .
git commit -m "Build CareAtlas Phase 8A AI Care Navigator"
git push
```

## Architecture note
8A deliberately uses an explainable rules-based matching engine so CareAtlas can launch without exposing an AI provider key in GitHub Pages and without requiring a paid server-side LLM integration. A later phase can add a secure language-model layer behind a server-side gateway while retaining this deterministic ranking and audit trail as the source of truth.
