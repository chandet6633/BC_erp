import { fetchFullList } from '../services/pb.js'
import { getBranch, getBranchFilter } from '../services/auth.js'
import { formatCurrency, showToast } from '../components/ui.js'
import { escapeHtml } from '../utils/sanitize.js'
import { printDailySummary } from '../services/print-engine.js'

export function initDailySummaryPage(container) {
    const today = new Date().toISOString().slice(0, 10)
    container.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
            <div class="page-title">
                <span class="material-icons-outlined">point_of_sale</span>
                <h1>สรุปปิดยอดประจำวัน</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-outline" id="btnExportDailyCsv"><span class="material-icons-outlined">download</span> Export CSV</button>
                <button class="btn btn-outline" id="btnPrintSummary"><span class="material-icons-outlined">print</span> พิมพ์รายงาน</button>
            </div>
        </div>

        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div style="display:flex;gap:var(--sp-4);align-items:flex-end;">
                    <div class="form-group" style="margin:0;width:200px;">
                        <label class="form-label">วันที่</label>
                        <input type="date" class="form-control" id="summaryDate" value="${today}">
                    </div>
                    <button class="btn btn-primary" id="btnLoadSummary">โหลดข้อมูล</button>
                </div>
            </div>
        </div>

        <div id="summaryContent" style="display:none;">
            <!-- KPI Cards -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-4);margin-bottom:var(--sp-4);">
                <div class="card" style="background:var(--bc-success-light,#D1FAE5);border-color:var(--bc-success,#10B981);">
                    <div class="card-body">
                        <div class="text-sm text-muted">ยอดขายรวม (ปิดงานแล้ว)</div>
                        <h2 style="margin:0;color:var(--bc-success);" id="kpiTotalRevenue">฿0.00</h2>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="text-sm text-muted">จำนวนใบงาน (ปิดงาน)</div>
                        <h2 style="margin:0;" id="kpiJobCount">0</h2>
                    </div>
                </div>
                <div class="card" style="background:var(--bc-danger-light,#FEE2E2);border-color:var(--bc-danger,#EF4444);">
                    <div class="card-body">
                        <div class="text-sm text-muted">ค้างชำระ (เปิด / ค้างชำระ)</div>
                        <h2 style="margin:0;color:var(--bc-danger);" id="kpiUnpaidCount">0</h2>
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);">
                <!-- Payment Breakdown -->
                <div class="card">
                    <div class="card-header"><h3>ช่องทางการรับเงิน (เฉพาะบิลปิดงาน)</h3></div>
                    <div class="card-body" style="padding:0;">
                        <table class="data-grid" style="width:100%;">
                            <tbody id="paymentBreakdownTbody"></tbody>
                        </table>
                    </div>
                </div>

                <!-- Mechanic Workload -->
                <div class="card">
                    <div class="card-header"><h3>ผลงานช่าง (จำนวนงานที่ทำ)</h3></div>
                    <div class="card-body" style="padding:0;">
                        <table class="data-grid" style="width:100%;">
                            <thead>
                                <tr>
                                    <th>ช่าง</th>
                                    <th style="text-align:right;">ช่างหลัก</th>
                                    <th style="text-align:right;">ช่างช่วย</th>
                                </tr>
                            </thead>
                            <tbody id="mechanicWorkloadTbody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Unpaid / Pending Jobs Table -->
            <div class="card" style="margin-top:var(--sp-4);">
                <div class="card-header" style="background:var(--bc-danger-light,#FEE2E2);color:var(--bc-danger,#B91C1C);">
                    <h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">warning</span> ใบงานค้างชำระ / รอจัดการ</h3>
                </div>
                <div class="card-body" style="padding:0;overflow-x:auto;">
                    <table class="data-grid" style="width:100%;text-align:left;">
                        <thead>
                            <tr>
                                <th>ใบงาน</th>
                                <th>ทะเบียนรถ</th>
                                <th>ยอดเงิน</th>
                                <th>สถานะใบงาน</th>
                                <th>ชำระเงิน</th>
                            </tr>
                        </thead>
                        <tbody id="unpaidJobsTbody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `

    let currentData = null

    container.querySelector('#btnLoadSummary').addEventListener('click', async () => {
        const dateStr = container.querySelector('#summaryDate').value
        if (!dateStr) return
        
        try {
            // BUG 43 FIX: Apply Branch Isolation to Reports
            const branchCond = getBranchFilter()
            const baseFilter = branchCond ? `(${branchCond})&&` : ''

            // Fetch all jobs for branch, filter by date client-side to avoid NocoDB DateTime parse errors
            const allJobs = await fetchFullList('jobs', { filter: baseFilter ? `(${branchCond})` : '' })

            // Filter for date-specific jobs (completed/active today)
            const dateJobs = allJobs.filter(j => {
                const sDate = j.start_date ? String(j.start_date).slice(0, 10) : null
                const eDate = j.end_date ? String(j.end_date).slice(0, 10) : null
                return sDate === dateStr || eDate === dateStr
            })

            // Filter for unpaid jobs (started ON OR BEFORE selected date)
            const pendingJobs = allJobs.filter(j => {
                const sDate = j.start_date ? String(j.start_date).slice(0, 10) : null
                const isPending = j.status === 'pending' || j.status === 'in_progress' || j.payment_status === 'unpaid' || j.payment_status === 'partial'
                return isPending && sDate && sDate <= dateStr
            })
            
            const currentBranch = getBranch()
            const mechanicsList = (await fetchFullList('users', { filter: "role='mechanic' || role='employee' || role='technician'", requestKey: null }))
                .filter(m => !currentBranch || String(m.branch || m.branch_id || '') === String(currentBranch))
            const mechMap = {}
            mechanicsList.forEach(m => mechMap[m.id] = m.display_name || m.name)

            let totalRev = 0
            let closedCount = 0
            let unpaidJobs = []
            
            let payments = {
                'cash': 0,
                'transfer': 0,
                'credit': 0,
                'qr': 0,
                'credit_term': 0,
                'insurance': 0
            }

            let mechStats = {} // { id: { lead: 0, helper: 0 } }

            // Process today's jobs
            dateJobs.forEach(j => {
                if (j.status === 'completed') {
                    closedCount++
                    totalRev += parseFloat(j.grand_total || 0)
                    
                    const payType = j.payment_type || 'cash'
                    payments[payType] = (payments[payType] || 0) + parseFloat(j.grand_total || 0)

                    if (j.lead_mechanic_id) {
                        if (!mechStats[j.lead_mechanic_id]) mechStats[j.lead_mechanic_id] = { lead: 0, helper: 0 }
                        mechStats[j.lead_mechanic_id].lead++
                    }

                    if (j.helper_mechanic_ids) {
                        j.helper_mechanic_ids.split(',').forEach(hid => {
                            const id = hid.trim()
                            if (id) {
                                if (!mechStats[id]) mechStats[id] = { lead: 0, helper: 0 }
                                mechStats[id].helper++
                            }
                        })
                    }
                }
            })

            // Process unpaid jobs
            pendingJobs.forEach(j => {
                if (j.status !== 'cancelled') {
                    // Prevent duplicates if a job is both today's and unpaid
                    if (!unpaidJobs.find(uj => uj.id === j.id)) {
                        unpaidJobs.push(j)
                    }
                }
            })

            // Render KPIs
            container.querySelector('#kpiTotalRevenue').textContent = formatCurrency(totalRev)
            container.querySelector('#kpiJobCount').textContent = closedCount
            container.querySelector('#kpiUnpaidCount').textContent = unpaidJobs.length

            // Render Payments
            const payLabels = {
                'cash': 'เงินสด', 'transfer': 'โอนเงิน', 'credit': 'บัตรเครดิต', 'qr': 'QR Payment', 'credit_term': 'เครดิต', 'insurance': 'ประกัน'
            }
            container.querySelector('#paymentBreakdownTbody').innerHTML = Object.keys(payments).filter(k => payments[k] > 0).map(k => `
                <tr>
                    <td data-label="ช่องทาง">${payLabels[k] || k}</td>
                    <td data-label="จำนวนเงิน" style="text-align:right;">${formatCurrency(payments[k])}</td>
                </tr>
            `).join('') || '<tr><td colspan="2" style="text-align:center;">ไม่มีข้อมูล</td></tr>'

            // BUG 86 FIX: Show ALL mechanics including zero-job ones, not only those who appeared in today's jobs
            container.querySelector('#mechanicWorkloadTbody').innerHTML = mechanicsList.map(m => {
                const mid = m.id
                const stats = mechStats[mid] || { lead: 0, helper: 0 }
                return `
                    <tr>
                        <td data-label="ช่าง">${m.display_name || m.name || 'ไม่ระบุชื่อ'}</td>
                        <td data-label="ช่างหลัก" style="text-align:right;">${stats.lead}</td>
                        <td data-label="ช่างช่วย" style="text-align:right;">${stats.helper}</td>
                    </tr>`
            }).join('') || '<tr><td colspan="3" style="text-align:center;">ไม่มีช่าง</td></tr>'

            // Render Unpaid
            container.querySelector('#unpaidJobsTbody').innerHTML = unpaidJobs.map(j => `
                <tr>
                    <td data-label="ใบงาน"><a href="#/job?id=${j.id}" target="_blank">${escapeHtml(j.job_no)}</a></td>
                    <td data-label="ทะเบียนรถ">${escapeHtml(j.plate)}</td>
                    <td data-label="ยอดเงิน">${formatCurrency(j.grand_total || 0)}</td>
                    <td data-label="สถานะใบงาน"><span class="status-badge ${j.status === 'completed' ? 'success' : 'warning'}">${j.status === 'completed' ? 'ปิดงาน' : 'เปิด'}</span></td>
                    <td data-label="ชำระเงิน"><span class="status-badge ${j.payment_status === 'partial' ? 'warning' : 'danger'}">${j.payment_status === 'partial' ? 'จ่ายบางส่วน' : 'ค้างชำระ'}</span></td>
                </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center;">ไม่มีค้างชำระ</td></tr>'

            container.querySelector('#summaryContent').style.display = 'block'
            
            currentData = {
                date: dateStr,
                totalRev,
                closedCount,
                unpaidCount: unpaidJobs.length,
                payments,
                mechStats,
                mechMap,
                unpaidJobs
            }

        } catch (e) {
            showToast('โหลดข้อมูลล้มเหลว', 'error')
            console.error(e)
        }
    })

    container.querySelector('#btnPrintSummary').addEventListener('click', () => {
        if (!currentData) return showToast('กรุณาโหลดข้อมูลก่อนพิมพ์', 'warning')
        printDailySummary(currentData)
    })

    // BUG 87 FIX: CSV export button for daily summary
    container.querySelector('#btnExportDailyCsv')?.addEventListener('click', () => {
        if (!currentData) return showToast('กรุณาโหลดข้อมูลก่อน', 'warning')

        const { date, totalRev, closedCount, unpaidCount, payments, mechStats, mechMap, unpaidJobs } = currentData

        let csv = '\uFEFF'
        csv += `รายงานสรุปประจำวัน,${date}\n`
        csv += `รายได้รวม,${totalRev}\n`
        csv += `ใบงานเสร็จ,${closedCount}\n`
        csv += `ค้างชำระ,${unpaidCount}\n\n`

        csv += 'ช่องทาง,ยอดเงิน\n'
        Object.keys(payments).forEach(k => { if (payments[k] > 0) csv += `${k},${payments[k]}\n` })
        csv += '\n'

        csv += 'ชื่อช่าง,ช่างหลัก,ช่างช่วย\n'
        Object.keys(mechStats).forEach(mid => { csv += `${mechMap[mid] || mid},${mechStats[mid].lead},${mechStats[mid].helper}\n` })
        csv += '\n'

        csv += 'ใบงาน,ทะเบียน,ยอด,สถานะ\n'
        unpaidJobs.forEach(j => { csv += `${j.job_no},${j.plate},${j.grand_total || 0},${j.payment_status}\n` })

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `daily_summary_${date}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
    })

    // Auto load for today
    container.querySelector('#btnLoadSummary').click()
}
