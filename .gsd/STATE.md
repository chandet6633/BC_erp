# STATE.md — Project Memory

> Last updated: 2026-05-04

## Current Position
- **Phase**: 3
- **Task**: Planning complete
- **Status**: Ready for execution

## Last Session Summary
Phase 2 verified successfully. The MungkhudShop E2E test files exist and a systemic login bug was properly identified and reported to `.gsd/phases/2/MungkhudShop-Bugs.md`.

## Next Steps
1. Run /execute 3 to begin writing and running the Management Portal Role-Based E2E tests.

## Phase 3 Summary
- ✅ `patch-schema-v3.mjs`: Added `qc_images` and `qc_approved_by` to jobs.
- ✅ `MungkhudShop/src/pages/kanban.js`: Mobile-responsive kanban, auto-archive logic, job timer logic, QC modal trigger, file attachment upload.
- ✅ `MungkhudShop/src/pages/job.js`: Payment sum validation against grand_total, payment proof UI.
- ✅ `MungkhudShop/src/pages/job-data.js`: Payment status calculation and payment proof upload to payload.
- ✅ `shared/nocodb-adapter.js`: Added `uploadAttachment` helper.

## Current Branch
`feat/password-flow-redesign`

## Key Context
- Payment validation strictly blocks "ปิดงาน" unless the sum equals the grand total, or the payment type includes credit terms.
- QC Approval uses a modal to completely intercept drag-and-drop from in-progress to closed/pending_review.
- Auto-archive hides any 'closed' jobs that were not modified 'today', keeping the Kanban board clean.

## Next Steps
1. /execute 4
