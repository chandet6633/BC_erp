/**
 * MungkhudShop — Job Page (v2 — POS Overhaul)
 * Orchestrator: imports state, data operations, and line-item logic from focused modules.
 * v2: Combined customer+vehicle card, mechanic assignment, service badge, ad-hoc items.
 */
import { createTabs, showToast, showConfirm, generateDocId, createAutocomplete, createVatToggle } from '../components/ui.js'
import { fetchFullList, updateRecord } from '../services/pb.js'
import { postToStockLedger } from '../services/inventory.js'
import { notifyJobCompleted } from '../services/telegram.js'
import { sanitizeFilter, escapeHtml } from '../utils/sanitize.js'

// ARCH-2: Import from focused modules
import { resetState, getState, setPlateAC, setCustomerAC, setVatToggle, getMechanics } from './job-state.js'
import { addJobLineRow, recalcTotals } from './job-line-items.js'
import { loadSearchData, filterLocalSearch, saveJobData, clearJobForm, editJob, deleteJob } from './job-data.js'
import { printJob } from '../services/print-engine.js'

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
                            <option value="pending">รับรถ</option>
                            <option value="in_progress">กำลังซ่อม</option>
                            <option value="qc_done">รอเก็บเงิน</option>
                            <option value="completed">เสร็จสิ้น</option>
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
    // BUG 63 FIX: Debounce live search to avoid re-rendering on every keystroke
    const debouncedFilter = window.debounce ? window.debounce(() => filterLocalSearch(panel, mainContainer), 350) : () => filterLocalSearch(panel, mainContainer)
    panel.querySelector('#searchKeyword').addEventListener('input', debouncedFilter)
    loadSearchData(panel, mainContainer)
}

function renderAddEditTab(panel, mainContainer) {
    const today = new Date().toISOString().slice(0, 10)

    panel.innerHTML = `
        <div class="toolbar">
            <div class="toolbar-actions">
                <button class="btn btn-primary touch-target" id="btnSaveJob"><span class="material-icons-outlined">save</span> บันทึก</button>
                <button class="btn btn-outline touch-target" id="btnClearJob"><span class="material-icons-outlined">refresh</span> ล้างฟอร์ม</button>
                <button class="btn btn-outline touch-target" id="btnPrintJob" style="display:none;"><span class="material-icons-outlined">print</span> พิมพ์</button>
                <button class="btn btn-danger touch-target" id="btnCancelJob" style="display:none;"><span class="material-icons-outlined">cancel</span> ยกเลิกงาน</button>
            </div>
        </div>

        <div class="job-form-grid">
            <!-- ─── Job Info ─── -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">assignment</span> ข้อมูลใบงาน</div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">เลขใบงาน</label>
                        <input type="text" class="form-control" id="jobDocId" value="กำลังสร้าง..." readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">สถานะ</label>
                        <select class="form-control" id="jobStatus" disabled>
                            <option value="pending">รับรถ/รอจัดช่าง</option>
                            <option value="in_progress">กำลังซ่อม</option>
                            <option value="qc_done">รอเก็บเงิน</option>
                            <option value="completed">เสร็จสิ้น</option>
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

                <!-- v2: Mechanic Assignment -->
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">ช่างหลัก (Lead)</label>
                        <select class="form-control touch-target" id="jobLeadMechanic">
                            <option value="">-- เลือกช่าง --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ช่างช่วย (Helpers)</label>
                        <div id="jobHelperMechanics" style="display:flex;flex-wrap:wrap;gap:var(--sp-2);padding:var(--sp-2);min-height:44px;border:1px solid var(--bc-border);border-radius:var(--radius-md);background:var(--bc-surface-solid);">กำลังโหลด...</div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">หมายเหตุ</label>
                    <textarea class="form-control" id="jobNotes" rows="2" placeholder="หมายเหตุ..."></textarea>
                </div>
            </div>

            <!-- ─── Combined Customer + Vehicle Card (v2) ─── -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">directions_car</span> ข้อมูลลูกค้า & ยานพาหนะ</div>

                <!-- Service History Badge (hidden until plate selected) -->
                <div id="jobServiceBadge" style="display:none;padding:var(--sp-3);background:var(--bc-info-light,#DBEAFE);border-radius:var(--radius-md);margin-bottom:var(--sp-3);font-size:0.85rem;border-left:4px solid var(--bc-info,#3B82F6);">
                    <div style="font-weight:600;margin-bottom:var(--sp-2);">📋 ประวัติการเข้ารับบริการ</div>
                    <div style="display:flex;gap:var(--sp-4);flex-wrap:wrap;">
                        <span>🔄 <span id="badgeVisitCount">-</span></span>
                        <span>📅 <span id="badgeLastDate">-</span></span>
                        <span>🛣️ <span id="badgeMileage">-</span></span>
                    </div>
                </div>

                <!-- New Vehicle/Customer Prompt -->
                <div id="jobNewRecordPrompt" style="display:none;padding:var(--sp-3);background:var(--bc-warning-light,#FEF3C7);border-radius:var(--radius-md);margin-bottom:var(--sp-3);border-left:4px solid var(--bc-warning,#F59E0B);font-size:0.875rem;">
                    <span class="material-icons-outlined" style="font-size:16px;vertical-align:middle;">info</span>
                    <strong>ไม่พบข้อมูลยานพาหนะนี้ในระบบ</strong> — กรุณากรอกข้อมูลด้านล่าง ระบบจะบันทึกให้อัตโนมัติเมื่อกด "บันทึก"
                </div>

                <!-- Plate + Red Plate -->
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

                <!-- Vehicle fields -->
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">รุ่นรถ</label>
                        <input type="text" class="form-control" id="jobModel" placeholder="Toyota Camry">
                    </div>
                    <div class="form-group">
                        <label class="form-label">สีรถ</label>
                        <input type="text" class="form-control" id="jobColor" placeholder="สี...">
                    </div>
                </div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">เลขไมล์</label>
                        <input type="number" class="form-control" id="jobMileage" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">เลขตัวถัง (VIN)</label>
                        <input type="text" class="form-control" id="jobChassis" placeholder="VIN...">
                    </div>
                </div>

                <!-- Customer fields -->
                <div style="border-top:1px solid var(--bc-border);margin:var(--sp-3) 0;padding-top:var(--sp-3);"></div>
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

            <!-- ─── Payment Info + VAT Toggle ─── -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">payment</span> การชำระเงิน</div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">ประเภทการชำระ</label>
                        <select class="form-control touch-target" id="jobPaymentType">
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
                <div class="form-group" style="margin-top:var(--sp-4);">
                    <label class="form-label">สลิปโอนเงิน / หลักฐานชำระเงิน (ถ้ามี)</label>
                    <input type="file" id="jobPaymentProof" accept="image/*" capture="environment" class="form-control">
                    <div id="jobPaymentUploading" style="display:none; margin-top:8px;">
                        <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;color:var(--color-primary);margin-bottom:4px;">
                            <span class="material-icons-outlined" style="font-size:16px;animation:spin 1s linear infinite;">cloud_upload</span>
                            <span>กำลังอัพโหลดหลักฐาน...</span>
                        </div>
                        <div style="width:100%;height:4px;background:var(--color-border,#e2e8f0);border-radius:2px;overflow:hidden;">
                            <div id="jobUploadBar" style="height:100%;width:30%;background:var(--color-primary,#1d4ed8);border-radius:2px;animation:uploadProgress 1.2s ease-in-out infinite;"></div>
                        </div>
                    </div>
                    <div id="jobPaymentProofPreview" style="margin-top:8px;"></div>
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
                secondary: `${v.brand || ''} ${v.model || ''} ${v.color || ''}`.trim(),
                _raw: v
            }))
        },
        onSelect: (item) => {
            const v = item._raw
            panel.querySelector('#jobModel').value = `${v.brand || ''} ${v.model || ''}`.trim()
            panel.querySelector('#jobMileage').value = v.mileage || ''
            panel.querySelector('#jobChassis').value = v.vin || v.chassis_number || ''
            panel.querySelector('#jobColor').value = v.color || ''
            panel.querySelector('#jobNewRecordPrompt').style.display = 'none'

            // Autofill customer
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

            // Service history badge
            const plate = v.plate_number
            fetchFullList('jobs', { filter: `(plate,eq,${plate})`, requestKey: null }).then(prevJobs => {
                const badge = panel.querySelector('#jobServiceBadge')
                if (!badge) return
                const closedJobs = prevJobs.filter(j => j.status === 'closed' || j.status === 'completed')
                if (closedJobs.length === 0) {
                    badge.style.display = 'none'
                    return
                }
                badge.style.display = 'block'
                panel.querySelector('#badgeVisitCount').textContent = `เข้ารับบริการ ${closedJobs.length} ครั้ง`
                const lastJob = closedJobs.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0]
                const lastDate = lastJob.start_date ? new Date(lastJob.start_date).toLocaleDateString('th-TH') : '-'
                panel.querySelector('#badgeLastDate').textContent = `ครั้งล่าสุด: ${lastDate}`
                const lastMileage = lastJob.mileage_in || 0
                const curMileage = parseFloat(panel.querySelector('#jobMileage').value) || 0
                const delta = curMileage > lastMileage && lastMileage > 0 ? `+${(curMileage - lastMileage).toLocaleString()} km` : `${curMileage.toLocaleString()} km`
                panel.querySelector('#badgeMileage').textContent = `ไมล์: ${delta}`
            }).catch(() => {})
        }
    })
    setPlateAC(plateAutocomplete)

    // Detect new (unregistered) plate on blur
    plateAutocomplete.input?.addEventListener('blur', async () => {
        const plateVal = plateAutocomplete.input.value.trim()
        const selectedId = plateAutocomplete.input.dataset?.selectedId
        if (!plateVal || selectedId) return  // skip if empty or already selected from dropdown
        // Small delay to allow onSelect to fire first
        setTimeout(async () => {
            if (plateAutocomplete.input.dataset?.selectedId) return  // selection happened
            const prompt = panel.querySelector('#jobNewRecordPrompt')
            const badge = panel.querySelector('#jobServiceBadge')
            if (prompt) prompt.style.display = 'block'
            if (badge) badge.style.display = 'none'
        }, 200)
    })

    // --- Autocomplete: Customer ---
    const custAutocomplete = createAutocomplete({
        container: panel.querySelector('#jobCustomerAC'),
        placeholder: 'ค้นหาลูกค้า...',
        fetchItems: async () => {
            const custs = await fetchFullList('customers')
            return custs.map(c => ({
                id: c.id,
                code: c.cust_code,
                label: c.name,
                secondary: `${c.cust_code ? '[' + c.cust_code + '] ' : ''}${c.phone || ''}`,
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

    // --- Mechanic Dropdown + Helper Chips (v2) ---
    ;(async () => {
        try {
            const mechanics = await getMechanics()
            const leadSel = panel.querySelector('#jobLeadMechanic')
            if (mechanics.length === 0) {
                const opt = document.createElement('option')
                opt.value = ''
                opt.textContent = 'ไม่มีช่างในสาขานี้'
                leadSel.appendChild(opt)
            }
            mechanics.forEach(m => {
                const opt = document.createElement('option')
                opt.value = m.id
                opt.textContent = m.display_name || m.name
                leadSel.appendChild(opt)
            })
            renderHelperChips(panel, mechanics, null)
            leadSel.addEventListener('change', () => {
                renderHelperChips(panel, mechanics, leadSel.value)
            })
        } catch (e) {
            console.warn('[Job] Could not load mechanics:', e.message)
            panel.querySelector('#jobHelperMechanics').textContent = 'ไม่สามารถโหลดข้อมูลช่าง'
        }
    })()

    const redPlate = panel.querySelector('#jobRedPlate')
    redPlate.addEventListener('click', () => redPlate.classList.toggle('active'))
    panel.querySelector('#jobDiscount').addEventListener('input', () => recalcTotals(panel))

    panel.querySelector('#btnAddItem').addEventListener('click', () => {
        const count = panel.querySelectorAll('#jobItemsBody tr:not(.grid-empty)').length
        addJobLineRow(panel, null, count + 1)
    })

    panel.querySelector('#btnSaveJob').addEventListener('click', () => saveJobData(panel, mainContainer))
    panel.querySelector('#btnClearJob').addEventListener('click', () => clearJobForm(panel))
    
    panel.querySelector('#btnPrintJob').addEventListener('click', () => {
        const { editingId } = getState()
        if (editingId) printJob(editingId)
    })

    // The old close job button is removed because SA now closes the job from the Kanban Board via the payment modal.

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

    // BUG 67 FIX: Warn on unsaved changes when navigating away
    let formDirty = false
    const DRAFT_KEY = 'mungkhud_job_draft'

    function markDirty() { formDirty = true }
    panel.querySelectorAll('input, select, textarea').forEach(el => el.addEventListener('input', markDirty))
    panel.querySelector('#jobItemsBody')?.addEventListener('change', markDirty)

    // Unload warning
    const onBeforeUnload = (e) => {
        const { editingId } = getState()
        if (formDirty && !editingId) {
            e.preventDefault()
            e.returnValue = 'สร้างใบงานค้างอยู่ หากออกจากหน้านี้ข้อมูลจะหาย'
        }
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    // SPA hash-change warning (fires before navigation)
    const onHashChange = (e) => {
        const { editingId } = getState()
        if (formDirty && !editingId) {
            const ok = confirm('มีข้อมูลที่ยังไม่ได้บันทึก ออกจากหน้านี้หรือไม่?')
            if (!ok) {
                e.preventDefault()
                // Restore hash to current page (job)
                history.pushState(null, '', '#/job')
            } else {
                formDirty = false
                localStorage.removeItem(DRAFT_KEY)
            }
        }
    }
    window.addEventListener('popstate', onHashChange)

    // Cleanup on clear/save
    const origSave = panel.querySelector('#btnSaveJob')
    origSave?.addEventListener('click', () => {
        formDirty = false
        localStorage.removeItem(DRAFT_KEY)
    }, true)
    panel.querySelector('#btnClearJob')?.addEventListener('click', () => {
        formDirty = false
        localStorage.removeItem(DRAFT_KEY)
    }, true)

    // Ensure a new intake form has a real job number before the SA presses save.
    clearJobForm(panel)

    // BUG 90 FIX: Auto-save draft every 90 seconds
    const autosaveTimer = setInterval(() => {
        const { editingId } = getState()
        if (!formDirty || editingId) return  // Only draft for NEW unsaved jobs
        try {
            const draft = {
                plate: plateAutocomplete?.input?.value || '',
                customer: custAutocomplete?.input?.value || '',
                phone: panel.querySelector('#jobCustomerPhone')?.value || '',
                model: panel.querySelector('#jobModel')?.value || '',
                notes: panel.querySelector('#jobNotes')?.value || '',
                savedAt: new Date().toISOString()
            }
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
        } catch { }
    }, 90_000)

    // Restore draft prompt
    try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
        if (draft && draft.plate) {
            const savedAt = new Date(draft.savedAt).toLocaleTimeString('th-TH')
            setTimeout(() => {
                if (confirm(`พบร่างใบงานที่ยังไม่ได้บันทึก (${draft.plate}, ${savedAt}) — กู้คืนหรือไม่?`)) {
                    if (plateAutocomplete?.input) plateAutocomplete.input.value = draft.plate
                    if (custAutocomplete?.input) custAutocomplete.input.value = draft.customer
                    const phoneEl = panel.querySelector('#jobCustomerPhone')
                    if (phoneEl) phoneEl.value = draft.phone
                    const modelEl = panel.querySelector('#jobModel')
                    if (modelEl) modelEl.value = draft.model
                    const notesEl = panel.querySelector('#jobNotes')
                    if (notesEl) notesEl.value = draft.notes
                } else {
                    localStorage.removeItem(DRAFT_KEY)
                }
            }, 500)
        }
    } catch { }

    // Cleanup interval when panel is replaced
    const observer = new MutationObserver(() => {
        if (!document.body.contains(panel)) {
            clearInterval(autosaveTimer)
            window.removeEventListener('beforeunload', onBeforeUnload)
            window.removeEventListener('popstate', onHashChange)
            observer.disconnect()
        }
    })
    observer.observe(document.body, { childList: true, subtree: true })
}

// ── Helper: render mechanic chip pills for "Helper" selection ─────────────
function renderHelperChips(panel, mechanics, excludeId) {
    const container = panel.querySelector('#jobHelperMechanics')
    if (!container) return
    container.innerHTML = ''
    const eligible = mechanics.filter(m => m.id !== excludeId)
    if (eligible.length === 0) {
        container.textContent = 'ไม่มีช่างอื่น'
        return
    }
    eligible.forEach(m => {
        const chip = document.createElement('button')
        chip.type = 'button'
        chip.className = 'helper-chip'
        chip.dataset.id = m.id
        chip.textContent = m.display_name || m.name
        chip.style.cssText = `
            display:inline-flex;align-items:center;gap:4px;
            padding:6px 12px;border:1px solid var(--bc-border);
            border-radius:var(--radius-full,20px);cursor:pointer;
            font-size:0.8rem;background:var(--bc-surface-solid);
            color:var(--bc-text);transition:all 0.15s;
        `
        chip.addEventListener('click', () => {
            chip.classList.toggle('active')
            if (chip.classList.contains('active')) {
                chip.style.background = 'var(--bc-navy-mid,#1e3a5f)'
                chip.style.color = '#fff'
                chip.style.borderColor = 'var(--bc-navy-mid,#1e3a5f)'
            } else {
                chip.style.background = 'var(--bc-surface-solid)'
                chip.style.color = 'var(--bc-text)'
                chip.style.borderColor = 'var(--bc-border)'
            }
        })
        container.appendChild(chip)
    })
}

// ── Helper: get selected helper mechanic IDs ──────────────────────────────
export function getSelectedHelperIds(panel) {
    return Array.from(panel.querySelectorAll('#jobHelperMechanics .helper-chip.active'))
        .map(chip => chip.dataset.id)
}

// ── Helper: set helper chips active state (used by editJob) ──────────────
export function setHelperChipState(panel, helperIdsCsv, mechanics, leadId) {
    renderHelperChips(panel, mechanics, leadId)
    if (!helperIdsCsv) return
    const ids = helperIdsCsv.split(',').map(s => s.trim()).filter(Boolean)
    panel.querySelectorAll('#jobHelperMechanics .helper-chip').forEach(chip => {
        if (ids.includes(chip.dataset.id)) chip.click()
    })
}
