# ROADMAP.md

> **Current Phase**: Not started
> **Milestone**: v2.0 — MungkhudShop POS Overhaul

## Must-Haves (from SPEC)
- [ ] Job form with inline customer+vehicle creation (F1)
- [ ] Ad-hoc line items without stock impact (F2)
- [ ] Mechanic assignment from users table + KPI (F3)
- [ ] Kanban daily auto-archive (F4)
- [ ] Print template customization (F5)
- [ ] Customer history page (F6)
- [ ] Remove master branch page (F7)
- [ ] Quick print button on job card (F8)
- [ ] Payment status + proof upload (F9)
- [ ] Duplicate record prevention (F10)
- [ ] Daily closing summary + PDF (F11)
- [ ] Job timer (F12)
- [ ] Vehicle service history badge (F13)
- [ ] Mobile-first responsive design (F14)

## Phases

### Phase 1: Schema & Foundation
**Status**: ✅ Complete (2026-05-04)
**Objective**: Prepare the database schema, API routes, and shared utilities that all other features depend on.
**Features**: F7 (remove branch page), F10 (duplicate prevention util), F14 (CSS responsive foundation)
**Deliverables**:
- Add new fields to NocoDB `jobs` table: `lead_mechanic_id`, `helper_mechanic_ids`, `payment_status`, `work_started_at`, `work_ended_at`, `work_duration_minutes`, `payment_proof_image`
- Add new fields to `vehicles` table: ensure `customer_id` is reliably populated
- Add new fields to `settings` table: `logo_image`, `qr_payment_image`, `qr_payment_text`
- Create duplicate-check utility functions in shared module
- Set up mobile-first CSS breakpoints and responsive grid system in `design-tokens.css`
- Remove master-branch.js and its route
- Update NocoDB setup script with new columns

### Phase 2: Job Card Overhaul
**Status**: ✅ Complete (2026-05-04)
**Objective**: Rebuild the job creation form with combined customer+vehicle card, mechanic assignment, and inline creation flow.
**Features**: F1 (customer+vehicle inline), F2 (ad-hoc items), F3 (mechanic select), F13 (service history badge)
**Deliverables**:
- Combined customer+vehicle card with autofill on existing plate
- Inline new customer/vehicle creation prompt when plate not found
- Auto-link vehicles to customers on save
- Ad-hoc item toggle on line items (no stock deduction)
- Mechanic dropdown (lead) + multi-select (helpers) from users table
- Vehicle service history badge below vehicle section
- Duplicate job warning (same plate with open status)
- Mobile-responsive form layout

### Phase 3: Kanban + Timer + Payment
**Status**: ✅ Complete (2026-05-04)
**Objective**: Enhance the kanban board, add job timer, and implement payment status tracking.
**Features**: F4 (kanban archive), F9 (payment status + proof), F12 (job timer)
**Deliverables**:
- Kanban auto-archive: only show today's closed jobs
- Show mechanic names on kanban cards
- Job timer: auto-start on `in_progress`, auto-stop on `pending_review`/`closed`
- Show elapsed work time on kanban cards
- Payment status badges on kanban + search results
- Payment proof image upload (camera/file) on job close
- Payment status required before closing job
- Mobile-optimized kanban with horizontal scroll

### Phase 4: Print, History & Daily Summary
**Status**: ✅ Complete (2026-05-04)
**Objective**: Complete the operational tools — quick print, customizable templates, customer history, and daily closing.
**Features**: F5 (print templates), F6 (customer history), F8 (quick print), F11 (daily summary)
**Deliverables**:
- Quick print/PDF buttons on job form + search grid rows
- Settings page: logo upload, QR image upload, payment text editor
- All print templates render logo + QR + payment text
- Customer history page with search, vehicle list, job timeline, lifetime spend
- Daily closing summary dashboard (revenue by method, unpaid jobs, mechanic workload)
- Daily summary PDF export
- Date range filter for historical summaries

### Phase 5: Polish, Mobile QA & KPI
**Status**: ✅ Complete
**Objective**: Final mobile optimization pass, mechanic KPI aggregation, and end-to-end testing.
**Features**: F3 (KPI aggregation), F14 (mobile polish)
**Deliverables**:
- Mechanic KPI dashboard/view: jobs led, assisted, hours, avg duration, revenue
- Full mobile QA pass on all pages (320px → 768px → 1024px)
- Touch target audit (44px minimum)
- Table → card layout conversion for narrow screens
- Performance optimization (lazy loading, pagination)
- Build and deploy to Docker test environment
- End-to-end workflow testing (create job → assign → work → close → pay → print → summary)

### Phase 6: Management Portal — Mechanic Dashboard
**Status**: ✅ Complete
**Objective**: Create a dedicated workspace for mechanics in the Management Portal.
**Features**: F3 (KPI aggregation & QC)
**Deliverables**:
- Dedicated mechanic route (`/mechanic`) in the Management Portal
- Mechanic dashboard showing active jobs assigned to them
- QC approval interface for uploading proof images and signing off
- KPI tracking (jobs completed, hours logged, performance metrics)

---

> **Current Milestone**: App Verification & Hardening
> **Goal**: Conduct full E2E testing on both web apps, ensuring all read/write operations link to the schema, and eliminate dead-end features.

## Must-Haves
- [ ] Fully functional webapp with no dead-end features, buttons, or inputs.
- [ ] Every page with read/write capability is linked to the schema and tested.
- [ ] Role-based access control tested across all portals.

## Phases

### Phase 1: Test Infrastructure Setup
**Status**: ⬜ Not Started
**Objective**: Set up Playwright testing infrastructure, mock environments, and testing utilities.

### Phase 2: MungkhudShop Comprehensive Testing & Validation
**Status**: ⬜ Not Started
**Objective**: Test ALL MungkhudShop pages (stocking simulation, print templates, kanban, QC, settings, job workflow). Identify any broken links to the schema or dead buttons. Log every failure and bug as a list to be fixed in Phase 4.

### Phase 3: Management Portal Role-Based Testing
**Status**: ⬜ Not Started
**Objective**: Test all portal features across every role (mechanic, SA, manager, owner, admin). Simulate distinct workflows to ensure security, correct schema interaction, and no dead ends. Log every failure and bug as a list to be fixed in Phase 4.

### Phase 4: Code Polish & Redundancy Reduction
**Status**: ⬜ Not Started
**Objective**: Clean up the codebase, reduce redundancies, and polish the final code structure for production readiness.
