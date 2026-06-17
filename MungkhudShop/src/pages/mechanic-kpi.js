import { fetchFullList, updateRecord, uploadAttachment } from '../services/pb.js'
import { showToast } from '../components/ui.js'
import { escapeHtml } from '../utils/sanitize.js'
import { getBranch, getCurrentUser } from '../services/auth.js'

const ACTIVE_STATUSES = new Set(['pending', 'in_progress', 'qc_done'])
const TECH_ROLES = new Set(['mechanic', 'technician', 'employee'])
const META_RE = /\n*\[MECHANIC_WORKFLOW_JSON\]([\s\S]*?)\[\/MECHANIC_WORKFLOW_JSON\]\s*$/

const STATUS_META = {
    pending: { label: 'รอรับงาน', className: 'pending' },
    accepted: { label: 'ตรวจสภาพรถก่อนเริ่มงาน', className: 'pending' },
    in_progress: { label: 'กำลังซ่อม', className: 'pending' },
    qc_done: { label: 'ส่ง QC แล้ว', className: 'closed' },
    completed: { label: 'เสร็จสิ้น', className: 'closed' },
    cancelled: { label: 'ยกเลิก', className: 'cancelled' }
}

function recordId(record) { return record?.id ?? record?.Id ?? record?.ID ?? '' }
function asId(value) { return String(value ?? '').trim() }
function splitIds(value) {
    if (Array.isArray(value)) return value.map(asId).filter(Boolean)
    return String(value || '').split(',').map(s => s.trim()).filter(Boolean)
}
function truthyActive(value) {
    if (value === undefined || value === null || value === '') return null
    return !(value === false || value === 'false' || value === 0 || value === '0')
}
function isActiveUser(user) {
    if (!user) return false
    const active = truthyActive(user.active)
    const isActive = truthyActive(user.is_active)
    if (active !== null) return active
    if (isActive !== null) return isActive
    return true
}
function normalizeBranch(value) { return String(value || '').trim().toLowerCase() }
function branchValues(record) {
    return [record?.branch_id, record?.branch, record?.code, record?.name, record?.display_name, record?.thai_name].map(normalizeBranch).filter(Boolean)
}
function buildBranchAliases(branches) {
    const aliases = new Map()
    branches.forEach(branch => {
        const values = branchValues(branch)
        values.forEach(value => {
            if (!aliases.has(value)) aliases.set(value, new Set())
            values.forEach(v => aliases.get(value).add(v))
        })
    })
    return aliases
}
function sameBranch(left, right, aliases) {
    const l = normalizeBranch(left)
    const r = normalizeBranch(right)
    if (!l || !r) return !l || !r
    if (l === r) return true
    return aliases.get(l)?.has(r) || aliases.get(r)?.has(l) || false
}
function jobBranch(job) { return job.branch_id || job.branch || '' }
function userBranch(user) { return user?.branch_id || user?.branch || getBranch() || '' }
function isAssignedTo(job, userId) {
    const target = asId(userId)
    return asId(job.lead_mechanic_id) === target || splitIds(job.helper_mechanic_ids).includes(target)
}
function hasAssignment(job) { return !!asId(job.lead_mechanic_id) || splitIds(job.helper_mechanic_ids).length > 0 }
function parseWorkflow(notes) {
    const match = String(notes || '').match(META_RE)
    if (!match) return {}
    try { return JSON.parse(match[1]) || {} } catch { return {} }
}
function visibleJobNotes(notes) { return String(notes || '').replace(META_RE, '').trim() }
function notesWithWorkflow(notes, workflow) {
    const visible = visibleJobNotes(notes)
    return `${visible}${visible ? '\n\n' : ''}[MECHANIC_WORKFLOW_JSON]${JSON.stringify(workflow)}[/MECHANIC_WORKFLOW_JSON]`
}
function formatDate(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return escapeHtml(String(value))
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}
function formatElapsed(start) {
    if (!start) return '-'
    const started = new Date(start).getTime()
    if (!started) return '-'
    const mins = Math.max(0, Math.floor((Date.now() - started) / 60000))
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h <= 0) return `${m} นาที`
    return `${h} ชม. ${m} นาที`
}
function statusKey(job) {
    const wf = parseWorkflow(job.notes)
    if ((job.status || 'pending') === 'pending' && wf.accepted_at) return 'accepted'
    return job.status || 'pending'
}
function statusBadge(job) {
    const meta = STATUS_META[statusKey(job)] || STATUS_META.pending
    return `<span class="badge badge-${meta.className}">${meta.label}</span>`
}
function mechanicName(mechanics, id) {
    const mechanic = mechanics.find(m => asId(recordId(m)) === asId(id))
    return mechanic ? (mechanic.display_name || mechanic.name || mechanic.username || id) : id
}
function itemKey(item, idx) { return asId(recordId(item)) || `item-${idx}` }
function safeJsonAttr(value) { return escapeHtml(JSON.stringify(value)).replace(/'/g, '&#39;') }
function wordCount(text) { return String(text || '').trim().split(/\s+/).filter(Boolean).length }
function evidenceCount(workflow, key) { return Array.isArray(workflow?.qc_evidence?.[key]) ? workflow.qc_evidence[key].length : 0 }

export function initMechanicKpiPage(container) {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    const currentUser = getCurrentUser()
    const currentRole = String(currentUser?.role || '').toLowerCase()
    const isTechnicianView = TECH_ROLES.has(currentRole)

    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">engineering</span>
                <h1>งานช่าง</h1>
            </div>
            <button class="btn btn-secondary" id="btnRefreshAssigned"><span class="material-icons-outlined">refresh</span> รีเฟรช</button>
        </div>

        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-header"><h3>${isTechnicianView ? 'งานที่ได้รับมอบหมาย' : 'งานช่างที่กำลังดำเนินการ'}</h3></div>
            <div class="card-body" id="assignedJobsList"><div style="text-align:center;padding:var(--sp-6);">กำลังโหลด...</div></div>
        </div>

        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div style="display:flex;gap:var(--sp-4);align-items:flex-end;flex-wrap:wrap;">
                    <div class="form-group" style="margin:0;width:150px;"><label class="form-label">ตั้งแต่วันที่</label><input type="date" class="form-control" id="kpiStartDate" value="${firstDay}"></div>
                    <div class="form-group" style="margin:0;width:150px;"><label class="form-label">ถึงวันที่</label><input type="date" class="form-control" id="kpiEndDate" value="${lastDay}"></div>
                    <button class="btn btn-primary" id="btnLoadKpi">โหลด KPI</button>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h3>ผลงานช่าง</h3></div>
            <div class="card-body" style="padding:0;overflow-x:auto;">
                <table class="data-grid" style="width:100%;text-align:left;">
                    <thead><tr><th>ชื่อช่าง</th><th style="text-align:center;">งานหลัก</th><th style="text-align:center;">งานช่วย</th><th style="text-align:center;">เวลารวม (ชม.)</th><th style="text-align:center;">เฉลี่ยต่อใบงาน (นาที)</th><th style="text-align:right;">รายได้จากงานหลัก</th></tr></thead>
                    <tbody id="kpiTbody"><tr><td colspan="6" style="text-align:center;">กำลังโหลด...</td></tr></tbody>
                </table>
            </div>
        </div>

        <div id="mechanicModal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.48);z-index:9999;align-items:center;justify-content:center;padding:16px;">
            <div style="width:min(760px,100%);max-height:90vh;overflow:auto;background:var(--bc-surface-solid,#fff);border-radius:8px;box-shadow:0 24px 80px rgba(15,23,42,.28);">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--bc-border);">
                    <h3 id="mechanicModalTitle" style="margin:0;font-size:1.05rem;"></h3>
                    <button class="btn btn-sm btn-outline" id="mechanicModalClose"><span class="material-icons-outlined" style="font-size:16px;">close</span></button>
                </div>
                <div id="mechanicModalBody" style="padding:18px;"></div>
            </div>
        </div>
    `

    let cachedMechanics = []
    let cachedJobs = []
    let cachedItemsByJob = new Map()
    let branchAliases = new Map()
    let timer = null

    async function loadLookups() {
        const [users, branches] = await Promise.all([
            fetchFullList('users', { requestKey: null }),
            fetchFullList('branches', { requestKey: null }).catch(() => [])
        ])
        cachedMechanics = users.filter(u => TECH_ROLES.has(String(u.role || '').toLowerCase())).filter(isActiveUser)
        branchAliases = buildBranchAliases(branches)
    }
    function branchMatches(recordBranch) {
        const selectedBranch = userBranch(currentUser)
        if (!selectedBranch || selectedBranch === 'all') return true
        return sameBranch(recordBranch, selectedBranch, branchAliases)
    }
    async function loadJobItems(jobs) {
        cachedItemsByJob = new Map()
        await Promise.all(jobs.map(async job => {
            const id = recordId(job)
            try {
                const items = await fetchFullList('job_items', { filter: `job_id='${String(id).replace(/'/g, "\\'")}'`, requestKey: null })
                cachedItemsByJob.set(asId(id), items)
            } catch { cachedItemsByJob.set(asId(id), []) }
        }))
    }

    function actionHtml(job, workflow, canAct) {
        if (!canAct) return ''
        const id = escapeHtml(recordId(job))
        if ((job.status || 'pending') === 'pending' && !workflow.accepted_at) return `<button class="btn btn-primary btn-sm" data-job-action="accept" data-job-id="${id}">รับงาน</button>`
        if ((job.status || 'pending') === 'pending' && workflow.accepted_at) return `<button class="btn btn-primary btn-sm" data-job-action="precheck" data-job-id="${id}">ตรวจสภาพก่อนเริ่ม</button>`
        if (job.status === 'in_progress') return `<button class="btn btn-primary btn-sm" data-job-action="qc" data-job-id="${id}">QC</button>`
        return '<span class="muted">รอปิดงาน</span>'
    }

    function renderItems(items, workflow) {
        if (!items.length) return '<div class="text-sm text-muted">ไม่มีรายการสินค้า/บริการ</div>'
        return `<div style="display:grid;gap:8px;">${items.map((item, idx) => {
            const key = itemKey(item, idx)
            return `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 10px;border:1px solid var(--bc-border);border-radius:6px;background:var(--bc-surface,#f8fafc);">
                <div><strong>${escapeHtml(item.product_name || item.name || 'รายการ')}</strong><div class="text-sm text-muted">จำนวน ${escapeHtml(item.qty || 1)} ${evidenceCount(workflow, key) ? ` • หลักฐาน ${evidenceCount(workflow, key)} รูป` : ''}</div></div>
                <div class="text-sm text-muted">${escapeHtml(item.type || item.product_type || '')}</div>
            </div>`
        }).join('')}</div>`
    }

    async function loadAssignedJobs() {
        const list = container.querySelector('#assignedJobsList')
        list.innerHTML = '<div style="text-align:center;padding:var(--sp-6);">กำลังโหลด...</div>'
        const jobs = await fetchFullList('jobs', { requestKey: null })
        const userId = currentUser?.id
        cachedJobs = jobs
            .filter(job => ACTIVE_STATUSES.has(job.status || 'pending'))
            .filter(hasAssignment)
            .filter(job => branchMatches(jobBranch(job)))
            .filter(job => !isTechnicianView || isAssignedTo(job, userId))
            .sort((a, b) => String(b.start_date || b.created_at || '').localeCompare(String(a.start_date || a.created_at || '')))
        await loadJobItems(cachedJobs)

        if (!cachedJobs.length) {
            list.innerHTML = `<div style="text-align:center;padding:var(--sp-6);">${isTechnicianView ? 'ยังไม่มีงานที่ได้รับมอบหมาย' : 'ยังไม่มีงานช่างที่กำลังดำเนินการ'}</div>`
            return
        }

        list.innerHTML = cachedJobs.map(job => {
            const workflow = parseWorkflow(job.notes)
            const items = cachedItemsByJob.get(asId(recordId(job))) || []
            const canAct = isTechnicianView && isAssignedTo(job, userId)
            const helpers = splitIds(job.helper_mechanic_ids).map(id => mechanicName(cachedMechanics, id)).filter(Boolean)
            return `<div class="mechanic-job-card" data-job-card="${escapeHtml(recordId(job))}" style="border:1px solid var(--bc-border);border-radius:8px;padding:14px;margin-bottom:12px;background:var(--bc-surface-solid,#fff);">
                <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
                    <div>
                        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><strong style="font-size:1rem;">${escapeHtml(job.job_no || recordId(job))}</strong>${statusBadge(job)}${workflow.work_started_at ? `<span class="badge badge-pending"><span class="elapsed" data-start="${escapeHtml(workflow.work_started_at)}">${formatElapsed(workflow.work_started_at)}</span></span>` : ''}</div>
                        <div class="text-sm text-muted" style="margin-top:4px;">ทะเบียน ${escapeHtml(job.plate || '-')} • วันที่รับรถ ${formatDate(job.start_date || job.created_at)}</div>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;">${actionHtml(job, workflow, canAct)}</div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:12px;">
                    <div><div class="text-sm text-muted">ช่างหลัก</div><strong>${escapeHtml(mechanicName(cachedMechanics, job.lead_mechanic_id) || '-')}</strong>${helpers.length ? `<div class="text-sm text-muted">ช่างช่วย: ${escapeHtml(helpers.join(', '))}</div>` : ''}</div>
                    <div><div class="text-sm text-muted">รายละเอียดงาน</div><div>${escapeHtml(visibleJobNotes(job.notes) || '-')}</div></div>
                </div>
                <div style="margin-top:12px;"><div class="text-sm text-muted" style="margin-bottom:6px;">รายการบริการ / สินค้า</div>${renderItems(items, workflow)}</div>
                ${workflow.precheck_note ? `<div style="margin-top:12px;padding:10px;border-left:4px solid var(--color-primary);background:var(--bc-surface,#f8fafc);"><div class="text-sm text-muted">บันทึกตรวจสภาพก่อนเริ่มงาน</div>${escapeHtml(workflow.precheck_note)}</div>` : ''}
            </div>`
        }).join('')
        refreshElapsedLabels()
    }

    async function loadKpi() {
        const start = container.querySelector('#kpiStartDate').value
        const end = container.querySelector('#kpiEndDate').value
        if (!start || !end) return showToast('กรุณาเลือกช่วงเวลา', 'warning')
        const tbody = container.querySelector('#kpiTbody')
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">กำลังโหลด...</td></tr>'
        const visibleMechanics = cachedMechanics.filter(m => branchMatches(userBranch(m)))
        const jobs = (await fetchFullList('jobs', { requestKey: null })).filter(job => job.status === 'completed').filter(job => String(job.end_date || '') >= start && String(job.end_date || '') <= `${end} 23:59:59`).filter(job => branchMatches(jobBranch(job)))
        const stats = {}
        visibleMechanics.forEach(m => { stats[recordId(m)] = { led: 0, assisted: 0, duration_mins: 0, revenue: 0, name: m.display_name || m.name || m.username || recordId(m) } })
        jobs.forEach(job => {
            const duration = Number.parseInt(job.work_duration_minutes || 0, 10) || 0
            const revenue = Number.parseFloat(job.grand_total || 0) || 0
            const leadId = asId(job.lead_mechanic_id)
            if (leadId && stats[leadId]) { stats[leadId].led += 1; stats[leadId].duration_mins += duration; stats[leadId].revenue += revenue }
            splitIds(job.helper_mechanic_ids).forEach(helperId => { if (stats[helperId]) { stats[helperId].assisted += 1; stats[helperId].duration_mins += duration } })
        })
        const rows = Object.values(stats).filter(s => s.led + s.assisted > 0).map(s => {
            const totalJobs = s.led + s.assisted
            const hours = (s.duration_mins / 60).toFixed(1)
            const avgMins = totalJobs > 0 ? Math.round(s.duration_mins / totalJobs) : 0
            return `<tr><td data-label="ชื่อช่าง"><strong>${escapeHtml(s.name)}</strong></td><td data-label="งานหลัก" style="text-align:center;">${s.led}</td><td data-label="งานช่วย" style="text-align:center;">${s.assisted}</td><td data-label="เวลารวม (ชม.)" style="text-align:center;">${hours}</td><td data-label="เฉลี่ยต่อใบงาน (นาที)" style="text-align:center;">${avgMins}</td><td data-label="รายได้จากงานหลัก" style="text-align:right;">${s.revenue.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td></tr>`
        })
        tbody.innerHTML = rows.join('') || '<tr><td colspan="6" style="text-align:center;">ไม่พบข้อมูลในช่วงเวลานี้</td></tr>'
    }

    function findJob(jobId) { return cachedJobs.find(job => asId(recordId(job)) === asId(jobId)) }
    function openModal(title, bodyHtml) {
        container.querySelector('#mechanicModalTitle').textContent = title
        container.querySelector('#mechanicModalBody').innerHTML = bodyHtml
        container.querySelector('#mechanicModal').style.display = 'flex'
    }
    function closeModal() { container.querySelector('#mechanicModal').style.display = 'none' }

    function openAcceptModal(job) {
        const currentHelpers = new Set(splitIds(job.helper_mechanic_ids))
        const leadId = asId(job.lead_mechanic_id)
        const helperOptions = cachedMechanics.filter(m => asId(recordId(m)) !== leadId).map(m => `<label style="display:flex;gap:8px;align-items:center;padding:6px 0;"><input type="checkbox" class="accept-helper" value="${escapeHtml(recordId(m))}" ${currentHelpers.has(asId(recordId(m))) ? 'checked' : ''}> ${escapeHtml(m.display_name || m.name || m.username || recordId(m))}</label>`).join('') || '<div class="text-sm text-muted">ไม่มีช่างช่วยในสาขา</div>'
        openModal('ยืนยันรับงาน', `<p style="margin-top:0;">ยืนยันรับงาน ${escapeHtml(job.job_no || recordId(job))}</p><div class="form-group"><label class="form-label">เลือกช่างช่วย</label><div style="max-height:220px;overflow:auto;border:1px solid var(--bc-border);border-radius:6px;padding:8px;">${helperOptions}</div></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;"><button class="btn btn-outline" data-modal-close>ยกเลิก</button><button class="btn btn-primary" data-confirm-accept="${escapeHtml(recordId(job))}">ยืนยันรับงาน</button></div>`)
    }

    function openPrecheckModal(job) {
        openModal('ตรวจสภาพรถก่อนเริ่มงาน', `<div class="form-group"><label class="form-label required">บันทึกผลตรวจสภาพก่อนเริ่มงาน</label><textarea class="form-control" id="precheckNote" rows="4" placeholder="ระบุอย่างน้อย 3 คำ และอย่างน้อย 10 ตัวอักษร"></textarea><div class="text-sm text-muted" style="margin-top:6px;">ต้องบันทึกเพื่อยืนยันว่าตรวจรถก่อนเริ่มงานแล้ว</div></div><div class="form-group"><label class="form-label">รูปภาพประกอบ (ถ้ามี)</label><input type="file" id="precheckFiles" class="form-control" accept="image/*" multiple capture="environment"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;"><button class="btn btn-outline" data-modal-close>ยกเลิก</button><button class="btn btn-primary" data-confirm-precheck="${escapeHtml(recordId(job))}">เริ่มงาน</button></div>`)
    }

    function openQcModal(job) {
        const items = cachedItemsByJob.get(asId(recordId(job))) || []
        const itemInputs = items.length ? items.map((item, idx) => `<div style="padding:10px;border:1px solid var(--bc-border);border-radius:6px;margin-bottom:8px;"><label class="form-label required">${escapeHtml(item.product_name || item.name || `รายการ ${idx + 1}`)}</label><input type="file" class="form-control qc-file" data-item-key="${escapeHtml(itemKey(item, idx))}" accept="image/*" multiple capture="environment"></div>`).join('') : '<div class="text-sm text-muted">ไม่มีรายการสินค้า/บริการในใบงานนี้ สามารถส่ง QC ได้โดยไม่ต้องแนบภาพรายรายการ</div>'
        openModal('ส่ง QC พร้อมหลักฐานงาน', `<p style="margin-top:0;">แนบภาพหลักฐานอย่างน้อย 1 รูปต่อรายการ</p>${itemInputs}<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;"><button class="btn btn-outline" data-modal-close>ยกเลิก</button><button class="btn btn-primary" data-confirm-qc="${escapeHtml(recordId(job))}">ส่ง QC</button></div>`)
    }

    async function uploadFilesFromInput(input) {
        const files = Array.from(input?.files || [])
        const uploaded = []
        for (const file of files) uploaded.push(...await uploadAttachment(file))
        return uploaded
    }

    async function handleAccept(jobId) {
        const job = findJob(jobId)
        if (!job) return
        const helpers = Array.from(container.querySelectorAll('.accept-helper:checked')).map(i => i.value).filter(Boolean).join(',')
        const workflow = { ...parseWorkflow(job.notes), accepted_at: new Date().toISOString(), accepted_by: currentUser?.id || '' }
        await updateRecord('jobs', jobId, { helper_mechanic_ids: helpers, notes: notesWithWorkflow(job.notes, workflow) })
        closeModal(); showToast('รับงานแล้ว กรุณาตรวจสภาพรถก่อนเริ่มงาน', 'success'); await loadAssignedJobs()
    }

    async function handlePrecheck(jobId) {
        const job = findJob(jobId)
        if (!job) return
        const note = container.querySelector('#precheckNote')?.value?.trim() || ''
        if (note.length < 10 || wordCount(note) < 3) return showToast('กรุณาระบุผลตรวจอย่างน้อย 3 คำ และอย่างน้อย 10 ตัวอักษร', 'warning')
        const attachments = await uploadFilesFromInput(container.querySelector('#precheckFiles'))
        const workflow = { ...parseWorkflow(job.notes), precheck_note: note, precheck_attachments: attachments, precheck_at: new Date().toISOString(), work_started_at: new Date().toISOString() }
        await updateRecord('jobs', jobId, { status: 'in_progress', notes: notesWithWorkflow(job.notes, workflow) })
        closeModal(); showToast('เริ่มงานแล้ว', 'success'); await loadAssignedJobs(); await loadKpi()
    }

    async function handleQc(jobId) {
        const job = findJob(jobId)
        if (!job) return
        const items = cachedItemsByJob.get(asId(jobId)) || []
        const evidence = {}
        for (const [idx, item] of items.entries()) {
            const key = itemKey(item, idx)
            const input = container.querySelector(`.qc-file[data-item-key="${CSS.escape(key)}"]`)
            if (!input || input.files.length < 1) return showToast('กรุณาแนบรูปหลักฐานอย่างน้อย 1 รูปต่อรายการ', 'warning')
            evidence[key] = await uploadFilesFromInput(input)
        }
        const workflow = { ...parseWorkflow(job.notes), qc_evidence: evidence, qc_submitted_at: new Date().toISOString() }
        await updateRecord('jobs', jobId, { status: 'qc_done', notes: notesWithWorkflow(job.notes, workflow) })
        closeModal(); showToast('ส่ง QC แล้ว', 'success'); await loadAssignedJobs(); await loadKpi()
    }

    function refreshElapsedLabels() {
        container.querySelectorAll('.elapsed[data-start]').forEach(el => { el.textContent = formatElapsed(el.dataset.start) })
    }

    async function loadPage() {
        try { await loadLookups(); await Promise.all([loadAssignedJobs(), loadKpi()]) }
        catch (e) { console.error(e); showToast('เกิดข้อผิดพลาดในการโหลดหน้างานช่าง', 'error') }
    }

    container.querySelector('#btnRefreshAssigned').addEventListener('click', async () => { try { await loadLookups(); await loadAssignedJobs(); showToast('อัปเดตรายการงานแล้ว', 'success') } catch (e) { console.error(e); showToast('โหลดรายการงานไม่สำเร็จ', 'error') } })
    container.querySelector('#btnLoadKpi').addEventListener('click', async () => { try { await loadKpi() } catch (e) { console.error(e); showToast('เกิดข้อผิดพลาดในการโหลด KPI', 'error') } })
    container.querySelector('#mechanicModalClose').addEventListener('click', closeModal)
    container.querySelector('#mechanicModal').addEventListener('click', e => { if (e.target.id === 'mechanicModal') closeModal() })
    container.addEventListener('click', async event => {
        const closeBtn = event.target.closest('[data-modal-close]')
        if (closeBtn) return closeModal()
        const actionBtn = event.target.closest('[data-job-action]')
        if (actionBtn) {
            const job = findJob(actionBtn.dataset.jobId)
            if (!job) return
            if (actionBtn.dataset.jobAction === 'accept') return openAcceptModal(job)
            if (actionBtn.dataset.jobAction === 'precheck') return openPrecheckModal(job)
            if (actionBtn.dataset.jobAction === 'qc') return openQcModal(job)
        }
        const acceptBtn = event.target.closest('[data-confirm-accept]')
        const precheckBtn = event.target.closest('[data-confirm-precheck]')
        const qcBtn = event.target.closest('[data-confirm-qc]')
        const btn = acceptBtn || precheckBtn || qcBtn
        if (!btn) return
        btn.disabled = true
        try {
            if (acceptBtn) await handleAccept(acceptBtn.dataset.confirmAccept)
            if (precheckBtn) await handlePrecheck(precheckBtn.dataset.confirmPrecheck)
            if (qcBtn) await handleQc(qcBtn.dataset.confirmQc)
        } catch (e) { console.error(e); showToast('อัปเดตงานไม่สำเร็จ', 'error') }
        finally { btn.disabled = false }
    })
    timer = setInterval(refreshElapsedLabels, 60000)
    const observer = new MutationObserver(() => {
        if (!document.body.contains(container)) { clearInterval(timer); observer.disconnect() }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    loadPage()
}
