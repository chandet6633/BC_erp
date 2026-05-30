---
phase: 1
plan: 2
wave: 1
---

# Plan 1.2: Shared Utilities — Duplicate Check + Image Compressor

## Objective
Create reusable shared utility modules that multiple features depend on: a generic duplicate record checker and a client-side image compressor for attachment uploads.

## Context
- .gsd/DECISIONS.md (ADR-008 — generic duplicate check, ADR-007 — image compression)
- webapp/shared/nocodb-adapter.js (existing shared CRUD functions)
- webapp/shared/filter-translator.js (existing filter utility pattern)
- webapp/MungkhudShop/src/utils/sanitize.js (existing utility pattern)

## Tasks

<task type="auto">
  <name>Create shared/duplicate-check.js utility</name>
  <files>webapp/shared/duplicate-check.js</files>
  <action>
    Create a new ES module that exports a `checkDuplicate` function:

    ```
    export async function checkDuplicate(table, field, value, excludeId = null)
    ```

    Behavior:
    1. Uses `fetchFullList` from nocodb-adapter.js to query `table` where `field = value`
    2. If `excludeId` is provided, filter out that record (for edit mode — don't flag yourself as duplicate)
    3. Returns `{ isDuplicate: boolean, existingRecord: object|null }`
    4. Handle edge cases: empty value (return false), null/undefined value (return false)
    5. Use sanitizeFilter for the value to prevent injection
    
    Also export convenience wrappers:
    - `checkDuplicateJob(plate, excludeId)` — checks jobs table for open jobs with same plate
    - `checkDuplicateCustomer(phone, excludeId)` — checks customers by phone
    - `checkDuplicateVehicle(plateNumber, excludeId)` — checks vehicles by plate_number
    - `checkDuplicateProduct(code, excludeId)` — checks products by code
    
    Import sanitizeFilter from the filter-translator or inline a simple escape.
  </action>
  <verify>Get-Content "webapp/shared/duplicate-check.js" | Select-String "export async function checkDuplicate" | Measure-Object | Select-Object -ExpandProperty Count</verify>
  <done>File exists, exports checkDuplicate and 4 convenience wrappers. Uses sanitizeFilter for safety.</done>
</task>

<task type="auto">
  <name>Create shared/image-compressor.js utility</name>
  <files>webapp/shared/image-compressor.js</files>
  <action>
    Create a new ES module for client-side image compression before upload:

    ```
    export async function compressImage(file, options = {})
    ```

    Parameters:
    - `file` — File or Blob from input[type=file] or camera capture
    - `options.maxWidth` — default 1200 (pixels)
    - `options.maxHeight` — default 1200 (pixels)
    - `options.quality` — default 0.7 (JPEG quality)
    - `options.outputType` — default 'image/jpeg'

    Implementation:
    1. Create an Image element, load the file via FileReader → dataURL
    2. Create a canvas, calculate scaled dimensions maintaining aspect ratio
    3. Draw image to canvas at reduced size
    4. Export canvas as blob with specified quality
    5. Return { blob, dataUrl, originalSize, compressedSize, ratio }

    Also export:
    - `compressImageToBase64(file, options)` — returns base64 string instead of blob
    - `createImagePreview(file, containerEl)` — renders a thumbnail preview into a DOM element

    Edge cases:
    - If image is already smaller than max dimensions, don't upscale
    - If file is not an image, throw a descriptive error
    - Handle EXIF orientation (use canvas transform for mobile photo rotation)
  </action>
  <verify>Get-Content "webapp/shared/image-compressor.js" | Select-String "export async function compressImage" | Measure-Object | Select-Object -ExpandProperty Count</verify>
  <done>File exists, exports compressImage, compressImageToBase64, and createImagePreview. Uses canvas API for resizing.</done>
</task>

## Success Criteria
- [ ] `duplicate-check.js` exports generic + 4 specific duplicate check functions
- [ ] `image-compressor.js` exports compression + preview functions
- [ ] Both files use ES module syntax compatible with Vite bundling
- [ ] No new npm dependencies required (uses native browser APIs)
