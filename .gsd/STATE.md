# STATE.md — Project Memory

> Last updated: 2026-05-04

## Current Position
- **Phase**: 2 — Job Card Overhaul — Complete ✅
- **Next Phase**: 3 — Operations & Workflow
- **Status**: Phase 2 verified, all tasks done

## Phase 2 Summary (3 plans, 4 files)
- ✅ `MungkhudShop/src/pages/job.js`: Redesigned form, combined vehicle+customer card, mechanic assignment, ad-hoc item toggle, service badge display, new record prompt banner.
- ✅ `MungkhudShop/src/pages/job-data.js`: Implemented auto-creation of vehicle/customer records, duplicate job detection, and ad-hoc item save logic (skipping stock ledger for adhoc items).
- ✅ `MungkhudShop/src/pages/job-line-items.js`: Transformed line items with an ad-hoc toggle, dynamically switching between product autocomplete and manual text inputs.
- ✅ `MungkhudShop/src/pages/job-state.js`: Added `getMechanics` cache for efficient mechanic dropdown loading.

## Current Branch
`feat/password-flow-redesign`

## Key Context
- All v2 form fields (customer_id, vehicle_id, lead_mechanic_id, helper_mechanic_ids) are now active and saving.
- Vehicles automatically update mileage upon job creation.
- Adhoc items save correctly with `type: 'adhoc'` and don't reduce stock.
- The UI handles the inline transition smoothly (unknown plate -> prompt -> auto-create -> saved).

## Next Steps
1. `/discuss-phase 3` — Optional: discuss the next phase (Operations & Workflow)
2. `/plan 3` — Plan Phase 3: Operations & Workflow
