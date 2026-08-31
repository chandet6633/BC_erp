# DECISIONS.md — Architecture Decision Records

> Decisions that shape the project. Add new entries at the bottom.

## ADR-001: NocoDB over PocketBase
- **Date:** 2026-04
- **Decision:** Migrated from PocketBase to NocoDB (SQLite) as the database backend
- **Rationale:** NocoDB provides a more flexible REST API, better admin UI for non-technical users, and avoids PocketBase auth limitations
- **Consequence:** Required building a custom Express API middleware layer to handle JWT auth and xc-token isolation

## ADR-002: Express API Middleware
- **Date:** 2026-04
- **Decision:** All browser-to-database communication goes through an Express API server
- **Rationale:** Keeps the NocoDB xc-token server-side only (security), enables RBAC, rate limiting, input validation, audit logging, and write serialization
- **Consequence:** Added a 4th container to the Docker stack; all CRUD operations must be proxied

## ADR-003: SHA-256 Password Hashing
- **Date:** 2026-05
- **Decision:** All passwords and PINs are SHA-256 hashed before storage
- **Rationale:** Simple, fast, and sufficient for an internal ERP. Express middleware auto-hashes on POST/PATCH to prevent plaintext storage
- **Consequence:** Cannot recover passwords — only reset

## ADR-004: SSO via Base64 Token
- **Date:** 2026-04
- **Decision:** Cross-app authentication between Portal and MungkhudShop uses Base64-encoded JSON tokens with embedded JWT
- **Rationale:** Avoids shared cookie complexity; works with separate Nginx containers on different ports
- **Consequence:** 5-minute expiry window; token must include JWT for authenticated API calls in the target app

## ADR-005: Admin-Assigned Passwords (No Forced Reset)
- **Date:** 2026-05
- **Decision:** Admins explicitly set passwords during user creation; employees can voluntarily change via the topbar modal but are not forced to on first login
- **Rationale:** Simpler UX for a small team; avoids disruption for tablet-based shared devices
- **Consequence:** Users may keep initial passwords indefinitely

---

## Phase 1 Decisions

**Date:** 2026-05-04

### ADR-006: Schema Migration via Script (Option A)
- **Decision:** Use a patch script (`patch-schema-v2.mjs`) to add new NocoDB columns via REST API
- **Rationale:** Repeatable, documented, version-controlled. Can run against test and production separately. Manual UI changes are not traceable.
- **Consequence:** Must maintain the script alongside `setup-nocodb-tables.mjs`

### ADR-007: NocoDB Attachment Field for Images
- **Decision:** Use NocoDB's built-in Attachment field type for payment proof images, logo, and QR images — NOT base64 in LongText
- **Rationale:** Native file handling, better storage efficiency, built-in thumbnail support
- **Constraint:** All image attachments must be compressed/resized before upload to save DB space
- **Implementation:** Client-side image compression (canvas resize to max 1200px, JPEG quality 0.7) before sending to API

### ADR-008: Generic Duplicate Prevention Utility
- **Decision:** Build a reusable `checkDuplicate(table, field, value, excludeId?)` utility in the shared module
- **Rationale:** Duplicate prevention is needed across jobs (plate), customers (phone/name), vehicles (plate), and products (code). A generic utility avoids copy-paste logic per page.
- **Consequence:** All CRUD pages can import and use the same function

### ADR-009: iPhone-Optimized Mobile Breakpoints
- **Decision:** Use breakpoints matching current iPhone screen sizes
- **Values:**
  - `393px` — iPhone 14/15/16 standard (logical)
  - `430px` — iPhone 14/15/16 Pro Max (logical)
  - `768px` — iPad Mini / tablet
  - `1024px` — iPad Pro / desktop
- **CSS custom properties:** `--bp-phone: 430px; --bp-tablet: 768px; --bp-desktop: 1024px;`
- **Rationale:** Shop staff use iPhones. Design for the exact devices they carry.

### Verified Live NocoDB Schema (2026-05-04)

**24 tables in BC_ERP base.** Key tables and their columns:

| Table | Existing Columns | New Columns Needed |
|-------|------------------|--------------------|
| `users` | name, email, pin, role, branch, active, display_name, last_force_logout, username, password_hash, phone, must_change_password | _(none — complete)_ |
| `jobs` | job_no, status, start_date, end_date, plate, model, customer_name, customer_phone, customer_id, vehicle_id, subtotal, discount, vat_amount, grand_total, payment_type, branch_id, technician, repair_details, notes, mileage_in | `lead_mechanic_id`, `helper_mechanic_ids`, `payment_status`, `payment_proof` (Attachment), `work_started_at`, `work_ended_at`, `work_duration_minutes` |
| `settings` | shop_name, address, phone, tax_id, prefix_job/qt/iv/rc, vat_rate, default_vat_enabled, default_vat_mode | `logo_image` (Attachment), `qr_payment_image` (Attachment), `qr_payment_text` |
| `customers` | code, name, phone, address, tax_id, email, credit_limit, credit_days | _(none — complete)_ |
| `vehicles` | plate_number, province, brand, model, year, color, vin, customer_id, mileage | _(none — complete)_ |
| `products` | code, name, type, brand_id, group_id, price, cost, unit, min_stock, is_track_stock, barcode | _(none — complete)_ |
| `job_items` | job_id, product_id, product_name, qty, unit, price, discount, total, type | _(type field already exists — can store 'adhoc')_ |
| `job_payments` | job_id, amount, payment_method, payment_date, reference | `proof_image` (Attachment) |
| `stock_ledgers` | transaction_no, transaction_type, product_id, warehouse_location, qty, unit_cost, total_value, reference_doc, branch_id | _(none)_ |
| `lookups` | type, label, value, is_active, sort_order | _(none)_ |

**Missing from setup script vs live DB:** `financial_ledger` table exists in live DB but not in setup script. `app_users`, `system_settings`, `app_settings`, `hr_employees`, `daily_summaries` tables are in the setup script but NOT in live DB.
