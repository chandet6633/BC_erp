/**
 * Generic document page factory.
 * Creates Search + Add/Edit tab pages for document types (Quotation, Invoice, Receipt, etc.)
 * Now with product autocomplete and VAT toggle.
 */
import { createTabs, renderDataGrid, showToast, showConfirm, formatDate, formatCurrency, generateDocId, createAutocomplete, createVatToggle, calcVat } from '../components/ui.js'
import { fetchFullList, createRecord, updateRecord, deleteRecord } from '../services/pb.js'
import { postToStockLedger } from '../services/inventory.js'
import { sanitizeFilter, escapeHtml } from '../utils/sanitize.js'
import { BATCH_SIZE } from '../utils/constants.js'
import { getBranchFilter, getBranch } from '../services/auth.js'

export function createDocumentPage(cfg) {
    return function (container) {
        let currentItems = []
        let editingId = null
        let docVatToggle = null
        const today = new Date().toISOString().slice(0, 10)

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
                const s = r.status || 'pending'
                const badge = s === 'confirmed' ? 'closed' : s === 'voided' ? 'cancelled' : 'open'
                const label = s === 'confirmed' ? 'ยืนยัน' : s === 'voided' ? 'ยกเลิก' : 'รอดำเนินการ'
                return `<span class="badge badge-${badge}">${label}</span>`
            }},
            {
                key: 'actions', label: 'จัดการ', render: r => `
                <div class="grid-actions">
                    <button class="btn btn-sm btn-outline btn-edit" data-id="${r.id}"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                </div>
            ` }
        ]

        async function loadData() {
            const gridEl = container.querySelector('#docGrid')
            gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>'
            // ARCH-4: Apply branch filter if user is scoped to a branch
            let filter = `doc_type='${sanitizeFilter(cfg.prefix)}'`
            const bf = getBranchFilter()
            if (bf) filter += ` && ${bf}`
            currentItems = await fetchFullList('documents', { filter, requestKey: null })
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
                    <button class="btn btn-outline" id="btnClearDoc"><span class="material-icons-outlined">refresh</span> ล้างแบบฟอร์ม</button>
                    <button class="btn btn-success" id="btnConfirmDoc" style="display:none;"><span class="material-icons-outlined">check_circle</span> ยืนยัน</button>
                    <button class="btn btn-danger" id="btnVoidDoc" style="display:none;"><span class="material-icons-outlined">cancel</span> ยกเลิก</button>
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
                    </div>
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
                            <thead><tr><th>#</th><th>สินค้า / บริการ</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>ส่วนลด</th><th>รวม</th><th></th></tr></thead>
                            <tbody class="doc-items-body">
                                <tr><td colspan="7" class="grid-empty" style="text-align:center;padding:var(--sp-6);">กดปุ่ม "เพิ่มรายการ"</td></tr>
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

        // --- Entity autocomplete (customer or vendor depending on doc type) ---
        const entityCollection = ['RR', 'PI', 'PCN', 'P'].includes(cfg.prefix) ? 'vendors' : 'customers'
        const entityAC = createAutocomplete({
            container: addPanel.querySelector('#docEntityAC'),
            placeholder: entityCollection === 'vendors' ? 'ค้นหาผู้จำหน่าย...' : 'ค้นหาลูกค้า...',
            fetchItems: async () => {
                const items = await fetchFullList(entityCollection)
                return items.map(c => ({
                    id: c.id,
                    code: c.code,
                    label: c.name,
                    secondary: c.phone || ''
                }))
            },
            onSelect: () => { }
        })

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

        async function editItem(id) {
            const item = currentItems.find(i => i.id === id)
            if (!item) return
            editingId = id
            container.querySelector('#doc_no').value = item.doc_no || ''
            container.querySelector('#issue_date').value = item.issue_date ? item.issue_date.split(' ')[0] : ''
            container.querySelector('#ref_no').value = item.ref_no || ''
            container.querySelector('#notes').value = item.notes || ''
            if (entityAC && item.entity_id) {
                try {
                    const entities = await fetchFullList(entityCollection, { filter: `id='${sanitizeFilter(item.entity_id)}'` })
                    if (entities.length > 0) entityAC.setValue(entities[0].name)
                } catch (_) { }
            }
            if (docVatToggle) docVatToggle.setState({ vatEnabled: !!item.vat_enabled, vatMode: item.vat_mode || 'customer_pays' })

            if (cfg.hasItems !== false) {
                const tbody = addPanel.querySelector('.doc-items-body')
                tbody.innerHTML = '<tr class="grid-empty"><td colspan="7" style="text-align:center;">กำลังโหลดรายการ...</td></tr>'
                const dItems = await fetchFullList('document_items', { filter: `document_id='${sanitizeFilter(item.id)}'` })
                tbody.innerHTML = ''
                if (dItems.length === 0) tbody.innerHTML = '<tr class="grid-empty"><td colspan="7" style="text-align:center;">ไม่มีรายการ</td></tr>'
                dItems.forEach((di, idx) => addLineRow(di, idx + 1))
                updateTotals()
            }
            // B3: Show confirm/void buttons when editing
            const btnConfirm = addPanel.querySelector('#btnConfirmDoc')
            const btnVoid = addPanel.querySelector('#btnVoidDoc')
            if (item.status === 'pending' || !item.status) {
                btnConfirm.style.display = 'inline-flex'
                btnVoid.style.display = 'inline-flex'
            } else {
                btnConfirm.style.display = 'none'
                btnVoid.style.display = item.status !== 'voided' ? 'inline-flex' : 'none'
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

        addPanel.querySelector('#btnSaveDoc')?.addEventListener('click', async () => {
            const doc_no = container.querySelector('#doc_no').value
            const issue_date = container.querySelector('#issue_date').value
            const ref_no = container.querySelector('#ref_no').value
            const notes = container.querySelector('#notes').value
            const entity_id = entityAC?.getSelectedId() || ''
            const vatState = docVatToggle ? docVatToggle.getState() : { vatEnabled: false, vatMode: 'customer_pays' }

            if (!doc_no) return showToast('กรุณาระบุเลขเอกสาร', 'error')

            // D2: Check for duplicate doc_no when creating new
            if (!editingId) {
                const existing = await fetchFullList('documents', { filter: `doc_no='${sanitizeFilter(doc_no)}'`, requestKey: null })
                if (existing.length > 0) {
                    return showToast(`เลขเอกสาร ${doc_no} ซ้ำกันแล้ว`, 'error')
                }
            }

            const payload = {
                doc_no, doc_type: cfg.prefix, issue_date, ref_no, notes, entity_id, status: 'pending',
                branch_id: getBranch() || '',
                vat_enabled: vatState.vatEnabled,
                vat_mode: vatState.vatMode,
                discount_amount: parseFloat(addPanel.dataset.discount || 0),
                subtotal: parseFloat(addPanel.dataset.subtotal || 0),
                vat_amount: parseFloat(addPanel.dataset.vat || 0),
                grand_total: parseFloat(addPanel.dataset.total || 0)
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
                    const oldItems = await fetchFullList('document_items', { filter: `document_id='${sanitizeFilter(docId)}'` })
                    for (let i = 0; i < oldItems.length; i += BATCH_SIZE) {
                        await Promise.all(oldItems.slice(i, i + BATCH_SIZE).map(o => deleteRecord('document_items', o.id)))
                    }

                    const rows = addPanel.querySelectorAll('.doc-items-body tr:not(.grid-empty)')
                    const itemsForLedger = []
                    for (const tr of rows) {
                        const prodInput = tr.querySelector('.line-prod')
                        const product_id = prodInput?.dataset?.selectedId || prodInput?.value || ''
                        const product_name = prodInput?.value || ''
                        const qty = parseFloat(tr.querySelector('.line-qty').value) || 0
                        const unit_price = parseFloat(tr.querySelector('.line-price').value) || 0
                        const discount = parseFloat(tr.querySelector('.line-disc')?.value) || 0
                        if (product_id || product_name) {
                            await createRecord('document_items', {
                                document_id: docId, product_id, product_name, qty, unit_price, discount,
                                total: (qty * unit_price) - discount
                            })
                            itemsForLedger.push({ product_id, qty, unit_price })
                        }
                    }

                    await postToStockLedger(cfg.prefix, doc_no, itemsForLedger)
                }

                showToast('บันทึกเอกสารเรียบร้อย', 'success')
                container.querySelector('#btnClearDoc').click()
                container.querySelector('.tab-btn[data-tab="search"]').click()
                loadData()
            } catch (err) {
                console.error(err)
                showToast('เกิดข้อผิดพลาดในการบันทึก', 'error')
            }
        })

        addPanel.querySelector('#btnClearDoc')?.addEventListener('click', () => {
            editingId = null
            fetchFullList('documents', { filter: `doc_type='${sanitizeFilter(cfg.prefix)}'`, requestKey: null }).then(docs => {
                const nextId = generateDocId(cfg.prefix, docs.length + 1)
                container.querySelector('#doc_no').value = nextId
            })
            container.querySelector('#issue_date').value = today
            container.querySelector('#ref_no').value = ''
            container.querySelector('#notes').value = ''
            if (entityAC) { entityAC.setValue(''); entityAC.setSelectedId('') }
            if (docVatToggle) docVatToggle.setState({ vatEnabled: false, vatMode: 'customer_pays' })
            if (cfg.hasItems !== false) {
                addPanel.querySelector('.doc-items-body').innerHTML = '<tr class="grid-empty"><td colspan="7" style="text-align:center;">กดปุ่ม "เพิ่มรายการ"</td></tr>'
                updateTotals()
            }
            // B3: Hide confirm/void buttons on clear
            addPanel.querySelector('#btnConfirmDoc').style.display = 'none'
            addPanel.querySelector('#btnVoidDoc').style.display = 'none'
        })

        // B3: Confirm document
        addPanel.querySelector('#btnConfirmDoc')?.addEventListener('click', async () => {
            if (!editingId) return
            if (await showConfirm('ยืนยันเอกสาร', 'ต้องการยืนยันเอกสารนี้?')) {
                await updateRecord('documents', editingId, { status: 'confirmed' })
                showToast('ยืนยันเอกสารเรียบร้อย', 'success')
                addPanel.querySelector('#btnConfirmDoc').style.display = 'none'
                loadData()
            }
        })

        // B3: Void document
        addPanel.querySelector('#btnVoidDoc')?.addEventListener('click', async () => {
            if (!editingId) return
            if (await showConfirm('ยกเลิกเอกสาร', 'ต้องการยกเลิกเอกสารนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
                await updateRecord('documents', editingId, { status: 'voided' })
                showToast('ยกเลิกเอกสารเรียบร้อย', 'warning')
                addPanel.querySelector('#btnVoidDoc').style.display = 'none'
                addPanel.querySelector('#btnConfirmDoc').style.display = 'none'
                loadData()
            }
        })

        function addLineRow(data = null, index = 1) {
            const tbody = addPanel.querySelector('.doc-items-body')
            if (tbody.querySelector('.grid-empty')) tbody.innerHTML = ''
            const tr = document.createElement('tr')
            const displayName = data ? (data.product_name || data.product_id || '') : ''
            tr.innerHTML = `
                <td>${index}</td>
                <td><div class="ac-doc-line-host"></div></td>
                <td><input type="number" class="form-control line-qty" value="${data ? data.qty : 1}" min="1" style="width:80px;"></td>
                <td><input type="number" class="form-control line-price" value="${data ? data.unit_price : 0}" min="0" style="width:100px;"></td>
                <td><input type="number" class="form-control line-disc" value="${data ? (data.discount || 0) : 0}" min="0" style="width:100px;"></td>
                <td class="line-total text-bold">฿0.00</td>
                <td><button class="btn btn-sm btn-danger line-rm"><span class="material-icons-outlined" style="font-size:16px;">close</span></button></td>
            `
            tbody.appendChild(tr)

            // Autocomplete for product in line item
            const acHost = tr.querySelector('.ac-doc-line-host')
            const isPurchaseDoc = ['RR', 'PI', 'PCN', 'P'].includes(cfg.prefix)
            const lineAC = createAutocomplete({
                container: acHost,
                placeholder: 'พิมพ์ชื่อสินค้า...',
                value: displayName,
                fetchItems: async () => {
                    const prods = await fetchFullList('products')
                    return prods.map(p => ({
                        id: p.id,
                        code: p.code,
                        label: p.name,
                        secondary: isPurchaseDoc
                            ? `ทุน ฿${p.cost || 0} | ขาย ฿${p.price || 0}`
                            : `฿${p.price || 0}`,
                        _raw: p
                    }))
                },
                onSelect: (item) => {
                    // Purchase docs default to cost, sales docs default to price
                    tr.querySelector('.line-price').value = isPurchaseDoc
                        ? (item._raw.cost || item._raw.price || 0)
                        : (item._raw.price || 0)
                    lineAC.input.dataset.selectedId = item.id
                    lineAC.input.classList.add('line-prod')
                    updateTotals()
                }
            })
            lineAC.input.classList.add('line-prod')
            if (data?.product_id) lineAC.input.dataset.selectedId = data.product_id

            tr.querySelectorAll('input').forEach(i => i.addEventListener('input', updateTotals))
            tr.querySelector('.line-rm').addEventListener('click', () => { tr.remove(); updateTotals() })
            updateTotals()
        }

        addPanel.querySelector('.btn-add-line')?.addEventListener('click', () => {
            const count = addPanel.querySelectorAll('.doc-items-body tr:not(.grid-empty)').length
            addLineRow(null, count + 1)
        })

        loadData()
        container.querySelector('#btnClearDoc')?.click()
    }
}
