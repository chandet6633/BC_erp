# STATE.md — Project Memory

> Last updated: 2026-05-04

## Current Position
- **Phase**: 1 — Complete ✅
- **Next Phase**: 2 — Job Card Overhaul
- **Status**: Phase 1 verified, all tasks done

## Phase 1 Summary (3 plans, 7 tasks)
- ✅ `patch-schema-v2.mjs` — 11 new columns added to NocoDB (11 added, 0 failed)
- ✅ `setup-nocodb-tables.mjs` — Updated with v2 columns for fresh installs
- ✅ `shared/duplicate-check.js` — Generic + 4 specific duplicate check functions
- ✅ `shared/image-compressor.js` — Canvas image compressor + upload widget
- ✅ `shared/design-tokens.css` — iPhone breakpoints (430/768/1024) + utility classes
- ✅ `master-branch.js` — Deleted, route and nav removed from app.js + index.html
- ✅ `api-server/middleware/validate.js` — Added work_duration_minutes to numerics

## Current Branch
`feat/password-flow-redesign`

## Key Context
- NocoDB: 24 tables, all v2 columns live in test instance
- Mobile CSS: MungkhudShop already had mobile.css at 768/480px — tokens now add 430px
- Phase 2 adds: customer+vehicle inline creation, ad-hoc items, mechanic dropdown, service badge
- Phase 3 adds: kanban archive, job timer, payment status, proof upload
- Phase 4 adds: quick print, settings templates, customer history page, daily summary

## Next Steps
1. `/discuss-phase 2` — Optional: discuss job card overhaul
2. `/plan 2` — Plan Phase 2: Job Card Overhaul
