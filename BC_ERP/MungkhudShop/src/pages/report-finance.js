/**
 * Finance Report page — live data from jobs + documents.
 * Simplified versions of UrsaShop finance reports:
 * - สรุปรายรับ-รายจ่าย (Income vs Expense)
 * - ยอดขายตามลูกค้า (Sales by Customer)
 * - ยอดขายตามรถ (Sales by Vehicle)
 * - รายการขายค่ำกว่าทุน (Below-Cost Sales)
 */
import { formatCurrency, renderDataGrid } from '../components/ui.js'
import { fetchFullList } from '../services/pb.js'
import { exportSingleSheet } from '../services/excel-export.js'
import { sanitizeFilter } from '../utils/sanitize.js'
import { getBranchFilter } from '../services/auth.js'
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export function initReportFinancePage(container) {
    const today = new Date().toISOString().slice(0, 10)
    const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">account_balance</span>
                <h1>รายงานการเงิน</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-outline" id="btnExportFinCSV"><span class="material-icons-outlined">download</span> CSV</button>
                <button class="btn btn-outline" id="btnExportFinXLSX" style="color:#217346;border-color:#217346;"><span class="material-icons-outlined">table_chart</span> Excel</button>
                <button class="btn btn-outline" id="btnPrintFin"><span class="material-icons-outlined">print</span> พิมพ์</button>
            </div>
        </div>
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-row-4">
                    <div class="form-group">
                        <label class="form-label">วันที่เริ่ม</label>
                        <input type="date" class="form-control" id="finStart" value="${lastMonth}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">วันที่สิ้นสุด</label>
                        <input type="date" class="form-control" id="finEnd" value="${today}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ประเภทรายงาน</label>
                        <select class="form-control" id="finReportType">
                            <option value="income_expense">สรุปรายรับ-รายจ่าย</option>
                            <option value="sales_by_customer">ยอดขายตามลูกค้า</option>
                            <option value="sales_by_vehicle">ยอดขายตามรถ</option>
                            <option value="daily_summary">สรุปยอดขายรายวัน</option>
                            <option value="below_cost">รายการขายต่ำกว่าทุน</option>
                        </select>
                    </div>
                    <div class="form-group" style="justify-content:flex-end;gap:var(--sp-2);flex-wrap:wrap;">
                        <button class="btn btn-primary" id="btnRunFinReport"><span class="material-icons-outlined">search</span> ดูรายงาน</button>
                        <button class="btn btn-outline btn-sm" id="btnFinToday">วันนี้</button>
                        <button class="btn btn-outline btn-sm" id="btnFinThisMonth">เดือนนี้</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="card" id="finChartCard" style="margin-bottom:var(--sp-4);display:none;">
            <div class="card-header"><h3>กราฟรายรับ-รายจ่าย</h3></div>
            <div class="card-body" style="height:280px;position:relative;">
                <canvas id="finChart"></canvas>
            </div>
        </div>
        <div class="stats-grid" id="finStats" style="margin-bottom:var(--sp-4);"></div>
        <div class="card">
            <div class="card-header"><h3 id="finReportTitle">รายละเอียดการเงิน</h3></div>
            <div class="card-body" id="finReportGrid">
                <div class="empty-state" style="padding:var(--sp-8);">
                    <span class="material-icons-outlined" style="font-size:48px;">account_balance</span>
                    <h3>กรุณาเลือกช่วงวันที่แล้วกด "ดูรายงาน"</h3>
                </div>
            </div>
        </div>
    `

    let lastItems = []
    let lastColumns = []

    async function runReport() {
        const start = container.querySelector('#finStart').value
        const end = container.querySelector('#finEnd').value
        const type = container.querySelector('#finReportType').value
        const gridEl = container.querySelector('#finReportGrid')
        const statsEl = container.querySelector('#finStats')
        gridEl.innerHTML = '<div style="padding:var(--sp-6);text-align:center;color:var(--color-text-muted);">กำลังคำนวณ...</div>'

        try {
            // BUG 18 FIX: Apply branch filter to prevent cross-branch data leakage in finance reports
            const bf = getBranchFilter()
            const branchAnd = bf ? ` && ${bf}` : ''

            // P1: Server-side date filtering — only fetch records in selected range
            const closedJobs = await fetchFullList('jobs', {
                filter: `status='completed' && end_date >= '${sanitizeFilter(start)}' && end_date <= '${sanitizeFilter(end)} 23:59:59'${branchAnd}`
            })
            const purchaseDocs = await fetchFullList('documents', {
                filter: `(doc_type='RR' || doc_type='PI' || doc_type='PCN') && issue_date >= '${sanitizeFilter(start)}' && issue_date <= '${sanitizeFilter(end)} 23:59:59'${branchAnd}`
            })

            const totalIncome = closedJobs.reduce((s, j) => s + (j.grand_total || 0), 0)
            const totalExpense = purchaseDocs.reduce((s, d) => s + (d.grand_total || 0), 0)
            const netProfit = totalIncome - totalExpense
            const totalVat = closedJobs.reduce((s, j) => s + (j.vat_amount || 0), 0)

            if (type === 'income_expense') {
                container.querySelector('#finReportTitle').textContent = 'สรุปรายรับ-รายจ่าย'
                statsEl.innerHTML = `
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">trending_up</span></div><div class="stat-value">${formatCurrency(totalIncome)}</div><div class="stat-label">รายรับรวม</div></div>
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">trending_down</span></div><div class="stat-value">${formatCurrency(totalExpense)}</div><div class="stat-label">รายจ่ายรวม</div></div>
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">account_balance</span></div><div class="stat-value" style="color:${netProfit >= 0 ? 'var(--color-success)' : '#ef4444'}">${formatCurrency(netProfit)}</div><div class="stat-label">กำไร/ขาดทุน</div></div>
                    <div class="stat-card"><div class="stat-icon orange"><span class="material-icons-outlined">receipt</span></div><div class="stat-value">${formatCurrency(totalVat)}</div><div class="stat-label">ภาษีขาย (VAT)</div></div>
                `
                lastColumns = [
                    { key: 'type', label: 'ประเภท' },
                    { key: 'doc_no', label: 'เลขเอกสาร' },
                    { key: 'date', label: 'วันที่' },
                    { key: 'entity', label: 'ลูกค้า/ผู้จำหน่าย' },
                    { key: 'amount', label: 'จำนวนเงิน', render: r => `<span style="color:${r.direction === 'in' ? 'var(--color-success)' : '#ef4444'}">${formatCurrency(r.amount)}</span>` },
                ]
                const incomeRows = closedJobs.map(j => ({ type: 'รายรับ (งานบริการ)', doc_no: j.job_no, date: j.end_date ? j.end_date.split(' ')[0] : '', entity: j.customer_name || '-', amount: j.grand_total || 0, direction: 'in' }))
                const expenseRows = purchaseDocs.map(d => ({ type: 'รายจ่าย (สั่งซื้อ)', doc_no: d.doc_no, date: d.issue_date ? d.issue_date.split(' ')[0] : '', entity: d.entity_id || '-', amount: d.grand_total || 0, direction: 'out' }))
                lastItems = [...incomeRows, ...expenseRows].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                renderFinChart(closedJobs, purchaseDocs)

            } else if (type === 'sales_by_customer') {
                container.querySelector('#finReportTitle').textContent = 'ยอดขายตามลูกค้า'
                const custMap = {}
                for (const j of closedJobs) {
                    const name = j.customer_name || 'ไม่ระบุ'
                    if (!custMap[name]) custMap[name] = { customer: name, count: 0, total: 0 }
                    custMap[name].count++
                    custMap[name].total += (j.grand_total || 0)
                }
                lastColumns = [
                    { key: 'customer', label: 'ชื่อลูกค้า' },
                    { key: 'count', label: 'จำนวนใบงาน' },
                    { key: 'total', label: 'ยอดรวม', render: r => formatCurrency(r.total) },
                    { key: 'avg', label: 'เฉลี่ยต่อใบ', render: r => formatCurrency(r.count > 0 ? r.total / r.count : 0) },
                ]
                lastItems = Object.values(custMap).sort((a, b) => b.total - a.total)
                statsEl.innerHTML = `
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">people</span></div><div class="stat-value">${lastItems.length}</div><div class="stat-label">ลูกค้าที่ใช้บริการ</div></div>
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">paid</span></div><div class="stat-value">${formatCurrency(totalIncome)}</div><div class="stat-label">ยอดขายรวม</div></div>
                `

            } else if (type === 'sales_by_vehicle') {
                container.querySelector('#finReportTitle').textContent = 'ยอดขายตามรถ'
                const plateMap = {}
                for (const j of closedJobs) {
                    const p = j.plate || 'ไม่ระบุ'
                    if (!plateMap[p]) plateMap[p] = { plate: p, customer: j.customer_name || '-', count: 0, total: 0 }
                    plateMap[p].count++
                    plateMap[p].total += (j.grand_total || 0)
                }
                lastColumns = [
                    { key: 'plate', label: 'ทะเบียนรถ' },
                    { key: 'customer', label: 'ลูกค้า' },
                    { key: 'count', label: 'จำนวนครั้ง' },
                    { key: 'total', label: 'ยอดรวม', render: r => formatCurrency(r.total) },
                ]
                lastItems = Object.values(plateMap).sort((a, b) => b.total - a.total)
                statsEl.innerHTML = `
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">directions_car</span></div><div class="stat-value">${lastItems.length}</div><div class="stat-label">รถที่เข้าใช้บริการ</div></div>
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">paid</span></div><div class="stat-value">${formatCurrency(totalIncome)}</div><div class="stat-label">ยอดขายรวม</div></div>
                `

            } else if (type === 'daily_summary') {
                container.querySelector('#finReportTitle').textContent = 'สรุปยอดขายและรายจ่ายรายวัน'
                const dayMap = {}
                for (const j of closedJobs) {
                    const d = j.end_date ? j.end_date.split(' ')[0] : 'ไม่ระบุ'
                    if (!dayMap[d]) dayMap[d] = { date: d, count: 0, total: 0, expense: 0 }
                    dayMap[d].count++
                    dayMap[d].total += (j.grand_total || 0)
                }
                for (const d of purchaseDocs) {
                    const date = d.issue_date ? d.issue_date.split(' ')[0] : 'ไม่ระบุ'
                    if (!dayMap[date]) dayMap[date] = { date: date, count: 0, total: 0, expense: 0 }
                    dayMap[date].expense += (d.grand_total || 0)
                }
                lastColumns = [
                    { key: 'date', label: 'วันที่' },
                    { key: 'count', label: 'จำนวนใบงาน' },
                    { key: 'total', label: 'ยอดขายรวม', render: r => `<span style="color:var(--color-success)">${formatCurrency(r.total)}</span>` },
                    { key: 'expense', label: 'รายจ่ายรวม', render: r => `<span style="color:#ef4444">${formatCurrency(r.expense)}</span>` },
                    { key: 'net', label: 'ยอดสุทธิ', render: r => {
                        const net = r.total - r.expense;
                        return `<span style="font-weight:bold;color:${net >= 0 ? 'var(--color-success)' : '#ef4444'}">${formatCurrency(net)}</span>`
                    }},
                ]
                lastItems = Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date))
                const avgDaily = lastItems.length > 0 ? totalIncome / lastItems.length : 0
                statsEl.innerHTML = `
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">calendar_today</span></div><div class="stat-value">${lastItems.length}</div><div class="stat-label">จำนวนวันทำงาน</div></div>
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">paid</span></div><div class="stat-value">${formatCurrency(totalIncome)}</div><div class="stat-label">ยอดขายรวม</div></div>
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">trending_down</span></div><div class="stat-value">${formatCurrency(totalExpense)}</div><div class="stat-label">รายจ่ายรวม</div></div>
                `
            }

            // FIX #4: Below-cost sales report
            else if (type === 'below_cost') {
                container.querySelector('#finReportTitle').textContent = 'รายการขายต่ำกว่าทุน'
                // BUG 12 FIX: Fetch items only for the closed jobs in the date range, in chunks of 50 to prevent URI Too Long
                let jobItems = []
                const jobIds = closedJobs.map(j => j.id)
                for (let i = 0; i < jobIds.length; i += 50) {
                    const chunk = jobIds.slice(i, i + 50)
                    const filterStr = chunk.map(id => `job_id='${sanitizeFilter(id)}'`).join('||')
                    const itemsChunk = await fetchFullList('job_items', { filter: `(${filterStr})`, requestKey: null })
                    jobItems = jobItems.concat(itemsChunk)
                }

                // Fetch only needed products instead of the entire catalog
                const productIds = [...new Set(jobItems.filter(ji => ji.product_id).map(ji => ji.product_id))]
                let products = []
                for (let i = 0; i < productIds.length; i += 50) {
                    const chunk = productIds.slice(i, i + 50)
                    const filterStr = chunk.map(id => `id='${sanitizeFilter(id)}'`).join('||')
                    const prodsChunk = await fetchFullList('products', { filter: `(${filterStr})`, requestKey: null })
                    products = products.concat(prodsChunk)
                }

                const prodMap = {}
                products.forEach(p => { prodMap[p.id] = p })
                const belowCostItems = []

                for (const ji of jobItems) {
                    const prod = prodMap[ji.product_id]
                    // BUG 10 FIX: Prioritize historical item-level cost snapshot over master cost
                    const snapshotCost = Number(ji.cost || 0)
                    const costToCompare = snapshotCost > 0 ? snapshotCost : (prod ? Number(prod.cost || 0) : 0)
                    
                    if (costToCompare <= 0) continue
                    const unitPrice = ji.unit_price || 0
                    if (unitPrice < costToCompare) {
                        // Find the job for date context
                        const job = closedJobs.find(j => j.id === ji.job_id)
                        belowCostItems.push({
                            job_no: job ? job.job_no : ji.job_id,
                            date: job ? (job.end_date || job.CreatedAt || '').split(' ')[0] : '-',
                            product: prod ? prod.name : (ji.product_name || 'ไม่ระบุ'),
                            cost: costToCompare,
                            sold_at: unitPrice,
                            loss: (costToCompare - unitPrice) * (ji.qty || 1),
                            qty: ji.qty || 1
                        })
                    }
                }

                lastColumns = [
                    { key: 'job_no', label: 'ใบงาน' },
                    { key: 'date', label: 'วันที่' },
                    { key: 'product', label: 'สินค้า' },
                    { key: 'qty', label: 'จำนวน' },
                    { key: 'cost', label: 'ต้นทุน', render: r => formatCurrency(r.cost) },
                    { key: 'sold_at', label: 'ขายที่', render: r => `<span style="color:#ef4444;">${formatCurrency(r.sold_at)}</span>` },
                    { key: 'loss', label: 'ขาดทุน', render: r => `<span style="color:#ef4444;font-weight:600;">-${formatCurrency(r.loss)}</span>` },
                ]
                lastItems = belowCostItems.sort((a, b) => b.loss - a.loss)
                const totalLoss = lastItems.reduce((s, i) => s + i.loss, 0)
                statsEl.innerHTML = `
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">warning</span></div><div class="stat-value">${lastItems.length}</div><div class="stat-label">รายการที่ขายต่ำกว่าทุน</div></div>
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">trending_down</span></div><div class="stat-value" style="color:#ef4444;">${formatCurrency(totalLoss)}</div><div class="stat-label">ขาดทุนรวม</div></div>
                `
            }

            if (lastItems.length > 0) {
                gridEl.innerHTML = renderDataGrid({ columns: lastColumns, items: lastItems })
            } else {
                gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>'
            }

        } catch (e) {
            console.error(e)
            gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:#ef4444;">เกิดข้อผิดพลาด</div>'
        }
    }

    let finChartInstance = null
    function renderFinChart(jobs, purchases) {
        const card = container.querySelector('#finChartCard')
        const canvas = container.querySelector('#finChart')
        if (!card || !canvas) return
        card.style.display = ''
        if (finChartInstance) finChartInstance.destroy()

        // Group income by date
        const dayMap = {}
        for (const j of jobs) {
            const d = j.end_date ? j.end_date.split(' ')[0] : 'N/A'
            if (!dayMap[d]) dayMap[d] = { income: 0, expense: 0 }
            dayMap[d].income += (j.grand_total || 0)
        }
        for (const p of purchases) {
            const d = p.issue_date ? p.issue_date.split(' ')[0] : 'N/A'
            if (!dayMap[d]) dayMap[d] = { income: 0, expense: 0 }
            dayMap[d].expense += (p.grand_total || 0)
        }
        const sorted = Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0]))

        finChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sorted.map(([d]) => d),
                datasets: [
                    { label: 'รายรับ', data: sorted.map(([, v]) => v.income), backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 4 },
                    { label: 'รายจ่าย', data: sorted.map(([, v]) => v.expense), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => '฿' + v.toLocaleString() } }
                }
            }
        })
    }

    container.querySelector('#btnRunFinReport').addEventListener('click', runReport)
    container.querySelector('#btnPrintFin').addEventListener('click', () => window.print())
    container.querySelector('#btnExportFinCSV').addEventListener('click', () => {
        if (lastItems.length === 0) return
        exportCSV('finance_report.csv', lastColumns, lastItems)
    })
    container.querySelector('#btnExportFinXLSX').addEventListener('click', async () => {
        if (lastItems.length === 0) return
        const headers = lastColumns.map(c => c.label)
        const rows = lastItems.map(item => lastColumns.map(c => item[c.key] ?? ''))
        await exportSingleSheet(headers, rows, 'finance_report', 'การเงิน')
    })

    // Quick date buttons
    container.querySelector('#btnFinToday')?.addEventListener('click', () => {
        container.querySelector('#finStart').value = today
        container.querySelector('#finEnd').value = today
        runReport()
    })
    container.querySelector('#btnFinThisMonth')?.addEventListener('click', () => {
        const d = new Date()
        const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
        container.querySelector('#finStart').value = first
        container.querySelector('#finEnd').value = today
        runReport()
    })
}

function exportCSV(filename, columns, items) {
    const headers = columns.map(c => c.label)
    const keys = columns.map(c => c.key)
    const rows = items.map(item => keys.map(k => `"${String(item[k] ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
}
