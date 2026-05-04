---
phase: 2
plan: 2
wave: 1
---

# Plan 2.2: Mechanic Assignment — Lead + Helpers Dropdown

## Objective
Replace the free-text "ช่างผู้รับผิดชอบ" (technician) field with a proper dropdown populated from the `users` table (role=mechanic only), plus a multi-select for helper mechanics. Data flows to the new `lead_mechanic_id` and `helper_mechanic_ids` columns.

## Context
- .gsd/SPEC.md (F3 — mechanic assignment)
- .gsd/DECISIONS.md (verified: users table has name, display_name, role fields)
- MungkhudShop/src/pages/job.js (line 124-127 — technician text input)
- MungkhudShop/src/pages/job-data.js (line 91 — editJob sets technician, line 167 — payload has technician)
- MungkhudShop/src/pages/job-state.js (all state management)

## Tasks

<task type="auto">
  <name>Replace technician text field with mechanic lead dropdown + helpers multi-select</name>
  <files>
    MungkhudShop/src/pages/job.js
    MungkhudShop/src/pages/job-data.js
    MungkhudShop/src/pages/job-state.js
  </files>
  <action>
    **In job.js renderAddEditTab:**
    
    Replace the technician form-group (lines 124-127):
    ```html
    <div class="form-group">
      <label class="form-label">ช่างผู้รับผิดชอบ</label>
      <input type="text" class="form-control" id="jobTechnician" placeholder="ชื่อช่าง...">
    </div>
    ```
    
    With:
    ```html
    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label required">ช่างหลัก (Lead)</label>
        <select class="form-control" id="jobLeadMechanic">
          <option value="">-- เลือกช่าง --</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">ช่างช่วย (Helpers)</label>
        <div id="jobHelperMechanics" class="helper-select-area"></div>
      </div>
    </div>
    ```
    
    After the autocomplete setup section (after line ~360), add mechanic loading logic:
    1. Fetch users where `role` is 'mechanic' (or 'employee' — check actual roles)
    2. Populate `#jobLeadMechanic` <select> with options: `<option value="{user.id}">{display_name || name}</option>`
    3. For helpers multi-select (`#jobHelperMechanics`):
       - Render checkboxes for each mechanic (except the selected lead)
       - CSS: wrap in flex, each checkbox is a pill-style toggle
       - Style: `.helper-chip { display:inline-flex; align-items:center; gap:4px; padding:6px 12px; border:1px solid var(--bc-border); border-radius:var(--radius-full); cursor:pointer; font-size:0.85rem; }`
       - `.helper-chip.active { background:var(--bc-navy-light); color:white; border-color:var(--bc-navy-light); }`
    4. When lead mechanic changes, re-render helper chips (exclude selected lead)
    
    **In job-state.js:**
    - Add `mechanicsCache` (null initially) to state
    - Add `getMechanics()` function that fetches & caches users with role=mechanic
    - Export `getMechanics`, add to resetState
    
    **In job-data.js editJob:**
    - Replace `panel.querySelector('#jobTechnician').value = item.technician` (line 91) with:
      - Set `#jobLeadMechanic` value to `item.lead_mechanic_id`
      - Set helper chips active for IDs in `item.helper_mechanic_ids` (comma-separated)
    
    **In job-data.js saveJobData:**
    - Replace `technician: panel.querySelector('#jobTechnician').value` (line 167) with:
      - `lead_mechanic_id: panel.querySelector('#jobLeadMechanic').value`
      - `helper_mechanic_ids: getSelectedHelperIds(panel).join(',')`
      - Keep `technician` as well (set to display_name of lead mechanic for backward compat)
    
    **In job-data.js clearJobForm:**
    - Replace `panel.querySelector('#jobTechnician').value = ''` (line 239) with:
      - Reset lead select to empty
      - Deactivate all helper chips
    
    Helper function `getSelectedHelperIds(panel)`:
    - Query all `.helper-chip.active` in `#jobHelperMechanics`
    - Return array of data-id values
  </action>
  <verify>Select-String -Path "MungkhudShop/src/pages/job.js" -Pattern "jobLeadMechanic|jobHelperMechanics|helper-chip" | Measure-Object | Select-Object -ExpandProperty Count</verify>
  <done>At least 3 matches: lead dropdown, helpers container, and chip class. Free-text technician field replaced.</done>
</task>

## Success Criteria
- [ ] Lead mechanic dropdown populated from users table (mechanic role only)
- [ ] Helper mechanics shown as toggleable chip pills
- [ ] Lead mechanic excluded from helper list
- [ ] `lead_mechanic_id` and `helper_mechanic_ids` saved to jobs table
- [ ] Edit mode correctly restores lead + helper selections
- [ ] Clear form resets both fields
