---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Schema Migration Script + NocoDB Column Patch

## Objective
Add all new columns to the live NocoDB tables via a script, and update the setup script so fresh installs also get them. This is the foundation — no feature code can work without these columns existing.

## Context
- .gsd/DECISIONS.md (ADR-006, ADR-007 — script-based migration, Attachment fields)
- .gsd/SPEC.md (F3, F9, F12 — mechanic, payment, timer fields)
- webapp/scripts/setup-nocodb-tables.mjs (existing table definitions)
- webapp/api-server/lib/nocodb.js (NocoDB API patterns)

## Tasks

<task type="auto">
  <name>Create patch-schema-v2.mjs migration script</name>
  <files>webapp/scripts/patch-schema-v2.mjs</files>
  <action>
    Create a new Node.js script that:
    1. Authenticates to NocoDB using --url, --email, --password args (same pattern as setup-nocodb-tables.mjs)
    2. Discovers the BC_ERP base and all existing tables
    3. For each table that needs new columns, checks if column already exists (skip if so), then creates it via `POST /api/v2/meta/tables/{tableId}/columns`
    
    Columns to add:
    
    **jobs table:**
    - `lead_mechanic_id` (SingleLineText) — Lead mechanic user ID
    - `helper_mechanic_ids` (SingleLineText) — Comma-separated helper IDs
    - `payment_status` (SingleLineText) — Default: 'unpaid'
    - `payment_proof` (Attachment) — Transfer slip image
    - `work_started_at` (DateTime) — Timer start
    - `work_ended_at` (DateTime) — Timer stop
    - `work_duration_minutes` (Number) — Calculated duration

    **settings table:**
    - `logo_image` (Attachment) — Shop logo
    - `qr_payment_image` (Attachment) — QR code image
    - `qr_payment_text` (LongText) — Payment instructions

    **job_payments table:**
    - `proof_image` (Attachment) — Payment proof per payment record

    The script should:
    - Log each column add/skip clearly
    - Handle errors gracefully (don't stop on first failure)
    - Print a summary at the end (N added, M skipped, K failed)
  </action>
  <verify>node webapp/scripts/patch-schema-v2.mjs --url=http://localhost:9080 --email=admin@bcauto.work --password=BcAuto2026! 2>&1 | Select-String "added|skipped|Done"</verify>
  <done>All 11 new columns exist in NocoDB. Script outputs "Done: X added, Y skipped"</done>
</task>

<task type="auto">
  <name>Update setup-nocodb-tables.mjs with new columns</name>
  <files>webapp/scripts/setup-nocodb-tables.mjs</files>
  <action>
    Update the TABLES array in setup-nocodb-tables.mjs so that fresh installs also include the new columns:
    
    1. Add to `jobs` columns array: lead_mechanic_id, helper_mechanic_ids, payment_status, payment_proof (Attachment), work_started_at, work_ended_at, work_duration_minutes
    2. Add to `settings` columns array: logo_image (Attachment), qr_payment_image (Attachment), qr_payment_text (LongText)
    3. Add to `job_payments` columns array: proof_image (Attachment)
    
    DO NOT change any existing column definitions — only append new ones.
  </action>
  <verify>Select-String -Path "webapp/scripts/setup-nocodb-tables.mjs" -Pattern "lead_mechanic_id|payment_status|logo_image|proof_image" | Measure-Object | Select-Object -ExpandProperty Count</verify>
  <done>At least 4 matches found (one per key new column). Existing column definitions unchanged.</done>
</task>

## Success Criteria
- [ ] `patch-schema-v2.mjs` runs against test NocoDB without errors
- [ ] All 11 new columns are visible in NocoDB admin UI
- [ ] `setup-nocodb-tables.mjs` includes all new columns for fresh installs
- [ ] Script is idempotent (running twice doesn't create duplicate columns)
