/**
 * Sales / Service Report page with CSV export and print.
 */
import { formatCurrency, renderDataGrid } from '../components/ui.js'
import { fetchFullList } from '../services/pb.js'
import { exportSingleSheet } from '../services/excel-export.js'
import { sanitizeFilter } from '../utils/sanitize.js'
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export function initReportSalesPage(container) {
    const today = new Date().toISOString().slice(0, 10)
    const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">bar_chart</span>
                <h1>รายงานบริการ / ขาย</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-outline" id="btnExportSalesCSV"><span class="material-icons-outlined">download</span> CSV</button>
                <button class="btn btn-outline" id="btnExportSalesXLSX" style="color:#217346;border-color:#217346;"><span class="material-icons-outlined">table_chart</span> Excel</button>
                <button class="btn btn-outline" id="btnPrintSales"><span class="material-icons-outlined">print</span> พิมพ์</button>
            </div>
        </div>
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-row-4">
                    <div class="form-group">
                        <label class="form-label">วันที่เริ่ม</label>
                        <input type="date" id="repStartDate" class="form-control" value="${lastMonth}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">วันที่สิ้นสุด</label>
                        <input type="date" id="repEndDate" class="form-control" value="${today}">
                    </div>
                    <div class="form-group" style="justify-content:flex-end;gap:var(--sp-2);flex-wrap:wrap;">
                        <button class="btn btn-primary" id="btnLoadReport"><span class="material-icons-outlined">search</span> ดูรายงาน</button>
                        <button class="btn btn-outline btn-sm" id="btnToday">วันนี้</button>
                        <button class="btn btn-outline btn-sm" id="btnThisMonth">เดือนนี้</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue"><span class="material-icons-outlined">receipt</span></div>
                <div class="stat-value" id="statJobCount">0</div>
                <div class="stat-label">จำนวนใบงานที่ปิดแล้ว</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><span class="material-icons-outlined">paid</span></div>
                <div class="stat-value" id="statTotalRev">฿0</div>
                <div class="stat-label">รายได้รวม</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><span class="material-icons-outlined">trending_up</span></div>
                <div class="stat-value" id="statAvg">฿0</div>
                <div class="stat-label">เฉลี่ยต่อใบ</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><span class="material-icons-outlined">person</span></div>
                <div class="stat-value" id="statCustomers">0</div>
                <div class="stat-label">ลูกค้าที่ใช้บริการ</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(34,197,94,0.15);color:#22c55e;"><span class="material-icons-outlined">savings</span></div>
                <div class="stat-value" id="statProfit">฿0</div>
                <div class="stat-label">กำไรรวม</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(168,85,247,0.15);color:#a855f7;"><span class="material-icons-outlined">percent</span></div>
                <div class="stat-value" id="statMargin">0%</div>
                <div class="stat-label">อัตรากำไร</div>
            </div>
        </div>
        <div class="card" style="margin-top:var(--sp-4);margin-bottom:var(--sp-4);">
            <div class="card-header"><h3>กราฟรายได้รายวัน</h3></div>
            <div class="card-body" style="height:280px;position:relative;">
                <canvas id="salesChart"></canvas>
            </div>
        </div>
        <div class="card" style="margin-top:var(--sp-4);">
            <div class="card-header"><h3>รายละเอียดรายงาน</h3></div>
            <div class="card-body" id="reportGrid">
                <div class="empty-state" style="padding:var(--sp-8);">
                    <span class="material-icons-outlined" style="font-size:48px;">assessment</span>
                    <h3>กรุณาเลือกช่วงวันที่แล้วกด "ดูรายงาน"</h3>
                </div>
            </div>
        </div>
    `

    const gridCols = [
        { key: 'job_no', label: 'เลขใบงาน' },
        { key: 'date', label: 'วันที่เสร็จ' },
        { key: 'customer', label: 'ลูกค้า' },
        { key: 'plate', label: 'ทะเบียนรถ' },
        { key: 'subtotal', label: 'มูลค่า (ก่อน VAT)', render: r => formatCurrency(r.subtotal) },
        { key: 'discount', label: 'ส่วนลด', render: r => formatCurrency(r.discount) },
        { key: 'total', label: 'รวมทั้งสิ้น', render: r => formatCurrency(r.total) },
        { key: 'profit', label: 'กำไร', render: r => {
            const p = r.profit || 0
            const color = p >= 0 ? '#22c55e' : '#ef4444'
            return `<span style="color:${color};font-weight:600;">${formatCurrency(p)}</span>`
        }}
    ]

    let lastItems = []

    async function loadReport() {
        const gridEl = container.querySelector('#reportGrid')
        gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังคำนวณรายงาน...</div>'

        const start = container.querySelector('#repStartDate').value
        const end = container.querySelector('#repEndDate').value

        try {
            // P1: Server-side date filtering — only fetch jobs in the selected range
            const jobs = await fetchFullList('jobs', {
                filter: `status='closed' && end_date >= '${sanitizeFilter(start)}' && end_date <= '${sanitizeFilter(end)} 23:59:59'`
            })

            let totalRev = 0, totalProfit = 0, totalCost = 0
            const customers = new Set()
            lastItems = []

            for (const j of jobs) {
                const sub = typeof j.subtotal === 'number' ? j.subtotal : 0
                const disc = typeof j.discount_amount === 'number' ? j.discount_amount : 0
                const grand = typeof j.grand_total === 'number' ? j.grand_total : 0
                const profit = typeof j.profit === 'number' ? j.profit : 0
                const cost = typeof j.total_cost === 'number' ? j.total_cost : 0

                totalRev += grand
                totalProfit += profit
                totalCost += cost
                if (j.customer_name) customers.add(j.customer_name)

                lastItems.push({
                    job_no: j.job_no,
                    date: j.end_date ? j.end_date.split(' ')[0] : '',
                    customer: j.customer_name || '-',
                    plate: j.plate || '-',
                    subtotal: sub,
                    discount: disc,
                    total: grand,
                    profit
                })
            }

            container.querySelector('#statJobCount').textContent = jobs.length
            container.querySelector('#statTotalRev').textContent = formatCurrency(totalRev)
            container.querySelector('#statAvg').textContent = jobs.length > 0 ? formatCurrency(totalRev / jobs.length) : '฿0'
            container.querySelector('#statCustomers').textContent = customers.size

            // U1: Profit stats
            const profitEl = container.querySelector('#statProfit')
            if (profitEl) {
                profitEl.textContent = formatCurrency(totalProfit)
                profitEl.style.color = totalProfit >= 0 ? '#22c55e' : '#ef4444'
            }
            const marginEl = container.querySelector('#statMargin')
            if (marginEl) marginEl.textContent = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) + '%' : '0%'

            lastItems.sort((a, b) => b.job_no.localeCompare(a.job_no))

            // Render chart
            renderSalesChart(lastItems)

            if (lastItems.length > 0) {
                gridEl.innerHTML = renderDataGrid({ columns: gridCols, items: lastItems })
            } else {
                gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">ไม่พบข้อมูลในช่วงวันที่เลือก</div>'
            }

        } catch (e) {
            console.error(e)
            gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:#ef4444;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>'
        }
    }

    let salesChartInstance = null
    function renderSalesChart(items) {
        const canvas = container.querySelector('#salesChart')
        if (!canvas) return
        if (salesChartInstance) salesChartInstance.destroy()

        // Group by date
        const dayMap = {}
        for (const item of items) {
            const d = item.date || 'N/A'
            dayMap[d] = (dayMap[d] || 0) + item.total
        }
        const sorted = Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0]))

        salesChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sorted.map(([d]) => d),
                datasets: [{
                    label: 'รายได้ (฿)',
                    data: sorted.map(([, v]) => v),
                    backgroundColor: 'rgba(37, 99, 235, 0.7)',
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => '฿' + v.toLocaleString() } }
                }
            }
        })
    }

    container.querySelector('#btnLoadReport').addEventListener('click', loadReport)
    container.querySelector('#btnPrintSales').addEventListener('click', () => window.print())
    container.querySelector('#btnExportSalesCSV').addEventListener('click', () => {
        if (lastItems.length === 0) return
        const headers = gridCols.map(c => c.label)
        const keys = gridCols.map(c => c.key)
        const rows = lastItems.map(item => keys.map(k => `"${String(item[k] ?? '').replace(/"/g, '""')}"`).join(','))
        const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'sales_report.csv'
        a.click()
    })
    container.querySelector('#btnExportSalesXLSX').addEventListener('click', async () => {
        if (lastItems.length === 0) return
        const headers = gridCols.map(c => c.label)
        const rows = lastItems.map(item => gridCols.map(c => item[c.key] ?? ''))
        await exportSingleSheet(headers, rows, 'sales_report', 'รายงานขาย')
    })

    // Quick date buttons
    container.querySelector('#btnToday')?.addEventListener('click', () => {
        container.querySelector('#repStartDate').value = today
        container.querySelector('#repEndDate').value = today
        loadReport()
    })
    container.querySelector('#btnThisMonth')?.addEventListener('click', () => {
        const d = new Date()
        const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
        container.querySelector('#repStartDate').value = first
        container.querySelector('#repEndDate').value = today
        loadReport()
    })

    loadReport()
}
