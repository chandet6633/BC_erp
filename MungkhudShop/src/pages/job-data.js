/**
 * Job Page — CRUD Operations (ARCH-2)
 * Extracted from job.js: loadSearchData, editJob, deleteJob, saveJobData, clearJobForm
 */
import { showToast, showConfirm, formatDate, formatCurrency, renderDataGrid, generateDocId } from '../components/ui.js'
import { fetchFullList, fetchList, createRecord, updateRecord, deleteRecord } from '../services/pb.js'
import { postToStockLedger } from '../services/inventory.js'
import { notifyJobCompleted } from '../services/telegram.js'
import { sanitizeFilter, escapeHtml } from '../utils/sanitize.js'
import { BATCH_SIZE } from '../utils/constants.js'
import { getBranchFilter, getBranch } from '../services/auth.js'
import { getState, setCurrentItems, setEditingId } from './job-state.js'
import { addJobLineRow, recalcTotals } from './job-line-items.js'

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

/** Load a job into the edit form */
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
    panel.querySelector('#jobTechnician').value = item.technician || ''

    if (plateAC) plateAC.setValue(item.plate || '')
    if (item.is_red_plate) panel.querySelector('#jobRedPlate').classList.add('active')
    else panel.querySelector('#jobRedPlate').classList.remove('active')

    panel.querySelector('#jobModel').value = item.model || ''
    panel.querySelector('#jobMileage').value = item.mileage || ''
    panel.querySelector('#jobChassis').value = item.chassis || ''

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

    const tbody = panel.querySelector('#jobItemsBody')
    tbody.innerHTML = '<tr class="grid-empty"><td colspan="7" style="text-align:center;">กำลังโหลดรายการ...</td></tr>'

    const jItems = await fetchFullList('job_items', { filter: `job_id='${sanitizeFilter(item.id)}'` })
    tbody.innerHTML = ''
    if (jItems.length === 0) tbody.innerHTML = '<tr class="grid-empty"><td colspan="7" style="text-align:center;">ไม่มีรายการ</td></tr>'

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

/** Save job + items to PocketBase */
export async function saveJobData(panel, mainContainer) {
    const { editingId, plateAC, customerAC, vatToggle } = getState()
    const job_no = panel.querySelector('#jobDocId').value
    const plate = plateAC ? plateAC.input.value : ''
    const customer_name = customerAC ? customerAC.input.value : ''

    if (!job_no || !plate || !customer_name) {
        return showToast('กรุณากรอกทะเบียนรถ และชื่อลูกค้า', 'error')
    }

    const vatState = vatToggle ? vatToggle.getState() : { vatEnabled: false, vatMode: 'customer_pays' }

    const payload = {
        job_no,
        status: panel.querySelector('#jobStatus').value,
        start_date: panel.querySelector('#jobStartDate').value,
        end_date: panel.querySelector('#jobEndDate').value,
        notes: panel.querySelector('#jobNotes').value,
        plate,
        is_red_plate: panel.querySelector('#jobRedPlate').classList.contains('active'),
        model: panel.querySelector('#jobModel').value,
        mileage: parseFloat(panel.querySelector('#jobMileage').value) || 0,
        chassis: panel.querySelector('#jobChassis').value,
        customer_name,
        customer_phone: panel.querySelector('#jobCustomerPhone').value,
        payment_type: panel.querySelector('#jobPaymentType').value,
        discount_pct: parseFloat(panel.querySelector('#jobDiscount').value) || 0,
        technician: panel.querySelector('#jobTechnician').value,
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
            const prodInput = tr.querySelector('.item-prod')
            const product_id = prodInput?.dataset?.selectedId || prodInput?.value || ''
            const product_name = prodInput?.value || ''
            const qty = parseFloat(tr.querySelector('.item-qty').value) || 0
            const unit_price = parseFloat(tr.querySelector('.item-price').value) || 0
            const discount = parseFloat(tr.querySelector('.item-disc').value) || 0
            if (product_id || product_name) {
                await createRecord('job_items', {
                    job_id: jobId, product_id, product_name, qty, unit_price, discount, total: (qty * unit_price) - discount
                })
                itemsForLedger.push({ product_id, qty, unit_price })
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

/** Reset the job form to blank */
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
    panel.querySelector('#jobTechnician').value = ''
    if (plateAC) { plateAC.setValue(''); plateAC.setSelectedId('') }
    panel.querySelector('#jobRedPlate').classList.remove('active')
    panel.querySelector('#jobModel').value = ''
    panel.querySelector('#jobMileage').value = ''
    panel.querySelector('#jobChassis').value = ''
    if (customerAC) { customerAC.setValue(''); customerAC.setSelectedId('') }
    panel.querySelector('#jobCustomerPhone').value = ''
    panel.querySelector('#jobPaymentType').value = 'cash'
    panel.querySelector('#jobDiscount').value = '0'
    if (vatToggle) vatToggle.setState({ vatEnabled: false, vatMode: 'customer_pays' })

    panel.querySelector('#btnCloseJob').style.display = 'none'
    panel.querySelector('#btnCancelJob').style.display = 'none'

    panel.querySelector('#jobItemsBody').innerHTML = '<tr class="grid-empty"><td colspan="7" style="text-align:center;">กดปุ่ม "เพิ่มรายการ"</td></tr>'
    recalcTotals(panel)
}
