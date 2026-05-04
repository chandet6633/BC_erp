# STATE.md — Project Memory

> Last updated: 2026-05-04

## Current Position
- **Phase**: 2 — Job Card Overhaul
- **Task**: Planning complete
- **Status**: Ready for execution

## Plans Created
- `2.1` — Combined Customer+Vehicle Card + Autofill + Service Badge (wave 1)
- `2.2` — Mechanic Lead Dropdown + Helper Multi-Select (wave 1)
- `2.3` — Ad-Hoc Line Items with Toggle (wave 2)

## Current Branch
`feat/password-flow-redesign`

## Key Context (Phase 2)
- Job form has 4 files: job.js (527 lines), job-data.js (257), job-line-items.js (86), job-state.js (58)
- Plate autocomplete already autofills model+mileage from vehicles and customer from customer_id
- Customer AC already autofills phone
- Free-text `technician` field at line 126 → replaced by lead_mechanic_id dropdown
- `job_items.type` column already exists → can store 'adhoc' without schema change
- Vehicle color field doesn't exist on job form yet (vehicles.color exists in DB)
- Service badge needs: count(jobs by plate), max(start_date), mileage delta

## Next Steps
1. `/execute 2` — Run all 3 plans
