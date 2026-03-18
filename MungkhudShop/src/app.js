/**
 * MungkhudShop — Main Application Router
 * Hash-based SPA router with Auth guard, RBAC sidebar, and Help instructions.
 * P3: Dynamic imports for code splitting — pages load on-demand.
 */
import { initDashboardPage } from './pages/dashboard.js'
import { initLoginPage } from './pages/login.js'
import { getCurrentUser, setCurrentUser, hasAccess, logout, getRoleLabel, getBranch, setBranch, isSSO, isEmployeeRestricted } from './services/auth.js'
import { showHelp } from './components/help.js'
import { initChangelog } from './components/changelog.js'
import { sanitizeFilter } from './utils/sanitize.js'
import { fetchFullList, managementPB, getManagementUrl } from './services/pb.js'

/* ── P3: Route → Lazy init function map ── */
const ROUTES = {
    'dashboard': initDashboardPage,
    'job': () => import('./pages/job.js').then(m => m.initJobPage),
    'quotation': () => import('./pages/quotation.js').then(m => m.initQuotationPage),
    'invoice': () => import('./pages/invoice.js').then(m => m.initInvoicePage),
    'receipt': () => import('./pages/receipt.js').then(m => m.initReceiptPage),
    'credit-note': () => import('./pages/credit-note.js').then(m => m.initCreditNotePage),
    'stock-list': () => import('./pages/stock-list.js').then(m => m.initStockListPage),
    'requisition': () => import('./pages/requisition.js').then(m => m.initRequisitionPage),
    'stock-return': () => import('./pages/stock-return.js').then(m => m.initStockReturnPage),
    'stock-transfer': () => import('./pages/stock-transfer.js').then(m => m.initStockTransferPage),
    'stock-adjust': () => import('./pages/stock-adjust.js').then(m => m.initStockAdjustPage),
    'goods-receipt': () => import('./pages/goods-receipt.js').then(m => m.initGoodsReceiptPage),
    'purchase-invoice': () => import('./pages/purchase-invoice.js').then(m => m.initPurchaseInvoicePage),
    'purchase-cn': () => import('./pages/purchase-cn.js').then(m => m.initPurchaseCNPage),
    'payment': () => import('./pages/payment.js').then(m => m.initPaymentPage),
    'withholding-tax': () => import('./pages/withholding-tax.js').then(m => m.initWithholdingTaxPage),
    'master-company': () => import('./pages/master-company.js').then(m => m.initMasterCompanyPage),
    'master-customer': () => import('./pages/master-customer.js').then(m => m.initMasterCustomerPage),
    'master-vehicle': () => import('./pages/master-vehicle.js').then(m => m.initMasterVehiclePage),
    'master-product': () => import('./pages/master-product.js').then(m => m.initMasterProductPage),
    'master-brand': () => import('./pages/master-brand.js').then(m => m.initMasterBrandPage),
    'master-group': () => import('./pages/master-group.js').then(m => m.initMasterGroupPage),
    'master-vendor': () => import('./pages/master-vendor.js').then(m => m.initMasterVendorPage),
    'master-lookup': () => import('./pages/master-lookup.js').then(m => m.initMasterLookupPage),
    'report-sales': () => import('./pages/report-sales.js').then(m => m.initReportSalesPage),
    'report-inventory': () => import('./pages/report-inventory.js').then(m => m.initReportInventoryPage),
    'report-finance': () => import('./pages/report-finance.js').then(m => m.initReportFinancePage),
    'forms': () => import('./pages/forms.js').then(m => m.initFormsPage),
    'settings': () => import('./pages/settings.js').then(m => m.initSettingsPage),
    'user-permissions': () => import('./pages/user-permissions.js').then(m => m.initUserPermissionsPage),
    'master-branch': () => import('./pages/master-branch.js').then(m => m.initBranchPage),
    'kanban': () => import('./pages/kanban.js').then(m => m.initKanbanPage),
}


const DEFAULT_ROUTE = 'dashboard'

/* ── Router ── */
function getRouteFromHash() {
    const hash = window.location.hash.replace('#/', '').split('?')[0]
    return hash || DEFAULT_ROUTE
}

async function navigate(route) {
    const user = getCurrentUser()

    // --- Login page (no auth needed) ---
    if (route === 'login') {
        hideAppShell()
        const content = document.getElementById('pageContent')
        content.innerHTML = ''
        initLoginPage(content)
        return
    }

    // --- Auth guard ---
    if (!user) {
        window.location.hash = '#/login'
        return
    }

    // --- RBAC check (employee restriction) ---
    const isEmployee = user.role && ['employee', 'employee_main', 'employee_sup', 'sa'].includes(user.role)
    if (isEmployee && isEmployeeRestricted(route)) {
        showAppShell()
        const content = document.getElementById('pageContent')
        content.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-outlined" style="font-size:48px;color:#ef4444;">lock</span>
                <h2>ไม่มีสิทธิ์เข้าถึง</h2>
                <p>บัญชีของคุณ (${getRoleLabel(user.role)}) ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
                <a href="#/dashboard" class="btn btn-primary" style="margin-top:var(--sp-4);">กลับหน้าหลัก</a>
            </div>`
        return
    }

    // --- RBAC check (allowed_menus) ---
    const hashRoute = `#/${route}`
    if (!hasAccess(hashRoute)) {
        showAppShell()
        const content = document.getElementById('pageContent')
        content.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-outlined" style="font-size:48px;color:#ef4444;">lock</span>
                <h2>ไม่มีสิทธิ์เข้าถึง</h2>
                <p>บัญชีของคุณ (${getRoleLabel(user.role)}) ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
                <a href="#/dashboard" class="btn btn-primary" style="margin-top:var(--sp-4);">กลับหน้าหลัก</a>
            </div>`
        return
    }

    // --- Show app shell ---
    showAppShell()
    updateUserDisplay(user)

    const content = document.getElementById('pageContent')
    const navItems = document.querySelectorAll('.nav-item')

    // Update active nav
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.route === route)
    })

    // Clear and render
    content.innerHTML = ''
    const routeEntry = ROUTES[route]
    if (routeEntry) {
        try {
            // P3: Support both sync functions and async lazy loaders
            let initFn = routeEntry
            if (typeof routeEntry === 'function' && routeEntry.length === 0 && routeEntry !== initDashboardPage) {
                // Lazy loader — show loading state
                content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:var(--sp-8);gap:var(--sp-3);color:var(--color-text-muted);"><span class="material-icons-outlined spin">hourglass_empty</span> กำลังโหลด...</div>'
                initFn = await routeEntry()
            }
            content.innerHTML = ''
            initFn(content)
        } catch (err) {
            console.error(`[ErrorBoundary] Page "${route}" crashed:`, err)
            content.innerHTML = `
                <div class="error-boundary">
                    <span class="material-icons-outlined error-icon">error_outline</span>
                    <h2>เกิดข้อผิดพลาด</h2>
                    <p>ไม่สามารถโหลดหน้านี้ได้ กรุณาลองอีกครั้ง หรือติดต่อผู้ดูแลระบบ</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        <span class="material-icons-outlined">refresh</span> ลองอีกครั้ง
                    </button>
                </div>`
        }
    } else {
        content.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-outlined">construction</span>
                <h2>หน้านี้กำลังพัฒนา</h2>
                <p>กรุณากลับมาใหม่ภายหลัง</p>
            </div>`
    }

    // Update help button route
    const helpBtn = document.getElementById('helpBtn')
    if (helpBtn) helpBtn.dataset.route = hashRoute
}

/* ── Show/Hide App Shell ── */
function hideAppShell() {
    const sidebar = document.getElementById('sidebar')
    const topnav = document.querySelector('.topnav')
    if (sidebar) sidebar.style.display = 'none'
    if (topnav) topnav.style.display = 'none'
    document.querySelector('.main-content')?.classList.add('login-mode')
}

function showAppShell() {
    const sidebar = document.getElementById('sidebar')
    const topnav = document.querySelector('.topnav')
    if (sidebar) sidebar.style.display = ''
    if (topnav) topnav.style.display = ''
    document.querySelector('.main-content')?.classList.remove('login-mode')
}

/* ── Update user display in topnav ── */
function updateUserDisplay(user) {
    const userNameEl = document.querySelector('.user-name')
    const userRoleEl = document.querySelector('.user-role')
    if (userNameEl) userNameEl.textContent = user.display_name
    if (userRoleEl) userRoleEl.textContent = getRoleLabel(user.role)
}

/* ── Filter sidebar items based on role ── */
function filterSidebarByRole() {
    const user = getCurrentUser()
    if (!user) return

    const userRole = user.role || ''
    const isEmployee = ['employee', 'employee_main', 'employee_sup', 'sa'].includes(userRole)

    // 1. Hide entire nav-groups based on data-access attribute
    const navGroups = document.querySelectorAll('.nav-group[data-access]')
    navGroups.forEach(group => {
        const allowedRoles = (group.dataset.access || '').split(',').map(r => r.trim())
        const hasGroupAccess = allowedRoles.some(r => {
            if (r === 'admin') return userRole === 'admin'
            if (r === 'owner') return userRole === 'owner'
            if (r === 'manager') return userRole === 'manager' || userRole === 'owner'
            return userRole === r
        })
        group.style.display = hasGroupAccess ? '' : 'none'
    })

    // 2. Hide individual nav items based on allowed_menus
    if (user.allowed_menus !== '*') {
        const navItems = document.querySelectorAll('.nav-item[data-route]')
        navItems.forEach(item => {
            const route = `#/${item.dataset.route}`
            if (hasAccess(route)) {
                item.style.display = ''
            } else {
                item.style.display = 'none'
            }
        })
    }
}

/* ── Sidebar Toggle (Desktop) ── */
function initSidebar() {
    const sidebar = document.getElementById('sidebar')
    const toggle = document.getElementById('sidebarToggle')

    // Restore state
    if (localStorage.getItem('gs_sidebar') === 'collapsed') {
        sidebar.classList.add('collapsed')
    }

    toggle?.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed')
        localStorage.setItem('gs_sidebar', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded')
    })
}

/* ── Mobile Sidebar Hamburger ── */
function initMobileMenu() {
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById('sidebarOverlay')
    const hamburger = document.getElementById('hamburgerBtn')
    if (!sidebar || !hamburger) return

    function openMobileMenu() {
        sidebar.classList.add('mobile-open')
        overlay?.classList.add('active')
        document.body.style.overflow = 'hidden'
    }

    function closeMobileMenu() {
        sidebar.classList.remove('mobile-open')
        overlay?.classList.remove('active')
        document.body.style.overflow = ''
    }

    hamburger.addEventListener('click', () => {
        if (sidebar.classList.contains('mobile-open')) {
            closeMobileMenu()
        } else {
            openMobileMenu()
        }
    })

    // Close on overlay click
    overlay?.addEventListener('click', closeMobileMenu)

    // Close on nav item click (mobile)
    sidebar.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeMobileMenu()
        })
    })

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
            closeMobileMenu()
        }
    })
}

/* ── Session Timeout (30 min) ── */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const SESSION_WARNING_MS = 25 * 60 * 1000 // Warning at 25 min
let sessionTimer = null
let warningTimer = null

function resetSessionTimer() {
    clearTimeout(sessionTimer)
    clearTimeout(warningTimer)

    if (!getCurrentUser()) return

    warningTimer = setTimeout(() => {
        // Show warning toast (if showToast exists)
        if (typeof window.showToast === 'function') {
            window.showToast('เซสชันจะหมดอายุใน 5 นาที', 'warning')
        }
    }, SESSION_WARNING_MS)

    sessionTimer = setTimeout(() => {
        logout()
        window.location.hash = '#/login'
    }, SESSION_TIMEOUT_MS)
}

function initSessionTimeout() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(evt => document.addEventListener(evt, resetSessionTimer, { passive: true }))
    resetSessionTimer()
}

/* ── Debounce Utility ── */
window.debounce = function(fn, ms = 300) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), ms)
    }
}

/* ── Help Button ── */
function initHelpButton() {
    // Create floating help button if not exists
    let helpBtn = document.getElementById('helpBtn')
    if (!helpBtn) {
        helpBtn = document.createElement('button')
        helpBtn.id = 'helpBtn'
        helpBtn.className = 'floating-help-btn'
        helpBtn.innerHTML = '<span class="material-icons-outlined">help_outline</span>'
        helpBtn.title = 'วิธีใช้งาน'
        document.body.appendChild(helpBtn)
    }

    helpBtn.addEventListener('click', () => {
        const route = helpBtn.dataset.route || `#/${getRouteFromHash()}`
        showHelp(route)
    })
}

/* ── Logout Button ── */
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn')
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault()
            logout()
        })
    }
}

/** Decodes and applies SSO token from URL if present */
async function handleSSO() {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('sso_token')
    if (!token) return

    try {
        // Base64 decode with Unicode support
        const json = decodeURIComponent(escape(atob(token)))
        const data = JSON.parse(json)
        
        // Token expiry check (5 minutes)
        if (Date.now() - data.issued_at > 5 * 60 * 1000) {
            console.warn('SSO token expired')
            return
        }

        // Fetch role data for menu permissions
        let allowedMenus = ''
        try {
            const roles = await fetchFullList('system_roles', {
                filter: `name='${sanitizeFilter(data.role)}'`,
                requestKey: null
            })
            if (roles.length > 0) {
                allowedMenus = roles[0].allowed_menus || ''
            }
        } catch (e) {
            console.warn('SSO: Could not fetch system_roles, using fallback:', e.message)
        }

        // Fallback: privileged roles always get full access
        const FULL_ACCESS_ROLES = ['admin', 'owner', 'manager', 'sa']
        if (!allowedMenus && FULL_ACCESS_ROLES.includes(data.role)) {
            allowedMenus = '*'
        }

        const session = {
            id: data.id,
            username: data.username,
            display_name: data.display_name,
            role: data.role,
            allowed_menus: allowedMenus,
            branch_id: data.branch_id || '',
            permissions: '{}'
        }

        setCurrentUser(session)
        if (data.branch_id) setBranch(data.branch_id)
        
        console.log('✅ SSO Login successful:', session.display_name)

        // Clean URL to prevent re-use/sharing
        params.delete('sso_token')
        const newSearch = params.toString()
        const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash
        window.history.replaceState({}, '', newUrl)

    } catch (e) {
        console.error('❌ SSO parsing failed:', e)
    }
}

/* ── Embedded Mode (iframe inside Management) ── */
function applyEmbeddedMode() {
    document.documentElement.classList.add('embedded-mode')
    const sidebar = document.getElementById('sidebar')
    const topnav = document.querySelector('.topnav')
    const logoutBtn = document.getElementById('logoutBtn')
    if (sidebar) sidebar.style.display = 'none'
    if (topnav) topnav.style.display = 'none'
    if (logoutBtn) logoutBtn.style.display = 'none'
    const mainWrapper = document.querySelector('.main-wrapper')
    if (mainWrapper) mainWrapper.style.width = '100%'
    const mainContent = document.querySelector('.main-content')
    if (mainContent) mainContent.classList.add('login-mode')
}

/* ── Back to Management Button (SSO users only) ── */
function initBackToMgmt() {
    const btn = document.getElementById('backToMgmtBtn')
    if (!btn) return

    const user = getCurrentUser()
    // Show for SSO and shared PIN users
    if (user && (user.sso_source === 'management' || user.sso_source === 'pin_shared')) {
        btn.style.display = 'flex'
        btn.addEventListener('click', () => {
            window.location.href = getManagementUrl()
        })
    }
}

/* ── Dark Mode Toggle ── */
function initDarkMode() {
    const btn = document.getElementById('darkModeBtn')
    const icon = document.getElementById('darkModeIcon')
    if (!btn || !icon) return

    // Load saved preference
    const saved = localStorage.getItem('mungkhud_theme')
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark')
        icon.textContent = 'light_mode'
    } else if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light')
        icon.textContent = 'dark_mode'
    }

    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme')
        if (current === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light')
            localStorage.setItem('mungkhud_theme', 'light')
            icon.textContent = 'dark_mode'
        } else {
            document.documentElement.setAttribute('data-theme', 'dark')
            localStorage.setItem('mungkhud_theme', 'dark')
            icon.textContent = 'light_mode'
        }
    })
}

/* ── Boot ── */
async function boot() {
    const isEmbedded = window.self !== window.top
    await handleSSO()
    initSidebar()
    initMobileMenu()
    initHelpButton()
    initLogout()
    initBackToMgmt()
    initDarkMode()
    initSessionTimeout()
    filterSidebarByRole()
    await initBranchSwitcher()
    if (isEmbedded) applyEmbeddedMode()
    navigate(getRouteFromHash())
    window.addEventListener('hashchange', () => navigate(getRouteFromHash()))

    // Non-blocking: changelog + low-stock alert
    if (getCurrentUser()) {
        initChangelog()
        checkLowStock()
        setInterval(checkLowStock, 5 * 60 * 1000) // Every 5 minutes
    }
}

/* ── Low-Stock Alert Checker ── */
async function checkLowStock() {
    try {
        const products = await fetchFullList('products', { requestKey: 'lowstock_check' })
        const ledgers = await fetchFullList('stock_ledgers', { requestKey: 'lowstock_ledgers' })
        const stockMap = {}
        for (const l of ledgers) {
            stockMap[l.product_id] = (stockMap[l.product_id] || 0) + (l.qty || 0)
        }
        const lowCount = products.filter(p => {
            const qty = stockMap[p.code] || stockMap[p.id] || 0
            return qty <= (p.min_stock || 5)
        }).length

        // Update notification badge
        const badge = document.getElementById('notifBadge')
        if (badge) {
            if (lowCount > 0) {
                badge.textContent = lowCount
                badge.style.display = ''
                // Play subtle beep on first detection
                if (!window._lowStockAlerted) {
                    window._lowStockAlerted = true
                    try {
                        const ctx = new AudioContext()
                        const osc = ctx.createOscillator()
                        const gain = ctx.createGain()
                        osc.connect(gain)
                        gain.connect(ctx.destination)
                        osc.frequency.value = 880
                        gain.gain.value = 0.1
                        osc.start()
                        osc.stop(ctx.currentTime + 0.15)
                    } catch { /* Audio not available */ }
                }
            } else {
                badge.style.display = 'none'
                window._lowStockAlerted = false
            }
        }
    } catch (e) {
        console.warn('Low-stock check failed:', e)
    }
}



/* ── Branch Switcher (queries Management PB) ── */
async function initBranchSwitcher() {
    const select = document.getElementById('branchSelect')
    if (!select) return

    const user = getCurrentUser()
    const isEmployee = user && ['employee', 'employee_main', 'employee_sup', 'sa'].includes(user.role)

    try {
        // Get unique branches from Management's users collection
        const allUsers = await managementPB.collection('users').getFullList({
            fields: 'branch',
            requestKey: 'branch_list'
        })

        // Extract unique non-empty branch values  
        const branchSet = new Map()
        allUsers.forEach(u => {
            if (u.branch && u.branch.trim()) {
                branchSet.set(u.branch.trim(), u.branch.trim())
            }
        })

        select.innerHTML = ''

        // Admin/owner/manager can see all branches
        if (!isEmployee) {
            const allOpt = document.createElement('option')
            allOpt.value = ''
            allOpt.textContent = 'ทุกสาขา'
            select.appendChild(allOpt)
        }

        // Sort branches and add options
        const sortedBranches = [...branchSet.values()].sort()
        sortedBranches.forEach(branch => {
            // Employee only sees their assigned branch
            if (isEmployee && user.branch_id && branch !== user.branch_id) return
            const opt = document.createElement('option')
            opt.value = branch
            opt.textContent = branch
            select.appendChild(opt)
        })

        // If employee is locked to a branch, disable the switcher
        if (isEmployee && user.branch_id) {
            select.value = user.branch_id
            select.disabled = true
            setBranch(user.branch_id)
        } else {
            // Restore saved branch for admin/owner
            const saved = getBranch()
            if (saved) select.value = saved
        }

        // If no branches exist, show a default
        if (select.options.length === 0) {
            const opt = document.createElement('option')
            opt.value = ''
            opt.textContent = 'สาขาหลัก'
            select.appendChild(opt)
        }

        select.addEventListener('change', () => {
            setBranch(select.value)
            navigate(getRouteFromHash()) // Refresh with new branch
        })
    } catch (e) {
        console.warn('Could not load branches:', e)
        // Fallback: show default
        select.innerHTML = '<option value="">สาขาหลัก</option>'
    }
}

document.addEventListener('DOMContentLoaded', boot)
