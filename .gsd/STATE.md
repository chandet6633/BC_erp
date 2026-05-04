# STATE.md — Project Memory

> Last updated: 2026-05-04

## Current Position
- **Phase**: 1 — Schema & Foundation
- **Task**: Planning complete
- **Status**: Ready for execution

## Plans Created
- `1-PLAN.md` — Schema Migration Script (wave 1)
- `2-PLAN.md` — Shared Utilities: Duplicate Check + Image Compressor (wave 1)
- `3-PLAN.md` — Mobile CSS Foundation + Remove Branch Page + API Validation (wave 2)

## Current Branch
`feat/password-flow-redesign`

## Key Context
- NocoDB test instance running at localhost:9080 (verified healthy)
- Token: UmqurJUh0NhbrQWnhMJ-sXRgA6wfrlX4dvk9Y5YD
- 24 tables in BC_ERP base (verified)
- 11 new columns needed across 3 tables (jobs, settings, job_payments)
- `job_items.type` already exists — can use for 'adhoc' flag
- `validate.js` is permissive — only need to add work_duration_minutes to NUMERIC_FIELDS
- Design tokens have NO breakpoints yet — Phase 1 adds them

## Next Steps
1. `/execute 1` — Run all 3 plans

## Open Decisions
- None — all resolved in /discuss-phase 1
