/**
 * MungkhudShop — Job Page (ARCH-2 Refactored)
 * Orchestrator: imports state, data operations, and line-item logic from focused modules.
 * This file contains only the UI templates and event wiring.
 */
import { createTabs, showToast, showConfirm, generateDocId, createAutocomplete, createVatToggle } from '../components/ui.js'
import { fetchFullList, updateRecord } from '../services/pb.js'
import { postToStockLedger } from '../services/inventory.js'
import { notifyJobCompleted } from '../services/telegram.js'
import { sanitizeFilter, escapeHtml } from '../utils/sanitize.js'

// ARCH-2: Import from focused modules
import { resetState, getState, setPlateAC, setCustomerAC, setVatToggle } from './job-state.js'
import { addJobLineRow, recalcTotals } from './job-line-items.js'
import { loadSearchData, filterLocalSearch, saveJobData, clearJobForm, editJob, deleteJob } from './job-data.js'

export function initJobPage(container) {
    resetState()

    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">build</span>
                <h1>ใบงาน (Job)</h1>
            </div>
        </div>
        <div id="jobTabs"></div>
        <div id="panel-search" class="tab-panel active"></div>
        <div id="panel-add" class="tab-panel"></div>
    `
    const tabContainer = container.querySelector('#jobTabs')
    createTabs(container, [
        { id: 'search', label: 'ค้นหา', icon: 'search' },
        { id: 'add', label: 'เพิ่ม / แก้ไข', icon: 'add_circle_outline' },
    ])
    const tabBar = container.querySelector('.tabs')
    if (tabBar && tabContainer) tabContainer.appendChild(tabBar)

    renderSearchTab(container.querySelector('#panel-search'), container)
    renderAddEditTab(container.querySelector('#panel-add'), container)
}

function renderSearchTab(panel, mainContainer) {
    panel.innerHTML = `
        <div class="card">
            <div class="card-body">
                <div class="form-row-4" style="margin-bottom:var(--sp-4);">
                    <div class="form-group">
                        <label class="form-label">เลขใบงาน</label>
                        <input type="text" class="form-control" id="searchJobId" placeholder="JOB2603-0001">
                    </div>
                    <div class="form-group">
                        <label class="form-label">สถานะ</label>
                        <select class="form-control" id="searchStatus">
                            <option value="">ทั้งหมด</option>
                            <option value="open">เปิด</option>
                            <option value="closed">ปิดงาน</option>
                            <option value="cancelled">ยกเลิก</option>
                        </select>
                    </div>
                </div>
                <div class="form-row-3" style="margin-bottom:var(--sp-4);">
                    <div class="form-group">
                        <label class="form-label">ทะเบียนรถ / ลูกค้า</label>
                        <input type="text" class="form-control" id="searchKeyword" placeholder="พิมพ์เพื่อค้นหา...">
                    </div>
                    <div class="form-group" style="justify-content:flex-end;">
                        <button class="btn btn-primary" id="btnSearchJob">
                            <span class="material-icons-outlined">search</span> ค้นหา
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div id="jobSearchResults" style="margin-top:var(--sp-4);"></div>
    `
    panel.querySelector('#btnSearchJob').addEventListener('click', () => loadSearchData(panel, mainContainer))
    panel.querySelector('#searchKeyword').addEventListener('input', () => filterLocalSearch(panel, mainContainer))
    loadSearchData(panel, mainContainer)
}

function renderAddEditTab(panel, mainContainer) {
    const newId = generateDocId('JOB')
    const today = new Date().toISOString().slice(0, 10)

    panel.innerHTML = `
        <div class="toolbar">
            <div class="toolbar-actions">
                <button class="btn btn-primary" id="btnSaveJob"><span class="material-icons-outlined">save</span> บันทึก</button>
                <button class="btn btn-outline" id="btnClearJob"><span class="material-icons-outlined">refresh</span> ล้างฟอร์ม</button>
                <button class="btn btn-success" id="btnCloseJob" style="display:none;"><span class="material-icons-outlined">check_circle</span> ปิดงาน</button>
                <button class="btn btn-danger" id="btnCancelJob" style="display:none;"><span class="material-icons-outlined">cancel</span> ยกเลิกงาน</button>
            </div>
        </div>

        <div class="job-form-grid">
            <!-- Job Info -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">assignment</span> ข้อมูลใบงาน</div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">เลขใบงาน</label>
                        <input type="text" class="form-control" id="jobDocId" value="${newId}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">สถานะ</label>
                        <select class="form-control" id="jobStatus" disabled>
                            <option value="open">เปิด</option>
                            <option value="closed">ปิดงาน</option>
                            <option value="cancelled">ยกเลิก</option>
                        </select>
                    </div>
                </div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">วันเริ่มงาน</label>
                        <input type="date" class="form-control" id="jobStartDate" value="${today}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">วันกำหนดเสร็จ</label>
                        <input type="date" class="form-control" id="jobEndDate">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">ช่างผู้รับผิดชอบ</label>
                    <input type="text" class="form-control" id="jobTechnician" placeholder="ชื่อช่าง...">
                </div>
                <div class="form-group">
                    <label class="form-label">หมายเหตุ</label>
                    <textarea class="form-control" id="jobNotes" rows="2" placeholder="หมายเหตุ..."></textarea>
                </div>
            </div>

            <!-- Vehicle Info -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">directions_car</span> ข้อมูลยานพาหนะ</div>
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
                <div class="form-group">
                    <label class="form-label">เลขตัวถัง (Chassis)</label>
                    <input type="text" class="form-control" id="jobChassis" placeholder="VIN...">
                </div>
            </div>

            <!-- Customer Info -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">person</span> ข้อมูลลูกค้า</div>
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

            <!-- Payment Info + VAT Toggle -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">payment</span> การชำระเงิน</div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">ประเภทการชำระ</label>
                        <select class="form-control" id="jobPaymentType">
                            <option value="cash">เงินสด</option>
                            <option value="transfer">โอนเงิน</option>
                            <option value="credit">บัตรเครดิต</option>
                            <option value="qr">QR Payment</option>
                            <option value="credit_term">เครดิต</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ส่วนลด (%)</label>
                        <input type="number" class="form-control" id="jobDiscount" value="0" min="0" max="100">
                    </div>
                </div>
                <div id="jobVatToggle" style="margin-top:var(--sp-3);"></div>
            </div>

            <!-- Service Items Grid -->
            <div class="job-section job-items-section">
                <div class="job-section-title"><span class="material-icons-outlined">list_alt</span> รายการบริการ / สินค้า</div>
                <div class="toolbar" style="margin-bottom:var(--sp-3);gap:var(--sp-2);flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary" id="btnAddItem"><span class="material-icons-outlined" style="font-size:16px;">add</span> เพิ่มรายการ</button>
                    <button class="btn btn-sm btn-outline" id="btnShowFavorites"><span class="material-icons-outlined" style="font-size:16px;">star</span> สินค้าโปรด</button>
                </div>
                <div id="favoritesPanel" style="display:none;margin-bottom:var(--sp-3);padding:var(--sp-3);background:var(--color-warning-light);border-radius:var(--radius-md);">
                    <div style="font-weight:600;font-size:0.85rem;margin-bottom:var(--sp-2);">⭐ เลือกสินค้าโปรดเพื่อเพิ่มเข้ารายการ:</div>
                    <div id="favoritesGrid" style="display:flex;flex-wrap:wrap;gap:var(--sp-2);">กำลังโหลด...</div>
                </div>
                <div class="data-grid">
                    <table>
                        <thead>
                            <tr>
                                <th style="width:40px;">#</th>
                                <th>สินค้า / บริการ</th>
                                <th style="width:80px;">จำนวน</th>
                                <th style="width:100px;">ราคา/หน่วย</th>
                                <th style="width:100px;">ส่วนลด</th>
                                <th style="width:120px;">รวม</th>
                                <th style="width:60px;"></th>
                            </tr>
                        </thead>
                        <tbody id="jobItemsBody">
                            <tr><td colspan="7" class="grid-empty" style="text-align:center;padding:var(--sp-6);color:var(--color-text-muted);">กดปุ่ม "เพิ่มรายการ" เพื่อเริ่มต้น</td></tr>
                        </tbody>
                    </table>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:var(--sp-4);gap:var(--sp-6);">
                    <div style="text-align:right;">
                        <div class="text-sm text-muted">รวมก่อนส่วนลด</div>
                        <div class="text-bold" id="jobSubtotal">฿0.00</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="text-sm text-muted">ส่วนลด</div>
                        <div class="text-bold" style="color:var(--color-danger);" id="jobDiscountAmt">-฿0.00</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="text-sm text-muted">ภาษีมูลค่าเพิ่ม 7%</div>
                        <div class="text-bold" id="jobVat">฿0.00</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="text-sm" style="color:var(--color-primary);font-weight:600;">ยอดรวมสุทธิ</div>
                        <div style="font-size:1.4rem;font-weight:700;color:var(--color-primary);" id="jobTotal">฿0.00</div>
                    </div>
                </div>
            </div>

            <!-- Repair Evaluation -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">checklist</span> ประเมินงานซ่อม</div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">ผลการตรวจสอบ</label>
                        <select class="form-control" id="jobEvalResult">
                            <option value="">ยังไม่ประเมิน</option>
                            <option value="pass">ผ่าน ✅</option>
                            <option value="fix_needed">ต้องแก้ไข ⚠️</option>
                            <option value="fail">ไม่ผ่าน ❌</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ผู้ประเมิน</label>
                        <input type="text" class="form-control" id="jobEvaluator" placeholder="ชื่อผู้ประเมิน...">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">บันทึกผลการประเมิน</label>
                    <textarea class="form-control" id="jobEvalNotes" rows="2" placeholder="ผลตรวจสอบ / รายละเอียดที่ต้องแก้ไข..."></textarea>
                </div>
            </div>

            <!-- Multiple Payment Methods -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">account_balance_wallet</span> แยกชำระหลายช่องทาง</div>
                <div id="jobPaymentMethods">
                    <div class="payment-row" style="display:flex;gap:var(--sp-3);align-items:center;margin-bottom:var(--sp-2);">
                        <select class="form-control pay-method" style="flex:1;">
                            <option value="cash">เงินสด</option>
                            <option value="transfer">โอนเงิน</option>
                            <option value="credit">บัตรเครดิต</option>
                            <option value="qr">QR Payment</option>
                            <option value="credit_term">เครดิต</option>
                        </select>
                        <input type="number" class="form-control pay-amount" placeholder="จำนวนเงิน" min="0" style="flex:1;">
                        <input type="text" class="form-control pay-ref" placeholder="อ้างอิง (ถ้ามี)" style="flex:1;">
                    </div>
                </div>
                <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-2);">
                    <button class="btn btn-sm btn-outline" id="btnAddPayment"><span class="material-icons-outlined" style="font-size:16px;">add</span> เพิ่มช่องทาง</button>
                    <span class="text-sm text-muted" style="align-self:center;" id="paymentSumLabel">ยอดชำระ: ฿0.00</span>
                </div>
            </div>
        </div>
    `

    // --- Autocomplete: Plate ---
    const plateAutocomplete = createAutocomplete({
        container: panel.querySelector('#jobPlateAC'),
        placeholder: 'กข-1234 (พิมพ์เพื่อค้นหา)',
        fetchItems: async () => {
            const vehicles = await fetchFullList('vehicles')
            return vehicles.map(v => ({
                id: v.id,
                code: v.plate_number,
                label: v.plate_number,
                secondary: `${v.brand || ''} ${v.model || ''}`.trim(),
                _raw: v
            }))
        },
        onSelect: (item) => {
            const v = item._raw
            panel.querySelector('#jobModel').value = `${v.brand || ''} ${v.model || ''}`.trim()
            panel.querySelector('#jobMileage').value = v.mileage || ''
            panel.querySelector('#jobChassis').value = v.chassis_number || ''
            if (v.customer_id) {
                fetchFullList('customers', { filter: `id='${sanitizeFilter(v.customer_id)}'` }).then(custs => {
                    if (custs.length > 0) {
                        const { customerAC } = getState()
                        if (customerAC) {
                            customerAC.setValue(custs[0].name)
                            customerAC.setSelectedId(custs[0].id)
                        }
                        panel.querySelector('#jobCustomerPhone').value = custs[0].phone || ''
                    }
                })
            }
        }
    })
    setPlateAC(plateAutocomplete)

    // --- Autocomplete: Customer ---
    const custAutocomplete = createAutocomplete({
        container: panel.querySelector('#jobCustomerAC'),
        placeholder: 'ค้นหาลูกค้า...',
        fetchItems: async () => {
            const custs = await fetchFullList('customers')
            return custs.map(c => ({
                id: c.id,
                code: c.code,
                label: c.name,
                secondary: c.phone || '',
                _raw: c
            }))
        },
        onSelect: (item) => {
            panel.querySelector('#jobCustomerPhone').value = item._raw.phone || ''
        }
    })
    setCustomerAC(custAutocomplete)

    // --- VAT Toggle ---
    const vt = createVatToggle({
        container: panel.querySelector('#jobVatToggle'),
        vatEnabled: false,
        vatMode: 'customer_pays',
        onUpdate: () => recalcTotals(panel)
    })
    setVatToggle(vt)

    const redPlate = panel.querySelector('#jobRedPlate')
    redPlate.addEventListener('click', () => redPlate.classList.toggle('active'))
    panel.querySelector('#jobDiscount').addEventListener('input', () => recalcTotals(panel))

    panel.querySelector('#btnAddItem').addEventListener('click', () => {
        const count = panel.querySelectorAll('#jobItemsBody tr:not(.grid-empty)').length
        addJobLineRow(panel, null, count + 1)
    })

    panel.querySelector('#btnSaveJob').addEventListener('click', () => saveJobData(panel, mainContainer))
    panel.querySelector('#btnClearJob').addEventListener('click', () => clearJobForm(panel))

    panel.querySelector('#btnCloseJob').addEventListener('click', async () => {
        const { editingId } = getState()
        const rows = panel.querySelectorAll('#jobItemsBody tr:not(.grid-empty)')
        let belowCostItems = []
        try {
            const products = await fetchFullList('products')
            const productMap = {}
            products.forEach(p => { productMap[p.id] = p; productMap[p.code] = p })
            rows.forEach(tr => {
                const prodId = tr.querySelector('.item-prod')?.dataset?.selectedId || tr.querySelector('.item-prod')?.value
                const unitPrice = parseFloat(tr.querySelector('.item-price')?.value) || 0
                const prod = productMap[prodId]
                if (prod && prod.cost > 0 && unitPrice < prod.cost) {
                    belowCostItems.push(`${prod.name || prod.code}: ขาย ฿${unitPrice} < ทุน ฿${prod.cost}`)
                }
            })
        } catch (_) { /* ignore */ }

        let msg = 'คุณต้องการปิดใบงานนี้?'
        if (belowCostItems.length > 0) {
            msg = `⚠️ พบสินค้าราคาต่ำกว่าทุน:\n${belowCostItems.join('\n')}\n\nยืนยันปิดงาน?`
        }

        if (await showConfirm('ปิดงาน', msg)) {
            const jItems = await fetchFullList('job_items', { filter: `job_id='${sanitizeFilter(editingId)}'` })
            let totalCost = 0
            const itemsForLedger = []
            try {
                const products = await fetchFullList('products', { requestKey: null })
                const pMap = {}
                products.forEach(p => { pMap[p.id] = p })
                for (const ji of jItems) {
                    const prod = pMap[ji.product_id]
                    const cost = prod ? (prod.cost || 0) : 0
                    totalCost += cost * (ji.qty || 0)
                    if (ji.product_id && ji.qty) {
                        itemsForLedger.push({ product_id: ji.product_id, qty: ji.qty, unit_price: ji.unit_price || 0 })
                    }
                }
            } catch (_) { /* products might not load */ }

            const grandTotal = parseFloat(panel.dataset.total) || 0
            const profit = grandTotal - totalCost

            await updateRecord('jobs', editingId, {
                status: 'closed',
                end_date: new Date().toISOString(),
                total_cost: Math.round(totalCost * 100) / 100,
                profit: Math.round(profit * 100) / 100
            })

            const jobNo = panel.querySelector('#jobDocId').value
            await postToStockLedger('JOB', jobNo, itemsForLedger)

            notifyJobCompleted({
                job_no: jobNo,
                plate: panel.querySelector('#jobPlateAC input')?.value || '',
                customer_name: panel.querySelector('#jobCustomerPhone')?.closest('.job-section')?.querySelector('[id$="AC"] input')?.value || '',
                grand_total: grandTotal
            }).catch(() => {})

            showToast(`ปิดงานเรียบร้อย (กำไร: ${profit >= 0 ? '' : '-'}฿${Math.abs(profit).toFixed(2)})`, profit >= 0 ? 'success' : 'warning')
            loadSearchData(mainContainer.querySelector('#panel-search'), mainContainer)
            mainContainer.querySelector('.tab-btn[data-tab="search"]').click()
        }
    })

    panel.querySelector('#btnCancelJob').addEventListener('click', async () => {
        const { editingId } = getState()
        if (await showConfirm('ยกเลิกงาน', 'คุณต้องการยกเลิกใบงานนี้?')) {
            await updateRecord('jobs', editingId, { status: 'cancelled' })
            showToast('ยกเลิกใบงานเรียบร้อย', 'warning')
            loadSearchData(mainContainer.querySelector('#panel-search'), mainContainer)
            mainContainer.querySelector('.tab-btn[data-tab="search"]').click()
        }
    })

    // --- Favorite Products ---
    panel.querySelector('#btnShowFavorites').addEventListener('click', async () => {
        const favPanel = panel.querySelector('#favoritesPanel')
        const isVisible = favPanel.style.display !== 'none'
        favPanel.style.display = isVisible ? 'none' : 'block'
        if (!isVisible) {
            const favGrid = panel.querySelector('#favoritesGrid')
            try {
                const favs = await fetchFullList('favorite_products')
                if (favs.length === 0) {
                    const prods = await fetchFullList('products')
                    favGrid.innerHTML = prods.slice(0, 20).map(p =>
                        `<button class="btn btn-sm btn-outline fav-btn" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}" data-price="${p.price || 0}" style="font-size:0.8rem;">
                            ${escapeHtml(p.name)} <span class="text-muted">(฿${p.price || 0})</span>
                        </button>`
                    ).join('')
                } else {
                    const products = await fetchFullList('products')
                    const prodMap = {}
                    products.forEach(p => { prodMap[p.id] = p })
                    favGrid.innerHTML = favs.map(f => {
                        const p = prodMap[f.product_id]
                        if (!p) return ''
                        return `<button class="btn btn-sm btn-outline fav-btn" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}" data-price="${p.price || 0}" style="font-size:0.8rem;">
                            ⭐ ${escapeHtml(p.name)} <span class="text-muted">(฿${p.price || 0})</span>
                        </button>`
                    }).join('')
                }
                favGrid.querySelectorAll('.fav-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const count = panel.querySelectorAll('#jobItemsBody tr:not(.grid-empty)').length
                        addJobLineRow(panel, {
                            product_id: btn.dataset.id,
                            product_name: btn.dataset.name,
                            qty: 1,
                            unit_price: parseFloat(btn.dataset.price) || 0,
                            discount: 0
                        }, count + 1)
                    })
                })
            } catch (e) {
                favGrid.innerHTML = '<span class="text-sm text-muted">ไม่สามารถโหลดข้อมูลได้</span>'
            }
        }
    })

    // --- Multiple Payment Methods ---
    panel.querySelector('#btnAddPayment').addEventListener('click', () => {
        const container = panel.querySelector('#jobPaymentMethods')
        const row = document.createElement('div')
        row.className = 'payment-row'
        row.style.cssText = 'display:flex;gap:var(--sp-3);align-items:center;margin-bottom:var(--sp-2);'
        row.innerHTML = `
            <select class="form-control pay-method" style="flex:1;">
                <option value="cash">เงินสด</option>
                <option value="transfer">โอนเงิน</option>
                <option value="credit">บัตรเครดิต</option>
                <option value="qr">QR Payment</option>
                <option value="credit_term">เครดิต</option>
            </select>
            <input type="number" class="form-control pay-amount" placeholder="จำนวนเงิน" min="0" style="flex:1;">
            <input type="text" class="form-control pay-ref" placeholder="อ้างอิง" style="flex:1;">
            <button class="btn btn-sm btn-danger pay-remove"><span class="material-icons-outlined" style="font-size:16px;">close</span></button>
        `
        container.appendChild(row)
        row.querySelector('.pay-remove').addEventListener('click', () => { row.remove(); updatePaymentSum() })
        row.querySelector('.pay-amount').addEventListener('input', updatePaymentSum)
    })

    function updatePaymentSum() {
        let sum = 0
        panel.querySelectorAll('.pay-amount').forEach(inp => { sum += parseFloat(inp.value) || 0 })
        const label = panel.querySelector('#paymentSumLabel')
        if (label) label.textContent = `ยอดชำระ: ฿${sum.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
    }
    panel.querySelectorAll('.pay-amount').forEach(inp => inp.addEventListener('input', updatePaymentSum))
}
