CareAtlas Phase 6B update package

Copy everything in this folder into your existing CareAtlas repository root and choose Replace when prompted.

Then run:

npx firebase-tools deploy --only firestore:rules,firestore:indexes
npm run build
git add .
git commit -m "Build CareAtlas Phase 6B real patient journey"
git push

Read PHASE6B_SETUP.md before testing the deployed site.
