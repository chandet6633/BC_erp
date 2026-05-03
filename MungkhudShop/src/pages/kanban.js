/**
 * Kanban Board — Drag-and-drop job status management.
 * Columns: รับงาน (open) → กำลังทำ (in_progress) → รอตรวจ (pending_review) → เสร็จ (closed)
 */
import { fetchFullList, updateRecord } from '../services/pb.js'
import { postToStockLedger } from '../services/inventory.js'
import { notifyJobCompleted } from '../services/telegram.js'
import { getBranchFilter, getBranch, getCurrentUser } from '../services/auth.js'
import { formatCurrency, showToast } from '../components/ui.js'
import { sanitizeFilter, escapeHtml } from '../utils/sanitize.js'
import '../assets/css/kanban.css'

const COLUMNS = [
    { id: 'open', label: 'รับงาน', color: '#3b82f6', icon: 'inbox' },
    { id: 'in_progress', label: 'กำลังทำ', color: '#f59e0b', icon: 'build' },
    { id: 'pending_review', label: 'รอตรวจ', color: '#8b5cf6', icon: 'fact_check' },
    { id: 'closed', label: 'เสร็จ', color: '#22c55e', icon: 'check_circle' },
]

let draggedCard = null

export function initKanbanPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">view_kanban</span>
                <h1>Kanban Board</h1>
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
    `

    // Init drag listeners on columns
    COLUMNS.forEach(col => {
        const body = container.querySelector(`#col-${col.id}`)
        body.addEventListener('dragover', handleDragOver)
        body.addEventListener('dragenter', handleDragEnter)
        body.addEventListener('dragleave', handleDragLeave)
        body.addEventListener('drop', handleDrop)
    })

    container.querySelector('#btnRefreshKanban').addEventListener('click', () => loadKanbanData(container))
    loadKanbanData(container)
}

function createJobCard(job) {
    const card = document.createElement('div')
    card.className = 'kanban-card'
    card.draggable = true
    card.dataset.jobId = job.id
    card.dataset.status = job.status

    // Time elapsed since start_date
    const startDate = new Date(job.start_date || job.updated || Date.now())
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
                ${escapeHtml(job.customer_name) || 'ลูกค้าทั่วไป'}
            </div>
            <div class="kanban-plate">
                <span class="material-icons-outlined" style="font-size:14px;">directions_car</span>
                ${escapeHtml(job.plate) || '-'}
            </div>
            ${job.grand_total ? `<div class="kanban-amount">${formatCurrency(job.grand_total)}</div>` : ''}
        </div>
        ${showBranch ? `
        <div class="kanban-branch-badge">
            <span class="material-icons-outlined" style="font-size:12px;">store</span>
            ${job.branch_id}
        </div>` : ''}
        <div class="kanban-card-footer">
            <span class="kanban-elapsed">${elapsed}</span>
            <a href="#/job?id=${job.id}" class="kanban-detail-link" title="ดูรายละเอียด">
                <span class="material-icons-outlined" style="font-size:14px;">open_in_new</span>
            </a>
        </div>
    `

    // Drag events (desktop)
    card.addEventListener('dragstart', (e) => {
        draggedCard = card
        card.classList.add('dragging')
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', job.id)
    })

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging')
        draggedCard = null
        document.querySelectorAll('.kanban-column-body').forEach(el => el.classList.remove('drag-over'))
    })

    // Touch drag-and-drop (mobile)
    let touchTimer = null
    let touchDragging = false
    let touchClone = null
    let startX = 0, startY = 0

    card.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX
        startY = e.touches[0].clientY
        touchTimer = setTimeout(() => {
            touchDragging = true
            draggedCard = card
            card.classList.add('dragging')

            // Create floating clone
            touchClone = card.cloneNode(true)
            touchClone.style.cssText = `position:fixed;z-index:999;width:${card.offsetWidth}px;pointer-events:none;opacity:0.85;transform:rotate(2deg);box-shadow:0 8px 24px rgba(0,0,0,0.2);`
            document.body.appendChild(touchClone)

            // Vibrate feedback
            if (navigator.vibrate) navigator.vibrate(30)
        }, 300)
    }, { passive: true })

    card.addEventListener('touchmove', (e) => {
        // Cancel long-press if finger moves too much before drag starts
        if (!touchDragging && touchTimer) {
            const dx = Math.abs(e.touches[0].clientX - startX)
            const dy = Math.abs(e.touches[0].clientY - startY)
            if (dx > 10 || dy > 10) {
                clearTimeout(touchTimer)
                touchTimer = null
            }
            return
        }

        if (!touchDragging) return
        e.preventDefault()

        const touch = e.touches[0]
        if (touchClone) {
            touchClone.style.left = (touch.clientX - 60) + 'px'
            touchClone.style.top = (touch.clientY - 30) + 'px'
        }

        // Highlight drop target
        document.querySelectorAll('.kanban-column-body').forEach(col => {
            const rect = col.getBoundingClientRect()
            if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
                touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                col.classList.add('drag-over')
            } else {
                col.classList.remove('drag-over')
            }
        })
    }, { passive: false })

    card.addEventListener('touchend', (e) => {
        clearTimeout(touchTimer)
        touchTimer = null

        if (touchClone) {
            touchClone.remove()
            touchClone = null
        }

        if (!touchDragging) return
        touchDragging = false
        card.classList.remove('dragging')

        // Find drop target
        const touch = e.changedTouches[0]
        const dropTarget = document.querySelectorAll('.kanban-column-body')
        let targetCol = null

        dropTarget.forEach(col => {
            col.classList.remove('drag-over')
            const rect = col.getBoundingClientRect()
            if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
                touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                targetCol = col
            }
        })

        if (targetCol && draggedCard) {
            // Simulate drop
            const fakeEvent = { preventDefault: () => {}, currentTarget: targetCol }
            handleDrop(fakeEvent)
        }
        draggedCard = null
    })

    return card
}

function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
}

function handleDragEnter(e) {
    e.preventDefault()
    e.currentTarget.classList.add('drag-over')
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over')
}

async function handleDrop(e) {
    e.preventDefault()
    const column = e.currentTarget
    column.classList.remove('drag-over')

    if (!draggedCard) return

    const jobId = draggedCard.dataset.jobId
    const newStatus = column.dataset.status
    const oldStatus = draggedCard.dataset.status

    if (newStatus === oldStatus) return

    // Optimistic: move card visually first
    column.appendChild(draggedCard)
    draggedCard.dataset.status = newStatus

    // Update counts
    updateColumnCounts()

    // Persist to PocketBase
    try {
        const updateData = { status: newStatus }
        if (newStatus === 'closed') {
            updateData.end_date = new Date().toISOString()

            // FIX #3 + #8: Calculate COGS, profit, and deduct stock on close
            try {
                const jItems = await fetchFullList('job_items', { filter: `job_id='${sanitizeFilter(jobId)}'` })
                const products = await fetchFullList('products', { requestKey: null })
                const pMap = {}
                products.forEach(p => { pMap[p.id] = p })

                let totalCost = 0
                const itemsForLedger = []
                for (const ji of jItems) {
                    const prod = pMap[ji.product_id]
                    const cost = prod ? (prod.cost || 0) : 0
                    totalCost += cost * (ji.qty || 0)
                    if (ji.product_id && ji.qty) {
                        itemsForLedger.push({ product_id: ji.product_id, qty: ji.qty, unit_price: ji.unit_price || 0 })
                    }
                }

                // Get job grand_total for profit calc
                const jobData = await fetchFullList('jobs', { filter: `id='${sanitizeFilter(jobId)}'`, requestKey: null })
                const grandTotal = jobData.length > 0 ? (jobData[0].grand_total || 0) : 0
                const profit = grandTotal - totalCost

                updateData.total_cost = Math.round(totalCost * 100) / 100
                updateData.profit = Math.round(profit * 100) / 100

                // Post to stock ledger (deduct items)
                const jobNo = jobData.length > 0 ? jobData[0].job_no : jobId
                await postToStockLedger('JOB', jobNo, itemsForLedger)

                // A2: Telegram notification (fire-and-forget)
                notifyJobCompleted({
                    job_no: jobNo,
                    plate: jobData[0]?.plate || '',
                    customer_name: jobData[0]?.customer_name || '',
                    grand_total: grandTotal
                }).catch(() => {})
            } catch (costErr) {
                console.warn('[Kanban] Could not calculate cost/stock:', costErr.message)
            }
        }
        await updateRecord('jobs', jobId, updateData)
        showToast(`\u0e2d\u0e31\u0e1e\u0e40\u0e14\u0e17\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e43\u0e1a\u0e07\u0e32\u0e19\u0e40\u0e1b\u0e47\u0e19 "${getStatusLabel(newStatus)}" \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08`, 'success')
    } catch (err) {
        console.error('Failed to update job status:', err)
        showToast('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e2d\u0e31\u0e1e\u0e40\u0e14\u0e17\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e44\u0e14\u0e49', 'error')
        // Rollback: move card back
        const oldCol = document.querySelector(`#col-${oldStatus}`)
        if (oldCol) {
            oldCol.appendChild(draggedCard)
            draggedCard.dataset.status = oldStatus
            updateColumnCounts()
        }
    }
}

function getStatusLabel(status) {
    const labels = { open: 'รับงาน', in_progress: 'กำลังทำ', pending_review: 'รอตรวจ', closed: 'เสร็จ' }
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
        const branchFilter = getBranchFilter()
        // Don't load cancelled jobs
        let filter = `status!='cancelled'`
        if (branchFilter) filter += ` && ${branchFilter}`

        const jobs = await fetchFullList('jobs', { 
            filter,
            sort: '-start_date'
        })

        // Clear columns
        COLUMNS.forEach(col => {
            const body = container.querySelector(`#col-${col.id}`)
            if (body) body.innerHTML = ''
        })

        // Place jobs in columns
        jobs.forEach(job => {
            // Map existing statuses to kanban columns
            let status = job.status || 'open'
            if (!COLUMNS.find(c => c.id === status)) status = 'open'

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
        showToast('ไม่สามารถโหลดข้อมูล Kanban ได้', 'error')
    }
}
