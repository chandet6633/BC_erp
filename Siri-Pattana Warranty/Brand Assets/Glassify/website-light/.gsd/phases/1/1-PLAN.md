---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: NocoDB Table Setup + Form Submission Logic

## Objective
Create a `glassify_leads` table in NocoDB and wire the existing contact form in `contact.html` to POST data to NocoDB via its REST API, replacing the current fake success animation with a real backend write.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- contact.html (existing form with fields: fname, lname, phone, line, car_brand, car_model, tier, message)
- NocoDB instance at http://localhost:9080 with API token `UmqurJUh0NhbrQWnhMJ-sXRgA6wfrlX4dvk9Y5YD`

## Tasks

<task type="auto">
  <name>Create glassify_leads table in NocoDB</name>
  <files>NocoDB Admin UI at http://localhost:9080</files>
  <action>
    Using the NocoDB REST API, create a new table `glassify_leads` in the BC_ERP base with these columns:
    - `fname` (SingleLineText) — ชื่อ
    - `lname` (SingleLineText) — นามสกุล
    - `phone` (SingleLineText) — เบอร์โทร
    - `line_id` (SingleLineText) — LINE ID
    - `car_brand` (SingleLineText) — ยี่ห้อรถ
    - `car_model` (SingleLineText) — รุ่นรถ
    - `tier` (SingleLineText) — รุ่นฟิล์มที่สนใจ
    - `message` (LongText) — ข้อความเพิ่มเติม
    - `status` (SingleLineText, default: "new") — สถานะ (new/contacted/booked/done)
    - `source` (SingleLineText, default: "website") — แหล่งที่มา

    NocoDB will auto-create Id, CreatedAt, UpdatedAt.

    NOTE: If we cannot create the table via API (permissions/CORS), document the manual steps for the user to create it in the NocoDB UI.
  </action>
  <verify>curl GET request to NocoDB listing records from the new table returns 200 OK with empty list</verify>
  <done>Table `glassify_leads` exists in NocoDB with all specified columns</done>
</task>

<task type="auto">
  <name>Wire contact form to NocoDB API</name>
  <files>contact.html</files>
  <action>
    Replace the `handleSubmit()` function in contact.html with real NocoDB API integration:

    1. On form submit, collect all field values into an object
    2. POST to NocoDB REST API: `POST http://localhost:9080/api/v2/meta/bases/{baseId}/tables/{tableId}/records`
       - Headers: `xc-token: {token}`, `Content-Type: application/json`
       - Body: field values mapped to lowercase column names
    3. Show loading state on the submit button (spinner + "กำลังส่ง...")
    4. On success (201): show green success state with checkmark, reset form after 3 seconds
    5. On failure: show red error state with message "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่" and re-enable button

    IMPORTANT:
    - The NocoDB token will be visible in client-side JS. This is acceptable for a lead-capture form (write-only, no sensitive reads). Document this trade-off in DECISIONS.md.
    - Use the NocoDB v2 API endpoint format: `/api/v2/public/shared-view/{sharedViewId}/rows` if a shared form view is available, OR use the direct table API with xc-token.
    - The form should gracefully degrade — if the API call fails, still show the error and allow retry.
  </action>
  <verify>
    1. Fill out the contact form and submit
    2. Check NocoDB table has a new record with correct field values
    3. Verify the success animation displays correctly
    4. Verify submitting with an unreachable API shows the error state
  </verify>
  <done>
    - Contact form successfully writes a new row to `glassify_leads` in NocoDB
    - Success/error states display correctly in the UI
    - Form resets after successful submission
  </done>
</task>

## Success Criteria
- [ ] A `glassify_leads` table exists in NocoDB with all required columns
- [ ] Submitting the contact form creates a new row in the table
- [ ] UI shows loading → success flow with visual feedback
- [ ] UI shows loading → error flow when API is unreachable
