/**
 * Mechanic Dashboard — logic.js
 */

import { fetchFullList, updateRecord, getAuthToken } from '@shared/nocodb-adapter.js'
import '../../services/authService.js'
import { uploadFiles, parseAttachments, renderAttachments } from '@shared/attachmentService.js'

async function init() {
    const user = window.AuthService?.getUser()
    if (!user) {
        window.location.href = '../main/index.html'
        return
    }

    const role = user.role || ''
    const canSeeFinancials = ['manager', 'owner', 'admin'].includes(role)
    const canApproveQC = ['manager', 'owner', 'admin', 'sa'].includes(role)

    document.getElementById('greetingText').textContent = `สวัสดี, ${user.name || user.username || 'ช่าง'} · ${getRoleLabel(role)}`

    if (canSeeFinancials) {
        document.querySelectorAll('.manager-only').forEach(el => el.style.display = '')
    }

    let myMechanicId = user.id

    setupTabs()

    await Promise.all([
        loadActiveJobs(myMechanicId, user, canApproveQC),
        loadKPIs(myMechanicId, canSeeFinancials)
    ])
}

function setupTabs() {
    document.getElementById('tabActive')?.addEventListener('click', () => {
        document.getElementById('tabActive').classList.add('active')
        document.getElementById('tabHistory').classList.remove('active')
        document.getElementById('tabActive').style.color = 'var(--primary-color)'
        document.getElementById('tabActive').style.borderBottom = '2px solid var(--primary-color)'
        document.getElementById('tabActive').style.fontWeight = '600'
        document.getElementById('tabHistory').style.color = 'var(--surface-600)'
        document.getElementById('tabHistory').style.borderBottom = 'none'
        document.getElementById('tabHistory').style.fontWeight = '500'
        document.getElementById('activeJobsContainer').style.display = 'block'
        document.getElementById('historyJobsContainer').style.display = 'none'
    })

    document.getElementById('tabHistory')?.addEventListener('click', () => {
        document.getElementById('tabHistory').classList.add('active')
        document.getElementById('tabActive').classList.remove('active')
        document.getElementById('tabHistory').style.color = 'var(--primary-color)'
        document.getElementById('tabHistory').style.borderBottom = '2px solid var(--primary-color)'
        document.getElementById('tabHistory').style.fontWeight = '600'
        document.getElementById('tabActive').style.color = 'var(--surface-600)'
        document.getElementById('tabActive').style.borderBottom = 'none'
        document.getElementById('tabActive').style.fontWeight = '500'
        document.getElementById('historyJobsContainer').style.display = 'block'
        document.getElementById('activeJobsContainer').style.display = 'none'
    })

    document.getElementById('historyFilter')?.addEventListener('change', () => {
        renderHistoryJobs()
    })
}

function getRoleLabel(role) {
    const labels = {
        mechanic: 'ช่าง',
        sa: 'Service Advisor',
        manager: 'ผู้จัดการ',
        owner: 'เจ้าของ',
        admin: 'Admin'
    }
    return labels[role] || role
}

async function loadActiveJobs(myId, user, canApproveQC) {
    const container = document.getElementById('activeJobsContainer')
    try {
        const allJobs = await fetchFullList('jobs', {
            filter: `(status!='cancelled')&&(status!='completed')`,
            requestKey: null
        })

        const myJobs = myId
            ? allJobs.filter(j =>
                j.lead_mechanic_id === myId ||
                (j.helper_mechanic_ids || '').split(',').map(s => s.trim()).includes(myId)
              )
            : allJobs

        if (myJobs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎉</div>
                    <div style="font-weight:600;margin-bottom:0.3rem;">ไม่มีงานที่รอดำเนินการ</div>
                    <div style="font-size:0.8rem;">ยินดีด้วย — ไม่มีงานค้างอยู่!</div>
                </div>
            `
            return
        }

        // Fetch items for these active jobs
        const filterStr = myJobs.map(j => `(job_id,eq,${j.id})`).join('~or')
        let allItems = []
        if (filterStr) {
            try {
                allItems = await fetchFullList('job_items', { filter: filterStr, requestKey: null })
            } catch (e) { console.error('Failed to fetch job items', e) }
        }

        container.innerHTML = myJobs.map(j => {
            const items = allItems.filter(i => i.job_id === j.id)
            return buildJobCard(j, myId, canApproveQC, items)
        }).join('')
        attachJobCardListeners(myJobs, myId, canApproveQC)

    } catch (e) {
        console.error('loadActiveJobs error:', e)
        container.innerHTML = `<div class="empty-state" style="color:#dc2626;">เกิดข้อผิดพลาดในการโหลดงาน</div>`
    }
}

function buildJobCard(job, myId, canApproveQC, items = []) {
    const isLead = job.lead_mechanic_id === myId
    const statusInfo = getStatusInfo(job.status)
    const qcStatus = getQcStatus(job)

    const allQcImages = parseAttachments(job.qc_images || '[]')
    
    // Privacy: Show ONLY cust_code, do not show name
    const displayCustomer = job.cust_code ? `[${job.cust_code}]` : 'ลูกค้าทั่วไป'

    let actionBtns = ''

    if (job.status === 'pending') {
        if (isLead) {
            actionBtns = `<button class="btn-qc" data-jobid="${job.id}" data-action="accept-job" style="background-color: #3b82f6; color: white; border: none;">
               <span class="material-icons-outlined" style="font-size:0.9rem;">play_arrow</span> ยอมรับงาน
           </button>`
        }
    } else if (job.status === 'in_progress') {
        actionBtns = `<button class="btn-qc btn-qc-submit" data-jobid="${job.id}" data-action="open-qc">
            <span class="material-icons-outlined" style="font-size:0.9rem;">photo_camera</span> ถ่ายรูป / ส่งงาน QC
        </button>`
    } else if (job.status === 'qc_done') {
        actionBtns = `<button class="btn-qc" disabled style="background-color: #e2e8f0; color: #64748b; border: 1px solid #cbd5e1;">
               <span class="material-icons-outlined" style="font-size:0.9rem;">hourglass_empty</span> รอ SA เก็บเงิน
           </button>`
    }

    const notesSection = `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--surface-200);">
            <div style="font-size:0.8rem; font-weight:600; color:var(--surface-600); margin-bottom: 4px;">บันทึกการทำงาน (ช่าง)</div>
            <textarea class="input mechanic-notes-input" id="notes-${job.id}" placeholder="ระบุรายละเอียดการซ่อม หรือข้อเสนอแนะเพิ่มเติม..." style="width:100%; font-size:0.8rem; padding:8px; border-radius: 6px; border: 1px solid var(--surface-200); resize:vertical; min-height:50px;">${escHtml(job.notes || '')}</textarea>
            <div style="text-align:right; margin-top: 4px;">
                <button class="btn-qc" data-jobid="${job.id}" data-action="save-notes" style="font-size:0.75rem; padding:4px 12px; background:var(--surface-200); color:var(--surface-700); border:none;">บันทึกโน้ต</button>
            </div>
        </div>
    `

    let itemsHtml = ''
    if (items && items.length > 0) {
        itemsHtml = items.map(item => {
            const itemImages = allQcImages.filter(img => img.itemId === item.id)
            const itemImagesHtml = itemImages.length > 0
                ? `<div class="qc-images-preview" style="margin-top:4px;">${itemImages.map(att => {
                    let u = typeof att === 'string' ? att : (att.url || att.path || '')
                    if (u && !u.startsWith('http') && !u.startsWith('/')) u = '/' + u
                    return `<img src="${escHtml(u)}" alt="QC" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="viewImage('${escHtml(u)}')">`
                }).join('')}</div>`
                : '<div style="font-size:0.75rem;color:#dc2626;margin-top:2px;" class="qc-missing-badge">❌ ยังไม่มีรูป QC</div>'

            return `
                <div style="border-bottom: 1px solid var(--surface-200); padding: 8px 0;" class="qc-item-row" data-itemid="${item.id}" data-has-photo="${itemImages.length > 0}">
                    <div style="font-size:0.85rem; font-weight:600;">${escHtml(item.product_name || 'รายการซ่อม')}</div>
                    ${itemImagesHtml}
                    <label class="file-input-label" style="display:inline-block; margin-top:4px; font-size:0.75rem; padding:4px 8px;">
                        <span class="material-icons-outlined" style="font-size:0.9rem;">add_a_photo</span> ถ่ายรูป
                        <input type="file" accept="image/*" capture="environment" multiple style="display:none;"
                               class="qc-file-input" data-jobid="${job.id}" data-itemid="${item.id}" data-existing='${JSON.stringify(allQcImages)}'>
                    </label>
                </div>
            `
        }).join('')
    } else {
        itemsHtml = `
            <div class="qc-item-row" data-itemid="general" data-has-photo="${allQcImages.length > 0}">
                <div style="font-size:0.85rem; font-weight:600;">รูปภาพทั่วไป</div>
                ${allQcImages.length > 0 ? `<div class="qc-images-preview" style="margin-top:4px;">${allQcImages.map(att => {
                    let u = typeof att === 'string' ? att : (att.url || att.path || '')
                    if (u && !u.startsWith('http') && !u.startsWith('/')) u = '/' + u
                    return `<img src="${escHtml(u)}" alt="QC" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="viewImage('${escHtml(u)}')">`
                }).join('')}</div>` : '<div style="font-size:0.75rem;color:#dc2626;margin-top:2px;" class="qc-missing-badge">❌ ยังไม่มีรูป QC</div>'}
                <label class="file-input-label" style="display:inline-block; margin-top:4px; font-size:0.75rem; padding:4px 8px;">
                    <span class="material-icons-outlined" style="font-size:0.9rem;">add_a_photo</span> ถ่ายรูป
                    <input type="file" accept="image/*" capture="environment" multiple style="display:none;"
                           class="qc-file-input" data-jobid="${job.id}" data-itemid="general" data-existing='${JSON.stringify(allQcImages)}'>
                </label>
            </div>
        `
    }

    const workItemsHtml = renderWorkItemsSummary(items)

    const qcPanelHtml = `
        <div class="qc-panel" id="qc-panel-${job.id}">
            <div class="qc-panel-title">
                <span class="material-icons-outlined" style="font-size:0.9rem;vertical-align:text-bottom;">checklist</span>
                รายการที่ต้องถ่ายรูป QC — ${escHtml(job.job_no || '')}
            </div>
            <div id="qc-items-container-${job.id}">
                ${itemsHtml}
            </div>
            <div style="margin-top:12px;text-align:right;">
                <button class="btn-qc btn-submit-all-qc" data-jobid="${job.id}" style="background-color: #10b981; color: white; border: none; padding: 6px 16px;">
                    <span class="material-icons-outlined" style="font-size:0.9rem;">check_circle</span> ยืนยันส่งงาน (QC)
                </button>
            </div>
        </div>
    `

    return `
    <div class="job-card" id="job-card-${job.id}">
        <div class="job-card-top">
            <div>
                <div class="job-no">${escHtml(job.job_no || job.id)}</div>
                <div class="job-customer">
                    <span class="material-icons-outlined" style="font-size:0.8rem;vertical-align:text-bottom;">person</span>
                    ${escHtml(displayCustomer)}
                </div>
            </div>
            <div class="job-plate">${escHtml(job.plate || '—')}</div>
        </div>

        <div>
            <span class="job-role-badge ${isLead ? 'role-lead' : 'role-helper'}">
                ${isLead ? '⭐ ช่างหลัก' : '🔧 ช่างช่วย'}
            </span>
            <span class="status-badge ${statusInfo.cls}">${statusInfo.label}</span>
            ${qcStatus ? `<span class="status-badge" style="background:rgba(124,58,237,0.12);color:#7c3aed;">${qcStatus}</span>` : ''}
        </div>

        ${workItemsHtml}
        <div class="job-card-footer">
            <div style="font-size:0.75rem;color:#94A3B8;">
                ${job.start_date ? `เริ่ม: ${job.start_date.slice(0, 10)}` : ''}
            </div>
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;justify-content:flex-end;">
                ${actionBtns}
            </div>
        </div>
        ${notesSection}
        ${qcPanelHtml}
    </div>`
}

function renderWorkItemsSummary(items = []) {
    if (!items.length) {
        return `
            <div class="work-items-panel">
                <div class="work-items-title">
                    <span class="material-icons-outlined">checklist</span>
                    รายการงานที่ต้องทำ
                </div>
                <div class="work-item-empty">ยังไม่มีรายการงานในใบงานนี้</div>
            </div>
        `
    }

    return `
        <div class="work-items-panel">
            <div class="work-items-title">
                <span class="material-icons-outlined">checklist</span>
                รายการงานที่ต้องทำ / เตรียมของ
            </div>
            ${items.map((item, index) => `
                <div class="work-item-row">
                    <div class="work-item-index">${index + 1}</div>
                    <div class="work-item-main">
                        <div class="work-item-name">${escHtml(item.product_name || item.name || 'รายการงาน')}</div>
                        <div class="work-item-meta">จำนวน ${escHtml(item.qty || 0)} ${escHtml(item.unit || '')}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `
}

function attachJobCardListeners(jobs, myId, canApproveQC) {
    document.querySelectorAll('[data-action="open-qc"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const jobId = btn.dataset.jobid
            const panel = document.getElementById(`qc-panel-${jobId}`)
            panel?.classList.toggle('open')
        })
    })

    document.querySelectorAll('[data-action="accept-job"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const jobId = btn.dataset.jobid
            try {
                btn.disabled = true
                btn.textContent = 'กำลังรับงาน...'
                await updateRecord('jobs', jobId, { 
                    status: 'in_progress', 
                    work_started_at: new Date().toISOString() 
                })
                showToast('รับงานเรียบร้อย', 'success')
                location.reload()
            } catch (e) {
                console.error('Accept job error:', e)
                showToast('เกิดข้อผิดพลาดในการรับงาน', 'error')
                btn.disabled = false
                btn.textContent = 'ยอมรับงาน'
            }
        })
    })

    document.querySelectorAll('[data-action="save-notes"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const jobId = btn.dataset.jobid
            const txt = document.getElementById(`notes-${jobId}`).value.trim()
            try {
                btn.disabled = true
                btn.textContent = '...'
                await updateRecord('jobs', jobId, { notes: txt })
                showToast('บันทึกโน้ตเรียบร้อย', 'success')
                btn.textContent = 'บันทึกแล้ว ✅'
                setTimeout(() => { btn.disabled = false; btn.textContent = 'บันทึกโน้ต'; }, 2000)
            } catch(e) {
                console.error(e)
                showToast('เกิดข้อผิดพลาดในการบันทึกโน้ต', 'error')
                btn.disabled = false
                btn.textContent = 'ลองใหม่'
            }
        })
    })

    document.querySelectorAll('.qc-file-input').forEach(input => {
        input.addEventListener('change', async () => {
            if (!input.files || input.files.length === 0) return
            const jobId = input.dataset.jobid
            const itemId = input.dataset.itemid
            let existing = []
            try { existing = parseAttachments(input.dataset.existing || '[]') } catch {
                existing = []
            }
            
            showToast('กำลังอัพโหลดรูปภาพ...', 'info')
            try {
                const newFiles = await uploadFiles(input.files)
                const filesWithItemId = newFiles.map(f => ({ ...f, itemId }))
                const combined = [...existing, ...filesWithItemId]
                
                // Save immediately to job record but do NOT mark qc_done yet
                await updateRecord('jobs', jobId, { qc_images: JSON.stringify(combined) })
                showToast(`อัพโหลดรูปภาพสำเร็จ`, 'success')
                
                // Update DOM locally instead of reloading
                const row = input.closest('.qc-item-row')
                row.dataset.hasPhoto = 'true'
                const missingBadge = row.querySelector('.qc-missing-badge')
                if (missingBadge) missingBadge.remove()
                
                let preview = row.querySelector('.qc-images-preview')
                if (!preview) {
                    preview = document.createElement('div')
                    preview.className = 'qc-images-preview'
                    preview.style.marginTop = '4px'
                    input.closest('.file-input-label')?.before(preview)
                }
                preview.innerHTML += filesWithItemId.map(att => {
                    let u = att.url || att.path || ''
                    if (u && !u.startsWith('http') && !u.startsWith('/')) u = '/' + u
                    return `<img src="${escHtml(u)}" alt="QC" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="viewImage('${escHtml(u)}')">`
                }).join('')
                
                // Update existing payload for all inputs in this job panel
                document.querySelectorAll(`.qc-file-input[data-jobid="${jobId}"]`).forEach(inp => {
                    inp.dataset.existing = JSON.stringify(combined)
                })
                input.value = ''
            } catch (e) {
                console.error('QC upload error:', e)
                showToast('อัพโหลดรูปภาพล้มเหลว', 'error')
            }
        })
    })

    // Submit QC Button (Validates per-item photos)
    document.querySelectorAll('.btn-submit-all-qc').forEach(btn => {
        btn.addEventListener('click', async () => {
            const jobId = btn.dataset.jobid
            const panel = document.getElementById(`qc-panel-${jobId}`)
            const rows = panel.querySelectorAll('.qc-item-row')
            
            let allHavePhoto = true
            rows.forEach(r => {
                if (r.dataset.hasPhoto !== 'true') allHavePhoto = false
            })
            
            if (!allHavePhoto) {
                return showToast('กรุณาถ่ายรูป QC ให้ครบทุกรายการซ่อม ก่อนส่งงาน', 'error')
            }
            
            btn.disabled = true
            btn.textContent = 'กำลังส่งงาน...'
            try {
                const user = window.AuthService?.getUser()
                const updateData = { 
                    status: 'qc_done',
                    qc_approved_by: user?.name || user?.username || 'ช่าง' // self-approve QC
                }
                const updatedJob = await updateRecord('jobs', jobId, updateData)
                showToast(`ส่งงาน QC สำเร็จ`, 'success')
                
                fetch('/api/notify/qc-done', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
                    },
                    body: JSON.stringify({ job: updatedJob, branchCode: updatedJob.branch_id })
                }).catch(err => console.error('Failed to notify QC Done:', err))
                
                setTimeout(() => location.reload(), 1500)
            } catch (e) {
                console.error('QC submit error:', e)
                showToast('ส่งงานล้มเหลว', 'error')
                btn.disabled = false
                btn.textContent = 'ยืนยันส่งงาน (QC)'
            }
        })
    })
}

async function loadKPIs(myId, canSeeFinancials) {
    try {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

        const allClosedJobs = await fetchFullList('jobs', {
            filter: `(status='completed')`,
            requestKey: null
        })

        renderHistoryJobs(myId, allClosedJobs, canSeeFinancials)

        const monthJobs = allClosedJobs.filter(j => {
            const d = (j.end_date || j.start_date || '').slice(0, 10)
            return d >= firstDay && d <= lastDay
        })

        let led = 0, assisted = 0, mins = 0, rev = 0
        monthJobs.forEach(j => {
            if (myId && j.lead_mechanic_id === myId) {
                led++
                mins += parseInt(j.work_duration_minutes || 0, 10)
                rev += parseFloat(j.grand_total || 0)
            }
            if (myId && (j.helper_mechanic_ids || '').split(',').map(s => s.trim()).includes(myId)) {
                assisted++
            }
        })

        document.getElementById('kpiLed').textContent = led
        document.getElementById('kpiAssisted').textContent = assisted
        if (canSeeFinancials) {
            document.getElementById('kpiHours').textContent = (mins / 60).toFixed(1)
            document.getElementById('kpiCompleted').textContent = led
            document.getElementById('kpiRevenue').textContent = '฿' + rev.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        }
    } catch (e) {
        console.error('loadKPIs error:', e)
    }
}

let _historyJobs = []
let _historyUserId = null
let _historyCanSeeFin = false

function renderHistoryJobs(myId = _historyUserId, allClosedJobs = _historyJobs, canSeeFinancials = _historyCanSeeFin) {
    _historyUserId = myId
    _historyJobs = allClosedJobs
    _historyCanSeeFin = canSeeFinancials

    const container = document.getElementById('historyJobsList')
    if (!container) return
    
    const filterVal = document.getElementById('historyFilter')?.value || 'this_month'
    const now = new Date()
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)

    const sorted = [...allClosedJobs].sort((a, b) => new Date(b.end_date || b.created_at || 0) - new Date(a.end_date || a.created_at || 0))
    
    let filtered = myId ? sorted.filter(j => 
        j.lead_mechanic_id === myId || 
        (j.helper_mechanic_ids || '').split(',').map(s => s.trim()).includes(myId)
    ) : sorted

    if (filterVal === 'this_month') {
        filtered = filtered.filter(j => (j.end_date || j.created_at || '').slice(0, 10) >= firstDayThisMonth)
    } else if (filterVal === 'last_month') {
        filtered = filtered.filter(j => {
            const d = (j.end_date || j.created_at || '').slice(0, 10)
            return d >= firstDayLastMonth && d <= lastDayLastMonth
        })
    }

    filtered = filtered.slice(0, 50)
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📂</div>
                <div style="font-weight:600;margin-bottom:0.3rem;">ไม่มีประวัติการทำงาน</div>
            </div>
        `
        return
    }
    
    container.innerHTML = filtered.map(j => {
        const isLead = j.lead_mechanic_id === myId
        const d = (j.end_date || j.created_at || '').slice(0, 10)
        
        // QC images preview
        const qcImages = parseAttachments(j.qc_images || '[]')
        const qcImagesHtml = qcImages.length > 0
            ? `<div class="qc-images-preview" style="margin-top: 8px;">${qcImages.map(att => {
                let u = typeof att === 'string' ? att : (att.url || att.path || '')
                if (u && !u.startsWith('http') && !u.startsWith('/')) u = '/' + u
                return `<img src="${escHtml(u)}" alt="QC" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="viewImage('${escHtml(u)}')">`
            }).join('')}</div>`
            : ''
            
        // Notes preview
        const notesHtml = j.notes 
            ? `<div style="margin-top: 8px; font-size: 0.8rem; background: var(--surface-100); padding: 8px; border-radius: 6px; color: var(--surface-700);">
                   <strong>โน้ต:</strong> ${escHtml(j.notes)}
               </div>`
            : ''

        return `
        <div class="job-card">
            <div class="job-card-top">
                <div>
                    <div class="job-no">${escHtml(j.job_no || j.id)}</div>
                    <div class="job-customer">
                        <span class="material-icons-outlined" style="font-size:0.8rem;vertical-align:text-bottom;">person</span>
                        ${escHtml(j.customer_name || '(ไม่ระบุลูกค้า)')}
                    </div>
                </div>
                <div class="job-plate">${escHtml(j.plate || '—')}</div>
            </div>
            <div>
                <span class="job-role-badge ${isLead ? 'role-lead' : 'role-helper'}">
                    ${isLead ? '⭐ ช่างหลัก' : '🔧 ช่างช่วย'}
                </span>
                <span class="status-badge status-closed">เสร็จแล้ว</span>
            </div>
            ${qcImagesHtml}
            ${notesHtml}
            <div class="job-card-footer">
                <div style="font-size:0.75rem;color:#94A3B8;">ปิดงาน: ${d}</div>
                ${canSeeFinancials && j.grand_total ? `<div style="font-size:0.85rem; font-weight: 600; color: var(--surface-700)">฿${parseFloat(j.grand_total).toLocaleString('th-TH')}</div>` : ''}
            </div>
        </div>
        `
    }).join('')
}

function getStatusInfo(status) {
    return {
        pending: { label: 'รอรับงาน', cls: 'status-open' },
        in_progress: { label: 'กำลังซ่อม', cls: 'status-in-progress' },
        qc_done: { label: 'รอเก็บเงิน', cls: 'status-waiting' },
        completed: { label: 'เสร็จสิ้น', cls: 'status-closed' },
        cancelled: { label: 'ยกเลิก', cls: 'status-closed' }
    }[status] || { label: status || 'ไม่ทราบ', cls: 'status-open' }
}

function getQcStatus(job) {
    if (job.qc_approved_by) return '✅ QC อนุมัติ'
    if (parseAttachments(job.qc_images || '[]').length > 0) return '📷 รอตรวจ QC'
    return null
}

function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function showToast(msg, type = 'info') {
    const stack = document.getElementById('toastStack')
    if (!stack) return
    const toast = document.createElement('div')
    toast.className = `toast-msg ${type}`
    toast.textContent = msg
    stack.appendChild(toast)
    setTimeout(() => toast.remove(), 3500)
}

window.viewImage = (url) => {
    const modal = document.getElementById('imgModal')
    document.getElementById('imgModalSrc').src = url
    modal.style.display = 'flex'
}

if (window.AuthService?.getUser()) {
    init()
} else {
    window.addEventListener('authReady', init, { once: true })
    setTimeout(() => {
        if (window.AuthService?.getUser()) init()
        else window.location.href = '../main/index.html'
    }, 800)
}
