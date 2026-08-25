# CareAtlas Phase 7G Setup & Test

## 1. Overlay 7G
Extract the Phase 7G update over the latest Phase 7F project.

## 2. Deploy Firestore rules
```powershell
cd "C:\Users\ansha\NextJS Projects\careatlas"
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```
No Apps Script / Google Drive redeployment is required for 7G.

## 3. Start locally
```powershell
npm run dev
```

## 4. Hospital registration test
Open:
`http://localhost:3000/hospital-register`

Register a NEW Firebase test email. Select at least one specialty. Optionally request a new specialty such as `Paediatric Cardiac Surgery`.

Expected Firestore:
```text
users/{uid}
  role: hospital_applicant
  hospitalApplicationId: {uid}

hospitalApplications/{uid}
  status: pending_review
  specialtyIds: [...]
  requestedSpecialtyNames: [...]
```
The applicant can sign back in at `/hospital-login` and is redirected to `/hospital/onboarding`. An applicant cannot access `/hospital/cases`.

## 5. Admin review
Sign in as a CareAtlas admin and open:
- `/admin/hospitals`
- `/admin/specialties`

The first admin load seeds the core specialty catalogue if Firestore has no specialties yet.

If the hospital requested a new specialty, approve it in the Specialty Catalogue first. The hospital publication action intentionally fails while requested specialties are unresolved.

Then click **Publish hospital**.

Expected results:
```text
hospitalApplications/{uid}.status = approved
users/{uid}.role = hospital_admin
users/{uid}.hospitalId = <generated hospital id>
hospitals/{hospitalId}.marketplaceStatus = published
hospitalCommercials/{hospitalId}.contractStatus = draft
```
The hospital user should sign out/in after approval so Firebase profile state refreshes.

## 6. Check specialty propagation
After publication, confirm the approved specialty appears in all three places:
- Public: `/specialties`
- Public hospitals: `/hospitals`
- Patient: `/patient/discover`

Use `/specialties/view?id=<specialtyId>` to verify the published hospital is connected to that specialty.

## 7. Commercial separation test
Admin opens:
`/admin/hospital-commercials`

Set a test commercial model/rate/terms. Confirm the hospital portal contains no commercial configuration page and Firestore rules prevent hospital users from reading `hospitalCommercials`.

Do not confuse CareAtlas partner commercials with a hospital's patient treatment quotation. Hospitals may still quote treatment prices in treatment plans.

## 8. Hospital operational profile
Approved hospital admin opens:
`/hospital/profile`

They can update:
- website
- address
- marketplace description
- international desk email/phone
- languages
- international-patient services

They cannot directly change approved specialty IDs, verification status, marketplace status, or CareAtlas commercials.

## 9. Team access
Hospital admin opens:
`/hospital/team`

Submit a doctor/coordinator access request. It appears in `/admin/hospitals` as `pending_admin_provisioning`.

7G does NOT create privileged Firebase Auth accounts from the browser. CareAtlas admin must provision that user securely, set the correct `hospitalId` and role, then mark the request provisioned.

## 10. Production compile + push
```powershell
npm run build

git add .
git commit -m "Build CareAtlas Phase 7G hospital network and specialties"
git push
```

## Notes
- `/specialties/view?id=...` and `/hospitals/profile?id=...` are query-string routes because CareAtlas currently uses `output: 'export'` for GitHub Pages.
- Demo provider records remain fallback content; do not present their ratings/accreditations as verified real-world data.
- Real hospital legal/accreditation verification remains an operations/compliance responsibility outside the browser UI.
