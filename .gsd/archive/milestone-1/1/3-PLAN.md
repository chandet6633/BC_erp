---
phase: 1
plan: 3
wave: 2
---

# Plan 1.3: Mobile-First CSS Foundation + Remove Branch Page

## Objective
Add responsive breakpoints and utility classes to the shared design system, and remove the master-branch page from MungkhudShop. This enables all Phase 2-5 work to be mobile-responsive from the start.

## Context
- .gsd/DECISIONS.md (ADR-009 — iPhone breakpoints: 430/768/1024)
- webapp/shared/design-tokens.css (existing design system — NO breakpoints currently)
- webapp/MungkhudShop/src/app.js (route registration, line 47: master-branch)
- webapp/MungkhudShop/src/pages/master-branch.js (file to remove)

## Tasks

<task type="auto">
  <name>Add mobile breakpoints and responsive utilities to design-tokens.css</name>
  <files>webapp/shared/design-tokens.css</files>
  <action>
    APPEND (do not modify existing content) the following to design-tokens.css:

    1. CSS custom properties for breakpoints (inside :root):
       --bp-phone: 430px;
       --bp-tablet: 768px;
       --bp-desktop: 1024px;
       --touch-target-min: 44px;

    2. Media query utility classes (after :root block):
    
    Mobile-first responsive grid:
    - `.form-row-2` → single column below 430px, 2-col above
    - `.form-row-3` → single column below 430px, 2-col 430-768, 3-col above
    - `.form-row-4` → single column below 430px, 2-col 430-768, 4-col above
    
    Visibility utilities:
    - `.hide-mobile` → display:none below 430px
    - `.hide-tablet` → display:none below 768px
    - `.show-mobile-only` → display:none above 430px
    - `.show-tablet-only` → display:none above 768px
    
    Touch-friendly:
    - `.touch-target` → min-height: 44px; min-width: 44px; (for buttons/links)
    
    Stack utility:
    - `.stack-mobile` → flex-direction: column below 430px
    
    Table responsive:
    - `.data-grid-responsive` — make tables scrollable horizontally on mobile
    
    Page-level:
    - Reduce `.page-header` padding on mobile
    - Make `.toolbar` wrap on mobile
    - Make `.card` full-width on mobile (remove side margins)
    - Reduce font sizes slightly on mobile for h1/h2

    IMPORTANT: All form-row classes must already work at desktop sizes — check existing CSS first. Only ADD media queries that override at smaller sizes. Do not break existing desktop layouts.
  </action>
  <verify>Select-String -Path "webapp/shared/design-tokens.css" -Pattern "bp-phone|bp-tablet|hide-mobile|touch-target" | Measure-Object | Select-Object -ExpandProperty Count</verify>
  <done>At least 4 responsive utility classes added. Breakpoint variables defined. File still valid CSS.</done>
</task>

<task type="auto">
  <name>Remove master-branch page from MungkhudShop</name>
  <files>
    webapp/MungkhudShop/src/app.js
    webapp/MungkhudShop/src/pages/master-branch.js
  </files>
  <action>
    1. In app.js, remove the route entry for 'master-branch':
       Delete line: `'master-branch': () => import('./pages/master-branch.js').then(m => m.initBranchPage),`
    
    2. Search app.js for any sidebar menu references to "master-branch" or "จัดการสาขา" — remove those entries too.
    
    3. Delete the file: webapp/MungkhudShop/src/pages/master-branch.js
    
    4. Verify no other files import from master-branch.js:
       Search for "master-branch" across MungkhudShop/src/ — should return 0 results after cleanup.
    
    DO NOT remove the branches table or API routes — branch management still exists in the Portal.
  </action>
  <verify>
    $routeCheck = Select-String -Path "webapp/MungkhudShop/src/app.js" -Pattern "master-branch" | Measure-Object | Select-Object -ExpandProperty Count;
    $fileCheck = Test-Path "webapp/MungkhudShop/src/pages/master-branch.js";
    Write-Output "Route refs: $routeCheck, File exists: $fileCheck"
  </verify>
  <done>Route refs: 0, File exists: False. No remaining references to master-branch in MungkhudShop.</done>
</task>

<task type="auto">
  <name>Update API server validation for new fields</name>
  <files>webapp/api-server/middleware/validate.js</files>
  <action>
    Review validate.js and ensure:
    1. The new fields (payment_status, lead_mechanic_id, etc.) are NOT in any blocked/stripped field lists
    2. If there's a whitelist pattern, add the new fields
    3. Ensure Attachment-type fields can pass through validation (they'll be handled by NocoDB's own upload endpoint)
    
    Also check api-server/routes/data.js:
    - Ensure the BRANCH_SCOPED_TABLES list doesn't need updating (jobs is already there)
    - Ensure FINANCIAL_TABLES doesn't block job_payments for SA role if needed
    
    Make minimal changes — only update if current validation would block the new fields.
  </action>
  <verify>Select-String -Path "webapp/api-server/middleware/validate.js" -Pattern "payment_status|lead_mechanic" -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count</verify>
  <done>Validation middleware allows new fields to pass through. No blocking rules for payment_status or mechanic IDs.</done>
</task>

## Success Criteria
- [ ] `design-tokens.css` has breakpoint variables and responsive utility classes
- [ ] Form rows collapse to single column on iPhone screens (≤430px)
- [ ] `master-branch.js` deleted, route removed from app.js
- [ ] API validation does not block new schema fields
- [ ] No build errors in MungkhudShop after branch page removal
