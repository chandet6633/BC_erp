# BC AutoXperience Production Roadmap: App First, Auth Later

## Summary

Build the fully functional business app before production authentication. Keep the dev portal role/branch selector as the fast testing entry point until the app is pilot-ready. LINE Login remains the production target, but moves to the bottom phases after core workflows, metadata, branch isolation, stock logic, HR isolation, and dashboards are stable.

## Phase 0: Current Stage Stabilization And Cleanup

- Freeze the current dev portal as the working entry point.
- Keep the stable dev session contract: `bcauto_dev_auth`, `bcauto_role`, `bcauto_user_id`, `bcauto_user_name`, `bcauto_auth_model`, and `bcauto_branch`.
- Keep MungkhudShop reachable only through portal session/SSO during development.
- Clean repo root so AI agents and developers do not confuse old files with active work:
  - archive/remove obsolete `.bat` scripts that duplicate active Docker/npm workflows
  - archive old compose/nginx files that are not active test or future production targets
  - clearly mark `example and ref only (not real work)` as reference-only
  - keep active root focused on apps, API, shared code, docs, tests, and deployment
- Gate: Portal build, MungkhudShop build, API syntax checks, dev auth check, and portal-to-MungkhudShop smoke pass.

## Phase 1: Metadata And Admin Foundation

- Make database metadata the source of truth for branches, roles, module access, and system settings.
- Keep static registry values only as bootstrap fallback.
- Complete Admin Suite for branch management, role permissions, user management, system settings, and system health.
- Remove active-code hardcoded branch names and old branch assumptions.
- Gate: adding/editing branches requires no code change; role permission edits change module visibility; default active branches are only `BC Auto Service`, `BC Auto Samchuk`, and `BC Auto Mueng Suphan`.

## Phase 2: Garage Portal / MungkhudShop Core

- Finish job workflow: create/edit job, customer and vehicle selection, job items/totals, mechanic assignment, kanban/service status, close job, and payment status.
- Finish document workflow: quotation, invoice, receipt, purchase invoice, purchase credit note, and confirm/void through server endpoints only.
- Finish stock management with standard accounting/warehouse logic:
  - immutable stock ledger entries for IN, OUT, ADJ, RETURN, and TRANSFER
  - moving weighted average cost for normal stock valuation
  - FIFO lot tracking where expiry, warranty, batch, or traceability matters
  - reservation vs commit separation for jobs and draft documents
  - branch-aware stock balances and transfer in-transit state
  - negative-stock prevention unless admin-approved adjustment policy allows it
  - cost recalculation and historical ledger integrity repair
- Gate: one complete job can move from create to work to document to payment/close; stock IN/OUT/ADJ changes balances correctly; weighted average cost recalculates correctly; transfer void/reversal policy protects both branches; integrity checks and conservative safe repair are visible in Admin Suite; refresh does not lose MungkhudShop session.

## Phase 3: Manager Dashboard

- Manager Dashboard is a Portal module, not a MungkhudShop page.
- It consumes data from MungkhudShop, HR, finance/admin records, and branch metadata.
- MungkhudShop may keep a separate shop-floor dashboard, but cross-module management reporting belongs here.
- Use server-side aggregation for revenue, gross profit, expenses, net profit, open jobs, completed jobs, unpaid jobs, low stock, branch comparison, and recent jobs.
- Gate: Manager/Admin/Owner can load scoped dashboard data; S.A./Mechanic cannot access it; branch selector changes scope; no hardcoded branch labels.

## Phase 4: HR Module

- Use `example and ref only (not real work)/checkin-out system` as process reference only.
- Do not copy reference code directly without adapting data access, security, and isolation.
- Build check in/out, leave request, leave approval, employee attendance view, payroll self-service view, and manager HR dashboard.
- Backend isolation rules:
  - staff can only read their own attendance, leave, payroll summary, and profile-derived HR data
  - manager can read branch/team HR data within allowed scope
  - owner/admin can read all HR data
  - payroll detail requires manager/owner/admin or explicit payroll permission
  - unauthorized API responses must strip salary/payroll fields
- Gate: Mechanic/S.A. can check in/out and view own HR info; manager can review attendance/leave for allowed scope; payroll data is hidden from unauthorized roles.

## Phase 5: Technical Knowledge Module

- Build searchable knowledge records for vehicle model data, repair tips, diagnostic notes, categories/tags, and attachments/images.
- Mechanic, S.A., Manager, Owner, and Admin can read; Admin/Manager can manage records.
- Gate: users can search/open technical records; authorized users can create/edit entries; mobile layout is usable in workshop conditions.

## Phase 6: S.A. Database And Documentation

- Build supplier prices, service documentation, customer/service notes, reusable templates, and attachments.
- S.A. can create/update relevant records; Manager/Admin can review and manage; Mechanic access only through explicit role metadata.
- Gate: S.A. can record supplier/service information; manager can review across branches; records are searchable and branch-aware where needed.

## Phase 7: API And Data Integrity Hardening

- Harden branch scoping, role scoping, protected table writes, document state machine, stock ledger consistency, and user/role/branch validation.
- Finalize integrity checks for jobs without branch, users without role/branch, orphan document items, stock mismatches, duplicate products/customers/vehicles, and suspicious negative stock/cost state.
- Gate: invalid roles are rejected; cross-branch writes are rejected; confirmed/paid/voided documents cannot be edited directly; integrity pages return actionable results.

## Phase 8: UI Polish And Mobile Readiness

- Polish only after workflows are real.
- Cover portal, MungkhudShop dashboard, job screens, stock/document screens, manager dashboard, HR, S.A. docs, and Admin Suite.
- Requirements: Thai and English fit without clipping; mobile layouts work in single-column where needed; touch targets are comfortable; no overlapping text; use Impeccable before major UI redesign work.
- Gate: desktop Chrome, mobile Chrome, and iPhone Safari where available can complete core workflows.

## Phase 9: Automated And Manual Testing

- Automated checks: Portal build, MungkhudShop build, API syntax checks, dev portal smoke, MungkhudShop job/document/stock smoke, manager dashboard API smoke, role metadata API smoke, and HR isolation smoke.
- Manual UAT covers Admin, Owner, Manager, S.A., Mechanic, and all three branches.
- Gate: no critical workflow blocker, no cross-branch data leak, no dev portal session loop, and checklist updated with new cases.

## Phase 10: Production Authentication And LINE Login

- Replace dev access only after the app is functionally complete.
- Production auth target is LINE Login first, with username/password as admin/emergency fallback.
- Add backend LINE auth: `GET /api/auth/line/start`, `GET /api/auth/line/callback`, `POST /api/auth/line/link`, and `POST /api/auth/logout`.
- Add user fields: `line_user_id`, `line_display_name`, `line_picture_url`, `auth_provider`, `last_login_at`, and `is_active`.
- Gate: LINE login works on desktop/mobile; unknown LINE users cannot access modules; logout clears Portal and MungkhudShop sessions; direct MungkhudShop access without valid portal session redirects back safely.

## Phase 11: Proxmox Docker Production Deployment

- Prepare self-hosted Proxmox Docker production package: production compose file, production `.env.example`, Nginx configs, TLS/reverse proxy notes, backup script, restore script, and deployment runbook.
- Production flags: `ENABLE_DEV_AUTH=false`, `ENABLE_DEV_ROUTES=false`, strong `JWT_SECRET`, real `NOCODB_TOKEN`, and LINE env vars configured.
- Backup policy: backup before deploy, daily database backup, and restore test before pilot.
- Gate: fresh deploy starts cleanly, HTTPS portal loads, LINE callback works on production domain, and backup/restore is proven.

## Phase 12: Pilot Release

- Pilot with selected staff only using real branches, real users, and controlled real workflows.
- Monitor API logs, auth failures, stock/document integrity, dashboard trust, and user feedback.
- Gate: 3-7 days of pilot without data loss, core workflows stable, branch isolation verified with real users, and known issues documented/prioritized.

## Key Interfaces And Data Changes

- Current dev portal session contract remains until Phase 10.
- Metadata APIs remain central: branch metadata/admin, role metadata/admin, and manager dashboard.
- MungkhudShop stock/document APIs must enforce ledger correctness server-side.
- HR APIs must enforce self-only data access for staff roles.
- Production auth APIs and LINE fields are deferred to Phase 10.
- New branches and permissions must be managed through Admin Suite, not code edits.

## Test Plan

- Every phase ends with build/API checks.
- Workflow phases add smoke tests before moving on.
- Stock phase must test moving average cost, FIFO lot behavior where enabled, transfers, adjustments, and negative-stock prevention.
- HR phase must test employee self-only access and payroll field stripping.
- Manual UAT waits until the app is functionally complete.
- Production auth is not a blocker for core module development, but is mandatory before pilot production.

## Assumptions

- Priority is fully functional app first, authentication later.
- Dev role/branch selector remains the main testing entry point until Phase 10.
- LINE Login remains the final production auth target.
- Deployment target is self-hosted Proxmox Docker.
- First production release target is pilot-safe, not full enterprise hardening.
- The HR reference folder is process guidance only, not production source.
- The repo root should be cleaned so active work is obvious to future agents.
