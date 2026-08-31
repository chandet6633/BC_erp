/**
 * Kanban Board — Locked job status portal.
 * Columns: รับรถ/รอจัดช่าง (pending) → กำลังซ่อม (in_progress) → รอเก็บเงิน (qc_done) → เสร็จสิ้น (completed)
 * Workflow is now strictly role-gated. Drag-and-drop is disabled.
 */
import { fetchFullList, uploadAttachment } from '../services/pb.js'
import { notifyJobCompleted, notifyPaymentCollected } from '../services/telegram.js'
import { getApiAuthHeaders, getBranchFilter, getBranch, getCurrentUser } from '../services/auth.js'
import { formatCurrency, showToast } from '../components/ui.js'
import { escapeHtml } from '../utils/sanitize.js'
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
        showToast('This job is already paid and closed.', 'warning')
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
        let slipUrl = ''
        if (fileInput.files.length > 0) {
            slipUrl = await uploadAttachment(fileInput.files[0], 'payment_slips')
        }

        const splits = []
        let paySum = 0
        container.querySelectorAll('.pay-row').forEach(row => {
            const method = row.querySelector('.pay-method-sel').value
            const amount = parseFloat(row.querySelector('.pay-amount-inp').value) || 0
            if (amount > 0) {
                splits.push({ method, amount })
                paySum += amount
            }
        })

        const requiredTotal = Number(currentPayJob.grand_total || 0)
        if (splits.length === 0 && requiredTotal > 0) {
            const fallbackMethod = container.querySelector('.pay-method-sel').value
            splits.push({ method: fallbackMethod, amount: requiredTotal })
            paySum = requiredTotal
        }

        const paymentDiff = Math.round((paySum - requiredTotal) * 100) / 100
        if (requiredTotal <= 0) {
            showToast('Payment total must be greater than 0.', 'error')
            return
        }
        if (paymentDiff < 0) {
            showToast(`Payment is short by ${formatCurrency(Math.abs(paymentDiff))}`, 'error')
            return
        }
        if (paymentDiff > 0) {
            showToast(`Payment exceeds total by ${formatCurrency(paymentDiff)}. Please verify.`, 'error')
            return
        }

        const closeRes = await fetch(`/api/data/custom/close-job-payment/${encodeURIComponent(currentPayJob.id)}`, {
            method: 'POST',
            headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ splits, slip_url: slipUrl || '' })
        })
        const closePayload = await closeRes.json().catch(() => ({}))
        if (!closeRes.ok) {
            throw new Error(closePayload.error || `Close job payment failed (${closeRes.status})`)
        }

        showToast('Payment received. IV/RC created and job closed.', 'success')
        container.querySelector('#paymentModalOverlay').classList.remove('show')
        fileInput.value = ''

        const closeUpdatedJob = { ...currentPayJob, ...(closePayload.job || {}) }
        notifyPaymentCollected(closeUpdatedJob, closeUpdatedJob.branch_id).catch(() => {})
        notifyJobCompleted(closeUpdatedJob, closeUpdatedJob.branch_id).catch(() => {})
        currentPayJob = null
        loadKanbanData(container)
    } catch (e) {
        console.error('Payment submit failed:', e)
        showToast(e.message || 'Failed to record payment.', 'error')
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
