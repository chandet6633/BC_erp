# STATE.md — Project Memory

> Last updated: 2026-05-04

## Current Position
- **Milestone**: App Verification & Hardening
- **Phase**: Not started
- **Status**: Milestone planned

## Last Session Summary
Phase 6 executed successfully. Management Portal mechanic dashboard created with active job list, QC image upload/approval, and role-gated KPIs. 

## Next Steps
1. Execute /plan 1 to set up the Playwright testing infrastructure.

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
