/**
 * Job Page — CRUD Operations (v2 — POS Overhaul)
 * v2: Auto-creates vehicle+customer records, mechanic assignment, color field.
 */
import { showToast, showConfirm, formatDate, formatCurrency, renderDataGrid, generateDocId } from '../components/ui.js'
import { fetchFullList, fetchList, createRecord, updateRecord, deleteRecord } from '../services/pb.js'
import { postToStockLedger } from '../services/inventory.js'
import { notifyJobCompleted } from '../services/telegram.js'
import { sanitizeFilter, escapeHtml } from '../utils/sanitize.js'
import { BATCH_SIZE } from '../utils/constants.js'
import { getBranchFilter, getBranch } from '../services/auth.js'
import { getState, setCurrentItems, setEditingId, getMechanics } from './job-state.js'
import { addJobLineRow, recalcTotals } from './job-line-items.js'
import { checkDuplicateJob, checkDuplicateVehicle, checkDuplicateCustomer } from '../../../../shared/duplicate-check.js'
import { getSelectedHelperIds, setHelperChipState } from './job.js'

/** Load jobs from server (with branch filter) */
export async function loadSearchData(panel, mainContainer) {
    const results = panel.querySelector('#jobSearchResults')
    results.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>'
    const bf = getBranchFilter()
    const opts = bf ? { filter: bf } : {}
    const items = await fetchFullList('jobs', opts)
    setCurrentItems(items)
    renderSearchGrid(items, mainContainer)
}

/** Client-side search filter */
export function filterLocalSearch(panel, mainContainer) {
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
    const panel = mainContainer.querySelector('#panel-search')
    const results = panel.querySelector('#jobSearchResults')
    results.innerHTML = renderDataGrid({
        columns: [
            { key: 'job_no', label: 'เลขใบงาน' },
            { key: 'status', label: 'สถานะ', render: (r) => `<span class="badge badge-${r.status || 'open'}">${r.status === 'closed' ? 'ปิดงาน' : r.status === 'cancelled' ? 'ยกเลิก' : 'เปิด'}</span>` },
            { key: 'plate', label: 'ทะเบียนรถ' },
            { key: 'customer_name', label: 'ลูกค้า' },
            { key: 'start_date', label: 'วันเริ่ม', render: (r) => formatDate(r.start_date) },
            { key: 'grand_total', label: 'ยอดรวม', render: (r) => formatCurrency(r.grand_total) },
            { key: 'profit', label: 'กำไร', render: (r) => {
                if (r.status !== 'closed' || r.profit == null) return '-'
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
    const { currentItems, plateAC, customerAC, vatToggle } = getState()
    const item = currentItems.find(i => i.id === id)
    if (!item) return

    const panel = mainContainer.querySelector('#panel-add')
    setEditingId(id)
    panel.querySelector('#jobDocId').value = item.job_no || ''
    panel.querySelector('#jobStatus').value = item.status || 'open'
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

    if (item.status === 'open') {
        panel.querySelector('#btnCloseJob').style.display = 'inline-flex'
        panel.querySelector('#btnCancelJob').style.display = 'inline-flex'
    } else {
        panel.querySelector('#btnCloseJob').style.display = 'none'
        panel.querySelector('#btnCancelJob').style.display = 'none'
    }

    // Hide prompts when editing existing job
    const badge = panel.querySelector('#jobServiceBadge')
    const prompt = panel.querySelector('#jobNewRecordPrompt')
    if (badge) badge.style.display = 'none'
    if (prompt) prompt.style.display = 'none'

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
        await deleteRecord('jobs', id)
        showToast('ลบใบงานเรียบร้อย', 'success')
        loadSearchData(panel, mainContainer)
    }
}

/** Save job + items (v2: auto-create vehicle+customer, mechanic assignment) */
export async function saveJobData(panel, mainContainer) {
    const { editingId, plateAC, customerAC, vatToggle } = getState()
    const job_no = panel.querySelector('#jobDocId').value
    const plate = plateAC ? plateAC.input.value.trim() : ''
    const customer_name = customerAC ? customerAC.input.value.trim() : ''

    if (!job_no || !plate || !customer_name) {
        return showToast('กรุณากรอกทะเบียนรถ และชื่อลูกค้า', 'error')
    }

    // v2: Duplicate open-job check
    if (!editingId) {
        const { isDuplicate, existingRecord } = await checkDuplicateJob(plate, null)
        if (isDuplicate) {
            const ok = await showConfirm('พบใบงานซ้ำ', `มีใบงานที่เปิดอยู่สำหรับทะเบียน ${plate} (${existingRecord?.job_no || ''})
ต้องการสร้างใบงานใหม่หรือไม่?`)
            if (!ok) return
        }
    }

    const vatState = vatToggle ? vatToggle.getState() : { vatEnabled: false, vatMode: 'customer_pays' }
    const customerPhone = panel.querySelector('#jobCustomerPhone').value.trim()
    const mileageVal = parseFloat(panel.querySelector('#jobMileage').value) || 0
    const colorVal = panel.querySelector('#jobColor')?.value?.trim() || ''

    // v2: Resolve customer record (auto-create if new)
    let customer_id = customerAC?.input?.dataset?.selectedId || ''
    if (!customer_id && customer_name) {
        const { isDuplicate: custExists, existingRecord: existCust } = await checkDuplicateCustomer(customerPhone || customer_name)
        if (custExists && existCust) {
            customer_id = existCust.id
        } else {
            try {
                const newCust = await createRecord('customers', { name: customer_name, phone: customerPhone })
                customer_id = newCust.id
                showToast(`สร้างลูกค้าใหม่: ${customer_name}`, 'info')
            } catch (_) {}
        }
    }

    // v2: Resolve vehicle record (auto-create if new)
    let vehicle_id = plateAC?.input?.dataset?.selectedId || ''
    if (!vehicle_id && plate) {
        const { isDuplicate: vehExists, existingRecord: existVeh } = await checkDuplicateVehicle(plate)
        if (vehExists && existVeh) {
            vehicle_id = existVeh.id
            // Update mileage and customer_id on existing vehicle
            await updateRecord('vehicles', vehicle_id, { mileage: mileageVal, customer_id, color: colorVal }).catch(() => {})
        } else {
            try {
                const newVeh = await createRecord('vehicles', {
                    plate_number: plate,
                    model: panel.querySelector('#jobModel').value,
                    color: colorVal,
                    mileage: mileageVal,
                    vin: panel.querySelector('#jobChassis').value,
                    customer_id
                })
                vehicle_id = newVeh.id
                showToast(`เพิ่มยานพาหนะใหม่: ${plate}`, 'info')
            } catch (_) {}
        }
    } else if (vehicle_id) {
        // Update mileage on existing vehicle
        await updateRecord('vehicles', vehicle_id, { mileage: mileageVal, customer_id, color: colorVal }).catch(() => {})
    }

    // v2: Mechanic assignment
    const lead_mechanic_id = panel.querySelector('#jobLeadMechanic')?.value || ''
    const helper_mechanic_ids = getSelectedHelperIds(panel).join(',')

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
        payment_status: 'unpaid',
        payment_type: panel.querySelector('#jobPaymentType').value,
        discount_pct: parseFloat(panel.querySelector('#jobDiscount').value) || 0,
        branch_id: getBranch() || '',
        vat_enabled: vatState.vatEnabled,
        vat_mode: vatState.vatMode,
        subtotal: parseFloat(panel.dataset.subtotal || 0),
        discount_amount: parseFloat(panel.dataset.discAmt || 0),
        vat_amount: parseFloat(panel.dataset.vat || 0),
        grand_total: parseFloat(panel.dataset.total || 0)
    }

    try {
        let jobId = editingId
        if (jobId) {
            await updateRecord('jobs', jobId, payload)
        } else {
            const created = await createRecord('jobs', payload)
            jobId = created.id
        }

        // Save Items (batch delete old, create new)
        const oldItems = await fetchFullList('job_items', { filter: `job_id='${sanitizeFilter(jobId)}'` })
        for (let i = 0; i < oldItems.length; i += BATCH_SIZE) {
            await Promise.all(oldItems.slice(i, i + BATCH_SIZE).map(o => deleteRecord('job_items', o.id)))
        }

        const rows = panel.querySelectorAll('#jobItemsBody tr:not(.grid-empty)')
        const itemsForLedger = []
        for (const tr of rows) {
            const typeBtn = tr.querySelector('.item-type-btn')
            const isAdhoc = typeBtn?.dataset?.type === 'adhoc'

            let product_id, product_name, itemType, product_type, cost

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
                product_type = ''
                cost = 0 // for products, cost is handled/stored via products table later
            }

            const qty = parseFloat(tr.querySelector('.item-qty').value) || 0
            const unit_price = parseFloat(tr.querySelector('.item-price').value) || 0
            const discount = parseFloat(tr.querySelector('.item-disc').value) || 0

            if (product_id || product_name) {
                await createRecord('job_items', {
                    job_id: jobId, product_id, product_name, qty,
                    unit_price, discount, total: (qty * unit_price) - discount,
                    type: itemType, product_type, cost
                })
                // Only add to stock ledger if NOT adhoc AND has a real product_id
                if (!isAdhoc && product_id) {
                    itemsForLedger.push({ product_id, qty, unit_price })
                }
            }
        }

        const finalStatus = panel.querySelector('#jobStatus').value
        if (finalStatus === 'closed') {
            await postToStockLedger('JOB', job_no, itemsForLedger)
        } else {
            await postToStockLedger('JOB', job_no, [])
        }

        showToast('บันทึกใบงานเรียบร้อย', 'success')
        clearJobForm(panel)
        mainContainer.querySelector('.tab-btn[data-tab="search"]').click()
        loadSearchData(mainContainer.querySelector('#panel-search'), mainContainer)
    } catch (e) {
        console.error(e)
        showToast('เกิดข้อผิดพลาดในการบันทึก', 'error')
    }
}

/** Reset the job form to blank (v2) */
export function clearJobForm(panel) {
    const { plateAC, customerAC, vatToggle } = getState()
    setEditingId(null)
    fetchList('jobs', 1, 1, { sort: '-created', requestKey: null }).then(res => {
        panel.querySelector('#jobDocId').value = generateDocId('JOB', (res?.totalItems || 0) + 1)
    }).catch(() => {
        panel.querySelector('#jobDocId').value = generateDocId('JOB')
    })
    panel.querySelector('#jobStatus').value = 'open'
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

    panel.querySelector('#btnCloseJob').style.display = 'none'
    panel.querySelector('#btnCancelJob').style.display = 'none'

    panel.querySelector('#jobItemsBody').innerHTML = '<tr class="grid-empty"><td colspan="8" style="text-align:center;">กดปุ่ม "เพิ่มรายการ"</td></tr>'
    recalcTotals(panel)
}
