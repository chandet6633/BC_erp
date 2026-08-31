import { getAuthToken } from '@shared/nocodb-adapter.js'
import { getBranchLabel, getBranchOptions } from '@shared/branch-metadata.js'
import { buildDevAuthHeaders, getSession, getSessionLanguage, isRealBranchId, setSessionBranch, setSessionLanguage } from '@shared/session.js'
import { AuthService } from '../../../services/authService.js'

const els = {
    period: document.getElementById('periodSelect'),
    branch: document.getElementById('branchSelect'),
    lang: document.getElementById('langSelect'),
    refresh: document.getElementById('refreshBtn'),
    loading: document.getElementById('loadingState'),
    error: document.getElementById('errorState'),
    content: document.getElementById('dashboardContent'),
    scopeLabel: document.getElementById('scopeLabel'),
    periodLabel: document.getElementById('periodLabel'),
    updatedLabel: document.getElementById('updatedLabel'),
    trend: document.getElementById('trendChart'),
    branchRows: document.getElementById('branchRows'),
    jobRows: document.getElementById('jobRows'),
    alertList: document.getElementById('alertList'),
    alertCount: document.getElementById('alertCount')
}

const i18n = {
    th: {
        title: 'แดชบอร์ดผู้จัดการ',
        subtitle: 'รายรับ กำไร ค่าใช้จ่าย งาน และสัญญาณเตือนจากข้อมูลจริง',
        today: 'วันนี้',
        week: 'สัปดาห์นี้',
        month: 'เดือนนี้',
        allBranches: 'Branch scope',
        refresh: 'รีเฟรช',
        portal: 'Portal',
        loading: 'กำลังโหลดข้อมูลแดชบอร์ด...',
        apiOfflineTitle: 'ยังไม่ได้เชื่อมต่อข้อมูลจริง',
        apiOfflineDetail: 'แดชบอร์ดกำลังแสดงโครงหน้าสำหรับทดสอบ เพราะ API dashboard ยังไม่พร้อมใช้งาน',
        trendTitle: 'แนวโน้มรายรับ / รายจ่าย',
        daily: 'รายวัน',
        revenue: 'รายรับ',
        grossProfit: 'กำไรขั้นต้น',
        expenses: 'รายจ่าย',
        branchCompare: 'เปรียบเทียบสาขา',
        branch: 'สาขา',
        netProfit: 'กำไรสุทธิ',
        openJobs: 'งานเปิดอยู่',
        unpaid: 'ค้างชำระ',
        lowStock: 'สต็อกต่ำ',
        scope: 'ขอบเขต',
        jobs: 'งาน',
        recentJobs: 'ใบงานล่าสุด',
        job: 'ใบงาน',
        customer: 'ลูกค้า',
        plate: 'ทะเบียน',
        status: 'สถานะ',
        total: 'ยอดรวม',
        alerts: 'สัญญาณเตือน',
        completedJobs: count => `${count} งานเสร็จ`,
        grossMargin: value => `${value} margin`,
        expenseRatio: value => `${value} ของรายรับ`,
        netMargin: value => `${value} net margin`,
        openJobsSub: 'งานที่ยังไม่ปิด',
        unpaidSub: 'งานค้างชำระ',
        lowStockSub: 'รายการต้องดูแล',
        scopeSub: 'ขอบเขตข้อมูล',
        noTrend: 'ไม่มีข้อมูลแนวโน้ม',
        noBranch: 'ไม่มีข้อมูลสาขาในช่วงนี้',
        noJobs: 'ไม่มีใบงานในช่วงนี้',
        noAlerts: 'ไม่มีสัญญาณเตือนในตอนนี้',
        periodRange: (start, end) => `${start || '-'} ถึง ${end || '-'}`,
        baht: 'บาท'
    },
    en: {
        title: 'Manager Dashboard',
        subtitle: 'Revenue, profit, expenses, jobs, and live operational alerts',
        today: 'Today',
        week: 'This week',
        month: 'This month',
        allBranches: 'Branch scope',
        refresh: 'Refresh',
        portal: 'Portal',
        loading: 'Loading dashboard data...',
        apiOfflineTitle: 'Live data is not connected yet',
        apiOfflineDetail: 'The dashboard is showing the test shell because the dashboard API is not available.',
        trendTitle: 'Revenue / Expense Trend',
        daily: 'Daily',
        revenue: 'Revenue',
        grossProfit: 'Gross profit',
        expenses: 'Expenses',
        branchCompare: 'Branch Comparison',
        branch: 'Branch',
        netProfit: 'Net profit',
        openJobs: 'Open jobs',
        unpaid: 'Unpaid',
        lowStock: 'Low stock',
        scope: 'Scope',
        jobs: 'Jobs',
        recentJobs: 'Recent Jobs',
        job: 'Job',
        customer: 'Customer',
        plate: 'Plate',
        status: 'Status',
        total: 'Total',
        alerts: 'Alerts',
        completedJobs: count => `${count} completed jobs`,
        grossMargin: value => `${value} margin`,
        expenseRatio: value => `${value} of revenue`,
        netMargin: value => `${value} net margin`,
        openJobsSub: 'Jobs still open',
        unpaidSub: 'Unpaid jobs',
        lowStockSub: 'Items need attention',
        scopeSub: 'Data scope',
        noTrend: 'No trend data',
        noBranch: 'No branch data for this period',
        noJobs: 'No jobs in this period',
        noAlerts: 'No alerts right now',
        periodRange: (start, end) => `${start || '-'} to ${end || '-'}`,
        baht: 'THB'
    }
}

let lang = getSessionLanguage()
let branchOptions = []

function t(key, ...args) {
    const value = i18n[lang][key] ?? i18n.th[key] ?? key
    return typeof value === 'function' ? value(...args) : value
}

const kpiEls = {
    revenue: document.getElementById('kpiRevenue'),
    completed: document.getElementById('kpiCompleted'),
    gross: document.getElementById('kpiGross'),
    grossMargin: document.getElementById('kpiGrossMargin'),
    expenses: document.getElementById('kpiExpenses'),
    expenseRatio: document.getElementById('kpiExpenseRatio'),
    net: document.getElementById('kpiNet'),
    netMargin: document.getElementById('kpiNetMargin'),
    openJobs: document.getElementById('kpiOpenJobs'),
    unpaid: document.getElementById('kpiUnpaid'),
    lowStock: document.getElementById('kpiLowStock'),
    scope: document.getElementById('kpiScope')
}

function money(value) {
    return `฿${Number(value || 0).toLocaleString(lang === 'en' ? 'en-US' : 'th-TH', { maximumFractionDigits: 0 })}`
}

function percent(value, base) {
    const n = Number(value || 0)
    const b = Number(base || 0)
    return b > 0 ? `${((n / b) * 100).toFixed(1)}%` : '0.0%'
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]))
}

function currentSession() {
    const user = AuthService.getUser()
    const session = getSession()
    return {
        user,
        role: user?.role || session.role || '',
        branch: session.branchId || user?.branch || '',
        name: user?.name || session.userName || 'Dev User',
        id: user?.id || session.userId || 'dev-user',
        dev: session.devAuth,
        branchLocked: session.branchLocked
    }
}

function authHeaders() {
    const token = getAuthToken()
    if (token) return { Authorization: `Bearer ${token}` }

    const session = currentSession()
    if (session.dev) return buildDevAuthHeaders()

    return {}
}

function assertAccess() {
    const session = currentSession()
    if (!['admin', 'owner', 'manager'].includes(session.role)) {
        window.location.href = '../main/index.html'
        return false
    }
    return true
}

function setState(state, message = '') {
    els.loading?.classList.toggle('active', state === 'loading')
    els.error?.classList.toggle('active', state === 'error')
    if (els.error) els.error.textContent = message
    if (els.loading) els.loading.textContent = t('loading')
    if (els.content) els.content.style.display = state === 'ready' ? '' : 'none'
}

function branchLabel(branchId) {
    return getBranchLabel(branchId, branchOptions, lang) || branchId
}

function fallbackBranchOptions() {
    const selected = els.branch?.value || currentSession().branch || ''
    return isRealBranchId(selected) ? [{ branch_id: selected, branch_name: selected, scoped: true, is_virtual: false }] : []
}

function renderBranchOptions(rows = branchOptions, selected = els.branch?.value || currentSession().branch || '') {
    if (!els.branch) return
    const normalized = Array.isArray(rows) && rows.length ? getBranchOptions(rows) : fallbackBranchOptions()
    const seen = new Set()
    branchOptions = normalized
        .map(branch => ({
            branch_id: String(branch.branch_id || branch.id || branch.code || '').trim(),
            branch_name: String(branch.branch_name || branch.name || branch.display_name || branch.code || '').trim()
        }))
        .filter(branch => {
            if (!isRealBranchId(branch.branch_id) || seen.has(branch.branch_id)) return false
            seen.add(branch.branch_id)
            return true
        })

    if (isRealBranchId(selected) && !branchOptions.some(branch => branch.branch_id === selected)) {
        branchOptions.push({ branch_id: selected, branch_name: branchLabel(selected) })
    }
    if (!isRealBranchId(selected)) selected = branchOptions[0]?.branch_id || ''

    els.branch.innerHTML = branchOptions
        .map(branch => `<option value="${escapeHtml(branch.branch_id)}">${escapeHtml(branch.branch_name || branch.branch_id)}</option>`)
        .join('')
    els.branch.value = selected
    if (isRealBranchId(selected)) setSessionBranch(selected, { locked: true })
}

function fallbackDashboardPayload(reason) {
    const session = currentSession()
    const branchId = els.branch?.value || session.branch || ''
    const today = new Date().toISOString().slice(0, 10)

    return {
        period: {
            type: els.period?.value || 'month',
            start: today,
            end: today
        },
        scope: {
            branch_id: branchId,
            branch_name: branchLabel(branchId),
            can_switch_branch: false,
            role: session.role
        },
        kpis: {
            revenue: 0,
            gross_profit: 0,
            expenses: 0,
            net_profit: 0,
            open_jobs: 0,
            completed_jobs: 0,
            unpaid_jobs: 0,
            low_stock_count: 0
        },
        trends: {
            revenue_by_day: [],
            expenses_by_day: []
        },
        available_branches: fallbackBranchOptions(),
        branches: [],
        recent_jobs: [],
        alerts: [{
            type: 'api_offline',
            severity: 'warning',
            title: t('apiOfflineTitle'),
            detail: reason || t('apiOfflineDetail')
        }],
        generated_at: new Date().toISOString(),
        offline: true
    }
}

async function loadDashboard() {
    if (!assertAccess()) return

    setState('loading')
    const params = new URLSearchParams({
        period: els.period?.value || 'month',
        branch_id: els.branch?.value || currentSession().branch || '',
        date: new Date().toISOString().slice(0, 10)
    })
    if (!isRealBranchId(params.get('branch_id'))) {
        const fallback = branchOptions[0]?.branch_id
        if (fallback) params.set('branch_id', fallback)
    }

    try {
        const res = await fetch(`/api/data/custom/manager-dashboard?${params}`, {
            headers: authHeaders()
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `Dashboard request failed (${res.status})`)
        renderDashboard(data)
        setState('ready')
    } catch (err) {
        if (currentSession().dev) {
            renderDashboard(fallbackDashboardPayload(err.message || t('apiOfflineDetail')))
            setState('ready')
            return
        }
        setState('error', err.message || t('apiOfflineDetail'))
    }
}

function renderDashboard(data) {
    const kpis = data.kpis || {}
    const revenue = Number(kpis.revenue || 0)
    const gross = Number(kpis.gross_profit || 0)
    const expenses = Number(kpis.expenses || 0)
    const net = Number(kpis.net_profit || 0)

    kpiEls.revenue.textContent = money(revenue)
    kpiEls.completed.textContent = t('completedJobs', Number(kpis.completed_jobs || 0).toLocaleString(lang === 'en' ? 'en-US' : 'th-TH'))
    kpiEls.gross.textContent = money(gross)
    kpiEls.grossMargin.textContent = t('grossMargin', percent(gross, revenue))
    kpiEls.expenses.textContent = money(expenses)
    kpiEls.expenseRatio.textContent = t('expenseRatio', percent(expenses, revenue))
    kpiEls.net.textContent = money(net)
    kpiEls.net.classList.toggle('red', net < 0)
    kpiEls.net.classList.toggle('green', net >= 0)
    kpiEls.netMargin.textContent = t('netMargin', percent(net, revenue))
    kpiEls.openJobs.textContent = Number(kpis.open_jobs || 0).toLocaleString(lang === 'en' ? 'en-US' : 'th-TH')
    kpiEls.unpaid.textContent = Number(kpis.unpaid_jobs || 0).toLocaleString(lang === 'en' ? 'en-US' : 'th-TH')
    kpiEls.lowStock.textContent = Number(kpis.low_stock_count || 0).toLocaleString(lang === 'en' ? 'en-US' : 'th-TH')
    kpiEls.scope.textContent = data.scope?.branch_name || branchLabel(data.scope?.branch_id) || '-'

    if (els.scopeLabel) els.scopeLabel.textContent = data.scope?.branch_name || branchLabel(data.scope?.branch_id) || '-'
    if (els.periodLabel) els.periodLabel.textContent = t('periodRange', data.period?.start, data.period?.end)
    if (els.updatedLabel) els.updatedLabel.textContent = new Date(data.generated_at || Date.now()).toLocaleString(lang === 'en' ? 'en-US' : 'th-TH', { dateStyle: 'short', timeStyle: 'short' })

    if (els.branch) {
        renderBranchOptions(data.available_branches || branchOptions, data.scope?.branch_id || els.branch.value || '')
        els.branch.disabled = true
    }

    renderTrend(data.trends || {})
    renderBranches(data.branches || [])
    renderJobs(data.recent_jobs || [])
    renderAlerts(data.alerts || [])
}

function renderTrend(trends) {
    const revenueRows = trends.revenue_by_day || []
    const expenseRows = trends.expenses_by_day || []
    const max = Math.max(
        1,
        ...revenueRows.map(row => Number(row.value || 0)),
        ...expenseRows.map(row => Number(row.value || 0))
    )
    const byDate = new Map()
    revenueRows.forEach(row => byDate.set(row.date, { date: row.date, revenue: Number(row.value || 0), expenses: 0 }))
    expenseRows.forEach(row => {
        const current = byDate.get(row.date) || { date: row.date, revenue: 0, expenses: 0 }
        current.expenses = Number(row.value || 0)
        byDate.set(row.date, current)
    })
    const rows = [...byDate.values()]
    if (els.trend) {
        els.trend.style.setProperty('--bars', String(Math.max(rows.length, 1)))
        els.trend.innerHTML = rows.length ? rows.map(row => `
            <div class="bar-pair" title="${escapeHtml(row.date)} | ${escapeHtml(t('revenue'))} ${money(row.revenue)} | ${escapeHtml(t('expenses'))} ${money(row.expenses)}">
                <div class="bar revenue" style="height:${Math.max(2, (row.revenue / max) * 100)}%"></div>
                <div class="bar expense" style="height:${Math.max(2, (row.expenses / max) * 100)}%"></div>
            </div>
        `).join('') : `<div class="empty">${escapeHtml(t('noTrend'))}</div>`
    }
}

function renderBranches(rows) {
    if (!els.branchRows) return
    els.branchRows.innerHTML = rows.length ? rows.map(row => `
        <tr>
            <td>${escapeHtml(row.branch_name || row.branch_id || '-')}</td>
            <td class="num">${money(row.revenue)}</td>
            <td class="num">${money(row.expenses)}</td>
            <td class="num ${Number(row.net_profit || 0) < 0 ? 'red' : 'green'}">${money(row.net_profit)}</td>
            <td class="num">${Number(row.completed_jobs || 0).toLocaleString(lang === 'en' ? 'en-US' : 'th-TH')}</td>
        </tr>
    `).join('') : `<tr><td colspan="5" class="empty">${escapeHtml(t('noBranch'))}</td></tr>`
}

function renderJobs(rows) {
    if (!els.jobRows) return
    els.jobRows.innerHTML = rows.length ? rows.map(job => `
        <tr>
            <td><strong>${escapeHtml(job.job_no || job.id || '-')}</strong></td>
            <td>${escapeHtml(job.customer_name || '-')}</td>
            <td>${escapeHtml(job.plate || '-')}</td>
            <td><span class="badge">${escapeHtml(job.status || job.payment_status || '-')}</span></td>
            <td class="num">${money(job.grand_total)}</td>
        </tr>
    `).join('') : `<tr><td colspan="5" class="empty">${escapeHtml(t('noJobs'))}</td></tr>`
}

function renderAlerts(rows) {
    if (els.alertCount) els.alertCount.textContent = String(rows.length)
    if (!els.alertList) return
    els.alertList.innerHTML = rows.length ? rows.map(alert => `
        <article class="alert ${alert.severity === 'critical' ? 'critical' : ''}">
            <div class="alert-title">${escapeHtml(alert.title || '-')}</div>
            <div class="alert-detail">${escapeHtml(alert.detail || '')}</div>
        </article>
    `).join('') : `<div class="empty">${escapeHtml(t('noAlerts'))}</div>`
}

function initControls() {
    const session = currentSession()
    if (els.lang) els.lang.value = lang
    if (els.branch) {
        renderBranchOptions()
        els.branch.value = isRealBranchId(session.branch) ? session.branch : (branchOptions[0]?.branch_id || '')
        els.branch.disabled = true
    }
    els.period?.addEventListener('change', loadDashboard)
    els.branch?.addEventListener('change', loadDashboard)
    els.refresh?.addEventListener('click', loadDashboard)
    els.lang?.addEventListener('change', () => {
        lang = els.lang.value === 'en' ? 'en' : 'th'
        setSessionLanguage(lang)
        applyStaticLanguage()
        loadDashboard()
    })
}

function setText(selector, text) {
    const el = document.querySelector(selector)
    if (el) el.textContent = text
}

function setIconButtonText(selector, icon, text) {
    const el = document.querySelector(selector)
    if (el) el.innerHTML = `<span class="material-icons-outlined">${icon}</span>${escapeHtml(text)}`
}

function applyStaticLanguage() {
    document.documentElement.lang = lang
    setText('h1', t('title'))
    setText('.subtitle', t('subtitle'))
    setText('#periodSelect option[value="today"]', t('today'))
    setText('#periodSelect option[value="week"]', t('week'))
    setText('#periodSelect option[value="month"]', t('month'))
    if (!branchOptions.length) {
        renderBranchOptions(fallbackBranchOptions(), els.branch?.value || currentSession().branch || '')
    }
    setIconButtonText('#refreshBtn', 'refresh', t('refresh'))
    setIconButtonText('.back-link', 'arrow_back', t('portal'))
    setText('#kpiRevenueLabel', t('revenue'))
    setText('#kpiGrossLabel', t('grossProfit'))
    setText('#kpiExpensesLabel', t('expenses'))
    setText('#kpiNetLabel', t('netProfit'))
    setText('#kpiOpenJobsLabel', t('openJobs'))
    setText('#kpiUnpaidLabel', t('unpaid'))
    setText('#kpiLowStockLabel', t('lowStock'))
    setText('#kpiScopeLabel', t('scope'))
    setText('#trendTitle', t('trendTitle'))
    setText('#trendBadge', t('daily'))
    setText('#legendRevenue', t('revenue'))
    setText('#legendExpenses', t('expenses'))
    setText('#branchTitle', t('branchCompare'))
    setText('#branchBadge', t('branch'))
    setText('#branchHeadBranch', t('branch'))
    setText('#branchHeadRevenue', t('revenue'))
    setText('#branchHeadExpenses', t('expenses'))
    setText('#branchHeadNet', t('netProfit'))
    setText('#branchHeadJobs', t('jobs'))
    setText('#jobsTitle', t('recentJobs'))
    setText('#jobsBadge', t('jobs'))
    setText('#jobHeadJob', t('job'))
    setText('#jobHeadCustomer', t('customer'))
    setText('#jobHeadPlate', t('plate'))
    setText('#jobHeadStatus', t('status'))
    setText('#jobHeadTotal', t('total'))
    setText('#alertsTitle', t('alerts'))

    const kpiSubs = document.querySelectorAll('.kpi-sub')
    if (kpiSubs[4]) kpiSubs[4].textContent = t('openJobsSub')
    if (kpiSubs[5]) kpiSubs[5].textContent = t('unpaidSub')
    if (kpiSubs[6]) kpiSubs[6].textContent = t('lowStockSub')
    if (kpiSubs[7]) kpiSubs[7].textContent = t('scopeSub')
}

initControls()
applyStaticLanguage()
loadDashboard()
