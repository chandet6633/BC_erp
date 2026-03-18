/**
 * MungkhudShop — Auth Service
 * Handles login, logout, role-based access control, branch switching, and granular permissions.
 * Uses custom app_users collection (not PB auth).
 */
import { fetchFullList } from './pb.js'
import { managementPB } from './pb.js'
import { hashPassword } from './crypto.js'
import { sanitizeFilter } from '../utils/sanitize.js'

const AUTH_KEY = 'mungkhud_auth'
const BRANCH_KEY = 'mungkhud_branch'

/** Get current logged-in user from localStorage */
export function getCurrentUser() {
    try {
        const raw = localStorage.getItem(AUTH_KEY)
        return raw ? JSON.parse(raw) : null
    } catch { return null }
}

/** Save user session */
export function setCurrentUser(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user))
}

/** Clear user session */
export function logout() {
    localStorage.removeItem(AUTH_KEY)
    window.location.hash = '#/login'
    window.location.reload()
}

/** Login with username + password */
export async function login(username, password) {
    const safeUser = sanitizeFilter(username)
    const hashedPw = await hashPassword(password)

    // Try hashed password match
    let users = await fetchFullList('app_users', {
        filter: `username='${safeUser}' && password='${sanitizeFilter(hashedPw)}' && is_active=true`,
        requestKey: null
    })

    // Fallback: fetch by username only, then verify password in JS (avoids filter injection on password)
    if (users.length === 0) {
        const candidates = await fetchFullList('app_users', {
            filter: `username='${safeUser}' && is_active=true`,
            requestKey: null
        })
        const match = candidates.find(u => u.password === password)
        if (match) {
            users = [match]
            // Auto-migrate plaintext password to hash
            try {
                const { updateRecord } = await import('./pb.js')
                await updateRecord('app_users', match.id, { password: hashedPw })
                console.log('🔒 Password auto-migrated to hash for:', username)
            } catch (e) { console.warn('Hash migration failed:', e) }
        }
    }

    if (users.length === 0) return null

    const user = users[0]
    // Fetch role permissions
    const roles = await fetchFullList('system_roles', {
        filter: `name='${sanitizeFilter(user.role)}'`,
        requestKey: null
    })
    const roleData = roles.length > 0 ? roles[0] : { allowed_menus: '' }

    const session = {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        allowed_menus: roleData.allowed_menus,
        branch_id: user.branch_id || '',
        permissions: user.permissions || '{}'
    }
    setCurrentUser(session)

    // Set branch from user's assigned branch (employees see only their branch)
    if (user.branch_id && (user.role === 'employee' || user.role === 'sa')) {
        setBranch(user.branch_id)
    }
    return session
}

/** Routes restricted from employees */
const EMPLOYEE_RESTRICTED_ROUTES = [
    'report-sales', 'report-inventory', 'report-finance', 'forms',
    'settings', 'user-permissions', 'master-branch'
]

/** Employee default allowed menus (everything except reports/settings) */
const EMPLOYEE_DEFAULT_MENUS = [
    '#/dashboard', '#/job', '#/quotation', '#/invoice', '#/receipt', '#/credit-note',
    '#/stock-list', '#/requisition', '#/stock-return', '#/stock-transfer', '#/stock-adjust',
    '#/goods-receipt', '#/purchase-invoice', '#/purchase-cn', '#/payment', '#/withholding-tax',
    '#/master-company', '#/master-customer', '#/master-vehicle', '#/master-product',
    '#/master-brand', '#/master-group', '#/master-vendor', '#/master-lookup'
].join(',')

/** Login with PIN — queries Management's shared user database */
export async function loginByPin(pin, roleGroup) {
    // Build role filter matching Management's approach
    let roleFilter = ''
    if (roleGroup === 'manager') {
        roleFilter = `(role='owner' || role='manager')`
    } else if (roleGroup === 'admin') {
        roleFilter = `(role='admin')`
    } else {
        roleFilter = `(role='employee' || role='employee_main' || role='employee_sup' || role='sa')`
    }

    try {
        const res = await managementPB.collection('users').getFirstListItem(
            `pin='${sanitizeFilter(pin)}' && ${roleFilter}`
        )

        if (!res) return null

        // Determine allowed menus based on role
        let allowedMenus = '*'
        const isEmployee = ['employee', 'employee_main', 'employee_sup', 'sa'].includes(res.role)

        try {
            const roles = await fetchFullList('system_roles', {
                filter: `name='${sanitizeFilter(res.role)}'`,
                requestKey: null
            })
            if (roles.length > 0) allowedMenus = roles[0].allowed_menus
        } catch {
            // system_roles collection may not exist — use smart defaults
            if (isEmployee) {
                allowedMenus = EMPLOYEE_DEFAULT_MENUS
            } else {
                allowedMenus = '*'  // admin/owner/manager get full access
            }
        }

        const session = {
            id: res.id,
            username: res.name,
            display_name: res.name,
            role: res.role,
            allowed_menus: allowedMenus,
            branch_id: res.branch || '',
            permissions: '{}',
            sso_source: 'pin_shared'
        }
        setCurrentUser(session)

        if (res.branch && isEmployee) {
            setBranch(res.branch)
        }

        return session
    } catch (e) {
        console.warn('[Auth] PIN login failed:', e.message)
        return null
    }
}

/** Check if a route is restricted for employees */
export function isEmployeeRestricted(route) {
    return EMPLOYEE_RESTRICTED_ROUTES.includes(route)
}

/** Check if current session came from SSO or shared login */
export function isSSO() {
    const user = getCurrentUser()
    return user && (user.sso_source === 'management' || user.sso_source === 'pin_shared')
}

/** Check if current user has access to a specific hash route */
export function hasAccess(hash) {
    const user = getCurrentUser()
    if (!user) return false
    if (user.allowed_menus === '*') return true
    const menus = (user.allowed_menus || '').split(',').map(m => m.trim())
    return menus.includes(hash)
}

/** Check if user is logged in, redirect to login if not */
export function requireAuth() {
    const user = getCurrentUser()
    if (!user) {
        window.location.hash = '#/login'
        return false
    }
    return true
}

/** Get role display name */
export function getRoleLabel(role) {
    const labels = {
        admin: 'ผู้ดูแลระบบ',
        owner: 'เจ้าของ',
        manager: 'ผู้จัดการ',
        employee: 'พนักงาน',
        employee_main: 'พนักงาน (หลัก)',
        employee_sup: 'พนักงาน (สุพรรณ)',
        sa: 'SA'
    }
    return labels[role] || role
}

/* ═══════════════════════════════════════════════════
   Branch (Multi-Shop) Helpers
   ═══════════════════════════════════════════════════ */

/** Get currently selected branch ID ('' = all branches for admin/owner) */
export function getBranch() {
    return localStorage.getItem(BRANCH_KEY) || ''
}

/** Set current branch */
export function setBranch(branchId) {
    localStorage.setItem(BRANCH_KEY, branchId || '')
}

/**
 * Get PocketBase filter string for branch scoping.
 * Admin/owner with '' branch = no filter (all branches).
 * Employee with specific branch = filter by branch_id.
 * @param {string} [fieldName] — the branch field name in the collection (default: 'branch_id')
 * @returns {string} PocketBase filter string or ''
 */
export function getBranchFilter(fieldName = 'branch_id') {
    const branch = getBranch()
    if (!branch) return '' // All branches
    return `${fieldName}='${sanitizeFilter(branch)}'`
}

/* ═══════════════════════════════════════════════════
   Granular Permission Helpers
   ═══════════════════════════════════════════════════ */

/**
 * Check if current user has a specific granular permission.
 * Admin always has all permissions.
 * @param {string} key — e.g. 'can_close_job', 'can_void_doc', 'can_approve_stock'
 * @returns {boolean}
 */
export function hasPermission(key) {
    const user = getCurrentUser()
    if (!user) return false
    if (user.role === 'admin') return true
    try {
        const perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || {})
        return !!perms[key]
    } catch {
        return false
    }
}

