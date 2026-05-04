# SPEC.md — MungkhudShop POS Overhaul

> **Status**: `FINALIZED`
> **Created**: 2026-05-04

## Vision

Transform MungkhudShop from a basic job-tracking app into a fully operational front-store POS system that handles the complete auto-service workflow — from customer check-in to payment — with mobile-first design, mechanic KPI tracking, and data integrity safeguards. The system must be usable on phones/tablets at the shop floor without needing a desktop.

## Goals

1. **Complete Job Workflow** — SA can create a job card with inline customer/vehicle creation, assign mechanics, track work time, process payment, and print documents — all from one flow.
2. **Data Integrity** — Prevent duplicate records, link customers to vehicles, track ad-hoc items without corrupting stock, and ensure payment status is always visible.
3. **Mechanic Accountability** — Track lead assignments, helper participation, work hours via auto-timer, and job counts for KPI reporting.
4. **Operational Efficiency** — Quick print from job cards, daily closing summary with PDF export, kanban auto-archive, low-stock warnings at point of use, and vehicle service history badges.
5. **Mobile-First Design** — Every page and interaction must work flawlessly on mobile phones and tablets (touch-friendly, responsive layouts, no hover-dependent UI).
6. **Print Template Customization** — Editable logo, QR payment image, and text details on all printed documents.
7. **Customer Relationship Foundation** — Customer history page with linked vehicles, visit counts, and service timeline for future CRM expansion.

## Non-Goals (Out of Scope)

- Expense/cost entry (handled in Management portal)
- Barcode scanning (future phase, needs camera API)
- LINE/SMS customer notifications (future API integration)
- Before/after repair photos (needs file upload infrastructure beyond proof-of-payment)
- Warranty job linking (future schema change)
- Service reminder system (future CRM feature)
- Branch management CRUD in MungkhudShop (removing the page; managed via Management portal)

## Users

| Role | Device | Primary Actions |
|------|--------|-----------------|
| **SA (Service Advisor)** | Desktop + Tablet | Create jobs, assign mechanics, process payments, print docs, daily closing |
| **Mechanic** | Phone (mobile) | View assigned jobs on kanban, update status, see job details |
| **Manager/Owner** | Desktop + Phone | Review kanban, check daily summary, monitor mechanic KPIs |

## Features

### F1: Job Card — Customer + Vehicle Inline Creation
- Combine customer and vehicle info into a single card on the job form
- When an existing plate is typed, autofill all vehicle + customer data
- When a new plate is entered, show an inline prompt to capture: customer name, phone, vehicle model, color, VIN
- Auto-create both `customers` and `vehicles` records on job save
- Link vehicle to customer via `customer_id` field

### F2: Ad-Hoc Line Items
- New item type toggle: `product` (from catalog) vs `adhoc` (manual entry)
- Ad-hoc items: user types name, qty, price directly — no product lookup required
- Ad-hoc items must still have a `product_type` (service/part/labor). If type doesn't exist in lookups, prompt to create
- Ad-hoc items are stored in `job_items` with `type: 'adhoc'` flag
- Ad-hoc items do NOT affect stock ledger (no deduction on job close)
- Ad-hoc items DO affect financial totals (revenue, cost, profit)

### F3: Mechanic Assignment + KPI
- Replace free-text technician field with a dropdown populated from `users` table (role = 'mechanic')
- Primary mechanic = "lead" (single select, required)
- Additional mechanics = "helpers" (multi-select, optional)
- Store in jobs table: `lead_mechanic_id`, `helper_mechanic_ids` (comma-separated IDs)
- KPI data points per mechanic:
  - Jobs led (count of jobs where they are lead)
  - Jobs assisted (count of jobs where they are helper)
  - Total work hours (from job timer)
  - Average job duration
  - Revenue generated (sum of grand_total for led jobs)

### F4: Kanban Auto-Archive
- Closed jobs auto-hide from kanban board after end of day (midnight reset)
- Only show today's closed jobs in the "เสร็จ" column
- Add a toggle/filter: "Show all closed" to view historical jobs if needed
- Show mechanic names on kanban cards (lead + helper count)

### F5: Print Template Customization
- Settings page: upload/edit shop logo image (stored as base64 or URL in `settings` table)
- Settings page: upload/edit QR payment image + payment instruction text
- All print templates inject: logo (top-left), QR code (bottom or sidebar), payment text
- Templates remain editable via settings — no code changes needed for customization

### F6: Customer History Page
- New page: `/customer-history`
- Search by customer name, phone, or plate number
- Display:
  - Customer info card (name, phone, total visits, first visit date)
  - Linked vehicles list with visit count per vehicle
  - Job timeline (all jobs for this customer, sorted by date)
  - Total lifetime spend
- Vehicle service history badge: "3rd visit | Last: 45 days ago | Last mileage: 85,000 km"

### F7: Remove Master Branch Page
- Remove `master-branch.js` from MungkhudShop
- Remove route registration from `app.js`
- Branch management stays in Management portal only

### F8: Quick Print Button
- Add `🖨️ Print` button on job form (next to Save button)
- Add `🖨️` icon button in search results grid per row
- One-click: auto-selects "ใบรับรถ / ใบงาน" template, passes job data, opens print window
- Also add a PDF button for quick PDF export from the same locations

### F9: Payment Status + Proof Upload
- Add `payment_status` field to jobs: `unpaid` | `partial` | `paid`
- Show payment badge on search results and kanban cards
- On job close: require selecting payment status
- Support image upload for proof of transaction (transfer slip, etc.)
- Store proof image as base64 in `job_payments` table or a new field on `jobs`
- Show uploaded proof as a thumbnail on the job form when editing

### F10: Duplicate Record Prevention
- **Jobs**: When saving a new job, check if an open job exists for the same plate. Show warning with link to existing job. Allow override with confirmation.
- **Customers**: When creating inline, check if phone number or name already exists. Suggest existing record instead of creating duplicate.
- **Vehicles**: When creating inline, check if plate number already exists. Auto-link to existing record.
- **Products**: In master data pages, prevent duplicate codes on save.

### F11: Daily Closing Summary
- New dashboard card or dedicated view
- Shows for the current day:
  - Jobs opened / closed / cancelled counts
  - Total revenue by payment method (cash, transfer, credit, QR)
  - Outstanding unpaid jobs list
  - Total parts used (count of job_items)
  - Mechanic workload summary (jobs per mechanic today)
- Export as PDF button (formatted summary document)
- Filter by date range for historical review

### F12: Job Timer (Auto Work Duration)
- Auto-start timer when job status moves to `in_progress`
- Auto-stop timer when job status moves to `pending_review` or `closed`
- Store `work_started_at` and `work_ended_at` timestamps on jobs table
- Calculate `work_duration_minutes` on close
- Show elapsed time on kanban card (already shows time since creation, enhance to show active work time)
- Duration feeds into mechanic KPI calculations

### F13: Vehicle Service History Badge
- When plate is selected in job form, show an inline badge:
  - Visit count: "3rd visit"
  - Last service date: "45 days ago"
  - Last mileage: "85,000 km"
  - Mileage delta: "+12,000 km since last visit"
- Data source: query `jobs` table filtered by plate number
- Displayed below the vehicle info section in the job form

### F14: Mobile-First Responsive Design
- All pages must work on screens ≥ 320px wide
- Touch targets minimum 44×44px
- Form grids collapse to single-column on mobile
- Kanban board: horizontal scroll on mobile (already has touch drag)
- Bottom action bar for key actions on mobile (save, print)
- No hover-dependent interactions (all hover effects have tap equivalents)
- Font sizes minimum 14px for readability
- Modal dialogs fit within mobile viewport
- Tables become card-based layouts on narrow screens

## Constraints

- **Technical**: Must work with existing NocoDB + Express API stack (no new databases)
- **Schema**: New fields can be added to existing tables; new tables if needed for KPI aggregation
- **Build**: Both frontends share `shared/nocodb-adapter.js` — changes must be backward-compatible
- **Performance**: Dashboard/kanban must load in < 2 seconds on 4G connection
- **Browser**: Must support Chrome 90+, Safari 15+ (shop tablets run Android Chrome)
- **No new dependencies**: Minimize npm package additions; use vanilla JS where possible

## Success Criteria

- [ ] SA can create a job card with a new customer+vehicle in under 2 minutes
- [ ] Mechanic can view and update their assigned jobs from a phone
- [ ] Daily closing summary PDF matches actual cash count
- [ ] No duplicate jobs can be accidentally created for the same plate
- [ ] All print templates show shop logo and QR payment code
- [ ] Customer history shows complete visit timeline with linked vehicles
- [ ] Kanban board shows only today's work (closed jobs auto-archived)
- [ ] Job timer accurately tracks mechanic work duration (±5 min)
- [ ] Every page is usable on a 375px-wide mobile screen
- [ ] Payment proof images can be uploaded and viewed on job records
