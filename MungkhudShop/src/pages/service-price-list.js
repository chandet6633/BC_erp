/**
 * Service Price List page.
 * Keeps service/labor pricing separate from inventory stock quantities.
 */
import { formatCurrency, renderDataGrid, showToast, showConfirm } from '../components/ui.js'
import { getApiAuthHeaders, getCurrentUser } from '../services/auth.js'
import { fetchFullList, updateRecord } from '../services/pb.js'
import { isServiceLikeProduct, isStockTrackedProduct } from '../utils/stock-rules.js'

function isServicePriceItem(product = {}) {
    return isServiceLikeProduct(product) || !isStockTrackedProduct(product)
}

function parseMoney(value) {
    return Number(String(value ?? '').replace(/,/g, '')) || 0
}

function recordId(record = {}) {
    return record.id ?? record.Id ?? record.ID ?? ''
}

export function initServicePriceListPage(container) {
    const user = getCurrentUser()
    const canEditPrices = Boolean(user)
    let currentItems = []

    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">home_repair_service</span>
                <h1>รายการค่าบริการ</h1>
            </div>
        </div>

        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-row-4">
                    <div class="form-group">
                        <label class="form-label">ประเภท</label>
                        <select class="form-control" id="svcTypeFilter">
                            <option value="">ทั้งหมด</option>
                            <option value="service">บริการ</option>
                            <option value="labor">ค่าแรง</option>
                            <option value="other">ไม่ตัดสต็อก / อื่นๆ</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ค้นหา</label>
                        <input type="text" id="svcSearchInput" class="form-control" placeholder="รหัส หรือ ชื่อค่าบริการ...">
                    </div>
                    <div class="form-group" style="justify-content:flex-end;">
                        <button class="btn btn-primary" id="btnSearchServices"><span class="material-icons-outlined">search</span> ค้นหา</button>
                    </div>
                    ${canEditPrices ? `
                        <div class="form-group" style="justify-content:flex-end;">
                            <a class="btn btn-outline" href="#/master-product"><span class="material-icons-outlined">add_circle_outline</span> เพิ่มรายการใหม่</a>
                        </div>
                        <div class="form-group" style="justify-content:flex-end;">
                            <button class="btn btn-danger" id="btnClearServices"><span class="material-icons-outlined">delete_sweep</span> ล้างรายการบริการ</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <div class="stats-grid" style="margin-bottom:var(--sp-4);">
            <div class="stat-card">
                <div class="stat-icon blue"><span class="material-icons-outlined">home_repair_service</span></div>
                <div class="stat-value" id="svcStatItems">0</div>
                <div class="stat-label">รายการค่าบริการ</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><span class="material-icons-outlined">paid</span></div>
                <div class="stat-value" id="svcStatAvgPrice">฿0.00</div>
                <div class="stat-label">ราคาเฉลี่ย</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><span class="material-icons-outlined">engineering</span></div>
                <div class="stat-value" id="svcStatLabor">0</div>
                <div class="stat-label">ค่าแรง/ช่าง</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><span class="material-icons-outlined">block</span></div>
                <div class="stat-value" id="svcStatNoPrice">0</div>
                <div class="stat-label">ยังไม่ตั้งราคา</div>
            </div>
        </div>

        <div id="servicePriceGrid">
            <div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>
        </div>
    `

    const gridCols = [
        { key: 'code', label: 'รหัส' },
        { key: 'name', label: 'ชื่อบริการ / ค่าแรง' },
        { key: 'type', label: 'ประเภท', render: r => r.type === 'labor' ? 'ค่าแรง' : r.type === 'service' ? 'บริการ' : (r.type || '-') },
        { key: 'unit', label: 'หน่วย' },
        { key: 'cost', label: 'ต้นทุน', render: r => `<input class="form-control svc-cost" data-id="${recordId(r)}" type="number" min="0" step="0.01" value="${Number(r.cost || 0)}" ${canEditPrices ? '' : 'disabled'} style="width:110px;">` },
        { key: 'price', label: 'ราคาขาย', render: r => `<input class="form-control svc-price" data-id="${recordId(r)}" type="number" min="0" step="0.01" value="${Number(r.price || 0)}" ${canEditPrices ? '' : 'disabled'} style="width:120px;">` },
        { key: 'status', label: 'สถานะ', render: r => String(r.is_active) === 'false' || r.is_active === false ? '<span class="badge badge-cancelled">ปิดใช้งาน</span>' : '<span class="badge badge-closed">ใช้งาน</span>' },
        { key: 'actions', label: '', render: r => canEditPrices ? `
            <div class="grid-actions">
                <button class="btn btn-sm btn-primary btn-save-service" data-id="${recordId(r)}">
                    <span class="material-icons-outlined" style="font-size:16px;">save</span>
                </button>
                <a class="btn btn-sm btn-outline" href="#/master-product" title="แก้ไขข้อมูลเต็ม">
                    <span class="material-icons-outlined" style="font-size:16px;">edit</span>
                </a>
            </div>
        ` : '<span class="badge">ดูอย่างเดียว</span>' }
    ]

    function filteredItems() {
        const query = container.querySelector('#svcSearchInput').value.trim().toLowerCase()
        const type = container.querySelector('#svcTypeFilter').value
        return currentItems.filter(item => {
            if (type === 'other') {
                if (isServiceLikeProduct(item)) return false
            } else if (type && item.type !== type) {
                return false
            }
            if (!query) return true
            return `${item.code || ''} ${item.name || ''}`.toLowerCase().includes(query)
        })
    }

    function render(items) {
        const grid = container.querySelector('#servicePriceGrid')
        grid.innerHTML = renderDataGrid({ columns: gridCols, items })
        if (!canEditPrices) {
            updateStats(items)
            return
        }
        grid.querySelectorAll('.btn-save-service').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id
                const row = btn.closest('tr')
                const cost = parseMoney(row?.querySelector('.svc-cost')?.value)
                const price = parseMoney(row?.querySelector('.svc-price')?.value)
                btn.disabled = true
                try {
                    await updateRecord('products', id, {
                        cost,
                        price,
                        is_track_stock: 'false'
                    })
                    const item = currentItems.find(p => String(recordId(p)) === String(id))
                    if (item) {
                        item.cost = cost
                        item.price = price
                        item.is_track_stock = 'false'
                    }
                    showToast('อัปเดตราคาค่าบริการแล้ว', 'success')
                    updateStats(filteredItems())
                } catch (error) {
                    console.error(error)
                    showToast('อัปเดตราคาไม่สำเร็จ', 'error')
                } finally {
                    btn.disabled = false
                }
            })
        })
        updateStats(items)
    }

    function updateStats(items) {
        const totalPrice = items.reduce((sum, item) => sum + parseMoney(item.price), 0)
        const avgPrice = items.length ? totalPrice / items.length : 0
        const laborCount = items.filter(item => ['labor', 'labour'].includes(String(item.type || '').toLowerCase())).length
        const noPrice = items.filter(item => parseMoney(item.price) <= 0).length

        container.querySelector('#svcStatItems').textContent = items.length
        container.querySelector('#svcStatAvgPrice').textContent = formatCurrency(avgPrice)
        container.querySelector('#svcStatLabor').textContent = laborCount
        container.querySelector('#svcStatNoPrice').textContent = noPrice
    }

    async function loadData() {
        const grid = container.querySelector('#servicePriceGrid')
        grid.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดรายการค่าบริการ...</div>'
        try {
            const products = await fetchFullList('products', { requestKey: null })
            currentItems = products
                .filter(isServicePriceItem)
                .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
            render(filteredItems())
        } catch (error) {
            console.error(error)
            grid.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:#ef4444;">โหลดรายการค่าบริการไม่สำเร็จ</div>'
        }
    }

    const rerender = () => render(filteredItems())
    container.querySelector('#btnSearchServices').addEventListener('click', rerender)
    container.querySelector('#svcTypeFilter').addEventListener('change', rerender)
    container.querySelector('#svcSearchInput').addEventListener('input', window.debounce ? window.debounce(rerender, 250) : rerender)
    container.querySelector('#btnClearServices')?.addEventListener('click', async () => {
        if (!await showConfirm('ยืนยันลบรายการบริการ', 'ต้องการลบรายการบริการ/ค่าแรงทั้งหมดใช่หรือไม่?')) return
        try {
            const res = await fetch('/api/dev/clear-data', {
                method: 'POST',
                headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ action: 'service_products' })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Request failed')
            showToast(data.message || 'ล้างรายการบริการเรียบร้อย', 'success')
            loadData()
        } catch (e) {
            console.error(e)
            showToast('Error: ' + e.message, 'error')
        }
    })

    loadData()
}
