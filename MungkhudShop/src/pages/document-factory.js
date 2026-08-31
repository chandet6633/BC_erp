/**
 * Generic document page factory.
 * Creates Search + Add/Edit tab pages for document types (Quotation, Invoice, Receipt, etc.)
 * Features: product autocomplete, VAT toggle, document linking (QT→IV→RC), print, stock transfers.
 */
import { createTabs, renderDataGrid, showToast, showConfirm, formatDate, formatCurrency, generateDocId, createAutocomplete, createVatToggle, calcVat } from '../components/ui.js'
import { fetchFullList, createRecord, updateRecord, deleteRecord } from '../services/pb.js'
import { sanitizeFilter, escapeHtml } from '../utils/sanitize.js'
import { BATCH_SIZE } from '../utils/constants.js'
import { getApiAuthHeaders, getBranchFilter, getBranch } from '../services/auth.js'
import { openPrintWindow } from '../utils/print-utils.js'
import { isStockTrackedProduct } from '../utils/stock-rules.js'
import { getBaseUom, getProductTrackingType, parseMetadata } from '../utils/inventory-domain.js'

// Document conversion rules: which doc type can convert to what
const CONVERT_MAP = {
    'QT': { target: 'IV', label: 'สร้างใบแจ้งหนี้ (IV)', route: '#/invoice' },
    'IV': { target: 'RC', label: 'สร้างใบเสร็จ (RC)', route: '#/receipt' },
    'RR': { target: 'PIV', label: 'สร้างใบกำกับภาษีซื้อ (PIV)', route: '#/purchase-invoice' },
}

const STOCK_STAFF_DOCS = ['RQ', 'RE', 'TF', 'SA']
const STAFF_DOC_ROLES = ['sa', 'mechanic', 'manager', 'owner']

function isBranchMemberStaff(user, branchId) {
    const role = String(user.role || '').toLowerCase()
    if (!STAFF_DOC_ROLES.includes(role)) return false
    if (role === 'owner') return true
    if (!branchId) return true
    const userBranch = user.branch || user.branch_id || ''
    return userBranch === branchId
}

// BUG 23 FIX: documentStockCache is module-level singleton that was never invalidated.
// Now declared per-page-instance so it's fresh on every navigation.
let documentStockCache = null;

export function createDocumentPage(cfg) {
    return function (container) {
        const recordId = (item) => item?.id ?? item?.Id ?? item?.ID ?? ''
        // Stale-DOM guard: bail out if user navigates away before async fetches complete
        const pageToken = Symbol(`document-page:${cfg.prefix}`)
        container.__documentPageToken = pageToken
        const isDestroyed = () => container.__documentPageToken !== pageToken || !container.isConnected

        let currentItems = []
        let editingId = null
        let docVatToggle = null
        const today = new Date().toISOString().slice(0, 10)

        // BUG 23 FIX: Reset cache on each page instantiation to prevent stale stock values
        documentStockCache = null

        // Check if this is an OUT document (sales/inventory deduction)
        const isPurchaseDoc = ['RR', 'PIV', 'PCN', 'PAY'].includes(cfg.prefix)
        const isInventoryDoc = ['RR', 'RQ', 'RE', 'TF', 'SA', 'PCN'].includes(cfg.prefix)
        const isAmountOnlyDoc = cfg.amountOnly === true
        
        // Fetch stock cache for OUT documents if needed
        if (!isPurchaseDoc) {
            fetch(`/api/data/custom/stock-balances?branch_id=${encodeURIComponent(getBranch() || '')}`, { headers: getApiAuthHeaders() })
                .then(r => r.json()).then(data => { if (!isDestroyed()) documentStockCache = data })
                .catch(e => console.warn('Failed to load stock balances', e))
        }

        function trackingValue(record, key, fallback = '') {
            const metadata = parseMetadata(record)
            return record?.[key] ?? metadata[key] ?? fallback
        }

        function serialList(value) {
            return String(value || '').split(/[\n,;]+/).map(v => v.trim()).filter(Boolean)
        }

        function validateTrackingRows(panel, { focus = true } = {}) {
            if (!isInventoryDoc) return true
            const rows = [...panel.querySelectorAll('.doc-items-body tr:not(.grid-empty)')]
            for (const tr of rows) {
                if (tr.dataset.trackStock === 'false') continue
                const productName = tr.querySelector('.line-prod')?.value || 'รายการสินค้า'
                const trackingType = String(tr.dataset.trackingType || 'NONE').toUpperCase()
                const qty = Math.abs(parseFloat(tr.querySelector('.line-qty')?.value || '0') || 0)
                if (trackingType === 'SERIALIZED') {
                    const serialInput = tr.querySelector('.line-serials')
                    const serials = serialList(serialInput?.value)
                    if (!serials.length) {
                        if (focus) serialInput?.focus()
                        showToast(`กรุณากรอก Serial number สำหรับ ${productName}`, 'warning')
                        return false
                    }
                    if (Number.isInteger(qty) && qty > 0 && serials.length !== qty) {
                        if (focus) serialInput?.focus()
                        showToast(`Serial number ของ ${productName} ต้องมี ${qty} รายการ`, 'warning')
                        return false
                    }
                }
                if (trackingType === 'BATCH') {
                    const batchInput = tr.querySelector('.line-batch')
                    if (!batchInput?.value?.trim()) {
                        if (focus) batchInput?.focus()
                        showToast(`กรุณากรอก Batch/Lot สำหรับ ${productName}`, 'warning')
                        return false
                    }
                }
                if (trackingType === 'DIMENSION') {
                    const rollInput = tr.querySelector('.line-roll')
                    const dimensionInput = tr.querySelector('.line-dimension-qty')
                    if (!rollInput?.value?.trim() || !(parseFloat(dimensionInput?.value || '0') > 0)) {
                        if (focus) (rollInput?.value?.trim() ? dimensionInput : rollInput)?.focus()
                        showToast(`กรุณากรอก Roll no. และจำนวน/ความยาวสำหรับ ${productName}`, 'warning')
                        return false
                    }
                }
            }
            return true
        }

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title">
                    <span class="material-icons-outlined">${cfg.icon}</span>
                    <h1>${cfg.title}</h1>
                </div>
            </div>
            <div id="${cfg.prefix}Tabs"></div>
            <div id="panel-search" class="tab-panel active"></div>
            <div id="panel-add" class="tab-panel"></div>
        `
        const tabContainer = container.querySelector(`#${cfg.prefix}Tabs`)
        createTabs(container, [
            { id: 'search', label: 'ค้นหา', icon: 'search' },
            { id: 'add', label: 'เพิ่ม / แก้ไข', icon: 'add_circle_outline' },
        ])
        const tabBar = container.querySelector('.tabs')
        if (tabBar && tabContainer) tabContainer.appendChild(tabBar)

        const searchPanel = container.querySelector('#panel-search')
        searchPanel.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="form-row-4" style="margin-bottom:var(--sp-4);">
                        <div class="form-group">
                            <label class="form-label">ค้นหาเอกสาร</label>
                            <input type="text" class="form-control" id="searchDocInput" placeholder="พิมพ์เพื่อค้นหา...">
                        </div>
                    </div>
                </div>
            </div>
            <div id="docGrid" style="margin-top:var(--sp-4);"></div>
        `

        const gridCols = [
            { key: 'doc_no', label: 'เลขเอกสาร' },
            { key: 'issue_date', label: 'วันที่', render: r => formatDate(r.issue_date) },
            { key: 'ref_no', label: 'อ้างอิง' },
            { key: 'grand_total', label: 'ยอดรวม', render: r => formatCurrency(r.grand_total) },
            { key: 'status', label: 'สถานะ', render: r => {
                const s = r.status || 'draft'
                const badge = ['confirmed', 'received'].includes(s) ? 'closed' : s === 'voided' ? 'cancelled' : 'open'
                const label = s === 'confirmed' ? 'ยืนยัน'
                    : s === 'in_transit' ? 'กำลังโอน'
                    : s === 'received' ? 'รับแล้ว'
                    : s === 'voided' ? 'ยกเลิก'
                    : s === 'paid' ? 'ชำระแล้ว'
                    : 'ฉบับร่าง'
                return `<span class="badge badge-${badge}">${label}</span>`
            }},
            {
                key: 'actions', label: 'จัดการ', render: r => `
                <div class="grid-actions">
                    <button class="btn btn-sm btn-outline btn-edit" data-id="${recordId(r)}"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${recordId(r)}"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                </div>
            ` }
        ]

        async function loadData() {
            if (isDestroyed()) return
            const gridEl = container.querySelector('#docGrid')
            gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>'
            let filter = `doc_type='${sanitizeFilter(cfg.prefix)}'`
            const bf = getBranchFilter()
            if (bf) filter += ` && ${bf}`
            currentItems = await fetchFullList('documents', { filter, requestKey: null })
            if (isDestroyed()) return
            renderGridItems(currentItems)
        }

        function renderGridItems(items) {
            const gridEl = container.querySelector('#docGrid')
            gridEl.innerHTML = renderDataGrid({ columns: gridCols, items })
            gridEl.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = (e) => {
                e.stopPropagation()
                editItem(e.currentTarget.dataset.id)
            })
            gridEl.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = (e) => {
                e.stopPropagation()
                deleteItem(e.currentTarget.dataset.id)
            })
        }

        container.querySelector('#searchDocInput').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase()
            const filtered = currentItems.filter(item =>
                (item.doc_no || '').toLowerCase().includes(val) ||
                (item.ref_no || '').toLowerCase().includes(val)
            )
            renderGridItems(filtered)
        })

        const addPanel = container.querySelector('#panel-add')
        let formHtml = `
                <div class="toolbar">
                <div class="toolbar-actions">
                    <button class="btn btn-primary" id="btnSaveDoc"><span class="material-icons-outlined">save</span> บันทึก</button>
                    ${isInventoryDoc ? `<button class="btn btn-success" id="btnSaveConfirmDoc"><span class="material-icons-outlined">task_alt</span> บันทึกและยืนยัน</button>` : ''}
                    <button class="btn btn-outline" id="btnClearDoc"><span class="material-icons-outlined">refresh</span> ล้างแบบฟอร์ม</button>
                    <button class="btn btn-danger" id="btnClearDocData"><span class="material-icons-outlined">delete_sweep</span> ล้างข้อมูลหน้านี้</button>
                    <button class="btn btn-success" id="btnConfirmDoc" style="display:none;"><span class="material-icons-outlined">check_circle</span> ยืนยัน</button>
                    ${cfg.prefix === 'TF' ? `<button class="btn btn-primary" id="btnReceiveTransfer" style="display:none;"><span class="material-icons-outlined">move_to_inbox</span> รับโอนเข้า</button>` : ''}
                    <button class="btn btn-danger" id="btnVoidDoc" style="display:none;"><span class="material-icons-outlined">cancel</span> ยกเลิก</button>
                    <button class="btn btn-outline" id="btnPrintDoc" style="display:none;color:var(--color-primary);border-color:var(--color-primary);"><span class="material-icons-outlined">print</span> พิมพ์</button>
                    ${CONVERT_MAP[cfg.prefix] ? `<button class="btn btn-outline" id="btnConvertDoc" style="display:none;color:#C8A048;border-color:#C8A048;"><span class="material-icons-outlined">arrow_forward</span> ${CONVERT_MAP[cfg.prefix].label}</button>` : ''}
                </div>
            </div>
                <div class="job-form-grid">
                    <div class="job-section">
                        <div class="job-section-title"><span class="material-icons-outlined">description</span> ข้อมูลเอกสาร</div>
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label">เลขเอกสาร</label>
                                <input type="text" class="form-control" id="doc_no" readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label">วันที่</label>
                                <input type="date" class="form-control" id="issue_date">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">อ้างอิงเอกสาร</label>
                            <input type="text" class="form-control" id="ref_no" placeholder="อ้างอิง...">
                        </div>
                        <div id="sourceDocBadge" style="display:none;margin-top:var(--sp-2);"></div>
                    </div>
                    <div class="job-section">${cfg.prefix === 'TF' ? `
                        <div class="job-section-title"><span class="material-icons-outlined">swap_horiz</span> การโอนสต็อก</div>
                        <div class="form-group">
                            <label class="form-label required">สาขาปลายทาง</label>
                            <select class="form-control" id="destination_branch_id">
                                <option value="">-- เลือกสาขาปลายทาง --</option>
                            </select>
                        </div>
                    ` : ''}
                    <div class="job-section">
                        <div class="job-section-title"><span class="material-icons-outlined">person</span> รายละเอียดเพิ่มเติม</div>
                        <div class="form-group">
                            <label class="form-label">คู่ค้า / ลูกค้า</label>
                            <div id="docEntityAC"></div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">หมายเหตุ</label>
                            <textarea class="form-control" id="notes" rows="3" placeholder="กรอกข้อมูลเพิ่มเติม..."></textarea>
                        </div>
                        ${isAmountOnlyDoc ? `
                        <div class="form-group">
                            <label class="form-label">${cfg.amountLabel || 'Amount'}</label>
                            <input type="number" class="form-control" id="doc_amount" min="0" step="0.01" placeholder="0.00">
                        </div>` : ''}
                        <div id="docVatToggle" style="margin-top:var(--sp-3);"></div>
                    </div>
                    `
        if (cfg.hasItems !== false) {
            formHtml += `
                <div class="job-section job-items-section">
                    <div class="job-section-title"><span class="material-icons-outlined">list_alt</span> รายการ</div>
                    <div class="toolbar" style="margin-bottom:var(--sp-3);">
                        <button class="btn btn-sm btn-primary btn-add-line"><span class="material-icons-outlined" style="font-size:16px;">add</span> เพิ่มรายการ</button>
                    </div>
                    <div class="data-grid">
                        <table>
                            <thead><tr><th>#</th><th>สินค้า / บริการ</th><th>จำนวน</th><th>UOM</th><th>ราคา/หน่วย</th><th>ส่วนลด</th><th>รวม</th><th></th></tr></thead>
                            <tbody class="doc-items-body">
                                <tr><td colspan="8" class="grid-empty" style="text-align:center;padding:var(--sp-6);">กดปุ่ม "เพิ่มรายการ"</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:var(--sp-6);margin-top:var(--sp-4);">
                        <div style="text-align:right;"><div class="text-sm text-muted">รวม</div><div class="text-bold doc-subtotal" id="doc_subtotal">฿0.00</div></div>
                        <div style="text-align:right;"><div class="text-sm text-muted">ส่วนลด</div><div class="text-bold doc-discount" id="doc_discount" style="color:var(--color-danger);">-฿0.00</div></div>
                        <div style="text-align:right;"><div class="text-sm text-muted">VAT 7%</div><div class="text-bold doc-vat" id="doc_vat">฿0.00</div></div>
                        <div style="text-align:right;"><div class="text-sm" style="color:var(--color-primary);font-weight:600;">ยอดรวมสุทธิ</div><div style="font-size:1.4rem;font-weight:700;color:var(--color-primary);" class="doc-total" id="doc_grand_total">฿0.00</div></div>
                    </div>
                </div>`
        }
        formHtml += `</div>`
        addPanel.innerHTML = formHtml
        if (cfg.refLabel) addPanel.querySelector('#ref_no')?.closest('.form-group')?.querySelector('.form-label')?.replaceChildren(document.createTextNode(cfg.refLabel))
        if (cfg.refPlaceholder) addPanel.querySelector('#ref_no')?.setAttribute('placeholder', cfg.refPlaceholder)
        if (cfg.entityLabel) addPanel.querySelector('#docEntityAC')?.closest('.form-group')?.querySelector('.form-label')?.replaceChildren(document.createTextNode(cfg.entityLabel))
        if (cfg.notesLabel) addPanel.querySelector('#notes')?.closest('.form-group')?.querySelector('.form-label')?.replaceChildren(document.createTextNode(cfg.notesLabel))
        if (cfg.notesPlaceholder) addPanel.querySelector('#notes')?.setAttribute('placeholder', cfg.notesPlaceholder)
        if (cfg.itemsTitle) {
            const titleEl = addPanel.querySelector('.job-items-section .job-section-title')
            if (titleEl) titleEl.innerHTML = `<span class="material-icons-outlined">list_alt</span> ${escapeHtml(cfg.itemsTitle)}`
        }

        // --- Entity autocomplete (customer or vendor depending on doc type) ---
        const isStaffEntityDoc = STOCK_STAFF_DOCS.includes(cfg.prefix)
        const entityCollection = ['RR', 'PIV', 'PCN', 'PAY', 'WT'].includes(cfg.prefix)
            ? 'vendors'
            : isStaffEntityDoc
                ? 'users'
                : 'customers'
        const entityAC = createAutocomplete({
            container: addPanel.querySelector('#docEntityAC'),
            placeholder: entityCollection === 'vendors' ? 'ค้นหาผู้จำหน่าย...' : 'ค้นหาลูกค้า...',
            fetchItems: async () => {
                const items = await fetchFullList(entityCollection)
                if (isStaffEntityDoc) {
                    const branchId = getBranch()
                    return items
                        .filter(u => isBranchMemberStaff(u, branchId))
                        .map(u => ({
                            id: u.id,
                            code: u.username || u.code || '',
                            label: u.display_name || u.name || u.username || u.id,
                            secondary: `${u.role || ''}${(u.branch || u.branch_id) ? ' | ' + (u.branch || u.branch_id) : ''}`
                        }))
                }
                return items.map(c => {
                    const code = c.code || c.cust_code || ''
                    return {
                        id: c.id,
                        code: code,
                        label: c.name,
                        secondary: `${code ? '[' + code + '] ' : ''}${c.phone || ''}`
                    }
                })
            },
            onSelect: () => { }
        })
        if (isStaffEntityDoc) {
            entityAC.input.placeholder = cfg.entityPlaceholder || 'ค้นหาผู้เบิก / ช่าง / ผู้รับผิดชอบ...'
        }

        // --- VAT Toggle ---
        docVatToggle = createVatToggle({
            container: addPanel.querySelector('#docVatToggle'),
            vatEnabled: false,
            vatMode: 'customer_pays',
            onUpdate: () => updateTotals()
        })

        function updateTotals() {
            let sub = 0
            let totalDisc = 0
            addPanel.querySelectorAll('.doc-items-body tr').forEach(tr => {
                if (tr.classList.contains('grid-empty')) return;
                const q = parseFloat(tr.querySelector('.line-qty')?.value) || 0
                const p = parseFloat(tr.querySelector('.line-price')?.value) || 0
                const d = parseFloat(tr.querySelector('.line-disc')?.value) || 0
                const t = (q * p) - d
                sub += (q * p)
                totalDisc += d
                tr.querySelector('.line-total').textContent = '฿' + t.toLocaleString('th-TH', { minimumFractionDigits: 2 })
            })

            const vatState = docVatToggle ? docVatToggle.getState() : { vatEnabled: false, vatMode: 'customer_pays' }
            const amountOnlyValue = isAmountOnlyDoc ? (parseFloat(container.querySelector('#doc_amount')?.value || '0') || 0) : 0
            const { vat_amount, grand_total } = calcVat(sub, totalDisc, vatState.vatEnabled, vatState.vatMode)

            if (cfg.hasItems !== false) {
                addPanel.querySelector('#doc_subtotal').textContent = '฿' + sub.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                addPanel.querySelector('#doc_discount').textContent = '-฿' + totalDisc.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                addPanel.querySelector('#doc_vat').textContent = '฿' + vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                addPanel.querySelector('#doc_grand_total').textContent = '฿' + grand_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                addPanel.dataset.subtotal = sub
                addPanel.dataset.discount = totalDisc
                addPanel.dataset.vat = vat_amount
                addPanel.dataset.total = grand_total
            }
        }

        async function ensureDocNo(force = false) {
            const input = container.querySelector('#doc_no')
            if (!input) return ''
            if (!force && input.value) return input.value

            const fallback = generateDocId(cfg.prefix, (currentItems?.length || 0) + 1)
            input.value = fallback

            try {
                const res = await fetch(`/api/data/custom/generate-doc-id?prefix=${encodeURIComponent(cfg.prefix)}`, {
                    headers: getApiAuthHeaders()
                })
                const data = await res.json().catch(() => ({}))
                if (!isDestroyed() && data?.doc_no) input.value = data.doc_no
            } catch {
                // Keep the local fallback visible so the user can save the draft.
            }
            return input.value
        }

        async function editItem(id) {
            const item = currentItems.find(i => String(recordId(i)) === String(id))
            if (!item) return
            editingId = id
            container.querySelector('#doc_no').value = item.doc_no || ''
            container.querySelector('#issue_date').value = item.issue_date ? item.issue_date.split(' ')[0] : ''
            container.querySelector('#ref_no').value = item.ref_no || ''
            container.querySelector('#notes').value = item.notes || ''
            if (isAmountOnlyDoc) container.querySelector('#doc_amount').value = item.grand_total || ''
            if (entityAC && item.entity_id) {
                try {
                    const entities = await fetchFullList(entityCollection, { filter: `id='${sanitizeFilter(item.entity_id)}'` })
                    if (entities.length > 0) {
                        entityAC.setValue(entities[0].display_name || entities[0].name || entities[0].username || entities[0].id)
                        // BUG 82 FIX: Persist the entity_id in the input's dataset so save does not lose the FK
                        entityAC.input.dataset.selectedId = item.entity_id
                    }
                } catch (_) { }
            }
            if (docVatToggle) docVatToggle.setState({ vatEnabled: !!item.vat_enabled, vatMode: item.vat_mode || 'customer_pays' })

            if (cfg.hasItems !== false) {
                const tbody = addPanel.querySelector('.doc-items-body')
                tbody.innerHTML = '<tr class="grid-empty"><td colspan="8" style="text-align:center;">กำลังโหลดรายการ...</td></tr>'
                const dItems = await fetchFullList('document_items', { filter: `document_id='${sanitizeFilter(item.id)}'` })
                tbody.innerHTML = ''
                if (dItems.length === 0) tbody.innerHTML = '<tr class="grid-empty"><td colspan="8" style="text-align:center;">ไม่มีรายการ</td></tr>'
                dItems.forEach((di, idx) => addLineRow(di, idx + 1, item.status))
                updateTotals()
            }
            
            // BUG 4 FIX: Disable editing of sealed documents
            const isSealed = ['confirmed', 'in_transit', 'received', 'paid', 'voided'].includes(item.status)
            addPanel.querySelectorAll('input, select, textarea').forEach(el => el.disabled = isSealed)
            const saveBtn = addPanel.querySelector('#btnSaveDoc')
            if (saveBtn) saveBtn.style.display = isSealed ? 'none' : 'inline-flex'
            const saveConfirmBtn = addPanel.querySelector('#btnSaveConfirmDoc')
            if (saveConfirmBtn) saveConfirmBtn.style.display = isSealed ? 'none' : 'inline-flex'
            const addLineBtn = addPanel.querySelector('.btn-add-line')
            if (addLineBtn) addLineBtn.style.display = isSealed ? 'none' : 'inline-flex'
            // B3: Show confirm/void buttons when editing
            const btnConfirm = addPanel.querySelector('#btnConfirmDoc')
            const btnVoid = addPanel.querySelector('#btnVoidDoc')
            const btnReceiveTransfer = addPanel.querySelector('#btnReceiveTransfer')
            if (item.status === 'draft' || item.status === 'pending' || !item.status) {
                btnConfirm.style.display = 'inline-flex'
                btnVoid.style.display = 'inline-flex'
            } else {
                btnConfirm.style.display = 'none'
                btnVoid.style.display = item.status !== 'voided' ? 'inline-flex' : 'none'
            }
            if (btnReceiveTransfer) {
                btnReceiveTransfer.style.display = (cfg.prefix === 'TF' && item.status === 'in_transit') ? 'inline-flex' : 'none'
            }
            // Show Print button when editing any existing document
            const btnPrint = addPanel.querySelector('#btnPrintDoc')
            if (btnPrint) btnPrint.style.display = 'inline-flex'
            // Show Convert button only for confirmed documents with a conversion target
            const btnConvert = addPanel.querySelector('#btnConvertDoc')
            if (btnConvert) btnConvert.style.display = (item.status === 'confirmed' && CONVERT_MAP[cfg.prefix]) ? 'inline-flex' : 'none'
            // Show source document badge if this doc was converted from another
            const srcBadge = container.querySelector('#sourceDocBadge')
            if (srcBadge && item.source_doc_id) {
                srcBadge.style.display = 'block'
                srcBadge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--color-primary-light);color:var(--color-primary);border-radius:var(--radius-sm);font-size:0.85rem;"><span class="material-icons-outlined" style="font-size:16px;">link</span> แปลงจากเอกสาร: ${escapeHtml(item.ref_no || item.source_doc_id)}</span>`
            } else if (srcBadge) { srcBadge.style.display = 'none' }
            // Load destination branch for TF docs
            if (cfg.prefix === 'TF' && item.destination_branch_id) {
                const destSel = container.querySelector('#destination_branch_id')
                if (destSel) destSel.value = item.destination_branch_id
            }
            container.querySelector('.tab-btn[data-tab="add"]').click()
        }

        async function deleteItem(id) {
            if (await showConfirm('ยืนยัน', 'คุณต้องการลบเอกสารนี้ใช่หรือไม่?')) {
                const dItems = await fetchFullList('document_items', { filter: `document_id='${sanitizeFilter(id)}'` })
                for (let i = 0; i < dItems.length; i += BATCH_SIZE) {
                    await Promise.all(dItems.slice(i, i + BATCH_SIZE).map(di => deleteRecord('document_items', di.id)))
                }
                await deleteRecord('documents', id)
                showToast('ลบเอกสารเรียบร้อย', 'success')
                loadData()
            }
        }

        addPanel.querySelector('#btnSaveConfirmDoc')?.addEventListener('click', () => {
            addPanel.dataset.saveConfirm = 'true'
            addPanel.querySelector('#btnSaveDoc')?.click()
        })

        addPanel.querySelector('#btnSaveDoc')?.addEventListener('click', async (e) => {
            const btnSave = e.currentTarget;
            const originalBtnText = btnSave.innerHTML;
            const shouldConfirmAfterSave = addPanel.dataset.saveConfirm === 'true'
            const btnSaveConfirm = addPanel.querySelector('#btnSaveConfirmDoc')
            btnSave.disabled = true;
            if (btnSaveConfirm) btnSaveConfirm.disabled = true;
            btnSave.innerHTML = '<span class="material-icons-outlined spin" style="animation: spin 1s linear infinite;">sync</span> กำลังบันทึก...';

            const unlockBtn = () => {
                btnSave.disabled = false;
                if (btnSaveConfirm) btnSaveConfirm.disabled = false;
                btnSave.innerHTML = originalBtnText;
            };

            let doc_no = container.querySelector('#doc_no').value
            const issue_date = container.querySelector('#issue_date').value
            const ref_no = container.querySelector('#ref_no').value
            const notes = container.querySelector('#notes').value
            const entity_id = entityAC?.getSelectedId() || ''
            const vatState = docVatToggle ? docVatToggle.getState() : { vatEnabled: false, vatMode: 'customer_pays' }
            const amountOnlyValue = isAmountOnlyDoc ? (parseFloat(container.querySelector('#doc_amount')?.value || '0') || 0) : 0

            if (!doc_no) {
                doc_no = await ensureDocNo(true)
            }

            if (!doc_no) {
                unlockBtn();
                return showToast('กรุณาระบุเลขเอกสาร', 'error')
            }

            if (cfg.requireNotes && !notes.trim()) {
                unlockBtn();
                return showToast(cfg.requireNotesMessage || 'Please enter a reason before saving this document.', 'error')
            }
            if (cfg.prefix === 'TF' && !container.querySelector('#destination_branch_id')?.value) {
                unlockBtn();
                return showToast('Please select destination branch before saving transfer.', 'error')
            }
            if (isAmountOnlyDoc && amountOnlyValue <= 0) {
                unlockBtn();
                return showToast('Please enter an amount greater than zero.', 'error')
            }
            if (!validateTrackingRows(addPanel)) {
                unlockBtn();
                return
            }

            // D2: Check for duplicate doc_no when creating new
            if (!editingId) {
                const existing = await fetchFullList('documents', { filter: `doc_no='${sanitizeFilter(doc_no)}'`, requestKey: null })
                if (existing.length > 0) {
                    unlockBtn();
                    return showToast(`เลขเอกสาร ${doc_no} ซ้ำกันแล้ว`, 'error')
                }
            }

            const payload = {
                doc_no, doc_type: cfg.prefix, issue_date, ref_no, notes, entity_id, status: 'draft',
                branch_id: getBranch() || '',
                vat_enabled: vatState.vatEnabled,
                vat_mode: vatState.vatMode,
                discount_amount: parseFloat(addPanel.dataset.discount || 0),
                subtotal: isAmountOnlyDoc ? amountOnlyValue : parseFloat(addPanel.dataset.subtotal || 0),
                vat_amount: parseFloat(addPanel.dataset.vat || 0),
                grand_total: isAmountOnlyDoc ? amountOnlyValue : parseFloat(addPanel.dataset.total || 0),
                ...(cfg.prefix === 'TF' ? { destination_branch_id: container.querySelector('#destination_branch_id')?.value || '' } : {})
            }

            try {
                let docId = editingId
                if (docId) {
                    await updateRecord('documents', docId, payload)
                } else {
                    const created = await createRecord('documents', payload)
                    docId = created.id
                }

                if (cfg.hasItems !== false) {
                    const rows = addPanel.querySelectorAll('.doc-items-body tr:not(.grid-empty)')
                    const itemsForLedger = []
                    const newIds = []

                    // BUG 1 FIX: Intelligent sync (insert/update) instead of blind delete
                    for (const tr of rows) {
                        const rowId = tr.dataset.id || null
                        const prodInput = tr.querySelector('.line-prod')
                        const selectedProductId = prodInput?.dataset?.selectedId || ''
                        const product_id = selectedProductId
                        const product_name = prodInput?.value || ''
                        const qty = parseFloat(tr.querySelector('.line-qty').value) || 0
                        const unit_price = parseFloat(tr.querySelector('.line-price').value) || 0
                        const discount = parseFloat(tr.querySelector('.line-disc')?.value) || 0
                        const trackingType = String(tr.dataset.trackingType || 'NONE').toUpperCase()
                        const serialNumbers = tr.querySelector('.line-serials')?.value?.trim() || ''
                        const batchNo = tr.querySelector('.line-batch')?.value?.trim() || ''
                        const expiryDate = tr.querySelector('.line-expiry')?.value || ''
                        const rollNo = tr.querySelector('.line-roll')?.value?.trim() || ''
                        const dimensionQty = parseFloat(tr.querySelector('.line-dimension-qty')?.value || '') || ''
                        const uom = tr.querySelector('.line-uom')?.textContent?.trim() || ''
                        
                        // BUG 2 FIX: Snapshot product cost
                        const cost = parseFloat(tr.dataset.cost || 0)

                        if (product_name && isInventoryDoc && !selectedProductId) {
                            prodInput?.focus()
                            throw new Error('กรุณาเลือกสินค้าในรายการจากช่องค้นหา ห้ามพิมพ์ชื่อสินค้าอย่างเดียวสำหรับเอกสารสต็อก')
                        }
                        if (isInventoryDoc && tr.dataset.trackStock !== 'false') {
                            if (trackingType === 'SERIALIZED' && !serialNumbers) {
                                prodInput?.focus()
                                throw new Error('กรุณากรอก Serial number สำหรับสินค้าที่ต้องติดตาม Serial')
                            }
                            if (trackingType === 'BATCH' && !batchNo) {
                                prodInput?.focus()
                                throw new Error('กรุณากรอก Batch/Lot สำหรับสินค้าที่ต้องติดตาม Batch')
                            }
                            if (trackingType === 'DIMENSION' && (!rollNo || !dimensionQty)) {
                                prodInput?.focus()
                                throw new Error('กรุณากรอก Roll no. และความยาว/จำนวน สำหรับสินค้าที่ต้องติดตามแบบม้วน/มิติ')
                            }
                        }

                        if (product_id || product_name) {
                            const p = {
                                document_id: docId, product_id, product_name, qty,
                                price: unit_price, unit_price, discount, cost,
                                total: (qty * unit_price) - discount, branch_id: payload.branch_id,
                                uom,
                                tracking_type: trackingType,
                                serial_numbers: serialNumbers,
                                batch_no: batchNo,
                                expiry_date: expiryDate,
                                roll_no: rollNo,
                                dimension_qty: dimensionQty
                            }
                            if (rowId) {
                                await updateRecord('document_items', rowId, p)
                                newIds.push(rowId)
                            } else {
                                const created = await createRecord('document_items', p)
                                newIds.push(created.id)
                            }
                            if (tr.dataset.trackStock !== 'false') {
                                itemsForLedger.push({ product_id, qty, unit_price, cost })
                            }
                        }
                    }

                    // Delete items removed from grid
                    const oldItems = await fetchFullList('document_items', { filter: `document_id='${sanitizeFilter(docId)}'` })
                    const toDelete = oldItems.filter(o => !newIds.includes(o.id))
                    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
                        await Promise.all(toDelete.slice(i, i + BATCH_SIZE).map(o => deleteRecord('document_items', o.id)))
                    }

                    // Stock posting is server-owned. Draft saves only sync document_items;
                    // confirm/receive endpoints create immutable ledger rows.
                }

                if (shouldConfirmAfterSave && isInventoryDoc) {
                    const res = await fetch(`/api/data/custom/confirm-document/${encodeURIComponent(docId)}`, {
                        method: 'POST',
                        headers: getApiAuthHeaders({ 'Content-Type': 'application/json' })
                    })
                    if (!res.ok) {
                        const text = await res.text()
                        throw new Error(text || `Confirm failed (${res.status})`)
                    }
                    showToast('บันทึกและยืนยันเอกสารเรียบร้อย สต็อกถูกปรับแล้ว', 'success')
                } else {
                    showToast('บันทึกเอกสารเรียบร้อย', 'success')
                }
                container.querySelector('#btnClearDoc').click()
                container.querySelector('.tab-btn[data-tab="search"]').click()
                loadData()
            } catch (err) {
                console.error(err)
                showToast('เกิดข้อผิดพลาดในการบันทึก', 'error')
            } finally {
                delete addPanel.dataset.saveConfirm
                unlockBtn();
            }
        })

        addPanel.querySelector('#btnClearDoc')?.addEventListener('click', () => {
            editingId = null
            ensureDocNo(true)
            container.querySelector('#issue_date').value = today
            container.querySelector('#ref_no').value = ''
            container.querySelector('#notes').value = ''
            if (isAmountOnlyDoc) container.querySelector('#doc_amount').value = ''
            if (entityAC) { entityAC.setValue(''); entityAC.setSelectedId('') }
            if (docVatToggle) docVatToggle.setState({ vatEnabled: false, vatMode: 'customer_pays' })
            if (cfg.hasItems !== false) {
                addPanel.querySelector('.doc-items-body').innerHTML = '<tr class="grid-empty"><td colspan="8" style="text-align:center;">กดปุ่ม "เพิ่มรายการ"</td></tr>'
                updateTotals()
            }
            // B3: Hide confirm/void/print/convert buttons on clear
            addPanel.querySelector('#btnConfirmDoc').style.display = 'none'
            addPanel.querySelector('#btnVoidDoc').style.display = 'none'
            const receiveBtn = addPanel.querySelector('#btnReceiveTransfer')
            if (receiveBtn) receiveBtn.style.display = 'none'
            addPanel.querySelector('#btnSaveDoc').style.display = 'inline-flex'
            const saveConfirmBtn = addPanel.querySelector('#btnSaveConfirmDoc')
            if (saveConfirmBtn) saveConfirmBtn.style.display = 'inline-flex'
            const btnPrint = addPanel.querySelector('#btnPrintDoc'); if (btnPrint) btnPrint.style.display = 'none'
            const btnConvert = addPanel.querySelector('#btnConvertDoc'); if (btnConvert) btnConvert.style.display = 'none'
            const srcBadge = container.querySelector('#sourceDocBadge'); if (srcBadge) srcBadge.style.display = 'none'
            addPanel.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false)
            const addLineBtn = addPanel.querySelector('.btn-add-line')
            if (addLineBtn) addLineBtn.style.display = 'inline-flex'
        })

        addPanel.querySelector('#btnClearDocData')?.addEventListener('click', async () => {
            if (!await showConfirm('ยืนยันลบข้อมูลเอกสาร', `ต้องการลบเอกสาร ${cfg.title} ทั้งหมดใช่หรือไม่?`)) return
            try {
                const res = await fetch('/api/dev/clear-data', {
                    method: 'POST',
                    headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ action: 'document_type', doc_type: cfg.prefix })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Request failed')
                showToast(data.message || 'ล้างข้อมูลเอกสารเรียบร้อย', 'success')
                addPanel.querySelector('#btnClearDoc')?.click()
                loadData()
            } catch (e) {
                console.error(e)
                showToast('Error: ' + e.message, 'error')
            }
        })

        // B3: Confirm document
        addPanel.querySelector('#btnConfirmDoc')?.addEventListener('click', async () => {
            if (!editingId) return
            if (await showConfirm('ยืนยันเอกสาร', 'ต้องการยืนยันเอกสารนี้?')) {
                if (!validateTrackingRows(addPanel)) return
                try {
                    const res = await fetch(`/api/data/custom/confirm-document/${encodeURIComponent(editingId)}`, {
                        method: 'POST',
                        headers: getApiAuthHeaders({ 'Content-Type': 'application/json' })
                    })
                    if (!res.ok) {
                        const text = await res.text()
                        throw new Error(text || `Confirm failed (${res.status})`)
                    }

                    showToast('ยืนยันเอกสารเรียบร้อย', 'success')
                    addPanel.querySelector('#btnConfirmDoc').style.display = 'none'
                    loadData()
                } catch (err) {
                    console.error(err)
                    showToast('ยืนยันเอกสารไม่สำเร็จ: ' + err.message, 'error')
                }
            }
        })

        addPanel.querySelector('#btnReceiveTransfer')?.addEventListener('click', async () => {
            if (!editingId) return
            if (await showConfirm('รับโอนเข้า', 'ยืนยันรับสินค้าโอนเข้าปลายทาง?')) {
                try {
                    const res = await fetch(`/api/data/custom/receive-transfer/${encodeURIComponent(editingId)}`, {
                        method: 'POST',
                        headers: getApiAuthHeaders({ 'Content-Type': 'application/json' })
                    })
                    if (!res.ok) {
                        const text = await res.text()
                        throw new Error(text || `Receive failed (${res.status})`)
                    }
                    showToast('รับโอนเข้าเรียบร้อย', 'success')
                    addPanel.querySelector('#btnReceiveTransfer').style.display = 'none'
                    loadData()
                } catch (err) {
                    console.error(err)
                    showToast('รับโอนไม่สำเร็จ: ' + err.message, 'error')
                }
            }
        })

        // B3: Void document
        addPanel.querySelector('#btnVoidDoc')?.addEventListener('click', async () => {
            if (!editingId) return
            if (await showConfirm('ยกเลิกเอกสาร', 'ต้องการยกเลิกเอกสารนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
                try {
                    const res = await fetch(`/api/data/custom/void-document/${encodeURIComponent(editingId)}`, {
                        method: 'POST',
                        headers: getApiAuthHeaders({ 'Content-Type': 'application/json' })
                    })
                    if (!res.ok) {
                        const text = await res.text()
                        throw new Error(text || `Void failed (${res.status})`)
                    }
                } catch (err) {
                    console.error(err)
                    showToast('ยกเลิกเอกสารไม่สำเร็จ: ' + err.message, 'error')
                    return
                }

                showToast('ยกเลิกเอกสารเรียบร้อย (ปรับสต็อกกลับแล้ว)', 'warning')
                addPanel.querySelector('#btnVoidDoc').style.display = 'none'
                addPanel.querySelector('#btnConfirmDoc').style.display = 'none'
                loadData()
            }
        })

        function addLineRow(data = null, index = 1, docStatus = 'pending') {
            const tbody = addPanel.querySelector('.doc-items-body')
            if (tbody.querySelector('.grid-empty')) tbody.innerHTML = ''
            const tr = document.createElement('tr')
            tr.dataset.id = data ? data.id : ''
            tr.dataset.cost = data ? (data.cost || 0) : 0
            const rowPrice = data ? (data.unit_price ?? data.price ?? 0) : 0
            const displayName = data ? (data.product_name || data.product_id || '') : ''
            
            const isSealed = ['confirmed', 'in_transit', 'received', 'paid', 'voided'].includes(docStatus)
            const disabledAttr = isSealed ? 'disabled' : ''

            tr.innerHTML = `
                <td data-label="#">${index}</td>
                <td data-label="สินค้า/บริการ">
                    <div class="ac-doc-line-host"></div>
                    <div class="line-tracking-panel" style="display:none;margin-top:var(--sp-2);gap:var(--sp-2);flex-wrap:wrap;"></div>
                </td>
                <td data-label="จำนวน"><input type="number" class="form-control line-qty" value="${data ? data.qty : 1}" ${cfg.allowNegativeQty ? '' : 'min="1"'} step="0.001" style="width:80px;" ${disabledAttr}></td>
                <td data-label="UOM"><span class="line-uom text-sm text-muted">${data?.uom || ''}</span></td>
                <td data-label="ราคา/หน่วย"><input type="number" class="form-control line-price" value="${rowPrice}" min="0" style="width:100px;" ${disabledAttr}></td>
                <td data-label="ส่วนลด"><input type="number" class="form-control line-disc" value="${data ? (data.discount || 0) : 0}" min="0" style="width:100px;" ${disabledAttr}></td>
                <td data-label="รวม" class="line-total text-bold">฿0.00</td>
                <td data-label="ลบ"><button class="btn btn-sm btn-danger line-rm" ${disabledAttr}><span class="material-icons-outlined" style="font-size:16px;">close</span></button></td>
            `
            tbody.appendChild(tr)

            function renderTrackingPanel(type = tr.dataset.trackingType || 'NONE') {
                const panel = tr.querySelector('.line-tracking-panel')
                if (!panel) return
                const sealed = ['confirmed', 'in_transit', 'received', 'paid', 'voided'].includes(docStatus)
                const disabled = sealed ? 'disabled' : ''
                const trackingType = String(type || 'NONE').toUpperCase()
                const trackingMeta = {
                    SERIALIZED: {
                        badge: 'Serialized',
                        hint: 'One serial per unit. Separate multiple serials with comma or new line.'
                    },
                    BATCH: {
                        badge: 'Batch/Lot',
                        hint: 'Use the supplier lot number. Expiry date is optional but recommended.'
                    },
                    DIMENSION: {
                        badge: 'Dimension/Roll',
                        hint: 'Record the roll number and measured length or quantity.'
                    }
                }[trackingType]
                panel.style.display = trackingType === 'NONE' ? 'none' : 'grid'
                if (trackingType === 'SERIALIZED') {
                    panel.innerHTML = `
                        <div class="traceability-header">
                            <span class="traceability-badge">${trackingMeta.badge}</span>
                            <span class="traceability-hint">${trackingMeta.hint}</span>
                        </div>
                        <label class="traceability-field traceability-field-wide">
                            <span>Serial numbers</span>
                            <textarea class="form-control line-serials" rows="2" placeholder="SN001, SN002" data-testid="line-serials" ${disabled}>${escapeHtml(trackingValue(data, 'serial_numbers') || trackingValue(data, 'serial_no'))}</textarea>
                        </label>`
                } else if (trackingType === 'BATCH') {
                    panel.innerHTML = `
                        <div class="traceability-header">
                            <span class="traceability-badge">${trackingMeta.badge}</span>
                            <span class="traceability-hint">${trackingMeta.hint}</span>
                        </div>
                        <label class="traceability-field">
                            <span>Batch/Lot no.</span>
                            <input class="form-control line-batch" placeholder="LOT-2026-001" value="${escapeHtml(trackingValue(data, 'batch_no'))}" data-testid="line-batch" ${disabled}>
                        </label>
                        <label class="traceability-field">
                            <span>Expiry date</span>
                            <input type="date" class="form-control line-expiry" value="${escapeHtml(String(trackingValue(data, 'expiry_date')).slice(0, 10))}" data-testid="line-expiry" ${disabled}>
                        </label>`
                } else if (trackingType === 'DIMENSION') {
                    panel.innerHTML = `
                        <div class="traceability-header">
                            <span class="traceability-badge">${trackingMeta.badge}</span>
                            <span class="traceability-hint">${trackingMeta.hint}</span>
                        </div>
                        <label class="traceability-field">
                            <span>Roll no.</span>
                            <input class="form-control line-roll" placeholder="ROLL-001" value="${escapeHtml(trackingValue(data, 'roll_no'))}" data-testid="line-roll" ${disabled}>
                        </label>
                        <label class="traceability-field">
                            <span>Length/qty</span>
                            <input type="number" step="0.001" class="form-control line-dimension-qty" placeholder="0.000" value="${escapeHtml(trackingValue(data, 'dimension_qty') || data?.qty || '')}" data-testid="line-dimension-qty" ${disabled}>
                        </label>`
                }
            }

            // Autocomplete for product in line item
            const acHost = tr.querySelector('.ac-doc-line-host')
            let currentStock = null;
            
            const lineAC = createAutocomplete({
                container: acHost,
                placeholder: 'พิมพ์ชื่อสินค้า...',
                value: displayName,
                fetchItems: async () => {
                    const prods = await fetchFullList('products')
                    const selectableProducts = isInventoryDoc ? prods.filter(isStockTrackedProduct) : prods
                    return selectableProducts.map(p => {
                        const productId = p.id ?? p.Id ?? p.ID
                        const s = documentStockCache && documentStockCache[productId] ? (documentStockCache[productId].qty || 0) : 0
                        return {
                            id: productId,
                            code: p.code,
                            label: p.name,
                            secondary: isPurchaseDoc
                                ? `ทุน ฿${p.cost || 0} | ขาย ฿${p.price || 0}`
                                : `คงเหลือ: ${s} | ฿${p.price || 0}`,
                            _raw: p,
                            stock: s
                        }
                    })
                },
                onSelect: (item) => {
                    // Purchase docs default to cost, sales docs default to price
                    tr.querySelector('.line-price').value = isPurchaseDoc
                        ? (item._raw.cost || item._raw.price || 0)
                        : (item._raw.price || 0)
                    tr.dataset.cost = item._raw.cost || 0
                    tr.dataset.trackStock = isStockTrackedProduct(item._raw) ? 'true' : 'false'
                    tr.dataset.productType = item._raw.type || ''
                    tr.dataset.trackingType = getProductTrackingType(item._raw)
                    tr.dataset.baseUom = getBaseUom(item._raw)
                    tr.querySelector('.line-uom').textContent = isPurchaseDoc
                        ? (item._raw.purchase_uom || item._raw.unit || tr.dataset.baseUom)
                        : (item._raw.sales_uom || item._raw.unit || tr.dataset.baseUom)
                    renderTrackingPanel(tr.dataset.trackingType)
                    lineAC.input.dataset.selectedId = item.id
                    lineAC.input.classList.add('line-prod')
                    currentStock = tr.dataset.trackStock === 'false' ? null : item.stock

                    // BUG 9 FIX: Stock limit check for OUT docs
                    if (!isPurchaseDoc && tr.dataset.trackStock !== 'false') {
                        const qtyInp = tr.querySelector('.line-qty')
                        if (currentStock !== null && parseFloat(qtyInp.value) > currentStock) {
                            showToast(`สินค้าคงเหลือไม่พอ (${currentStock})`, 'warning')
                            qtyInp.value = currentStock > 0 ? currentStock : 1
                        }
                    }

                    updateTotals()
                }
            })
            if (isSealed) lineAC.input.disabled = true
            lineAC.input.classList.add('line-prod')
            if (data?.product_id) {
                lineAC.input.dataset.selectedId = data.product_id
                tr.dataset.trackStock = 'true'
                tr.dataset.trackingType = trackingValue(data, 'tracking_type', data.stock_tracking_type || 'NONE')
                renderTrackingPanel(tr.dataset.trackingType)
                if (!isPurchaseDoc && documentStockCache && documentStockCache[data.product_id]) {
                    currentStock = documentStockCache[data.product_id].qty || 0
                }
            }
            renderTrackingPanel(tr.dataset.trackingType || 'NONE')

            tr.querySelectorAll('input').forEach(i => i.addEventListener('input', (e) => {
                // BUG 9 FIX: Check stock on qty change
                if (!isPurchaseDoc && tr.dataset.trackStock !== 'false' && e.target.classList.contains('line-qty') && currentStock !== null) {
                    const val = parseFloat(e.target.value) || 0
                    if (val > currentStock) {
                        showToast(`สินค้าคงเหลือไม่พอ (${currentStock})`, 'warning')
                        e.target.value = currentStock > 0 ? currentStock : 1
                    }
                }
                updateTotals()
            }))
            tr.querySelector('.line-rm').addEventListener('click', () => { tr.remove(); updateTotals() })
            updateTotals()
        }

        addPanel.querySelector('.btn-add-line')?.addEventListener('click', () => {
            const count = addPanel.querySelectorAll('.doc-items-body tr:not(.grid-empty)').length
            addLineRow(null, count + 1)
        })

        // ─── Print Button Handler ───
        addPanel.querySelector('#btnPrintDoc')?.addEventListener('click', async () => {
            if (!editingId) return
            const item = currentItems.find(i => String(recordId(i)) === String(editingId))
            if (!item) return
            try {
                const dItems = await fetchFullList('document_items', { filter: `document_id='${sanitizeFilter(editingId)}'` })
                let shopInfo = { shopName: 'MungkhudShop', shopAddress: '', shopPhone: '', shopTaxId: '' }
                try {
                    const settings = await fetchFullList('settings', { requestKey: null })
                    if (settings.length > 0) {
                        const s = settings[0]
                        shopInfo.shopName = s.shop_name || shopInfo.shopName
                        shopInfo.shopAddress = s.address || ''
                        shopInfo.shopPhone = s.phone || ''
                        shopInfo.shopTaxId = s.tax_id || ''
                    }
                } catch (e) { /* ignore */ }
                const tmpl = { id: cfg.prefix, label: cfg.title, icon: cfg.icon, collection: 'documents', keyField: 'doc_no' }
                openPrintWindow(tmpl, item, dItems, shopInfo, { showVat: 'auto', showDiscount: true, showBank: true, showSignature: true })
            } catch (err) {
                showToast('เกิดข้อผิดพลาดในการพิมพ์: ' + err.message, 'error')
            }
        })

        // ─── Convert Document Handler ───
        addPanel.querySelector('#btnConvertDoc')?.addEventListener('click', async () => {
            if (!editingId || !CONVERT_MAP[cfg.prefix]) return
            const item = currentItems.find(i => String(recordId(i)) === String(editingId))
            if (!item) return
            if (item.status !== 'confirmed') return showToast('ต้องยืนยันเอกสารก่อนจึงจะแปลงได้', 'warning')

            const target = CONVERT_MAP[cfg.prefix]
            if (!await showConfirm('แปลงเอกสาร', `ต้องการสร้าง ${target.label} จากเอกสารนี้?`)) return

            try {
                // Generate new doc_no for the target type
                let newDocNo = ''
                try {
                    const idRes = await fetch(`/api/data/custom/generate-doc-id?prefix=${encodeURIComponent(target.target)}`, { headers: getApiAuthHeaders() })
                    const idData = await idRes.json()
                    newDocNo = idData.doc_no
                } catch { newDocNo = generateDocId(target.target, 1) }

                // Copy header
                const newDoc = await createRecord('documents', {
                    doc_no: newDocNo,
                    doc_type: target.target,
                    issue_date: today,
                    ref_no: item.doc_no,
                    entity_id: item.entity_id || '',
                    notes: item.notes || '',
                    source_doc_id: item.id,
                    status: 'draft',
                    branch_id: getBranch() || '',
                    vat_enabled: item.vat_enabled,
                    vat_mode: item.vat_mode || 'customer_pays',
                    subtotal: item.subtotal || 0,
                    discount_amount: item.discount_amount || 0,
                    vat_amount: item.vat_amount || 0,
                    grand_total: item.grand_total || 0
                })

                // Copy line items
                const srcItems = await fetchFullList('document_items', { filter: `document_id='${sanitizeFilter(item.id)}'` })
                for (const si of srcItems) {
                    await createRecord('document_items', {
                        document_id: newDoc.id,
                        product_id: si.product_id,
                        product_name: si.product_name,
                        qty: si.qty,
                        price: si.unit_price ?? si.price ?? 0,
                        unit_price: si.unit_price ?? si.price ?? 0,
                        discount: si.discount || 0,
                        cost: si.cost || 0,
                        total: si.total || 0,
                        uom: si.uom || '',
                        tracking_type: si.tracking_type || 'NONE',
                        serial_numbers: si.serial_numbers || si.serial_no || '',
                        batch_no: si.batch_no || '',
                        expiry_date: si.expiry_date || '',
                        roll_no: si.roll_no || '',
                        dimension_qty: si.dimension_qty || '',
                        branch_id: getBranch() || ''
                    })
                }

                showToast(`สร้าง ${target.label} เรียบร้อย: ${newDocNo}`, 'success')
                // Navigate to the target page
                window.location.hash = target.route
            } catch (err) {
                console.error(err)
                showToast('เกิดข้อผิดพลาดในการแปลงเอกสาร: ' + err.message, 'error')
            }
        })

        // ─── Load branch list for TF destination selector ───
        if (cfg.prefix === 'TF') {
            const destSel = container.querySelector('#destination_branch_id')
            if (destSel) {
                fetchFullList('branches').then(branches => {
                    const currentBranch = getBranch()
                    branches.filter(b => String(b.code || b.name || b.id) !== String(currentBranch)).forEach(b => {
                        const branchCode = b.code || b.name || b.id
                        const opt = document.createElement('option')
                        opt.value = branchCode
                        opt.textContent = b.name || b.code || b.id
                        destSel.appendChild(opt)
                    })
                }).catch(() => { /* branches may not exist yet */ })
            }
        }

        loadData()
        container.querySelector('#btnClearDoc')?.click()
    }
}
