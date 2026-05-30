/**
 * Inventory Report page — live data from products + stock_ledgers.
 * Simplified versions of UrsaShop inventory reports:
 * - สรุปยอดเบิกสินค้า (Requisition Summary)
 * - สต็อกการ์ด (Stock Card)  
 * - สินค้าคงคลัง ณ วันที่กำหนด (Stock at Date)
 * - สินค้าคงคลัง (มีต้นทุน) (Stock with Cost)
 */
import { formatCurrency, renderDataGrid } from '../components/ui.js'
import { fetchFullList } from '../services/pb.js'
import { exportSingleSheet } from '../services/excel-export.js'
import { getBranch } from '../services/auth.js'
import { getStockStatus, isLowStock, isStockTrackedProduct } from '../utils/stock-rules.js'
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js'
Chart.register(DoughnutController, ArcElement, Tooltip, Legend)

function renderStockStatusBadge(product, qty) {
    const status = getStockStatus(product, qty)
    if (status.key === 'out') return '<span class="badge badge-cancelled">หมด</span>'
    if (status.key === 'low') return `<span class="badge badge-pending">ใกล้หมด (Min ${status.minQty})</span>`
    if (status.key === 'over') return `<span class="badge badge-pending">สูงกว่า Max (${status.maxQty})</span>`
    return '<span class="badge badge-closed">ปกติ</span>'
}

export function initReportInventoryPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">analytics</span>
                <h1>รายงานคลังสินค้า</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-outline" id="btnExportInvCSV"><span class="material-icons-outlined">download</span> CSV</button>
                <button class="btn btn-outline" id="btnExportInvXLSX" style="color:#217346;border-color:#217346;"><span class="material-icons-outlined">table_chart</span> Excel</button>
                <button class="btn btn-outline" id="btnPrintInv"><span class="material-icons-outlined">print</span> พิมพ์</button>
            </div>
        </div>
        <div class="card" id="invChartCard" style="margin-bottom:var(--sp-4);display:none;">
            <div class="card-header"><h3>สถานะสต็อก</h3></div>
            <div class="card-body" style="height:260px;position:relative;display:flex;justify-content:center;">
                <canvas id="invChart" style="max-width:350px;"></canvas>
            </div>
        </div>
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-row-4">
                    <div class="form-group">
                        <label class="form-label">ประเภทรายงาน</label>
                        <select class="form-control" id="invReportType">
                            <option value="stock_valuation">สินค้าคงคลัง (มีต้นทุน)</option>
                            <option value="stock_card">สต็อกการ์ด (ประวัติเคลื่อนไหว)</option>
                            <option value="requisition_summary">สรุปยอดเบิกสินค้า</option>
                            <option value="low_stock">สินค้าใกล้หมด / หมดสต็อก</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">กลุ่มสินค้า</label>
                        <select class="form-control" id="invGroupFilter">
                            <option value="">ทั้งหมด</option>
                        </select>
                    </div>
                    <div class="form-group" id="invDateGroup" style="display:none;">
                        <label class="form-label">ช่วงวันที่ (สำหรับสต็อกการ์ด/เบิก)</label>
                        <div style="display:flex;gap:var(--sp-2);">
                            <input type="date" id="invStartDate" class="form-control">
                            <input type="date" id="invEndDate" class="form-control">
                        </div>
                    </div>
                    <div class="form-group" style="justify-content:flex-end;gap:var(--sp-2);flex-wrap:wrap;">
                        <button class="btn btn-primary" id="btnRunInvReport"><span class="material-icons-outlined">search</span> ดูรายงาน</button>
                        <button class="btn btn-outline btn-sm" id="btnInvToday" style="display:none;">วันนี้</button>
                        <button class="btn btn-outline btn-sm" id="btnInvThisMonth" style="display:none;">เดือนนี้</button>
                    </div>
                </div>
            </div>
        </div>
        <script>
            // Toggle date inputs based on report type
            document.getElementById('invReportType').addEventListener('change', (e) => {
                const isDateReport = ['stock_card', 'requisition_summary'].includes(e.target.value)
                document.getElementById('invDateGroup').style.display = isDateReport ? 'block' : 'none'
                document.getElementById('btnInvToday').style.display = isDateReport ? 'inline-block' : 'none'
                document.getElementById('btnInvThisMonth').style.display = isDateReport ? 'inline-block' : 'none'
            })
        </script>
        <div class="stats-grid" id="invStats" style="margin-bottom:var(--sp-4);"></div>
        <div class="card">
            <div class="card-header"><h3 id="invReportTitle">ผลรายงาน</h3></div>
            <div class="card-body" id="invReportGrid">
                <div class="empty-state" style="padding:var(--sp-8);">
                    <span class="material-icons-outlined" style="font-size:48px;">inventory</span>
                    <h3>กรุณาเลือกประเภทรายงานแล้วกด "ดูรายงาน"</h3>
                </div>
            </div>
        </div>
    `

    let lastItems = []
    let lastColumns = []

    async function runReport() {
        const type = container.querySelector('#invReportType').value
        const group = container.querySelector('#invGroupFilter').value
        const gridEl = container.querySelector('#invReportGrid')
        const statsEl = container.querySelector('#invStats')
        gridEl.innerHTML = '<div style="padding:var(--sp-6);text-align:center;color:var(--color-text-muted);">กำลังคำนวณ...</div>'

        try {
            const products = (await fetchFullList('products', { requestKey: null })).filter(isStockTrackedProduct)
            
            // BUG 13 & 16 FIX: Fetch pre-aggregated balances from server for snapshot reports
            let stockMap = {}
            let costMap = {}
            let ledgers = []

            if (type === 'stock_valuation' || type === 'low_stock') {
                const res = await fetch(`/api/data/custom/stock-balances?branch_id=${encodeURIComponent(getBranch() || '')}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('mungkhud_jwt')}` }
                })
                if (res.ok) stockMap = await res.json()
            } else {
                // For ledger-based reports, use date filters to prevent OOM
                const start = container.querySelector('#invStartDate')?.value || '2000-01-01'
                const end = container.querySelector('#invEndDate')?.value || '2100-01-01'
                ledgers = await fetchFullList('stock_ledgers', { 
                    filter: `CreatedAt >= '${start} 00:00:00' && CreatedAt <= '${end} 23:59:59'`,
                    requestKey: null 
                })
            }

            // Resolve group names
            let groupMap = {}
            try {
                const groups = await fetchFullList('product_groups', { requestKey: null })
                groups.forEach(g => { groupMap[g.id] = g.name })
            } catch (_) { /* groups may not exist */ }

            let filtered = products
            if (group) filtered = filtered.filter(p => p.group_id === group)

            if (type === 'stock_valuation') {
                container.querySelector('#invReportTitle').textContent = 'สินค้าคงคลัง (มีต้นทุน)'
                lastColumns = [
                    { key: 'code', label: 'รหัส' },
                    { key: 'name', label: 'ชื่อสินค้า' },
                    { key: 'unit', label: 'หน่วย' },
                    { key: 'qty', label: 'คงเหลือ' },
                    { key: 'avg_cost', label: 'ต้นทุนเฉลี่ย', render: r => formatCurrency(r.avg_cost) },
                    { key: 'total_value', label: 'มูลค่ารวม', render: r => formatCurrency(r.total_value) },
                    { key: 'status', label: 'สถานะ', render: r => renderStockStatusBadge(r, r.qty) },
                ]
                // FIX #1: use p.id (not p.code) to join with ledger
                // FIX #7: use product.cost (WAC) as primary source
                lastItems = filtered.map(p => {
                    const sm = stockMap[p.id] || { qty: 0, total_value: 0 }
                    const qty = typeof sm === 'number' ? sm : (sm.qty || 0)
                    const total_val = typeof sm === 'number' ? 0 : (sm.total_value || 0)
                    const cost = p.cost || (qty > 0 ? total_val / qty : 0)
                    return { ...p, qty, avg_cost: cost, total_value: qty * cost }
                }).sort((a, b) => (a.code || '').localeCompare(b.code || ''))

                const totalVal = lastItems.reduce((s, i) => s + i.total_value, 0)
                const totalItems = lastItems.length
                const outOfStock = lastItems.filter(i => i.qty <= 0).length
                statsEl.innerHTML = `
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">category</span></div><div class="stat-value">${totalItems}</div><div class="stat-label">รายการ</div></div>
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">attach_money</span></div><div class="stat-value">${formatCurrency(totalVal)}</div><div class="stat-label">มูลค่ารวม</div></div>
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">block</span></div><div class="stat-value">${outOfStock}</div><div class="stat-label">หมดสต็อก</div></div>
                `
                renderInvChart(lastItems)

            } else if (type === 'stock_card') {
                container.querySelector('#invReportTitle').textContent = 'สต็อกการ์ด (ประวัติเคลื่อนไหว)'
                lastColumns = [
                    { key: 'created', label: 'วันที่', render: r => r.CreatedAt ? r.CreatedAt.split(' ')[0] : '-' },
                    { key: 'product_id', label: 'รหัสสินค้า' },
                    { key: 'transaction_type', label: 'ประเภท', render: r => r.transaction_type === 'IN' ? '<span class="badge badge-closed">เข้า</span>' : r.transaction_type === 'OUT' ? '<span class="badge badge-cancelled">ออก</span>' : '<span class="badge badge-pending">ปรับ</span>' },
                    { key: 'reference_doc', label: 'เอกสารอ้างอิง' },
                    { key: 'qty', label: 'จำนวน' },
                    { key: 'unit_cost', label: 'ราคา/หน่วย', render: r => formatCurrency(r.unit_cost) },
                    { key: 'total_value', label: 'มูลค่า', render: r => formatCurrency(r.total_value) },
                ]
                lastItems = [...ledgers].sort((a, b) => (b.CreatedAt || '').localeCompare(a.CreatedAt || ''))
                statsEl.innerHTML = `
                    <div class="stat-card"><div class="stat-icon blue"><span class="material-icons-outlined">swap_vert</span></div><div class="stat-value">${ledgers.length}</div><div class="stat-label">รายการเคลื่อนไหว</div></div>
                    <div class="stat-card"><div class="stat-icon green"><span class="material-icons-outlined">add_circle</span></div><div class="stat-value">${ledgers.filter(l => l.transaction_type === 'IN').length}</div><div class="stat-label">รับเข้า</div></div>
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">remove_circle</span></div><div class="stat-value">${ledgers.filter(l => l.transaction_type === 'OUT').length}</div><div class="stat-label">เบิกออก</div></div>
                `

            } else if (type === 'requisition_summary') {
                container.querySelector('#invReportTitle').textContent = 'สรุปยอดเบิกสินค้า'
                const outLedgers = ledgers.filter(l => l.transaction_type === 'OUT')
                const reqMap = {}
                for (const l of outLedgers) {
                    if (!reqMap[l.product_id]) reqMap[l.product_id] = { product_id: l.product_id, total_qty: 0, total_value: 0, count: 0 }
                    reqMap[l.product_id].total_qty += Math.abs(l.qty || 0)
                    reqMap[l.product_id].total_value += Math.abs(l.total_value || 0)
                    reqMap[l.product_id].count++
                }
                lastColumns = [
                    { key: 'product_id', label: 'รหัสสินค้า' },
                    { key: 'name', label: 'ชื่อสินค้า' },
                    { key: 'count', label: 'จำนวนครั้ง' },
                    { key: 'total_qty', label: 'จำนวนเบิกรวม' },
                    { key: 'total_value', label: 'มูลค่ารวม', render: r => formatCurrency(r.total_value) },
                ]
                // FIX #1: join by p.id not p.code
                lastItems = Object.values(reqMap).map(r => {
                    const prod = products.find(p => p.id === r.product_id || p.code === r.product_id)
                    return { ...r, name: prod ? prod.name : r.product_id }
                }).sort((a, b) => b.total_qty - a.total_qty)
                const totalReqVal = lastItems.reduce((s, i) => s + i.total_value, 0)
                statsEl.innerHTML = `
                    <div class="stat-card"><div class="stat-icon orange"><span class="material-icons-outlined">output</span></div><div class="stat-value">${lastItems.length}</div><div class="stat-label">สินค้าที่ถูกเบิก</div></div>
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">attach_money</span></div><div class="stat-value">${formatCurrency(totalReqVal)}</div><div class="stat-label">มูลค่าเบิกรวม</div></div>
                `

            } else if (type === 'low_stock') {
                container.querySelector('#invReportTitle').textContent = 'สินค้าใกล้หมด / หมดสต็อก'
                lastColumns = [
                    { key: 'code', label: 'รหัส' },
                    { key: 'name', label: 'ชื่อสินค้า' },
                    { key: 'qty', label: 'คงเหลือ' },
                    { key: 'min_qty', label: 'Min', render: r => getStockStatus(r, r.qty).minQty },
                    { key: 'max_qty', label: 'Max', render: r => getStockStatus(r, r.qty).maxQty ?? '-' },
                    { key: 'status', label: 'สถานะ', render: r => renderStockStatusBadge(r, r.qty) },
                ]
                // FIX #1 + #2: use p.id, use product-specific min/max stock settings
                lastItems = filtered.map(p => {
                    const sm = stockMap[p.id] || { qty: 0 }
                    const qty = typeof sm === 'number' ? sm : (sm.qty || 0)
                    return { ...p, qty }
                }).filter(p => isLowStock(p, p.qty)).sort((a, b) => a.qty - b.qty)
                statsEl.innerHTML = `
                    <div class="stat-card"><div class="stat-icon red"><span class="material-icons-outlined">warning</span></div><div class="stat-value">${lastItems.length}</div><div class="stat-label">สินค้าที่ต้องสั่งเพิ่ม</div></div>
                `
            }

            if (lastItems.length > 0) {
                gridEl.innerHTML = renderDataGrid({ columns: lastColumns, items: lastItems })
            } else {
                gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div>'
            }

        } catch (e) {
            console.error(e)
            gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:#ef4444;">เกิดข้อผิดพลาด</div>'
        }
    }

    let invChartInstance = null
    function renderInvChart(items) {
        const card = container.querySelector('#invChartCard')
        const canvas = container.querySelector('#invChart')
        if (!card || !canvas) return
        card.style.display = ''
        if (invChartInstance) invChartInstance.destroy()

        const normal = items.filter(i => getStockStatus(i, i.qty).key === 'normal').length
        const low = items.filter(i => getStockStatus(i, i.qty).key === 'low').length
        const out = items.filter(i => getStockStatus(i, i.qty).key === 'out').length
        const over = items.filter(i => getStockStatus(i, i.qty).key === 'over').length

        invChartInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['ปกติ', 'ใกล้หมด', 'หมดสต็อก', 'สูงกว่า Max'],
                datasets: [{
                    data: [normal, low, out, over],
                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444', '#6366f1'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        })
    }

    container.querySelector('#btnRunInvReport').addEventListener('click', runReport)
    container.querySelector('#btnPrintInv').addEventListener('click', () => window.print())

    // Populate group filter dynamically
    ;(async () => {
        try {
            const groups = await fetchFullList('product_groups', { requestKey: null })
            const sel = container.querySelector('#invGroupFilter')
            groups.filter(g => g.is_active !== false).forEach(g => {
                const opt = document.createElement('option')
                opt.value = g.id
                opt.textContent = g.name
                sel.appendChild(opt)
            })
        } catch (e) { console.warn('[InvReport] Could not load groups:', e.message) }
    })()
    container.querySelector('#btnExportInvCSV').addEventListener('click', () => {
        if (lastItems.length === 0) return
        exportCSV('inventory_report.csv', lastColumns, lastItems)
    })
    container.querySelector('#btnExportInvXLSX').addEventListener('click', async () => {
        if (lastItems.length === 0) return
        const headers = lastColumns.map(c => c.label)
        const rows = lastItems.map(item => lastColumns.map(c => item[c.key] ?? ''))
        await exportSingleSheet(headers, rows, 'inventory_report', 'คลังสินค้า')
    })

    // Quick date buttons
    container.querySelector('#btnInvToday')?.addEventListener('click', () => {
        const t = new Date().toISOString().slice(0, 10)
        const startEl = container.querySelector('#invStartDate')
        const endEl = container.querySelector('#invEndDate')
        if (startEl) startEl.value = t
        if (endEl) endEl.value = t
        runReport()
    })
    container.querySelector('#btnInvThisMonth')?.addEventListener('click', () => {
        const d = new Date()
        const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
        const t = d.toISOString().slice(0, 10)
        const startEl = container.querySelector('#invStartDate')
        const endEl = container.querySelector('#invEndDate')
        if (startEl) startEl.value = first
        if (endEl) endEl.value = t
        runReport()
    })
}

function exportCSV(filename, columns, items) {
    const headers = columns.filter(c => c.key !== 'status' || !c.render).map(c => c.label)
    const keys = columns.filter(c => c.key !== 'status' || !c.render).map(c => c.key)
    const rows = items.map(item => keys.map(k => `"${String(item[k] ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
}
