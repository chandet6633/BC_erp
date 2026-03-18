/**
 * Stock List page — inventory overview with filters.
 */
import { formatCurrency, renderDataGrid } from '../components/ui.js'
import { fetchFullList } from '../services/pb.js'

export function initStockListPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">inventory_2</span>
                <h1>รายการสินค้าคงคลัง</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-outline"><span class="material-icons-outlined">download</span> ส่งออก Excel</button>
            </div>
        </div>
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-row-4">
                    <div class="form-group">
                        <label class="form-label">กลุ่มสินค้า</label>
                        <select class="form-control" id="slGroupFilter">
                            <option value="">ทั้งหมด</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ประเภท</label>
                        <select class="form-control" id="slTypeFilter">
                            <option value="">ทั้งหมด</option>
                            <option value="part">อะไหล่</option>
                            <option value="service">บริการ</option>
                            <option value="fluid">น้ำมัน/สารหล่อลื่น</option>
                            <option value="accessory">อุปกรณ์เสริม</option>
                            <option value="other">อื่นๆ</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ค้นหาสินค้า</label>
                        <input type="text" id="slSearchInput" class="form-control" placeholder="รหัส หรือ ชื่อสินค้า...">
                    </div>
                    <div class="form-group" style="justify-content:flex-end;">
                        <button class="btn btn-primary" id="btnSearchStock"><span class="material-icons-outlined">search</span> ค้นหา</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="stats-grid" style="margin-bottom:var(--sp-4);">
            <div class="stat-card">
                <div class="stat-icon blue"><span class="material-icons-outlined">category</span></div>
                <div class="stat-value" id="statItems">0</div>
                <div class="stat-label">รายการสินค้า</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><span class="material-icons-outlined">attach_money</span></div>
                <div class="stat-value" id="statValue">฿0</div>
                <div class="stat-label">มูลค่าคงคลังรวม</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><span class="material-icons-outlined">trending_down</span></div>
                <div class="stat-value" id="statLow">0</div>
                <div class="stat-label">สินค้าใกล้หมด</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><span class="material-icons-outlined">block</span></div>
                <div class="stat-value" id="statOut">0</div>
                <div class="stat-label">สินค้าหมด</div>
            </div>
        </div>

        <div id="stockGrid">
            <div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>
        </div>
    `

    const gridCols = [
        { key: 'code', label: 'รหัสสินค้า' },
        { key: 'name', label: 'ชื่อสินค้า' },
        { key: 'type', label: 'ประเภท' },
        { key: 'group_name', label: 'กลุ่ม' },
        { key: 'unit', label: 'หน่วย' },
        { key: 'qty', label: 'คงเหลือ' },
        { key: 'cost', label: 'ต้นทุนเฉลี่ย', render: r => formatCurrency(r.cost) },
        { key: 'total_value', label: 'มูลค่ารวม', render: r => formatCurrency(r.total_value) },
        {
            key: 'status', label: 'สถานะ', render: r => {
                const minQty = r.min_qty || 5
                if (r.qty <= 0) return '<span class="badge badge-cancelled">หมด</span>'
                if (r.qty <= minQty) return `<span class="badge badge-pending">ใกล้หมด (ต่ำกว่า ${minQty})</span>`
                return '<span class="badge badge-closed">พอเพียง</span>'
            }
        },
    ]

    // Populate group filter dynamically
    async function loadGroupFilter() {
        try {
            const groups = await fetchFullList('product_groups', { requestKey: null })
            const sel = container.querySelector('#slGroupFilter')
            groups.filter(g => g.is_active !== false).forEach(g => {
                const opt = document.createElement('option')
                opt.value = g.id
                opt.textContent = g.name
                sel.appendChild(opt)
            })
        } catch (e) {
            console.warn('[StockList] Could not load product_groups:', e.message)
        }
    }

    async function loadData() {
        const gridEl = container.querySelector('#stockGrid')
        gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังคำนวณยอดคงคลัง...</div>'

        const search = container.querySelector('#slSearchInput').value.toLowerCase().trim()
        const group = container.querySelector('#slGroupFilter').value
        const type = container.querySelector('#slTypeFilter').value

        try {
            const products = await fetchFullList('products', { requestKey: null })
            const ledgers = await fetchFullList('stock_ledgers', { requestKey: null })

            // Aggregate ledgers by product_id
            const stockMap = {}
            for (const l of ledgers) {
                if (!stockMap[l.product_id]) {
                    stockMap[l.product_id] = { qty: 0, total_value: 0 }
                }
                stockMap[l.product_id].qty += (l.qty || 0)
                stockMap[l.product_id].total_value += (l.total_value || 0)
            }

            // Load group names for display
            let groupMap = {}
            try {
                const groups = await fetchFullList('product_groups', { requestKey: null })
                groups.forEach(g => { groupMap[g.id] = g.name })
            } catch (_) { /* groups may not exist */ }

            let items = []
            let totalVal = 0
            let countLow = 0
            let countOut = 0

            for (const p of products) {
                // Apply filters
                if (type && p.type !== type) continue
                if (group && p.group_id !== group) continue
                if (search && !(p.code.toLowerCase().includes(search) || p.name.toLowerCase().includes(search))) continue

                // FIX #1: Use p.id (not p.code) to join with stock_ledgers
                const stock = stockMap[p.id] || { qty: 0, total_value: 0 }

                // FIX #7: Use product.cost (WAC) as primary source
                const cost = p.cost || (stock.qty > 0 ? (stock.total_value / stock.qty) : 0)
                const totalValue = stock.qty * cost

                const item = {
                    ...p,
                    qty: stock.qty,
                    cost: cost,
                    total_value: totalValue,
                    group_name: groupMap[p.group_id] || p.group_id || '-'
                }
                items.push(item)

                totalVal += item.total_value
                // FIX #2: Use min_qty from product instead of hardcoded 5
                const minQty = p.min_qty || 5
                if (item.qty <= 0) countOut++
                else if (item.qty <= minQty) countLow++
            }

            container.querySelector('#statItems').textContent = items.length
            container.querySelector('#statValue').textContent = formatCurrency(totalVal)
            container.querySelector('#statLow').textContent = countLow
            container.querySelector('#statOut').textContent = countOut

            items.sort((a, b) => (a.code || '').localeCompare(b.code || ''))
            gridEl.innerHTML = renderDataGrid({ columns: gridCols, items })

        } catch (e) {
            console.error(e)
            gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:#ef4444;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>'
        }
    }

    container.querySelector('#btnSearchStock').addEventListener('click', loadData)
    container.querySelector('#slSearchInput').addEventListener('keyup', e => { if (e.key === 'Enter') loadData() })

    loadGroupFilter()
    loadData()
}
