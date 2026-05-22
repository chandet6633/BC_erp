import { fetchFullList } from '../services/pb.js'
import { formatCurrency, showToast } from '../components/ui.js'
import { escapeHtml } from '../utils/sanitize.js'
import { getBranch, getBranchFilter } from '../services/auth.js'

export function initMechanicKpiPage(container) {
    // Default to this month
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">engineering</span>
                <h1>ผลงานช่าง (Mechanic KPI)</h1>
            </div>
        </div>

        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div style="display:flex;gap:var(--sp-4);align-items:flex-end;flex-wrap:wrap;">
                    <div class="form-group" style="margin:0;width:150px;">
                        <label class="form-label">ตั้งแต่วันที่</label>
                        <input type="date" class="form-control" id="kpiStartDate" value="${firstDay}">
                    </div>
                    <div class="form-group" style="margin:0;width:150px;">
                        <label class="form-label">ถึงวันที่</label>
                        <input type="date" class="form-control" id="kpiEndDate" value="${lastDay}">
                    </div>
                    <button class="btn btn-primary" id="btnLoadKpi">โหลดข้อมูล</button>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-body" style="padding:0;overflow-x:auto;">
                <table class="data-grid" style="width:100%;text-align:left;">
                    <thead>
                        <tr>
                            <th>ชื่อช่าง</th>
                            <th style="text-align:center;">งานหลัก (ใบ)</th>
                            <th style="text-align:center;">งานช่วย (ใบ)</th>
                            <th style="text-align:center;">เวลาทำงานรวม (ชม.)</th>
                            <th style="text-align:center;">เฉลี่ยต่อใบงาน (นาที)</th>
                            <th style="text-align:right;">รายได้จากงานหลัก</th>
                        </tr>
                    </thead>
                    <tbody id="kpiTbody">
                        <!-- KPI rows injected here -->
                    </tbody>
                </table>
            </div>
        </div>
    `

    container.querySelector('#btnLoadKpi').addEventListener('click', async () => {
        const start = container.querySelector('#kpiStartDate').value
        const end = container.querySelector('#kpiEndDate').value
        if (!start || !end) return showToast('กรุณาเลือกช่วงเวลา', 'warning')

        try {
            const tbody = container.querySelector('#kpiTbody')
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">กำลังโหลด...</td></tr>'

            const currentBranch = getBranch()
            const mechanics = (await fetchFullList('users', { filter: "role='mechanic' || role='employee' || role='technician'", requestKey: null }))
                .filter(m => !currentBranch || String(m.branch || m.branch_id || '') === String(currentBranch))
            
            // Fetch jobs within date range — scoped to user's branch
            // BUG 87 FIX: Apply branch filter so mechanics only see their own branch's KPI
            const branchFilter = getBranchFilter()
            let jobFilter = `status='completed' && end_date >= '${start}' && end_date <= '${end} 23:59:59'`
            if (branchFilter) jobFilter += ` && ${branchFilter}`

            const jobs = await fetchFullList('jobs', { 
                filter: jobFilter,
                requestKey: null 
            })
            const filteredJobs = jobs

            // Aggregate data
            // stats: { mechanicId: { led: 0, assisted: 0, duration_mins: 0, revenue: 0 } }
            const stats = {}
            mechanics.forEach(m => {
                stats[m.id] = { led: 0, assisted: 0, duration_mins: 0, revenue: 0, name: m.display_name || m.name }
            })

            filteredJobs.forEach(j => {
                const duration = j.work_duration_minutes ? parseInt(j.work_duration_minutes, 10) : 0
                const rev = parseFloat(j.grand_total || 0)

                // Lead
                if (j.lead_mechanic_id && stats[j.lead_mechanic_id]) {
                    stats[j.lead_mechanic_id].led++
                    stats[j.lead_mechanic_id].duration_mins += duration
                    stats[j.lead_mechanic_id].revenue += rev
                }

                // Helpers
                if (j.helper_mechanic_ids) {
                    const helpers = j.helper_mechanic_ids.split(',').map(s => s.trim())
                    helpers.forEach(hId => {
                        if (hId && stats[hId]) {
                            stats[hId].assisted++
                            // Duration applies to helpers too? Assuming yes, or at least partial.
                            // We will apply the same duration to helpers for "time spent working"
                            stats[hId].duration_mins += duration
                        }
                    })
                }
            })

            // Render
            let html = ''
            Object.values(stats).forEach(s => {
                const totalJobs = s.led + s.assisted
                if (totalJobs === 0) return // Skip mechanics with no jobs
                
                const hours = (s.duration_mins / 60).toFixed(1)
                const avgMins = s.led > 0 ? Math.round(s.duration_mins / s.led) : 0 // Calculate avg based on led jobs for simplicity

                html += `
                    <tr>
                        <td data-label="ชื่อช่าง"><strong>${escapeHtml(s.name)}</strong></td>
                        <td data-label="งานหลัก (ใบ)" style="text-align:center;">${s.led}</td>
                        <td data-label="งานช่วย (ใบ)" style="text-align:center;">${s.assisted}</td>
                        <td data-label="เวลาทำงานรวม (ชม.)" style="text-align:center;">${hours}</td>
                        <td data-label="เฉลี่ยต่อใบงาน (นาที)" style="text-align:center;">${avgMins}</td>
                        <td data-label="รายได้จากงานหลัก" style="text-align:right;">${formatCurrency(s.revenue)}</td>
                    </tr>
                `
            })

            tbody.innerHTML = html || '<tr><td colspan="6" style="text-align:center;">ไม่พบข้อมูลในช่วงเวลานี้</td></tr>'

        } catch (e) {
            console.error(e)
            showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล KPI', 'error')
        }
    })

    // Auto load
    container.querySelector('#btnLoadKpi').click()
}
