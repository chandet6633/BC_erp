# Phase 2 Manual UAT Checklist

Use this checklist before moving to Phase 3 Manager Dashboard work. Keep notes, screenshots, document numbers, and branch names for anything that fails.

Interactive HTML version: `docs/phase-2-manual-uat-checklist.html`

## Test Setup

- [ ] Docker stack is running.
- [ ] API is reachable at `http://localhost:9093/api/health`.
- [ ] Portal is reachable at `http://localhost:9092`.
- [ ] MungkhudShop is reachable through the Portal module card, not direct login.
- [ ] Browser dev tools console is open.
- [ ] Use a clean browser profile or clear app storage before starting.
- [ ] Active branches available:
  - [ ] `BC Auto Service` (`bc-auto-service`)
  - [ ] `BC Auto Samchuk` (`bc-auto-samchuk`)
  - [ ] `BC Auto Mueng Suphan` (`bc-auto-mueng-suphan`)
- [ ] No `All branches` / `ทุกสาขา` option appears in normal Portal branch selection.

## Portal Dev Access

- [ ] Open `http://localhost:9092/?from=mungkhudshop&reason=token_expired`.
- [ ] Selector renders without redirect loop.
- [ ] Query params are cleaned after render.
- [ ] Select `Admin` + `BC Auto Service`; enter Portal.
- [ ] Open DevTools Application storage and confirm:
  - [ ] `app.session.devAuth = 1`
  - [ ] `app.session.role = admin`
  - [ ] `app.session.userId` exists
  - [ ] `app.session.userName` exists
  - [ ] `app.session.authModel` exists
  - [ ] `app.session.branchId = bc-auto-service`
  - [ ] `app.session.branchLocked = true`
  - [ ] old keys are not written: `bcauto_dev_auth`, `bcauto_role`, `bcauto_branch`
- [ ] Use Switch Role and confirm the selector returns.
- [ ] Repeat role + branch entry for:
  - [ ] Owner
  - [ ] Manager
  - [ ] S.A.
  - [ ] Mechanic/Technician
- [ ] Repeat with each branch:
  - [ ] BC Auto Service / `bc-auto-service`
  - [ ] BC Auto Samchuk / `bc-auto-samchuk`
  - [ ] BC Auto Mueng Suphan / `bc-auto-mueng-suphan`
- [ ] Confirm `All branches` / `ทุกสาขา` is not available for Admin, Owner, or Manager.

## Portal Module Visibility

- [ ] Admin sees Admin Suite.
- [ ] Admin sees Garage Portal System.
- [ ] Owner sees Manager Dashboard.
- [ ] Manager sees Manager Dashboard.
- [ ] S.A. sees Garage, HR, Technical Knowledge, and S.A. docs.
- [ ] Mechanic sees Garage/mechanic access, HR self-service, and Technical Knowledge.
- [ ] S.A. cannot open Manager Dashboard by direct URL.
- [ ] Mechanic cannot open Manager Dashboard by direct URL.
- [ ] Non-admin cannot open Admin Suite direct URLs.

## Portal To MungkhudShop Session

- [ ] Login through Portal as Admin or Manager.
- [ ] Click Garage Portal System.
- [ ] MungkhudShop opens without showing its own login page.
- [ ] MungkhudShop shows selected role.
- [ ] MungkhudShop shows the selected real branch, not an all-branch scope.
- [ ] MungkhudShop local/session storage uses `app.session.branchId` and not `bcauto_branch` or `mungkhud_branch`.
- [ ] Refresh MungkhudShop dashboard.
- [ ] Session survives refresh.
- [ ] Open MungkhudShop directly in a fresh tab without Portal session.
- [ ] User is redirected back to Portal safely.
- [ ] Switch role in Portal and reopen MungkhudShop.
- [ ] MungkhudShop reflects the new role/branch.

## Job Lifecycle

- [ ] As S.A. or Manager, create a new customer.
- [ ] Create or select a vehicle for that customer.
- [ ] Create a new job.
- [ ] Assign a mechanic.
- [ ] Add at least one service line.
- [ ] Add at least one stock-tracked product line.
- [ ] Save job.
- [ ] Move job through service status/kanban stages.
- [ ] Mechanic view can see assigned work.
- [ ] Complete/QC job where available.
- [ ] Close job using the server close/payment flow.
- [ ] Invoice is generated or confirmed.
- [ ] Receipt is generated or confirmed.
- [ ] Job status becomes completed.
- [ ] Payment status becomes paid.
- [ ] Refresh after close.
- [ ] Job/document/payment state remains correct.

## Document Workflow

- [ ] Create quotation.
- [ ] Confirm quotation.
- [ ] Create invoice from quotation/job where available.
- [ ] Confirm invoice.
- [ ] Create receipt/payment.
- [ ] Confirm receipt.
- [ ] Try editing confirmed document item.
- [ ] Edit is blocked.
- [ ] Try deleting confirmed document.
- [ ] Delete is blocked.
- [ ] Try voiding paid document.
- [ ] Void is blocked.
- [ ] Create a stock document in draft.
- [ ] Confirm through server endpoint/UI only.
- [ ] Direct table status edit is blocked or posts ledger correctly through backend guard.

## Stock Receipt And Weighted Average Cost

- [ ] Select branch `BC Auto Service`.
- [ ] Create or identify a stock product.
- [ ] Create goods receipt at cost A.
- [ ] Confirm goods receipt.
- [ ] Confirm stock balance increases.
- [ ] Create second goods receipt at cost B.
- [ ] Confirm goods receipt.
- [ ] Confirm product average cost recalculates correctly.
- [ ] Create requisition/issue.
- [ ] Confirm requisition.
- [ ] Confirm stock decreases.
- [ ] Confirm cost remains sensible after OUT.
- [ ] Try issue greater than available stock.
- [ ] System blocks with insufficient stock error.

## Stock Adjustment

- [ ] Create positive stock adjustment with reason.
- [ ] Confirm adjustment.
- [ ] Balance increases.
- [ ] Create negative stock adjustment with reason within available balance.
- [ ] Confirm adjustment.
- [ ] Balance decreases.
- [ ] Create stock adjustment without reason.
- [ ] System blocks the adjustment.
- [ ] Try negative adjustment greater than stock.
- [ ] System blocks negative stock.
- [ ] Recalculate Costs from Admin Integrity page.
- [ ] Product cost remains/recalculates correctly.

## Branch Transfer

- [ ] Select source branch `BC Auto Service`.
- [ ] Select destination branch `BC Auto Samchuk`.
- [ ] Destination selector lists only real branches and excludes the current source branch.
- [ ] Destination selector does not include `All branches` / `ทุกสาขา`.
- [ ] Create stock transfer.
- [ ] Confirm transfer.
- [ ] Source branch balance decreases.
- [ ] Destination branch shows in-transit quantity.
- [ ] Receive transfer.
- [ ] Destination branch on-hand increases.
- [ ] Void an in-transit transfer before receive.
- [ ] Source branch balance is restored.
- [ ] Try voiding a received transfer after destination stock has been consumed.
- [ ] System blocks reversal if it would create negative destination stock.

## Traceability

- [ ] Create or identify serial-tracked product.
- [ ] Receive serial-tracked product with serial number.
- [ ] Try receiving duplicate serial.
- [ ] System blocks duplicate serial.
- [ ] Issue serial-tracked product with valid serial.
- [ ] System accepts.
- [ ] Try issuing same serial again.
- [ ] System blocks.
- [ ] Create or identify batch-tracked product.
- [ ] Receive batch product with batch/lot number.
- [ ] Issue from valid batch.
- [ ] System accepts.
- [ ] Try issuing unknown batch.
- [ ] System blocks.
- [ ] For FIFO-enabled product, receive old lot then new lot.
- [ ] Try issuing new lot before old lot.
- [ ] System blocks with FIFO requirement.

## Admin Integrity Page

- [ ] Login as Admin.
- [ ] Open `http://localhost:9092/pages/admin/integrity-check.html`.
- [ ] Page loads without console errors.
- [ ] Run Checks.
- [ ] Summary cards update.
- [ ] Stock Integrity section renders all categories.
- [ ] Document Integrity section renders all categories.
- [ ] Export JSON downloads a file.
- [ ] Safe Repair button is visible.
- [ ] Safe Repair asks for confirmation.
- [ ] Cancel Safe Repair; no data changes.
- [ ] Run Recalculate Costs.
- [ ] Page refreshes checks after recalculation.
- [ ] Login as Owner/Manager/S.A./Mechanic.
- [ ] Direct URL to integrity page is denied or redirected.

## Role And Branch Isolation

- [ ] Login as Admin + `BC Auto Service`; only that branch's normal workflow data is visible.
- [ ] Login as Owner + `BC Auto Samchuk`; normal workflows remain scoped to that one branch.
- [ ] Login as Manager + one branch; other branch data is not visible in branch-scoped workflows.
- [ ] Login as S.A. + one branch; admin/finance unsafe pages are hidden and data is branch-scoped.
- [ ] Login as Mechanic + one branch; payment/admin/stock settings are hidden and data is branch-scoped.
- [ ] Direct URL checks enforce the same restrictions as menu visibility.
- [ ] API calls with invalid dev role are rejected.
- [ ] API calls with valid dev role and branch headers succeed only for allowed routes.
- [ ] Manager dashboard has no `All branches` option.
- [ ] Manager dashboard request with `branch_id=all` is rejected.
- [ ] Job cards, kanban, stock, reports, documents, and mechanic views show only selected-branch records.
- [ ] Cross-branch activity is possible only through stock transfer create/receive flow.

## Bilingual And Responsive Spot Check

- [ ] Portal language toggle switches Thai to English without reload.
- [ ] Portal language toggle switches English to Thai without reload.
- [ ] New Portal text changes language.
- [ ] Mobile viewport around 390px wide works for dev selector.
- [ ] Mobile Portal module cards are single column.
- [ ] Thai labels do not clip or overlap.
- [ ] English labels do not clip or overlap.
- [ ] MungkhudShop main dashboard is usable on mobile.
- [ ] Stock/document/job screens remain usable enough for current dev phase.

## Regression Watch List

- [ ] No kick-out redirect loop.
- [ ] No stale token loop.
- [ ] No MungkhudShop login page appears in normal Portal flow.
- [ ] No direct MungkhudShop access without Portal session.
- [ ] No branch names other than:
  - [ ] `BC Auto Service`
  - [ ] `BC Auto Samchuk`
  - [ ] `BC Auto Mueng Suphan`
- [ ] No hardcoded branch assumptions are visible in UI.
- [ ] No console errors during core workflow.
- [ ] No API 500 during core workflow.

## Sign-Off

- [ ] Phase 2 manual UAT passed.
- [ ] Failed items are documented with screenshot, role, branch, URL, and document/job number.
- [ ] Dirty integrity findings are either repaired or explicitly accepted for current test data.
- [ ] Ready to start Phase 3 Manager Dashboard.
