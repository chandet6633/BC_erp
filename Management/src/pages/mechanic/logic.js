/**
 * Mechanic Dashboard — logic.js
 */

import { fetchFullList, updateRecord } from '@shared/nocodb-adapter.js'
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

    await Promise.all([
        loadActiveJobs(myMechanicId, user, canApproveQC),
        loadKPIs(myMechanicId, canSeeFinancials)
    ])
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
            filter: `(status!='cancelled')&&(status!='closed')`,
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

        container.innerHTML = myJobs.map(j => buildJobCard(j, myId, canApproveQC)).join('')
        attachJobCardListeners(myJobs, myId, canApproveQC)

    } catch (e) {
        console.error('loadActiveJobs error:', e)
        container.innerHTML = `<div class="empty-state" style="color:#dc2626;">เกิดข้อผิดพลาดในการโหลดงาน</div>`
    }
}

function buildJobCard(job, myId, canApproveQC) {
    const isLead = job.lead_mechanic_id === myId
    const statusInfo = getStatusInfo(job.status)
    const qcStatus = getQcStatus(job)

    const qcImages = parseAttachments(job.qc_images || '[]')
    const qcImagesHtml = qcImages.length > 0
        ? `<div class="qc-images-preview">${qcImages.map(url => `<img src="${escHtml(url)}" alt="QC" onclick="viewImage('${escHtml(url)}')">`).join('')}</div>`
        : ''

    const qcApprovalBtn = (canApproveQC || isLead) && qcImages.length > 0 && !job.qc_approved_by
        ? `<button class="btn-qc btn-qc-approve" data-jobid="${job.id}" data-action="approve-qc">
               <span class="material-icons-outlined" style="font-size:0.9rem;">verified</span> อนุมัติ QC
           </button>`
        : ''

    const qcSubmitBtn = `<button class="btn-qc btn-qc-submit" data-jobid="${job.id}" data-action="open-qc">
        <span class="material-icons-outlined" style="font-size:0.9rem;">photo_camera</span>
        ${qcImages.length > 0 ? 'ดู/เพิ่มรูป QC' : 'ส่ง QC'}
    </button>`

    return `
    <div class="job-card" id="job-card-${job.id}">
        <div class="job-card-top">
            <div>
                <div class="job-no">${escHtml(job.job_no || job.id)}</div>
                <div class="job-customer">
                    <span class="material-icons-outlined" style="font-size:0.8rem;vertical-align:text-bottom;">person</span>
                    ${escHtml(job.customer_name || '(ไม่ระบุลูกค้า)')}
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

        <div class="job-card-footer">
            <div style="font-size:0.75rem;color:#94A3B8;">
                ${job.start_date ? `เริ่ม: ${job.start_date.slice(0, 10)}` : ''}
            </div>
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;justify-content:flex-end;">
                ${qcSubmitBtn}
                ${qcApprovalBtn}
            </div>
        </div>

        <!-- QC Panel -->
        <div class="qc-panel" id="qc-panel-${job.id}">
            <div class="qc-panel-title">
                <span class="material-icons-outlined" style="font-size:0.9rem;vertical-align:text-bottom;">photo_camera</span>
                รูปภาพ QC — ${escHtml(job.job_no || '')}
                ${job.qc_approved_by ? `<span style="color:var(--mech-success);margin-left:0.5rem;">✅ อนุมัติโดย ${escHtml(job.qc_approved_by)}</span>` : ''}
            </div>
            ${qcImagesHtml}
            <label class="file-input-label">
                <span class="material-icons-outlined" style="font-size:1rem;">add_a_photo</span>
                เพิ่มรูปภาพ
                <input type="file" accept="image/*" capture="environment" multiple style="display:none;"
                       class="qc-file-input" data-jobid="${job.id}" data-existing='${JSON.stringify(qcImages)}'>
            </label>
            <div style="font-size:0.72rem;color:#94A3B8;margin-top:0.4rem;">ถ่ายรูปจากกล้อง หรือเลือกไฟล์จากอุปกรณ์</div>
        </div>
    </div>`
}

function attachJobCardListeners(jobs, myId, canApproveQC) {
    document.querySelectorAll('[data-action="open-qc"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const jobId = btn.dataset.jobid
            const panel = document.getElementById(`qc-panel-${jobId}`)
            panel?.classList.toggle('open')
        })
    })

    document.querySelectorAll('[data-action="approve-qc"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const jobId = btn.dataset.jobid
            const user = window.AuthService?.getUser()
            try {
                btn.disabled = true
                btn.textContent = '...'
                await updateRecord('jobs', jobId, { qc_approved_by: user?.name || user?.username || 'ผู้จัดการ' })
                showToast('อนุมัติ QC เรียบร้อย', 'success')
                const panel = btn.closest('.job-card').querySelector(`#qc-panel-${jobId}`)
                panel?.classList.add('open')
                btn.remove()
            } catch (e) {
                console.error(e)
                showToast('เกิดข้อผิดพลาดในการอนุมัติ QC', 'error')
                btn.disabled = false
                btn.textContent = '✅ อนุมัติ QC'
            }
        })
    })

    document.querySelectorAll('.qc-file-input').forEach(input => {
        input.addEventListener('change', async () => {
            if (!input.files || input.files.length === 0) return
            const jobId = input.dataset.jobid
            let existing = []
            try { existing = parseAttachments(input.dataset.existing || '[]') } catch (e) {}
            
            showToast('กำลังอัพโหลดรูปภาพ...', 'info')
            try {
                const newFiles = await uploadFiles(input.files)
                const combined = [...existing, ...newFiles]
                await updateRecord('jobs', jobId, { qc_images: JSON.stringify(combined) })
                showToast(`อัพโหลด ${newFiles.length} รูปสำเร็จ`, 'success')
                
                const panel = input.closest('.qc-panel')
                let preview = panel?.querySelector('.qc-images-preview')
                if (!preview) {
                    preview = document.createElement('div')
                    preview.className = 'qc-images-preview'
                    input.closest('label')?.before(preview)
                }
                preview.innerHTML += renderAttachments(newFiles)
                input.dataset.existing = JSON.stringify(combined)
                input.value = ''
            } catch (e) {
                console.error('QC upload error:', e)
                showToast('อัพโหลดรูปภาพล้มเหลว', 'error')
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
            filter: `(status='closed')`,
            requestKey: null
        })

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

function getStatusInfo(status) {
    return {
        open: { label: 'รับงาน', cls: 'status-open' },
        in_progress: { label: 'กำลังซ่อม', cls: 'status-in-progress' },
        waiting_parts: { label: 'รออะไหล่', cls: 'status-waiting' },
        qc: { label: 'รอ QC', cls: 'status-waiting' },
        closed: { label: 'เสร็จแล้ว', cls: 'status-closed' }
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
