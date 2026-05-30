/**
 * Stock List page — inventory overview with filters.
 */
import { formatCurrency, renderDataGrid } from '../components/ui.js'
import { fetchFullList } from '../services/pb.js'
import { getBranch } from '../services/auth.js'
import { getStockStatus, isStockTrackedProduct } from '../utils/stock-rules.js'

export function initStockListPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">inventory_2</span>
                <h1>รายการสินค้าคงคลัง</h1>
            </div>
            <div class="toolbar-actions">
                <button class="btn btn-outline" id="btnExportExcel"><span class="material-icons-outlined">download</span> ส่งออก Excel</button>
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

    // Stale-DOM guard: if user navigates away before async fetches complete, bail out cleanly.
    const sentinel = document.createElement('div')
    sentinel.style.display = 'none'
    container.appendChild(sentinel)
    const isDestroyed = () => !sentinel.isConnected

    const gridCols = [
        { key: 'code', label: 'รหัสสินค้า' },
        { key: 'name', label: 'ชื่อสินค้า' },
        { key: 'type', label: 'ประเภท' },
        { key: 'group_name', label: 'กลุ่ม' },
        { key: 'unit', label: 'หน่วย' },
        { key: 'qty', label: 'คงเหลือ' },
        { key: 'min_qty', label: 'Min', render: r => getStockStatus(r, r.qty).minQty },
        { key: 'max_qty', label: 'Max', render: r => getStockStatus(r, r.qty).maxQty ?? '-' },
        { key: 'cost', label: 'ต้นทุนเฉลี่ย', render: r => formatCurrency(r.cost) },
        { key: 'total_value', label: 'มูลค่ารวม', render: r => formatCurrency(r.total_value) },
        {
            key: 'status', label: 'สถานะ', render: r => {
                const status = getStockStatus(r, r.qty)
                if (status.key === 'out') return '<span class="badge badge-cancelled">หมด</span>'
                if (status.key === 'low') return `<span class="badge badge-pending">ใกล้หมด (Min ${status.minQty})</span>`
                if (status.key === 'over') return `<span class="badge badge-pending">สูงกว่า Max (${status.maxQty})</span>`
                return '<span class="badge badge-closed">พอเพียง</span>'
            }
        },
    ]

    // Populate group filter dynamically
    let groupMapCache = {}
    async function loadGroupFilter() {
        try {
            const groups = await fetchFullList('product_groups', { requestKey: null })
            if (isDestroyed()) return
            const sel = container.querySelector('#slGroupFilter')
            groups.forEach(g => { 
                groupMapCache[g.id] = g.name 
            })
            groups.filter(g => g.is_active !== false).forEach(g => {
                const opt = document.createElement('option')
                opt.value = g.id
                opt.textContent = g.name
                sel.appendChild(opt)
            })
        } catch (e) {
            if (!isDestroyed()) console.warn('[StockList] Could not load product_groups:', e.message)
        }
    }

    async function loadData() {
        if (isDestroyed()) return
        const gridEl = container.querySelector('#stockGrid')
        gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังคำนวณยอดคงคลัง...</div>'

        const search = container.querySelector('#slSearchInput').value.toLowerCase().trim()
        const group = container.querySelector('#slGroupFilter').value
        const type = container.querySelector('#slTypeFilter').value

        try {
            const products = (await fetchFullList('products', { requestKey: null }))
                .filter(isStockTrackedProduct)
            if (isDestroyed()) return
            
            let stockMap = {}
            const res = await fetch(`/api/data/custom/stock-balances?branch_id=${encodeURIComponent(getBranch() || '')}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('mungkhud_jwt')}` }
            })
            if (isDestroyed()) return
            if (res.ok) {
                stockMap = await res.json()
            }

            let items = []
            let totalVal = 0
            let countLow = 0
            let countOut = 0

            for (const p of products) {
                if (type && p.type !== type) continue
                if (group && p.group_id !== group) continue
                if (search && !((p.code || '').toLowerCase().includes(search) || (p.name || '').toLowerCase().includes(search))) continue

                const sm = stockMap[p.id] || { qty: 0, total_value: 0 }
                const stockQty = typeof sm === 'number' ? sm : (sm.qty || 0)
                const stockVal = typeof sm === 'number' ? 0 : (sm.total_value || 0)

                const cost = p.cost || (stockQty > 0 ? (stockVal / stockQty) : 0)
                const totalValue = stockQty * cost

                const item = {
                    ...p,
                    qty: stockQty,
                    cost: cost,
                    total_value: totalValue,
                    group_name: groupMapCache[p.group_id] || p.group_id || '-'
                }
                items.push(item)

                totalVal += item.total_value
                const status = getStockStatus(p, item.qty)
                if (status.key === 'out') countOut++
                else if (status.key === 'low') countLow++
            }

            if (isDestroyed()) return
            container.querySelector('#statItems').textContent = items.length
            container.querySelector('#statValue').textContent = formatCurrency(totalVal)
            container.querySelector('#statLow').textContent = countLow
            container.querySelector('#statOut').textContent = countOut

            items.sort((a, b) => (a.code || '').localeCompare(b.code || ''))
            lastExportItems = items
            gridEl.innerHTML = renderDataGrid({ columns: gridCols, items })

        } catch (e) {
            if (isDestroyed()) return
            console.error(e)
            gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:#ef4444;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>'
        }
    }

    container.querySelector('#btnSearchStock').addEventListener('click', loadData)
    // BUG 63 FIX: Debounce live search to avoid calling loadData on every keystroke
    const debouncedSearch = window.debounce ? window.debounce(loadData, 400) : loadData
    container.querySelector('#slSearchInput').addEventListener('keyup', e => { if (e.key === 'Enter') loadData(); })
    container.querySelector('#slSearchInput').addEventListener('input', debouncedSearch)

    // BUG 73 FIX: Wire up Excel export button — exports last rendered stock data
    let lastExportItems = []

    container.querySelector('#btnExportExcel')?.addEventListener('click', () => {
        if (!lastExportItems || lastExportItems.length === 0) {
            showToast('กรุณาค้นหาสินค้าก่อน', 'warning'); return
        }
        const headers = 'รหัสสินค้า,ชื่อสินค้า,คงเหลือ,ต้นทุน/หน่วย,มูลค่ารวม,Min,Max,สถานะ'
        const rows = lastExportItems.map(i => {
            const status = getStockStatus(i, i.qty)
            const statusText = status.key === 'out' ? 'หมด' : status.key === 'low' ? 'ใกล้หมด' : status.key === 'over' ? 'สูงกว่า Max' : 'พอเพียง'
            return `"${i.code || ''}","${i.name || ''}",${i.qty},${(i.cost || 0).toFixed(2)},${(i.total_value || 0).toFixed(2)},${status.minQty},${status.maxQty ?? ''},"${statusText}"`
        })
        const csv = '\uFEFF' + [headers, ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `stock_list_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
    })

    loadGroupFilter()
    loadData()
}
