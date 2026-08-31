/**
 * MungkhudShop — Auth Service (Unified Login)
 * ═══════════════════════════════════════════════
 * Supports username/password login (primary) and PIN login (secondary).
 * JWT stored in localStorage for persistent sessions.
 *
 * Architecture: Browser → Nginx → Express API → NocoDB
 */
import { fetchFullList, getPortalUrl } from './pb.js'
import { loginWithPin, loginWithUsername, validateToken, clearAuthToken } from '@shared/nocodb-adapter.js'
import { buildDevAuthHeaders, clearAppSession, getSession, isRealBranchId, setSessionBranch } from '@shared/session.js'
import { sanitizeFilter } from '../utils/sanitize.js'

const AUTH_KEY = 'mungkhud_auth'
const TOKEN_KEY = 'mungkhud_jwt'

/* ═══════════════════════════════════════════════════
   SESSION MANAGEMENT
   ═══════════════════════════════════════════════════ */

/** Get current logged-in user from localStorage, with expiry check */
export function getCurrentUser() {
    try {
        const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY)
        if (!raw) return null
        const session = JSON.parse(raw)
        // BUG 50 FIX: Validate session expiry (7-day token lifetime)
        if (session._expiresAt && Date.now() > session._expiresAt) {
            localStorage.removeItem(AUTH_KEY)
            localStorage.removeItem(TOKEN_KEY)
            sessionStorage.removeItem(AUTH_KEY)
            sessionStorage.removeItem(TOKEN_KEY)
            return null
        }
        return session
    } catch { return null }
}

/** Save user session + JWT with expiry timestamp */
export function setCurrentUser(user, token) {
    // BUG 50 FIX: Attach expiry timestamp matching the 7-day JWT lifetime
    const sessionWithExpiry = { ...user, _expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }
    localStorage.setItem(AUTH_KEY, JSON.stringify(sessionWithExpiry))
    if (token) localStorage.setItem(TOKEN_KEY, token)
    const branchId = user.branch_id || user.branch || ''
    if (isRealBranchId(branchId)) setSessionBranch(branchId, { locked: user.branch_locked !== false })
}

/** Get stored JWT token — checks localStorage then sessionStorage */
export function getStoredToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''
}

/** Build auth headers for direct fetch() calls that bypass the shared adapter. */
export function getApiAuthHeaders(extra = {}) {
    const token = getStoredToken()
    const headers = { ...extra }
    if (token) {
        headers.Authorization = `Bearer ${token}`
        return headers
    }

    return buildDevAuthHeaders(headers)
}

/** Clear user session */
export function clearCurrentSession() {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(TOKEN_KEY)
    clearAppSession()
    sessionStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    clearAuthToken()
}

/** Send the user back to the Portal, the only entry point for MungkhudShop. */
export function redirectToPortal(reason = 'portal_required') {
    const url = new URL(getPortalUrl(), window.location.href)
    url.searchParams.set('from', 'mungkhudshop')
    url.searchParams.set('reason', reason)
    window.location.href = url.toString()
}

/** Clear user session */
export function logout() {
    clearCurrentSession()
    redirectToPortal('signed_out')
}

/* ═══════════════════════════════════════════════════
   AUTO-LOGIN (Task 1.8)
   ═══════════════════════════════════════════════════ */

/**
 * Try to auto-login using stored JWT.
 * @returns {object|null} User session if valid, null if expired/missing
 */
export async function tryAutoLogin() {
    const token = getStoredToken()
    if (!token) return null

    try {
        const user = await validateToken(token)
        if (!user) {
            // Token expired or invalid
            localStorage.removeItem(TOKEN_KEY)
            localStorage.removeItem(AUTH_KEY)
            return null
        }

        // Refresh session data
        const session = await buildSession(user)
        setCurrentUser(session, token)
        return session
    } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(AUTH_KEY)
        return null
    }
}

/* ═══════════════════════════════════════════════════
   LOGIN METHODS
   ═══════════════════════════════════════════════════ */

/**
 * Login with username + password (primary method).
 * @param {string} username
 * @param {string} password
 * @param {boolean} remember — store JWT persistently
 * @returns {object|null} Session or null on failure
 */
export async function loginByUsername(username, password, remember = true) {
    try {
        const { user, token } = await loginWithUsername(username, password)
        if (!user) return null

        const session = await buildSession(user)
        session.must_change_password = user.must_change_password || false

        if (remember) {
            setCurrentUser(session, token)
        } else {
            // BUG 9 FIX: Non-persistent session — store in sessionStorage only, not localStorage
            // The user's data disappears when the browser tab is closed
            try {
                sessionStorage.setItem(AUTH_KEY, JSON.stringify(session))
                sessionStorage.setItem(TOKEN_KEY, token)
            } catch {
                // Fallback to localStorage if sessionStorage unavailable (e.g., private mode)
                setCurrentUser(session, token)
            }
        }

        // Set branch for scoped roles
        if (user.branch && !['admin', 'owner'].includes(user.role)) {
            setBranch(user.branch)
        }

        return session
    } catch (e) {
        console.warn('[Auth] Username login failed:', e.message)
        throw e // Let caller display the error message
    }
}

/**
 * Login with PIN (secondary — for shared tablets).
 */
export async function loginByPin(pin, roleGroup) {
    try {
        const { user, token } = await loginWithPin(pin, roleGroup)
        if (!user) return null

        const session = await buildSession(user)
        session.must_change_password = user.must_change_password || false
        setCurrentUser(session, token)

        if (user.branch && !['admin', 'owner'].includes(user.role)) {
            setBranch(user.branch)
        }

        return session
    } catch (e) {
        console.warn('[Auth] PIN login failed:', e.message)
        return null
    }
}

/**
 * Build a full session object from API user data.
 */
async function buildSession(user) {
    // Fetch role permissions
    let allowedMenus = '*'
    let rolePermissions = '{}'
    try {
        const roles = await fetchFullList('system_roles', {
            filter: `name='${sanitizeFilter(user.role)}'`,
            requestKey: null
        })
        if (roles.length > 0) {
            allowedMenus = roles[0].allowed_menus
            if (roles[0].permissions) {
                rolePermissions = typeof roles[0].permissions === 'string' 
                    ? roles[0].permissions 
                    : JSON.stringify(roles[0].permissions)
            }
        }
    } catch {
        // BUG 7 FIX: Proper per-role fallback menus when system_roles is unavailable
        const SA_MENUS = '#/dashboard,#/job,#/kanban,#/stock-list,#/service-price-list,#/requisition,#/stock-return,#/stock-transfer,#/stock-adjust'
        if (user.role === 'sa') allowedMenus = SA_MENUS
        else if (['mechanic', 'technician'].includes(user.role)) allowedMenus = '#/mechanic-kpi'
        else if (['manager', 'owner', 'admin'].includes(user.role)) allowedMenus = '*'
    }

    return {
        id: user.id,
        username: user.username || user.name,
        display_name: user.name || user.display_name,
        role: user.role,
        allowed_menus: allowedMenus,
        branch_id: user.branch || '',
        permissions: rolePermissions,
        sso_source: 'api_jwt'
    }
}

/* ═══════════════════════════════════════════════════
   ACCESS CONTROL
   ═══════════════════════════════════════════════════ */

/** Check if current user has access to a specific hash route */
export function hasAccess(hash) {
    const user = getCurrentUser()
    if (!user) return false
    if (user.allowed_menus === '*') return true
    const menus = (user.allowed_menus || '').split(',').map(m => m.trim())
    if (hash === '#/service-price-list' && (menus.includes('#/stock-list') || menus.includes('#/master-product'))) {
        return true
    }
    return menus.includes(hash)
}

/** Check if user is logged in, redirect to login if not */
export function requireAuth() {
    const user = getCurrentUser()
    if (!user) {
        redirectToPortal('portal_required')
        return false
    }
    return true
}

/** Check if current session came from SSO */
export function isSSO() {
    const user = getCurrentUser()
    return user && (user.sso_source === 'portal' || user.sso_source === 'app.portal')
}

/** Get role display name */
export function getRoleLabel(role) {
    const labels = {
        admin: 'ผู้ดูแลระบบ',
        owner: 'เจ้าของ',
        manager: 'ผู้จัดการ',
        mechanic: 'ช่าง',
        technician: 'ช่างเทคนิค',
        sa: 'SA'
    }
    return labels[role] || role
}

/* ═══════════════════════════════════════════════════
   BRANCH (MULTI-SHOP) HELPERS
   ═══════════════════════════════════════════════════ */

export function getBranch() {
    const sessionBranch = getSession().branchId
    if (isRealBranchId(sessionBranch)) return sessionBranch
    const user = getCurrentUser()
    const userBranch = user?.branch_id || user?.branch || ''
    return isRealBranchId(userBranch) ? userBranch : ''
}

export function setBranch(branchId) {
    if (!isRealBranchId(branchId)) return
    setSessionBranch(branchId, { locked: true })
}

export function getBranchFilter(fieldName = 'branch_id') {
    const branch = getBranch()
    if (!isRealBranchId(branch)) return `${fieldName}='__missing_branch__'`
    return `${fieldName}='${sanitizeFilter(branch)}'`
}

/* ═══════════════════════════════════════════════════
   GRANULAR PERMISSIONS
   ═══════════════════════════════════════════════════ */

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


