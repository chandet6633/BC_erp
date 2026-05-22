---
phase: 2
plan: 3
wave: 2
---

# Plan 2.3: Ad-Hoc Line Items (No Stock Impact)

## Objective
Add a toggle on each job line item to switch between "product" (from catalog) and "adhoc" (manual entry). Ad-hoc items don't look up products, don't affect stock, but DO affect financials. They still require a product type selection.

## Context
- .gsd/SPEC.md (F2 — ad-hoc items)
- .gsd/DECISIONS.md (verified: job_items.type already exists — can store 'adhoc')
- MungkhudShop/src/pages/job-line-items.js (all — addJobLineRow, recalcTotals)
- MungkhudShop/src/pages/job-data.js (lines 192-207 — save items loop, lines 209-214 — stock ledger)
- MungkhudShop/src/pages/job.js (lines 200-228 — items grid HTML, line 365-368 — add item button)

## Tasks

<task type="auto">
  <name>Add adhoc toggle to line items and skip stock for adhoc type</name>
  <files>
    MungkhudShop/src/pages/job-line-items.js
    MungkhudShop/src/pages/job-data.js
    MungkhudShop/src/pages/job.js
  </files>
  <action>
    **In job-line-items.js addJobLineRow:**
    
    Modify the row HTML to add a type toggle BEFORE the product autocomplete:
    
    Current first cells:
    ```
    <td>${index}</td>
    <td><div class="ac-line-host"></div></td>
    ```
    
    New first cells:
    ```
    <td>${index}</td>
    <td>
      <div class="item-type-toggle">
        <button class="btn btn-xs item-type-btn ${isAdhoc ? 'adhoc' : 'product'}" 
                data-type="${isAdhoc ? 'adhoc' : 'product'}" 
                title="คลิกเพื่อสลับ: สินค้าจากคลัง / เพิ่มรายการด่วน">
          ${isAdhoc ? '⚡' : '📦'}
        </button>
      </div>
      <div class="ac-line-host" style="${isAdhoc ? 'display:none;' : ''}"></div>
      <input type="text" class="form-control item-adhoc-name" 
             placeholder="ชื่อรายการ..." 
             value="${data?.product_name || ''}"
             style="${!isAdhoc ? 'display:none;' : ''}">
      <select class="form-control item-product-type" style="${!isAdhoc ? 'display:none;' : ''}">
        <option value="">-- ประเภท --</option>
        <option value="service">บริการ</option>
        <option value="part">อะไหล่</option>
        <option value="labor">ค่าแรง</option>
        <option value="other">อื่นๆ</option>
      </select>
    </td>
    ```
    
    Determine `isAdhoc` from `data?.type === 'adhoc'`.
    
    Add toggle click handler on `.item-type-btn`:
    - Toggle between 'product' and 'adhoc'
    - When 'product': show autocomplete host, hide adhoc inputs
    - When 'adhoc': hide autocomplete host, show adhoc name input + type select
    - Update button emoji and data-type attribute
    
    When in adhoc mode, user types name directly and selects type from dropdown.
    
    Add CSS for the type toggle button:
    ```css
    .item-type-btn { 
      min-width:32px; height:32px; padding:4px; font-size:14px; 
      border-radius:var(--radius-sm); border:1px solid var(--bc-border);
      cursor:pointer; background:var(--bc-surface-solid);
    }
    .item-type-btn.adhoc { 
      background:var(--bc-warning-light); border-color:var(--bc-warning); 
    }
    ```
    
    **In job.js items grid header:**
    
    Update table header (lines 214-222) — the # column stays, but adjust widths:
    ```
    <th style="width:40px;">#</th>
    <th>สินค้า / บริการ</th>  <!-- stays same -->
    ```
    No header change needed — the toggle is inside the product cell.
    
    **In job-data.js saveJobData (item save loop, lines 192-207):**
    
    Modify the loop to detect adhoc items:
    ```javascript
    for (const tr of rows) {
      const typeBtn = tr.querySelector('.item-type-btn')
      const isAdhoc = typeBtn?.dataset?.type === 'adhoc'
      
      let product_id, product_name, itemType
      
      if (isAdhoc) {
        product_id = ''  // no product link
        product_name = tr.querySelector('.item-adhoc-name')?.value || 'รายการด่วน'
        itemType = tr.querySelector('.item-product-type')?.value || 'other'
      } else {
        const prodInput = tr.querySelector('.item-prod')
        product_id = prodInput?.dataset?.selectedId || ''
        product_name = prodInput?.value || ''
        itemType = 'product'
      }
      
      const qty = parseFloat(tr.querySelector('.item-qty').value) || 0
      const unit_price = parseFloat(tr.querySelector('.item-price').value) || 0
      const discount = parseFloat(tr.querySelector('.item-disc').value) || 0
      
      if (product_id || product_name) {
        await createRecord('job_items', {
          job_id: jobId, product_id, product_name, qty, 
          unit_price, discount, total: (qty * unit_price) - discount,
          type: isAdhoc ? 'adhoc' : itemType  // store type
        })
        // ONLY add to stock ledger if NOT adhoc AND has a valid product_id
        if (!isAdhoc && product_id) {
          itemsForLedger.push({ product_id, qty, unit_price })
        }
      }
    }
    ```
    
    **In job-data.js editJob item loading (line 124):**
    
    When calling `addJobLineRow(panel, ji, idx + 1)`, the `ji` object has `type` field.
    The `addJobLineRow` function already receives `data` — it will check `data.type === 'adhoc'` to set the initial toggle state.
    
    **In the close job handler (job.js lines 396-438):**
    
    When closing and posting to stock ledger, the `jItems` from DB will have `type` field.
    Filter out adhoc items from stock posting:
    ```javascript
    for (const ji of jItems) {
      if (ji.type === 'adhoc') continue  // skip adhoc items for stock
      const prod = pMap[ji.product_id]
      ...
    }
    ```
    
    Also update the below-cost warning check to skip adhoc items.
  </action>
  <verify>Select-String -Path "MungkhudShop/src/pages/job-line-items.js" -Pattern "adhoc|item-type-btn|item-adhoc-name|item-product-type" | Measure-Object | Select-Object -ExpandProperty Count</verify>
  <done>At least 4 matches: adhoc toggle, button class, name input, type select. Ad-hoc items skip stock ledger.</done>
</task>

## Success Criteria
- [ ] Each line item has a toggle button (📦 product vs ⚡ adhoc)
- [ ] Adhoc mode shows: manual name input + product type dropdown
- [ ] Product mode shows: autocomplete search (existing behavior)
- [ ] Adhoc items stored with `type: 'adhoc'` in job_items table
- [ ] Adhoc items NOT sent to stock ledger on job close
- [ ] Adhoc items DO contribute to financial totals (subtotal, grand_total)
- [ ] Edit mode correctly restores adhoc vs product toggle state
- [ ] Below-cost warning skips adhoc items
