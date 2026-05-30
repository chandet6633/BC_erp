/**
 * Job Page — CRUD Operations (v2 — POS Overhaul)
 * v2: Auto-creates vehicle+customer records, mechanic assignment, color field.
 */
import { showToast, showConfirm, formatDate, formatCurrency, renderDataGrid, generateDocId } from '../components/ui.js'
import { fetchFullList, fetchList, createRecord, updateRecord, deleteRecord, uploadAttachment } from '../services/pb.js'
import { postToStockLedger } from '../services/inventory.js'
import { notifyJobCompleted, notifyJobAssigned } from '../services/telegram.js'
import { sanitizeFilter, escapeHtml } from '../utils/sanitize.js'
import { BATCH_SIZE } from '../utils/constants.js'
import { getBranchFilter, getBranch } from '../services/auth.js'
import { isStockTrackedProduct } from '../utils/stock-rules.js'
import { getState, setCurrentItems, setEditingId, getMechanics, getProductsWithStock } from './job-state.js'
import { addJobLineRow, recalcTotals } from './job-line-items.js'
import { checkDuplicateJob, checkDuplicateVehicle, checkDuplicateCustomer } from '@shared/duplicate-check.js'
import { getSelectedHelperIds, setHelperChipState } from './job.js'

/** Load jobs from server (with branch filter) */
export async function loadSearchData(panel, mainContainer) {
    if (!panel || !mainContainer) return
    const results = panel.querySelector('#jobSearchResults')
    if (!results) return
    results.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>'
    const bf = getBranchFilter()
    const opts = bf ? { filter: bf } : {}
    const items = await fetchFullList('jobs', opts)
    if (!panel.isConnected || !mainContainer.isConnected) return
    setCurrentItems(items)
    renderSearchGrid(items, mainContainer)
}

/** Client-side search filter */
export function filterLocalSearch(panel, mainContainer) {
    if (!panel || !mainContainer || !panel.isConnected) return
    const { currentItems } = getState()
    const kw = (panel.querySelector('#searchKeyword').value || '').toLowerCase()
    const st = panel.querySelector('#searchStatus').value
    const filtered = currentItems.filter(j => {
        let matchKw = true
        if (kw) {
            matchKw = (j.job_no || '').toLowerCase().includes(kw) ||
                (j.plate || '').toLowerCase().includes(kw) ||
                (j.customer_name || '').toLowerCase().includes(kw)
        }
        let matchSt = true
        if (st) matchSt = j.status === st
        return matchKw && matchSt
    })
    renderSearchGrid(filtered, mainContainer)
}

/** Render search result data grid */
export function renderSearchGrid(items, mainContainer) {
    if (!mainContainer || !mainContainer.isConnected) return
    const panel = mainContainer.querySelector('#panel-search')
    if (!panel) return
    const results = panel.querySelector('#jobSearchResults')
    if (!results) return
    results.innerHTML = renderDataGrid({
        columns: [
            { key: 'job_no', label: 'เลขใบงาน' },
            { key: 'status', label: 'สถานะ', render: (r) => `<span class="badge badge-${r.status || 'pending'}">${r.status === 'completed' ? 'เสร็จสิ้น' : r.status === 'cancelled' ? 'ยกเลิก' : r.status === 'qc_done' ? 'รอเก็บเงิน' : r.status === 'in_progress' ? 'กำลังซ่อม' : 'รับรถ'}</span>` },
            { key: 'plate', label: 'ทะเบียนรถ' },
            { key: 'customer_name', label: 'ลูกค้า' },
            { key: 'start_date', label: 'วันเริ่ม', render: (r) => formatDate(r.start_date) },
            { key: 'grand_total', label: 'ยอดรวม', render: (r) => formatCurrency(r.grand_total) },
            { key: 'profit', label: 'กำไร', render: (r) => {
                if (r.status !== 'completed' || r.profit == null) return '-'
                const p = r.profit || 0
                const color = p >= 0 ? '#22c55e' : '#ef4444'
                return `<span style="color:${color};font-weight:600;">${p >= 0 ? '' : '-'}฿${Math.abs(p).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>`
            }},
            { key: 'actions', label: '', render: (r) => `<div class="grid-actions"><button class="btn btn-sm btn-outline btn-edit" data-id="${r.id}"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button><button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button></div>` }
        ],
        items
    })

    results.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = (e) => {
        e.stopPropagation()
        editJob(e.currentTarget.dataset.id, mainContainer)
    })
    results.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = (e) => {
        e.stopPropagation()
        deleteJob(e.currentTarget.dataset.id, panel, mainContainer)
    })
}

/** Load a job into the edit form (v2) */
export async function editJob(id, mainContainer) {
    if (!mainContainer || !mainContainer.isConnected) return
    const { currentItems, plateAC, customerAC, vatToggle } = getState()
    const item = currentItems.find(i => String(i.id ?? i.Id ?? i.ID ?? '') === String(id))
    if (!item) return

    const panel = mainContainer.querySelector('#panel-add')
    if (!panel) return
    setEditingId(id)
    panel.querySelector('#jobDocId').value = item.job_no || ''
    panel.querySelector('#jobStatus').value = item.status || 'pending'
    panel.querySelector('#jobStartDate').value = item.start_date ? item.start_date.split(' ')[0] : ''
    panel.querySelector('#jobEndDate').value = item.end_date ? item.end_date.split(' ')[0] : ''
    panel.querySelector('#jobNotes').value = item.notes || ''

    // v2: Lead mechanic
    const leadSel = panel.querySelector('#jobLeadMechanic')
    if (leadSel && item.lead_mechanic_id) leadSel.value = item.lead_mechanic_id

    // v2: Helper chips
    try {
        const mechanics = await getMechanics()
        setHelperChipState(panel, item.helper_mechanic_ids || '', mechanics, item.lead_mechanic_id || null)
    } catch (_) {}

    if (plateAC) plateAC.setValue(item.plate || '')
    if (item.is_red_plate) panel.querySelector('#jobRedPlate').classList.add('active')
    else panel.querySelector('#jobRedPlate').classList.remove('active')

    panel.querySelector('#jobModel').value = item.model || ''
    panel.querySelector('#jobMileage').value = item.mileage_in || item.mileage || ''
    panel.querySelector('#jobChassis').value = item.chassis || ''
    // v2: Color field
    const colorEl = panel.querySelector('#jobColor')
    if (colorEl) {
        if (item.vehicle_id) {
            fetchFullList('vehicles', { filter: `id='${sanitizeFilter(item.vehicle_id)}'`, requestKey: null })
                .then(vArr => { if (vArr[0]) colorEl.value = vArr[0].color || '' })
                .catch(() => {})
        } else colorEl.value = ''
    }

    if (customerAC) customerAC.setValue(item.customer_name || '')
    panel.querySelector('#jobCustomerPhone').value = item.customer_phone || ''

    panel.querySelector('#jobPaymentType').value = item.payment_type || 'cash'
    panel.querySelector('#jobDiscount').value = item.discount_pct || 0

    if (vatToggle) vatToggle.setState({ vatEnabled: !!item.vat_enabled, vatMode: item.vat_mode || 'customer_pays' })

    if (item.status !== 'completed' && item.status !== 'cancelled') {
        panel.querySelector('#btnCancelJob').style.display = 'inline-flex'
    } else {
        panel.querySelector('#btnCancelJob').style.display = 'none'
    }
    
    // Always allow printing for saved jobs
    panel.querySelector('#btnPrintJob').style.display = 'inline-flex'

    // Hide prompts when editing existing job
    const badge = panel.querySelector('#jobServiceBadge')
    const prompt = panel.querySelector('#jobNewRecordPrompt')
    if (badge) badge.style.display = 'none'
    if (prompt) prompt.style.display = 'none'

    // BUG 3 FIX: Enforce Job Completion UI Lock
    const btnSave = panel.querySelector('#btnSaveJob')
    if (item.status === 'completed' || item.status === 'invoiced' || item.status === 'voided') {
        if (btnSave) {
            btnSave.disabled = true
            btnSave.style.opacity = 0.5
            btnSave.innerHTML = '<span class="material-icons-outlined">lock</span> ปิดงานแล้ว'
        }
        setTimeout(() => {
            panel.querySelectorAll('input, select, textarea').forEach(inp => inp.disabled = true)
            panel.querySelectorAll('.item-type-btn, .btn-add-line, .item-remove').forEach(btn => btn.style.display = 'none')
        }, 100)
    } else {
        if (btnSave) {
            btnSave.disabled = false
            btnSave.style.opacity = 1
            btnSave.innerHTML = '<span class="material-icons-outlined">save</span> บันทึกใบงาน'
        }
        panel.querySelectorAll('input, select, textarea').forEach(inp => inp.disabled = false)
        panel.querySelectorAll('.item-type-btn, .btn-add-line, .item-remove').forEach(btn => btn.style.display = '')
    }

    const tbody = panel.querySelector('#jobItemsBody')
    tbody.innerHTML = '<tr class="grid-empty"><td colspan="8" style="text-align:center;">กำลังโหลดรายการ...</td></tr>'

    const jItems = await fetchFullList('job_items', { filter: `job_id='${sanitizeFilter(item.id)}'` })
    tbody.innerHTML = ''
    if (jItems.length === 0) tbody.innerHTML = '<tr class="grid-empty"><td colspan="8" style="text-align:center;">ไม่มีรายการ</td></tr>'

    jItems.forEach((ji, idx) => addJobLineRow(panel, ji, idx + 1))
    recalcTotals(panel)

    mainContainer.querySelector('.tab-btn[data-tab="add"]').click()
}

/** Delete a job */
export async function deleteJob(id, panel, mainContainer) {
    if (await showConfirm('ยืนยันลบ', 'คุณต้องการลบใบงานนี้ใช่หรือไม่?')) {
        // BUG 20 FIX: Delete orphaned job_items before deleting the parent job
        try {
            const items = await fetchFullList('job_items', { filter: `job_id='${sanitizeFilter(id)}'`, requestKey: null });
            for (const item of items) {
                await deleteRecord('job_items', item.id);
            }
        } catch (e) {
            console.warn('[DeleteJob] Failed to delete job_items', e.message);
        }

        await deleteRecord('jobs', id)
        showToast('ลบใบงานเรียบร้อย', 'success')
        loadSearchData(panel, mainContainer)
    }
}

/** Save job + items (v2: auto-create vehicle+customer, mechanic assignment) */
export async function saveJobData(panel, mainContainer) {
    const btnSave = panel.querySelector('#btnSaveJob');
    const originalBtnText = btnSave ? btnSave.innerHTML : 'บันทึกใบงาน';
    
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="material-icons-outlined spin" style="animation: spin 1s linear infinite;">sync</span> กำลังบันทึก...';
    }

    const { editingId, plateAC, customerAC, vatToggle } = getState()
    const job_no = panel.querySelector('#jobDocId').value
    const plate = plateAC ? plateAC.input.value.trim() : ''
    const customer_name = customerAC ? customerAC.input.value.trim() : ''

    const unlockBtn = () => {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = originalBtnText;
        }
    };

    if (!job_no || !plate || !customer_name) {
        unlockBtn();
        return showToast('กรุณากรอกทะเบียนรถ และชื่อลูกค้า', 'error')
    }

    // v2: Duplicate open-job check
    if (!editingId) {
        const { isDuplicate, existingRecord } = await checkDuplicateJob(plate, null)
        if (isDuplicate) {
            unlockBtn();
            const ok = await showConfirm('พบใบงานซ้ำ', `มีใบงานที่เปิดอยู่สำหรับทะเบียน ${plate} (${existingRecord?.job_no || ''})
ต้องการสร้างใบงานใหม่หรือไม่?`)
            if (!ok) return
            
            // Re-lock if they confirmed they want to proceed
            if (btnSave) {
                btnSave.disabled = true;
                btnSave.innerHTML = '<span class="material-icons-outlined spin" style="animation: spin 1s linear infinite;">sync</span> กำลังบันทึก...';
            }
        }
    }

    const vatState = vatToggle ? vatToggle.getState() : { vatEnabled: false, vatMode: 'customer_pays' }
    const customerPhone = panel.querySelector('#jobCustomerPhone').value.trim()
    const mileageVal = parseFloat(panel.querySelector('#jobMileage').value) || 0
    const colorVal = panel.querySelector('#jobColor')?.value?.trim() || ''

    // v2: Resolve customer record (auto-create if new via Atomic Upsert)
    let customer_id = customerAC?.input?.dataset?.selectedId || ''
    if (!customer_id && customer_name) {
        try {
            // BUG 84 FIX: Use atomic upsert to prevent duplicate customers during concurrent saves
            let cust_code = ''
            try {
                const jwt = localStorage.getItem('mungkhud_jwt') || ''
                const codeRes = await fetch('/api/data/custom/generate-doc-id?prefix=CUST&table=customers&field=cust_code', {
                    headers: { 'Authorization': `Bearer ${jwt}` }
                })
                const codeData = await codeRes.json()
                cust_code = codeData.doc_no || ''
            } catch { /* best effort */ }

            const jwt = localStorage.getItem('mungkhud_jwt') || ''
            const upsertRes = await fetch('/api/data/custom/upsert-customer', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: customer_name, phone: customerPhone, cust_code, branch_id: getBranch() || '' })
            });
            const custData = await upsertRes.json();
            customer_id = custData.id;
            if (upsertRes.status === 201) {
                showToast(`สร้างลูกค้าใหม่: ${customer_name} (${custData.cust_code || 'ไม่มีรหัส'})`, 'info');
            }
        } catch (e) {
            console.error('Failed to upsert customer:', e);
        }
    }

    // v2: Resolve vehicle record (auto-create if new via Atomic Upsert)
    let vehicle_id = plateAC?.input?.dataset?.selectedId || ''
    if (!vehicle_id && plate) {
        try {
            // BUG 85 FIX: Use atomic upsert to prevent duplicate vehicles during concurrent saves
            const jwt = localStorage.getItem('mungkhud_jwt') || ''
            const upsertRes = await fetch('/api/data/custom/upsert-vehicle', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plate_number: plate,
                    model: panel.querySelector('#jobModel').value,
                    color: colorVal,
                    mileage: mileageVal,
                    vin: panel.querySelector('#jobChassis').value,
                    customer_id,
                    branch_id: getBranch() || ''
                })
            });
            const vehData = await upsertRes.json();
            vehicle_id = vehData.id;
            if (upsertRes.status === 201) {
                showToast(`เพิ่มยานพาหนะใหม่: ${plate}`, 'info');
            }
        } catch (e) {
            console.error('Failed to upsert vehicle:', e);
        }
    } else if (vehicle_id) {
        // Update mileage on existing vehicle
        await updateRecord('vehicles', vehicle_id, { mileage: mileageVal, customer_id, color: colorVal }).catch(() => {})
    }

    // v2: Mechanic assignment
    const lead_mechanic_id = panel.querySelector('#jobLeadMechanic')?.value || ''
    const helper_mechanic_ids = getSelectedHelperIds(panel).join(',')

    // Calculate payment status and primary payment type
    const grandTotal = parseFloat(panel.dataset.total || 0)
    const payRows = Array.from(panel.querySelectorAll('#jobPaymentMethods .payment-row'))
    let paySum = 0
    let primaryPayType = ''
    let maxPay = -1
    let hasCreditTerm = false
    
    payRows.forEach(r => {
        const m = r.querySelector('.pay-method').value
        const amt = parseFloat(r.querySelector('.pay-amount').value) || 0
        paySum += amt
        if (m === 'credit_term' || m === 'insurance') hasCreditTerm = true
        if (amt > maxPay) {
            maxPay = amt
            primaryPayType = m
        }
    })

    let paymentStatus = 'unpaid'
    if (paySum >= grandTotal && grandTotal > 0) paymentStatus = 'paid'
    else if (paySum > 0) paymentStatus = 'partial'
    // BUG 7 FIX: Only set 'paid' for credit_term if at least one credit_term row has amount > 0
    // Previously: even ฿0 credit term rows incorrectly set status to 'paid'
    else if (hasCreditTerm && payRows.some(r => (r.querySelector('.pay-method').value === 'credit_term' || r.querySelector('.pay-method').value === 'insurance') && (parseFloat(r.querySelector('.pay-amount').value) || 0) > 0)) {
        paymentStatus = 'credit'
    }

    const payload = {
        job_no,
        status: panel.querySelector('#jobStatus').value,
        start_date: panel.querySelector('#jobStartDate').value,
        end_date: panel.querySelector('#jobEndDate').value,
        notes: panel.querySelector('#jobNotes').value,
        plate,
        is_red_plate: panel.querySelector('#jobRedPlate').classList.contains('active'),
        model: panel.querySelector('#jobModel').value,
        mileage_in: mileageVal,
        chassis: panel.querySelector('#jobChassis').value,
        customer_name,
        customer_phone: customerPhone,
        customer_id,
        vehicle_id,
        lead_mechanic_id,
        helper_mechanic_ids,
        payment_status: paymentStatus,
        payment_type: primaryPayType || 'cash',
        discount_pct: parseFloat(panel.querySelector('#jobDiscount').value) || 0,
        branch_id: getBranch() || '',
        vat_enabled: vatState.vatEnabled,
        vat_mode: vatState.vatMode,
        subtotal: parseFloat(panel.dataset.subtotal || 0),
        discount_amount: parseFloat(panel.dataset.discAmt || 0),
        vat_amount: parseFloat(panel.dataset.vat || 0),
        grand_total: grandTotal
    }

    // BUG 31 FIX: Calculate profit and total_cost for sales reporting
    // Profit = grand_total - sum(cost * qty) for all items in the current form
    {
        let totalCost = 0
        for (const tr of panel.querySelectorAll('#jobItemsBody tr:not(.grid-empty)')) {
            const qty = parseFloat(tr.querySelector('.item-qty')?.value) || 0
            const cost = parseFloat(tr.querySelector('.item-cost')?.value) || 0
            totalCost += qty * cost
        }
        payload.total_cost = totalCost
        payload.profit = grandTotal - totalCost
    }
    
    const fileInput = panel.querySelector('#jobPaymentProof')
    if (fileInput && fileInput.files.length > 0) {
        try {
            const uploadingLabel = panel.querySelector('#jobPaymentUploading')
            if (uploadingLabel) uploadingLabel.style.display = 'block'
            
            const uploadedFile = await uploadAttachment(fileInput.files[0])
            payload.payment_proof = uploadedFile
            
            if (uploadingLabel) uploadingLabel.style.display = 'none'
        } catch (err) {
            console.error('Failed to upload payment proof', err)
            showToast('อัพโหลดสลิปล้มเหลว', 'error')
        }
    }

    try {
        let jobId = editingId
        if (jobId) {
            await updateRecord('jobs', jobId, payload)
        } else {
            const created = await createRecord('jobs', payload)
            jobId = created.id
        }

        // Save Items (intelligent sync to preserve audit trails and avoid race condition data loss)
        const oldItems = await fetchFullList('job_items', { filter: `job_id='${sanitizeFilter(jobId)}'` })
        const newIds = []

        const rows = panel.querySelectorAll('#jobItemsBody tr:not(.grid-empty)')
        const itemsForLedger = []
        for (const tr of rows) {
            const rowId = tr.dataset.id || null
            const typeBtn = tr.querySelector('.item-type-btn')
            const isAdhoc = typeBtn?.dataset?.type === 'adhoc'

            let product_id, product_name, itemType, product_type, cost, prodRecord

            if (isAdhoc) {
                product_id = ''
                product_name = tr.querySelector('.item-adhoc-name')?.value?.trim() || 'รายการด่วน'
                itemType = 'adhoc'
                product_type = tr.querySelector('.item-product-type')?.value || 'other'
                cost = parseFloat(tr.querySelector('.item-cost')?.value) || 0
            } else {
                const prodInput = tr.querySelector('.item-prod')
                product_id = prodInput?.dataset?.selectedId || ''
                product_name = prodInput?.value?.trim() || ''
                itemType = 'product'
                product_type = tr.dataset.productType || ''
                
                // BUG 10 FIX: Snapshot master cost at time of sale
                const { products } = await getProductsWithStock()
                prodRecord = products.find(p => p.id === product_id)
                product_type = prodRecord?.type || product_type
                cost = prodRecord ? (parseFloat(prodRecord.cost) || 0) : 0
            }

            const qty = parseFloat(tr.querySelector('.item-qty').value) || 0
            const unit_price = parseFloat(tr.querySelector('.item-price').value) || 0
            const discount = parseFloat(tr.querySelector('.item-disc').value) || 0

            if (product_id || product_name) {
                const p = {
                    job_id: jobId, product_id, product_name, qty,
                    unit_price, discount, total: (qty * unit_price) - discount,
                    type: itemType, product_type, cost, branch_id: payload.branch_id
                }
                if (rowId) {
                    await updateRecord('job_items', rowId, p)
                    newIds.push(rowId)
                } else {
                    const created = await createRecord('job_items', p)
                    newIds.push(created.id)
                }
                
                // Only add to stock ledger if NOT adhoc AND has a real product_id
                const trackStock = tr.dataset.trackStock === 'false' ? false : (prodRecord ? isStockTrackedProduct(prodRecord) : true)
                if (!isAdhoc && product_id && trackStock) {
                    itemsForLedger.push({ product_id, qty, unit_price })
                }
            }
        }

        // Delete items that were removed
        const toDelete = oldItems.filter(o => !newIds.includes(o.id))
        for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
            await Promise.all(toDelete.slice(i, i + BATCH_SIZE).map(o => deleteRecord('job_items', o.id)))
        }

        // The SA no longer closes the job directly from this form, so we don't deduct stock here anymore.
        // We only clear out stock ledger if it was un-completed (though typically a job won't be edited after complete).

        // BUG 1 FIX: Notify telegram if it's a new job and has a lead mechanic
        if (!editingId && lead_mechanic_id) {
            const mechanics = await getMechanics()
            const mechName = mechanics.find(m => m.id === lead_mechanic_id)?.name || 'ไม่ระบุ'
            notifyJobAssigned({
                ...payload,
                job_no
            }, mechName, payload.branch_id).catch(() => {})
        }

        showToast('บันทึกใบงานเรียบร้อย', 'success')
        clearJobForm(panel)
        mainContainer.querySelector('.tab-btn[data-tab="search"]').click()
        loadSearchData(mainContainer.querySelector('#panel-search'), mainContainer)
    } catch (e) {
        console.error(e)
        showToast('เกิดข้อผิดพลาดในการบันทึก', 'error')
    } finally {
        unlockBtn();
    }
}

/** Reset the job form to blank (v2) */
export function clearJobForm(panel) {
    if (!panel || !panel.isConnected) return
    const { plateAC, customerAC, vatToggle } = getState()
    setEditingId(null)
    panel.querySelector('#jobDocId').value = 'กำลังสร้าง...'
    fetch('/api/data/custom/generate-doc-id?prefix=JOB&table=jobs&field=job_no', { headers: { 'Authorization': `Bearer ${localStorage.getItem('mungkhud_jwt')}` } })
        .then(r => r.json()).then(d => {
            const input = panel.isConnected ? panel.querySelector('#jobDocId') : null
            if (input) input.value = d.doc_no || generateDocId('JOB')
        })
        .catch(() => {
            const input = panel.isConnected ? panel.querySelector('#jobDocId') : null
            if (input) input.value = generateDocId('JOB')
        })
    panel.querySelector('#jobStatus').value = 'pending'
    panel.querySelector('#jobStartDate').value = new Date().toISOString().slice(0, 10)
    panel.querySelector('#jobEndDate').value = ''
    panel.querySelector('#jobNotes').value = ''
    // v2: Reset mechanic fields
    const leadSel = panel.querySelector('#jobLeadMechanic')
    if (leadSel) leadSel.value = ''
    panel.querySelectorAll('#jobHelperMechanics .helper-chip.active').forEach(chip => chip.click())
    if (plateAC) { plateAC.setValue(''); plateAC.input && (plateAC.input.dataset.selectedId = '') }
    panel.querySelector('#jobRedPlate').classList.remove('active')
    panel.querySelector('#jobModel').value = ''
    panel.querySelector('#jobMileage').value = ''
    panel.querySelector('#jobChassis').value = ''
    const colorEl = panel.querySelector('#jobColor'); if (colorEl) colorEl.value = ''
    if (customerAC) { customerAC.setValue(''); customerAC.input && (customerAC.input.dataset.selectedId = '') }
    panel.querySelector('#jobCustomerPhone').value = ''
    panel.querySelector('#jobPaymentType').value = 'cash'
    panel.querySelector('#jobDiscount').value = '0'
    if (vatToggle) vatToggle.setState({ vatEnabled: false, vatMode: 'customer_pays' })
    // v2: Hide badges/prompts
    const badge = panel.querySelector('#jobServiceBadge'); if (badge) badge.style.display = 'none'
    const prompt = panel.querySelector('#jobNewRecordPrompt'); if (prompt) prompt.style.display = 'none'

    panel.querySelector('#btnCancelJob').style.display = 'none'
    panel.querySelector('#btnPrintJob').style.display = 'none'

    // Reset UI Lock (Bug 3 Fix cleanup)
    const btnSave = panel.querySelector('#btnSaveJob')
    if (btnSave) {
        btnSave.disabled = false
        btnSave.style.opacity = 1
        btnSave.innerHTML = '<span class="material-icons-outlined">save</span> บันทึกใบงาน'
    }
    panel.querySelectorAll('input, select, textarea').forEach(inp => inp.disabled = false)
    panel.querySelectorAll('.item-type-btn, .btn-add-line, .item-remove').forEach(btn => btn.style.display = '')

    panel.querySelector('#jobItemsBody').innerHTML = '<tr class="grid-empty"><td colspan="8" style="text-align:center;">กดปุ่ม "เพิ่มรายการ"</td></tr>'
    recalcTotals(panel)
}
