/**
 * Kanban Board — Locked job status management.
 * Columns: รับรถ/รอจัดช่าง (pending) → กำลังซ่อม (in_progress) → รอเก็บเงิน (qc_done) → เสร็จสิ้น (completed)
 * Workflow is now strictly role-gated. Drag-and-drop is disabled.
 */
import { fetchFullList, createRecord, updateRecord, deleteRecord, uploadAttachment } from '../services/pb.js'
import { postToStockLedger } from '../services/inventory.js'
import { notifyJobCompleted, notifyPaymentCollected } from '../services/telegram.js'
import { getBranchFilter, getBranch, getCurrentUser } from '../services/auth.js'
import { formatCurrency, showToast } from '../components/ui.js'
import { sanitizeFilter, escapeHtml } from '../utils/sanitize.js'
import { isStockTrackedProduct } from '../utils/stock-rules.js'
import { getMechanics } from './job-state.js'
import '../assets/css/kanban.css'

const COLUMNS = [
    { id: 'pending', label: 'รับรถ/รอจัดช่าง', color: '#3b82f6', icon: 'inbox' },
    { id: 'in_progress', label: 'กำลังซ่อม', color: '#f59e0b', icon: 'build' },
    { id: 'qc_done', label: 'รอเก็บเงิน', color: '#8b5cf6', icon: 'fact_check' },
    { id: 'completed', label: 'เสร็จสิ้น', color: '#22c55e', icon: 'check_circle' },
]

export function initKanbanPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">view_kanban</span>
                <h1>สถานะงาน (Kanban Board)</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-sm btn-outline" id="btnRefreshKanban">
                    <span class="material-icons-outlined" style="font-size:16px;">refresh</span> โหลดใหม่
                </button>
                <a href="#/job" class="btn btn-sm btn-primary">
                    <span class="material-icons-outlined" style="font-size:16px;">add</span> สร้างใบงานใหม่
                </a>
            </div>
        </div>

        <div class="kanban-board" id="kanbanBoard">
            ${COLUMNS.map(col => `
                <div class="kanban-column" data-status="${col.id}">
                    <div class="kanban-column-header" style="border-top:3px solid ${col.color};">
                        <span class="material-icons-outlined" style="color:${col.color};font-size:18px;">${col.icon}</span>
                        <span class="kanban-column-title">${col.label}</span>
                        <span class="kanban-column-count" id="count-${col.id}">0</span>
                    </div>
                    <div class="kanban-column-body" id="col-${col.id}" 
                         data-status="${col.id}"></div>
                </div>
            `).join('')}
        </div>

        <!-- Payment Modal -->
        <div id="paymentModalOverlay" class="modal-overlay">
            <div id="paymentModal" class="modal" style="width: 100%; max-width: 450px;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><span class="material-icons-outlined">payments</span> รับชำระเงินและปิดงาน</h2>
                        <button class="btn-close" id="btnPaymentClose" style="background:none;border:none;cursor:pointer;"><span class="material-icons-outlined">close</span></button>
                    </div>
                    <div class="modal-body">
                        <div style="background: var(--color-surface); padding: var(--sp-3); border-radius: var(--radius-sm); margin-bottom: var(--sp-4); border: 1px solid var(--color-border);">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                                <span class="text-muted">เลขใบงาน:</span>
                                <strong id="payJobNo">-</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                                <span class="text-muted">ลูกค้า:</span>
                                <strong id="payCustomer">-</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size: 1.1rem;">
                                <span>ยอดต้องชำระ:</span>
                                <strong class="text-primary" id="payAmount">฿0.00</strong>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">ช่องทางรับชำระ <span class="text-danger">*</span></label>
                            <div id="payMethodsContainer">
                                <div class="pay-row" style="display:flex; gap:8px; margin-bottom:8px;">
                                    <select class="form-control pay-method-sel" style="flex:1;">
                                        <option value="cash">เงินสด</option>
                                        <option value="transfer">โอนเงิน / QR</option>
                                        <option value="card">บัตรเครดิต</option>
                                    </select>
                                    <input type="number" class="form-control pay-amount-inp" placeholder="จำนวนเงิน" style="flex:1;" min="0">
                                </div>
                            </div>
                            <button class="btn btn-sm btn-outline" id="btnAddPayRow" style="margin-top:4px;">
                                <span class="material-icons-outlined" style="font-size:16px;">add</span> เพิ่มช่องทางชำระ
                            </button>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">หลักฐานการชำระเงิน (สลิป)</label>
                            <input type="file" id="paySlipInput" accept="image/*" class="form-control">
                            <div id="payUploading" style="display:none; color:var(--color-primary); font-size:0.8rem; margin-top:4px;">กำลังอัพโหลด...</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" id="btnPaymentCancel">ยกเลิก</button>
                        <button class="btn btn-primary" id="btnPaymentSubmit">ยืนยันรับเงินและปิดงาน</button>
                    </div>
                </div>
            </div>
        </div>
    `

    container.querySelector('#btnRefreshKanban').addEventListener('click', () => loadKanbanData(container))
    
    // Payment Modal Setup
    const paymentModalOverlay = container.querySelector('#paymentModalOverlay')
    const closePayment = () => { 
        paymentModalOverlay.classList.remove('show');
        currentPayJob = null;
        container.querySelector('#paySlipInput').value = '';
    }
    container.querySelector('#btnPaymentClose').addEventListener('click', closePayment)
    container.querySelector('#btnPaymentCancel').addEventListener('click', closePayment)
    container.querySelector('#btnPaymentSubmit').addEventListener('click', () => handlePaymentSubmit(container))
    
    container.querySelector('#btnAddPayRow')?.addEventListener('click', () => {
        const c = container.querySelector('#payMethodsContainer')
        const row = document.createElement('div')
        row.className = 'pay-row'
        row.style.cssText = 'display:flex; gap:8px; margin-bottom:8px;'
        row.innerHTML = `
            <select class="form-control pay-method-sel" style="flex:1;">
                <option value="cash">เงินสด</option>
                <option value="transfer">โอนเงิน / QR</option>
                <option value="card">บัตรเครดิต</option>
            </select>
            <input type="number" class="form-control pay-amount-inp" placeholder="จำนวนเงิน" style="flex:1;" min="0">
            <button class="btn btn-sm btn-danger btn-rm-pay"><span class="material-icons-outlined" style="font-size:16px;">close</span></button>
        `
        c.appendChild(row)
        row.querySelector('.btn-rm-pay').addEventListener('click', () => row.remove())
    })

    // Listen for custom event
    document.addEventListener('open-payment-modal', (e) => {
        currentPayJob = e.detail.job
        container.querySelector('#payJobNo').textContent = currentPayJob.job_no || '-'
        container.querySelector('#payCustomer').textContent = currentPayJob.customer_name || '-'
        container.querySelector('#payAmount').textContent = formatCurrency(currentPayJob.grand_total || 0)
        
        // Reset inputs
        const pCont = container.querySelector('#payMethodsContainer')
        if (pCont) {
            pCont.innerHTML = `
                <div class="pay-row" style="display:flex; gap:8px; margin-bottom:8px;">
                    <select class="form-control pay-method-sel" style="flex:1;">
                        <option value="cash">เงินสด</option>
                        <option value="transfer">โอนเงิน / QR</option>
                        <option value="card">บัตรเครดิต</option>
                    </select>
                    <input type="number" class="form-control pay-amount-inp" placeholder="จำนวนเงิน" style="flex:1;" min="0" value="${currentPayJob.grand_total || 0}">
                </div>
            `
        }
        
        container.querySelector('#paySlipInput').value = ''
        container.querySelector('#payUploading').style.display = 'none'
        
        paymentModalOverlay.classList.add('show')
    })

    loadKanbanData(container)
}

let currentPayJob = null;
let isProcessingPayment = false;

async function handlePaymentSubmit(container) {
    if (!currentPayJob) return
    if (currentPayJob.status === 'completed' || currentPayJob.payment_status === 'paid') {
        showToast('ใบงานนี้ถูกชำระเงินและปิดไปแล้ว', 'warning')
        return
    }
    if (isProcessingPayment) return
    isProcessingPayment = true

    const fileInput = container.querySelector('#paySlipInput')
    const submitBtn = container.querySelector('#btnPaymentSubmit')
    const uploadLbl = container.querySelector('#payUploading')

    submitBtn.disabled = true
    if (fileInput.files.length > 0) uploadLbl.style.display = 'block'

    try {
        let slipUrl = null
        if (fileInput.files.length > 0) {
            slipUrl = await uploadAttachment(fileInput.files[0])
        }

        // BUG 6 FIX: Serialize Split Payments
        const payRows = container.querySelectorAll('.pay-row')
        const splits = []
        let paySum = 0
        payRows.forEach(row => {
            const m = row.querySelector('.pay-method-sel').value
            const a = parseFloat(row.querySelector('.pay-amount-inp').value) || 0
            if (a > 0) {
                splits.push({ method: m, amount: a })
                paySum += a
            }
        })
        
        // If no split provided, default to the first method with full grand_total
        if (splits.length === 0) {
            // BUG 83 FIX: Validate that at least one payment row has a positive amount
            const grandTotal = currentPayJob.grand_total || 0
            if (grandTotal <= 0) {
                showToast('ยอดชำระต้องมากกว่า 0', 'error')
                submitBtn.disabled = false
                isProcessingPayment = false
                return
            }
            const fallbackMethod = container.querySelector('.pay-method-sel').value
            splits.push({ method: fallbackMethod, amount: grandTotal })
            paySum = grandTotal
        }

        const requiredTotal = Number(currentPayJob.grand_total || 0)
        const paymentDiff = Math.round((paySum - requiredTotal) * 100) / 100
        if (requiredTotal <= 0) {
            showToast('ยอดชำระต้องมากกว่า 0', 'error')
            return
        }
        if (paymentDiff < 0) {
            showToast(`ยอดรับชำระยังขาด ${formatCurrency(Math.abs(paymentDiff))}`, 'error')
            return
        }
        if (paymentDiff > 0) {
            showToast(`ยอดรับชำระเกิน ${formatCurrency(paymentDiff)} กรุณาตรวจสอบ`, 'error')
            return
        }

        const now = new Date()
        const jobId = currentPayJob.id
        const updateData = {
            status: 'completed',
            payment_status: 'paid',
            payment_type: JSON.stringify(splits), // Store as JSON array
            end_date: now.toISOString(),
            work_ended_at: now.toISOString()
        }
        if (slipUrl) updateData.payment_slip = slipUrl

        const jItems = await fetchFullList('job_items', { filter: `job_id='${sanitizeFilter(jobId)}'` })

        // BUG 47 FIX: Only fetch needed products to prevent Frontend OOM on massive catalogs
        const pIds = [...new Set(jItems.filter(ji => ji.type !== 'adhoc' && ji.product_id).map(ji => ji.product_id))]
        let products = []
        if (pIds.length > 0) {
            // If more than 50 products, we should chunk, but a single job rarely has >50 items
            const idFilter = pIds.map(id => `id='${sanitizeFilter(id)}'`).join('||')
            products = await fetchFullList('products', { filter: `(${idFilter})`, requestKey: null })
        }

        const pMap = {}
        products.forEach(p => { pMap[p.id] = p })

        let totalCost = 0
        const itemsForLedger = []
        for (const ji of jItems) {
            // BUG 2 FIX: Calculate ad-hoc item costs properly instead of defaulting to 0
            let cost = 0
            if (ji.type === 'adhoc') {
                // BUG 44 FIX: Prevent malicious ad-hoc cost inflation
                cost = parseFloat(ji.cost) || 0
                if (cost < 0) cost = 0
                const itemPrice = parseFloat(ji.unit_price || ji.price || 0)
                if (cost > itemPrice) cost = itemPrice // Cost cannot exceed selling price for ad-hoc to prevent negative profit fraud
            } else {
                const prod = pMap[ji.product_id]
                cost = parseFloat(ji.cost) || (prod ? (parseFloat(prod.cost) || 0) : 0)
            }

            totalCost += cost * (ji.qty || 0)

            // Only post non-adhoc items to stock ledger
            const trackStock = ji.type !== 'adhoc' && ji.product_id && (!pMap[ji.product_id] || isStockTrackedProduct(pMap[ji.product_id]))
            if (trackStock && ji.qty) {
                itemsForLedger.push({ product_id: ji.product_id, qty: ji.qty, unit_price: ji.unit_price || 0 })
            }
        }

        const grandTotal = currentPayJob.grand_total || 0
        const profit = grandTotal - totalCost
        const jobNo = currentPayJob.job_no || jobId

        updateData.total_cost = Math.round(totalCost * 100) / 100
        updateData.profit = Math.round(profit * 100) / 100

        // BUG 7 & 8 FIX: Atomic Try-Catch for Job, Financial Ledger, and Stock Ledger
        let createdLedgers = []
        try {
            // First update job
            await updateRecord('jobs', jobId, updateData)

            const grandTotal = currentPayJob.grand_total || 0
            if (grandTotal > 0 && splits.length > 0) {
                const nowStr = new Date().toISOString()
                
                // Create multiple ledgers for split payments
                for (const split of splits) {
                    const ledgerRecord = await createRecord('financial_ledger', {
                        date: nowStr.slice(0, 10),
                        amount: split.amount,
                        category: 'รายรับจากใบงาน',
                        notes: `ชำระเงินใบงาน ${currentPayJob.job_no || jobId} (${split.method})`,
                        receipt_url: slipUrl || '',
                        branch_id: currentPayJob.branch_id || '',
                        payment_type: split.method, // Resolved Bug 8: Using split.method directly
                        excluded: false,
                        verified: false,
                        entry_type: 'revenue',
                        is_confidential: false,
                        reference_doc: currentPayJob.job_no || jobId
                    })
                    createdLedgers.push(ledgerRecord)
                }
            }

            await postToStockLedger('JOB', jobNo, itemsForLedger, currentPayJob.branch_id || getBranch() || null)
        } catch (dbErr) {
            console.error('[Kanban] Payment transaction failed:', dbErr.message)
            // Rollback ledgers if job update succeeded but ledgers failed, or vice versa (best effort)
            for (const l of createdLedgers) {
                await deleteRecord('financial_ledger', l.id).catch(() => {})
            }
            // Try to revert job status if it was updated
            await updateRecord('jobs', jobId, { status: currentPayJob.status, payment_status: currentPayJob.payment_status }).catch(() => {})
            
            showToast('เกิดข้อผิดพลาดในการบันทึกบัญชี: ' + dbErr.message, 'error')
            submitBtn.innerHTML = 'ยืนยันรับเงินและปิดงาน'
            submitBtn.disabled = false
            return
        }
        
        showToast('รับชำระเงินและปิดงานเรียบร้อย', 'success')
        container.querySelector('#paymentModalOverlay').classList.remove('show')
        fileInput.value = ''
        
        // Notify — capture job data BEFORE clearing currentPayJob
        const updatedJob = { ...currentPayJob, ...updateData }
        notifyPaymentCollected(updatedJob, updatedJob.branch_id).catch(() => {})
        notifyJobCompleted(updatedJob, updatedJob.branch_id).catch(() => {})
        currentPayJob = null

        loadKanbanData(container)
    } catch (e) {
        console.error('Payment submit failed:', e)
        showToast('เกิดข้อผิดพลาดในการบันทึก', 'error')
    } finally {
        isProcessingPayment = false
        submitBtn.disabled = false
        uploadLbl.style.display = 'none'
    }
}

// Map mechanic ID to name
let mechanicCache = {}

function createJobCard(job) {
    const card = document.createElement('div')
    card.className = 'kanban-card'
    card.dataset.jobId = job.id
    card.dataset.status = job.status

    // Time elapsed since start_date
    const startDate = new Date(job.start_date || job.UpdatedAt || Date.now())
    const elapsed = getElapsedLabel(startDate)

    // Priority badge
    const priority = job.priority || 'normal'
    const priorityColors = { urgent: '#ef4444', high: '#f59e0b', normal: '#3b82f6', low: '#94a3b8' }
    const priorityLabels = { urgent: 'ด่วนมาก', high: 'ด่วน', normal: 'ปกติ', low: 'ต่ำ' }

    // Show branch badge when admin views all branches
    const showBranch = !getBranch() && job.branch_id

    card.innerHTML = `
        <div class="kanban-card-header">
            <span class="kanban-job-no">${job.job_no || 'ไม่มีเลข'}</span>
            <span class="kanban-priority" style="background:${priorityColors[priority]}15;color:${priorityColors[priority]};">
                ${priorityLabels[priority] || 'ปกติ'}
            </span>
        </div>
        <div class="kanban-card-body">
            <div class="kanban-customer">
                <span class="material-icons-outlined" style="font-size:14px;">person</span>
                ${job.cust_code ? `<span style="font-family:monospace;font-size:0.85rem;font-weight:600;">[${escapeHtml(job.cust_code)}]</span>` : (escapeHtml(job.customer_name) ? `<span style="font-size:0.8rem;">${escapeHtml(job.customer_name).slice(0,12)}…</span>` : 'ลูกค้าทั่วไป')}
            </div>
            <div class="kanban-plate">
                <span class="material-icons-outlined" style="font-size:14px;">directions_car</span>
                ${escapeHtml(job.plate) || '-'}
            </div>
            ${job.grand_total ? `<div class="kanban-amount">${formatCurrency(job.grand_total)}</div>` : ''}
            
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:6px;">
                ${job.payment_status ? `<span class="kanban-payment-badge ${job.payment_status}">${job.payment_status === 'paid' ? 'จ่ายแล้ว' : (job.payment_status === 'partial' ? 'มัดจำ' : 'ค้างชำระ')}</span>` : ''}
                ${job.lead_mechanic_id ? `<span class="kanban-mechanic-badge"><span class="material-icons-outlined" style="font-size:12px;">engineering</span> ${escapeHtml(mechanicCache[job.lead_mechanic_id] || job.lead_mechanic_id)}</span>` : ''}
                ${job.status === 'in_progress' ? `<span class="kanban-timer-badge"><span class="material-icons-outlined" style="font-size:12px;">timer</span> กำลังทำ</span>` : ''}
                ${job.work_duration_minutes ? `<span class="kanban-timer-badge" style="background:#e0f2fe;color:#0284c7;"><span class="material-icons-outlined" style="font-size:12px;">schedule</span> ${job.work_duration_minutes} นาที</span>` : ''}
            </div>
        </div>
        ${showBranch ? `
        <div class="kanban-branch-badge">
            <span class="material-icons-outlined" style="font-size:12px;">store</span>
            ${job.branch_id}
        </div>` : ''}
        <div class="kanban-card-footer">
            <span class="kanban-elapsed">${elapsed}</span>
            <div class="kanban-actions">
                ${renderActionButtons(job)}
            </div>
        </div>
    `

    // Action button listeners
    const payBtn = card.querySelector('.btn-kanban-action.pay')
    if (payBtn) {
        payBtn.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            // Dispatch event to open payment modal (Phase 2)
            document.dispatchEvent(new CustomEvent('open-payment-modal', { detail: { job } }))
        })
    }

    const editBtn = card.querySelector('.kanban-detail-link')
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            // Handled by generic href="#/job?id=..."
        })
    }

    return card
}

function renderActionButtons(job) {
    let buttons = ''
    
    // SA Payment Button
    if (job.status === 'qc_done') {
        buttons += `
            <button class="btn-kanban-action pay">
                <span class="material-icons-outlined" style="font-size:14px;">payments</span> เก็บเงิน
            </button>
        `
    }
    
    // Edit/View Button
    buttons += `
        <a href="#/job?id=${job.id}" class="kanban-detail-link" title="ดูรายละเอียด">
            <span class="material-icons-outlined" style="font-size:18px;">open_in_new</span>
        </a>
    `
    return buttons
}

function getStatusLabel(status) {
    const labels = { pending: 'รับรถ', in_progress: 'กำลังซ่อม', qc_done: 'รอเก็บเงิน', completed: 'เสร็จสิ้น' }
    return labels[status] || status
}

function getElapsedLabel(date) {
    const now = new Date()
    const diff = now - date
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'เมื่อสักครู่'
    if (hours < 24) return `${hours} ชม. ที่แล้ว`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} วันที่แล้ว`
    return `${Math.floor(days / 7)} สัปดาห์`
}

function updateColumnCounts() {
    COLUMNS.forEach(col => {
        const body = document.querySelector(`#col-${col.id}`)
        const count = document.querySelector(`#count-${col.id}`)
        if (body && count) {
            count.textContent = body.querySelectorAll('.kanban-card').length
        }
    })
}

async function loadKanbanData(container) {
    try {
        // Prepare mechanics cache
        const mechs = await getMechanics()
        mechs.forEach(m => { mechanicCache[m.id] = m.name || m.email })

        const branchFilter = getBranchFilter()
        // We do client-side filtering for auto-archive to avoid NocoDB DateTime like (~) operator errors
        let filter = `(status!='cancelled')`
        if (branchFilter) filter += ` && ${branchFilter}`

        const allJobs = await fetchFullList('jobs', { 
            filter,
            sort: '-start_date'
        })

        // Auto-archive: hide closed jobs older than today
        const todayStr = new Date().toISOString().split('T')[0]
        const jobs = allJobs.filter(j => {
            // Map legacy statuses
            let s = j.status
            if (s === 'open') s = 'pending'
            if (s === 'pending_review') s = 'qc_done'
            if (s === 'closed') s = 'completed'
            j.status = s

            if (j.status !== 'completed') return true
            if (!j.end_date) return false
            return j.end_date.startsWith(todayStr)
        })

        // Clear columns
        COLUMNS.forEach(col => {
            const body = container.querySelector(`#col-${col.id}`)
            if (body) body.innerHTML = ''
        })

        // Place jobs in columns
        jobs.forEach(job => {
            let status = job.status || 'pending'
            if (!COLUMNS.find(c => c.id === status)) status = 'pending'

            const colBody = container.querySelector(`#col-${status}`)
            if (colBody) {
                colBody.appendChild(createJobCard({ ...job, status }))
            }
        })

        updateColumnCounts()

        // Show empty states
        COLUMNS.forEach(col => {
            const body = container.querySelector(`#col-${col.id}`)
            if (body && body.children.length === 0) {
                body.innerHTML = '<div class="kanban-empty">ไม่มีใบงาน</div>'
            }
        })

    } catch (e) {
        console.error('Kanban load error:', e)
        const errMsg = e?.message?.includes('403') 
            ? 'ไม่มีสิทธิ์เข้าถึงข้อมูล (403 Forbidden)'
            : 'ไม่สามารถโหลดข้อมูล Kanban ได้: ' + (e?.message || 'ไม่ทราบสาเหตุ')
        showToast(errMsg, 'error')
        
        // Show error state in all columns
        COLUMNS.forEach(col => {
            const body = container.querySelector(`#col-${col.id}`)
            if (body && body.children.length === 0) {
                body.innerHTML = '<div class="kanban-empty" style="color:var(--color-danger);"><span class="material-icons-outlined" style="font-size:24px;display:block;margin-bottom:4px;">error_outline</span>โหลดไม่สำเร็จ</div>'
            }
        })
    }
}
