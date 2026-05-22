---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Combined Customer+Vehicle Card with Autofill + Inline Creation

## Objective
Merge the separate "Vehicle Info" and "Customer Info" sections into a single card. When an existing plate is typed, autofill all fields. When a new plate is entered, show an inline prompt for the user to input customer+vehicle details. On save, auto-create both records in NocoDB and link them.

## Context
- .gsd/SPEC.md (F1 — inline creation, F10 — duplicate prevention, F13 — service history badge)
- .gsd/DECISIONS.md (verified schema: vehicles has customer_id, jobs has customer_id + vehicle_id)
- MungkhudShop/src/pages/job.js (lines 82-295 — renderAddEditTab, plate AC at line 297-329, customer AC at 332-350)
- MungkhudShop/src/pages/job-data.js (lines 78-128 — editJob, 139-224 — saveJobData, 226-256 — clearJobForm)
- MungkhudShop/src/pages/job-state.js (all — module state)
- shared/duplicate-check.js (checkDuplicateVehicle, checkDuplicateCustomer)

## Tasks

<task type="auto">
  <name>Redesign job form: merge vehicle+customer into single card, add service history badge</name>
  <files>MungkhudShop/src/pages/job.js</files>
  <action>
    In `renderAddEditTab` function (lines 82-295), replace the two separate sections:
    - "ข้อมูลยานพาหนะ" (Vehicle Info, lines 134-161)
    - "ข้อมูลลูกค้า" (Customer Info, lines 163-176)
    
    With a SINGLE combined section:
    ```
    <!-- Customer + Vehicle Card (Combined) -->
    <div class="job-section">
      <div class="job-section-title"><span class="material-icons-outlined">directions_car</span> ข้อมูลลูกค้า & ยานพาหนะ</div>
      
      <!-- Service History Badge (hidden until plate selected) -->
      <div id="jobServiceBadge" style="display:none;" class="service-badge">...</div>
      
      <!-- Plate + Red Plate row -->
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label required">ทะเบียนรถ</label>
          <div id="jobPlateAC"></div>
        </div>
        <div class="form-group" style="align-items:flex-start;">
          <label class="form-label">ป้ายแดง</label>
          <div class="toggle" id="jobRedPlate"></div>
        </div>
      </div>
      
      <!-- New Customer/Vehicle Prompt (hidden until new plate detected) -->
      <div id="jobNewRecordPrompt" style="display:none;" class="new-record-prompt">
        <div style="padding:var(--sp-3);background:var(--bc-warning-light);border-radius:var(--radius-md);margin-bottom:var(--sp-3);">
          <span class="material-icons-outlined" style="font-size:16px;vertical-align:middle;">info</span>
          <strong>ไม่พบข้อมูลยานพาหนะ</strong> — กรุณากรอกข้อมูลด้านล่าง ระบบจะบันทึกให้อัตโนมัติ
        </div>
      </div>
      
      <!-- Vehicle fields row -->
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">รุ่นรถ</label>
          <input type="text" class="form-control" id="jobModel" placeholder="Toyota Camry">
        </div>
        <div class="form-group">
          <label class="form-label">เลขไมล์</label>
          <input type="number" class="form-control" id="jobMileage" placeholder="0">
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">สี</label>
          <input type="text" class="form-control" id="jobColor" placeholder="สีรถ...">
        </div>
        <div class="form-group">
          <label class="form-label">เลขตัวถัง (VIN)</label>
          <input type="text" class="form-control" id="jobChassis" placeholder="VIN...">
        </div>
      </div>
      
      <!-- Customer fields row -->
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label required">ชื่อลูกค้า</label>
          <div id="jobCustomerAC"></div>
        </div>
        <div class="form-group">
          <label class="form-label">เบอร์โทร</label>
          <input type="text" class="form-control" id="jobCustomerPhone" placeholder="08x-xxx-xxxx">
        </div>
      </div>
    </div>
    ```
    
    Key changes:
    1. Combined into ONE section with header "ข้อมูลลูกค้า & ยานพาหนะ"
    2. Added `id="jobServiceBadge"` div (hidden by default) — shows visit count, last date, mileage delta
    3. Added `id="jobNewRecordPrompt"` warning banner (hidden by default)
    4. Added `id="jobColor"` field (maps to vehicles.color)
    5. All existing IDs preserved (jobPlateAC, jobModel, jobMileage, jobChassis, jobCustomerAC, jobCustomerPhone)
    
    Service badge HTML:
    ```html
    <div id="jobServiceBadge" style="display:none;padding:var(--sp-3);background:var(--bc-info-light,#DBEAFE);border-radius:var(--radius-md);margin-bottom:var(--sp-3);font-size:0.85rem;display:flex;gap:var(--sp-4);flex-wrap:wrap;">
      <span><strong>🔄</strong> <span id="badgeVisitCount">-</span></span>
      <span><strong>📅</strong> <span id="badgeLastDate">-</span></span>
      <span><strong>🛣️</strong> <span id="badgeMileage">-</span></span>
    </div>
    ```
    
    Modify the plate autocomplete `onSelect` callback (lines 311-328):
    - After autofill, also set jobColor from v.color
    - After autofill, query jobs table for service history: count jobs for this plate, get last service date, calculate mileage delta
    - Show the service badge with results
    - Hide the newRecordPrompt when plate matches
    
    Add a new event: when the plate AC input loses focus and NO item was selected (user typed a new plate):
    - Call `checkDuplicateVehicle(plateValue)` from shared/duplicate-check.js
    - If not duplicate: show the newRecordPrompt banner, set a state flag `isNewVehicle = true`
    - If duplicate: autofill from the found record
    
    Import `checkDuplicateVehicle`, `checkDuplicateCustomer`, `checkDuplicateJob` at top of file.
  </action>
  <verify>Select-String -Path "MungkhudShop/src/pages/job.js" -Pattern "jobServiceBadge|jobNewRecordPrompt|jobColor|checkDuplicate" | Measure-Object | Select-Object -ExpandProperty Count</verify>
  <done>At least 4 matches: service badge, new record prompt, color field, and duplicate check import. Vehicle+customer sections merged into one.</done>
</task>

<task type="auto">
  <name>Update saveJobData to auto-create customer+vehicle records and link them</name>
  <files>MungkhudShop/src/pages/job-data.js</files>
  <action>
    Modify `saveJobData` function (lines 139-224) to:
    
    1. BEFORE saving the job, check if this is a new vehicle (state flag or no vehicle_id):
       a. If plate is new (not from autocomplete selection):
          - Check if vehicle already exists via `checkDuplicateVehicle(plate)`
          - If exists: use existing vehicle record, set vehicle_id
          - If not: create new vehicle record with fields from form (plate, model, mileage, color, vin)
       b. For customer:
          - If customer_name is new (not from autocomplete selection):
            - Check if customer exists by phone via `checkDuplicateCustomer(phone)`
            - If exists: use existing, set customer_id
            - If not: create new customer record (name, phone)
       c. Link vehicle to customer: update vehicle's `customer_id` to the resolved customer_id
    
    2. Include in job payload:
       - `customer_id`: resolved customer record ID
       - `vehicle_id`: resolved vehicle record ID  
       - `mileage_in`: mileage value from form (already exists)
    
    3. After save, update the vehicle's `mileage` field with the new mileage value from form
    
    4. Add duplicate job check BEFORE save:
       - Call `checkDuplicateJob(plate, editingId)` 
       - If duplicate found: show confirm dialog "พบใบงานที่เปิดอยู่สำหรับทะเบียน X (JOB-xxx). ต้องการสร้างใหม่หรือไม่?"
       - If user declines: abort save
    
    Also modify `editJob` (lines 78-128):
    - Load the service badge when editing: query jobs by plate, calculate stats, show badge
    - Set the `jobColor` field from vehicle data (need to fetch vehicle record if vehicle_id exists)
    
    Also modify `clearJobForm` (lines 226-256):
    - Clear the color field: `panel.querySelector('#jobColor').value = ''`
    - Hide service badge and new record prompt
    
    Import `checkDuplicateJob`, `checkDuplicateVehicle`, `checkDuplicateCustomer` from shared/duplicate-check.js
    Import `createRecord` (already imported)
  </action>
  <verify>Select-String -Path "MungkhudShop/src/pages/job-data.js" -Pattern "checkDuplicate|customer_id|vehicle_id|jobColor|jobServiceBadge" | Measure-Object | Select-Object -ExpandProperty Count</verify>
  <done>At least 5 matches: duplicate checks imported, customer_id/vehicle_id in payload, color field handled, service badge populated.</done>
</task>

## Success Criteria
- [ ] Vehicle + Customer sections merged into single "ข้อมูลลูกค้า & ยานพาหนะ" card
- [ ] Typing an existing plate autofills all vehicle + customer fields
- [ ] Typing a new plate shows warning banner prompting user to fill details
- [ ] On save with new plate: creates vehicle + customer records automatically
- [ ] Service history badge shows visit count, last date, mileage delta
- [ ] Duplicate job warning when plate has an open job
- [ ] Color field added and persisted
- [ ] clearJobForm resets all new fields
