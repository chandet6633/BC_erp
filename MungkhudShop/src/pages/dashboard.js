/**
 * Dashboard page — live stats from PocketBase.
 * Enhanced with branch-aware stats, today's revenue, sparklines, and quick actions.
 */
import { formatCurrency, renderDataGrid, formatDate } from '../components/ui.js'
import { fetchFullList } from '../services/pb.js'
import { getApiAuthHeaders, getBranch, getBranchFilter, getCurrentUser } from '../services/auth.js'
import { notifyLowStock } from '../services/telegram.js'
import { getStockStatus, isLowStock, isStockTrackedProduct } from '../utils/stock-rules.js'

/** Render an inline SVG sparkline from an array of values */
function renderSparkline(values, width = 80, height = 24) {
    if (!values || values.length < 2) return ''
    const max = Math.max(...values, 1)
    const min = Math.min(...values, 0)
    const range = max - min || 1
    const step = width / (values.length - 1)

    const points = values.map((v, i) => {
        const x = i * step
        const y = height - ((v - min) / range) * (height - 4) - 2
        return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')

    // Determine trend color
    const first = values[0], last = values[values.length - 1]
    const color = last > first ? '#22c55e' : last < first ? '#ef4444' : '#94a3b8'

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" 
        style="display:block;margin-top:4px;opacity:0.8;">
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" 
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
}

/** Get trend indicator text */
function getTrendIndicator(values) {
    if (!values || values.length < 2) return ''
    const first = values[0], last = values[values.length - 1]
    if (first === 0 && last === 0) return '<span class="trend-flat">● —</span>'
    const change = first === 0 ? 100 : ((last - first) / first * 100)
    if (change > 0) return `<span class="trend-up">▲ ${Math.round(change)}%</span>`
    if (change < 0) return `<span class="trend-down">▼ ${Math.abs(Math.round(change))}%</span>`
    return '<span class="trend-flat">● —</span>'
}

export function initDashboardPage(container) {
    const user = getCurrentUser()
    const branchLabel = getBranch() ? '' : ' (branch required)'

    container.innerHTML = `
        <style>
            .trend-up { color: #22c55e; font-size: 0.7rem; font-weight: 600; }
            .trend-down { color: #ef4444; font-size: 0.7rem; font-weight: 600; }
            .trend-flat { color: #94a3b8; font-size: 0.7rem; }
            .stat-sparkline { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
        </style>
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">dashboard</span>
                <h1>แดชบอร์ด</h1>
            </div>
            <div class="toolbar-actions" style="gap:var(--sp-3);">
                <span class="text-sm text-muted">${user ? `สวัสดี, ${user.display_name || user.username}` : ''}</span>
                <span class="text-sm text-muted">อัพเดท: ${new Date().toLocaleString('th-TH')}${branchLabel}</span>
                <button class="btn btn-sm btn-outline" id="btnRefreshDash"><span class="material-icons-outlined" style="font-size:16px;">refresh</span></button>
            </div>
        </div>

        <div class="stats-grid" style="grid-template-columns:repeat(5,1fr);">
            <div class="stat-card">
                <div class="stat-icon blue"><span class="material-icons-outlined">build</span></div>
                <div class="stat-value" id="statJobs">-</div>
                <div class="stat-label">ใบงานที่เปิดอยู่</div>
                <div class="stat-sparkline" id="sparkJobs"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><span class="material-icons-outlined">today</span></div>
                <div class="stat-value" id="statTodayRev">-</div>
                <div class="stat-label">รายได้วันนี้</div>
                <div class="stat-sparkline" id="sparkTodayRev"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(168,85,247,0.15);color:#a855f7;"><span class="material-icons-outlined">paid</span></div>
                <div class="stat-value" id="statRevenue">-</div>
                <div class="stat-label">รายได้เดือนนี้</div>
                <div class="stat-sparkline" id="sparkRevenue"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><span class="material-icons-outlined">people</span></div>
                <div class="stat-value" id="statCustomers">-</div>
                <div class="stat-label">ลูกค้าทั้งหมด</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><span class="material-icons-outlined">inventory_2</span></div>
                <div class="stat-value" id="statLowStock">-</div>
                <div class="stat-label">สินค้าใกล้หมด</div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div id="reorderAlert" style="display:none;margin-top:var(--sp-4);padding:var(--sp-4);background:linear-gradient(135deg,#fef2f2,#fff7ed);border-left:4px solid #ef4444;border-radius:8px;">
            <div style="display:flex;align-items:center;gap:var(--sp-3);">
                <span class="material-icons-outlined" style="color:#ef4444;font-size:28px;">warning_amber</span>
                <div>
                    <div style="font-weight:600;color:#ef4444;">สินค้าต่ำกว่าจุดสั่งซื้อ</div>
                    <div class="text-sm text-muted" id="reorderMessage">กำลังตรวจสอบ...</div>
                </div>
                <a href="#/stock-list" class="btn btn-sm btn-outline" style="margin-left:auto;color:#ef4444;border-color:#ef4444;">ดูรายละเอียด</a>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="card" style="margin-top:var(--sp-4);">
            <div class="card-body" style="display:flex;gap:var(--sp-3);flex-wrap:wrap;">
                <a href="#/job" class="btn btn-primary"><span class="material-icons-outlined">add</span> สร้างใบงานใหม่</a>
                <a href="#/quotation" class="btn btn-outline"><span class="material-icons-outlined">request_quote</span> ใบเสนอราคา</a>
                <a href="#/report-sales" class="btn btn-outline"><span class="material-icons-outlined">assessment</span> รายงานยอดขาย</a>
                <a href="#/forms" class="btn btn-outline"><span class="material-icons-outlined">print</span> พิมพ์เอกสาร</a>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-5); margin-top:var(--sp-4);">
            <div class="card">
                <div class="card-header"><h3>ใบงานล่าสุด</h3></div>
                <div class="card-body" id="recentJobs">
                    <div style="padding:var(--sp-4);text-align:center;color:var(--color-text-muted);">กำลังโหลด...</div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>สินค้าที่ต้องสั่งเพิ่ม</h3></div>
                <div class="card-body" id="lowStockList">
                    <div style="padding:var(--sp-4);text-align:center;color:var(--color-text-muted);">กำลังโหลด...</div>
                </div>
            </div>
        </div>
    `

    container.querySelector('#btnRefreshDash').addEventListener('click', () => loadDashboardData(container, true))
    loadDashboardData(container)
}

/** Get array of last N days as ISO date strings */
function getLastNDays(n) {
    const days = []
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        days.push(d.toISOString().slice(0, 10))
    }
    return days
}

async function loadDashboardData(container, forceRefresh = false) {
    const CACHE_KEY = 'mungkhud_dash_cache'
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

    // P2: Check sessionStorage cache
    if (!forceRefresh) {
        try {
            const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY))
            if (cached && Date.now() - cached.ts < CACHE_TTL) {
                if (!container?.isConnected) return
                renderDashboard(container, cached.data)
                return
            }
        } catch (_) {}
    }

    try {
        const branchFilter = getBranchFilter()
        const today = new Date().toISOString().slice(0, 10)
        const now = new Date()
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const last7Start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

        // P2: Scoped queries — only fetch what we need
        const bf = branchFilter ? ` && ${branchFilter}` : ''
        const safeFetchFullList = async (collection, options = {}) => {
            try {
                return await fetchFullList(collection, options)
            } catch (error) {
                console.warn(`[Dashboard] ${collection} query failed:`, error?.message || error)
                return []
            }
        }

        // Open jobs count
        const openJobs = await safeFetchFullList('jobs', { filter: `status='open'${bf}` })

        // Today's closed jobs (revenue)
        const todayJobs = await safeFetchFullList('jobs', {
            filter: `status='completed' && end_date >= '${today}'${bf}`
        })

        // This month's closed jobs
        const monthJobs = await safeFetchFullList('jobs', {
            filter: `status='completed' && end_date >= '${monthStart}'${bf}`
        })

        // Last 7 days jobs for sparklines
        const recentJobs = await safeFetchFullList('jobs', {
            filter: `start_date >= '${last7Start}'${bf}`
        })

        // Customers count
        const customers = await safeFetchFullList('customers')

        // Products (for low-stock list display)
        const products = (await safeFetchFullList('products')).filter(isStockTrackedProduct)

        // P2: Server-side aggregated stock balances — avoids downloading entire ledger table to browser
        let stockMap = {}
        try {
            const stockRes = await fetch(`/api/data/custom/stock-balances?branch_id=${encodeURIComponent(getBranch() || '')}`, {
                headers: getApiAuthHeaders()
            })
            if (stockRes.ok) {
                const rawMap = await stockRes.json()
                // Normalize: server returns { product_id: { qty, total_value } }
                for (const pid in rawMap) {
                    const sm = rawMap[pid]
                    stockMap[pid] = typeof sm === 'number' ? sm : (sm.qty || 0)
                }
            }
        } catch (e) { console.warn('[Dashboard] stock-balances failed:', e) }

        const data = {
            openCount: openJobs.length,
            todayRev: todayJobs.reduce((s, j) => s + (j.grand_total || 0), 0),
            monthRev: monthJobs.reduce((s, j) => s + (j.grand_total || 0), 0),
            customerCount: customers.length,
            stockMap,
            products,
            recentJobs,
            todayJobs,
            monthJobs,
            last7Start
        }

        // Cache to sessionStorage
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
        } catch (_) {} // quota exceeded is fine

        if (!container?.isConnected) return
        renderDashboard(container, data)

    } catch (e) {
        console.error('Dashboard load error:', e)
        const statJobs = container?.isConnected ? container.querySelector('#statJobs') : null
        if (statJobs) statJobs.textContent = '!'
    }
}

function renderDashboard(container, data) {
    if (!container?.isConnected) return
    const { openCount, todayRev, monthRev, customerCount, stockMap, products, recentJobs, todayJobs, monthJobs, last7Start } = data

    const setText = (selector, value) => {
        const el = container.querySelector(selector)
        if (el) el.textContent = value
    }

    setText('#statJobs', openCount)
    setText('#statTodayRev', formatCurrency(todayRev))
    setText('#statRevenue', formatCurrency(monthRev))
    setText('#statCustomers', customerCount)

    // Low stock
    const lowStockProducts = products.filter(p => {
        const qty = stockMap[p.id] || 0
        return isLowStock(p, qty)
    })
    setText('#statLowStock', lowStockProducts.length)

    // Reorder Alert banner
    const alertEl = container.querySelector('#reorderAlert')
    if (alertEl) {
        if (lowStockProducts.length > 0) {
            alertEl.style.display = 'block'
            const outCount = lowStockProducts.filter(p => (stockMap[p.id] || 0) <= 0).length
            const msgEl = container.querySelector('#reorderMessage')
            if (msgEl) msgEl.textContent = `พบ ${lowStockProducts.length} รายการ (หมดสต็อก ${outCount} รายการ) — ควรสั่งซื้อเพิ่ม`
            // A2: Telegram low stock notification (fire-and-forget, once per session)
            if (!window.__lowStockNotified) {
                window.__lowStockNotified = true
                notifyLowStock(lowStockProducts.map(p => {
                    const qty = stockMap[p.id] || 0
                    const status = getStockStatus(p, qty)
                    return { name: p.name, qty, minQty: status.minQty, maxQty: status.maxQty }
                })).catch(() => {})
            }
        } else {
            alertEl.style.display = 'none'
        }
    }

    // Sparklines: 7-day trend
    const last7 = getLastNDays(7)

    // Jobs per day (created)
    const jobsByDay = last7.map(day =>
        recentJobs.filter(j => j.CreatedAt && j.CreatedAt.split(' ')[0] === day).length
    )
    const sparkJobsEl = container.querySelector('#sparkJobs')
    if (sparkJobsEl) sparkJobsEl.innerHTML = renderSparkline(jobsByDay) + getTrendIndicator(jobsByDay)

    // Revenue per day (from month closed jobs)
    const allClosedRecent = [...todayJobs, ...monthJobs.filter(j => !todayJobs.find(t => t.id === j.id))]
    const revByDay = last7.map(day =>
        allClosedRecent.filter(j => j.end_date && j.end_date.split(' ')[0] === day)
            .reduce((s, j) => s + (j.grand_total || 0), 0)
    )
    const sparkTodayEl = container.querySelector('#sparkTodayRev')
    if (sparkTodayEl) sparkTodayEl.innerHTML = renderSparkline(revByDay) + getTrendIndicator(revByDay)

    // Monthly revenue trend (last 7 days cumulative)
    let cumRev = 0
    const cumRevByDay = last7.map(day => {
        cumRev += allClosedRecent.filter(j => j.end_date && j.end_date.split(' ')[0] === day)
            .reduce((s, j) => s + (j.grand_total || 0), 0)
        return cumRev
    })
    const sparkRevEl = container.querySelector('#sparkRevenue')
    if (sparkRevEl) sparkRevEl.innerHTML = renderSparkline(cumRevByDay) + getTrendIndicator(cumRevByDay)

    // Recent Jobs table — combine recent created and show sorted
    const sortedRecent = [...recentJobs].sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '')).slice(0, 8)
    const jobsEl = container.querySelector('#recentJobs')
    if (!jobsEl) return
    if (sortedRecent.length === 0) {
        jobsEl.innerHTML = '<div class="empty-state" style="padding:var(--sp-6);"><span class="material-icons-outlined" style="font-size:40px;">inbox</span><p class="text-sm">ยังไม่มีใบงาน</p></div>'
    } else {
        jobsEl.innerHTML = renderDataGrid({
            columns: [
                { key: 'job_no', label: 'เลขใบงาน' },
                { key: 'plate', label: 'ทะเบียน' },
                { key: 'customer_name', label: 'ลูกค้า' },
                { key: 'status', label: 'สถานะ', render: r => `<span class="badge badge-${r.status === 'completed' ? 'closed' : r.status === 'cancelled' ? 'cancelled' : 'open'}">${r.status === 'completed' ? 'ปิดงาน' : r.status === 'cancelled' ? 'ยกเลิก' : 'เปิด'}</span>` },
                { key: 'grand_total', label: 'ยอดรวม', render: r => formatCurrency(r.grand_total || 0) },
            ],
            items: sortedRecent
        })
    }

    // Low stock list
    const lowEl = container.querySelector('#lowStockList')
    if (!lowEl) return
    if (lowStockProducts.length === 0) {
        lowEl.innerHTML = '<div class="empty-state" style="padding:var(--sp-6);"><span class="material-icons-outlined" style="font-size:40px;">check_circle</span><p class="text-sm">ไม่มีสินค้าใกล้หมด</p></div>'
    } else {
        lowEl.innerHTML = renderDataGrid({
            columns: [
                { key: 'code', label: 'รหัส' },
                { key: 'name', label: 'ชื่อสินค้า' },
                {
                    key: 'qty', label: 'คงเหลือ', render: r => {
                        const q = stockMap[r.id] || 0
                        return `<span style="color:${q <= 0 ? '#ef4444' : '#f59e0b'};font-weight:600;">${q}</span>`
                    }
                },
                { key: 'min_qty', label: 'ขั้นต่ำ', render: r => getStockStatus(r, stockMap[r.id] || 0).minQty },
            ],
            items: lowStockProducts.slice(0, 10)
        })
    }
}

