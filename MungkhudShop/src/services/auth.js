/**
 * MungkhudShop — Auth Service (Unified Login)
 * ═══════════════════════════════════════════════
 * Supports username/password login (primary) and PIN login (secondary).
 * JWT stored in localStorage for persistent sessions.
 *
 * Architecture: Browser → Nginx → Express API → NocoDB
 */
import { fetchFullList } from './pb.js'
import { loginWithPin, loginWithUsername, validateToken, clearAuthToken } from '@shared/nocodb-adapter.js'
import { sanitizeFilter } from '../utils/sanitize.js'

const AUTH_KEY = 'mungkhud_auth'
const TOKEN_KEY = 'mungkhud_jwt'
const BRANCH_KEY = 'mungkhud_branch'

/* ═══════════════════════════════════════════════════
   SESSION MANAGEMENT
   ═══════════════════════════════════════════════════ */

/** Get current logged-in user from localStorage */
export function getCurrentUser() {
    try {
        const raw = localStorage.getItem(AUTH_KEY)
        return raw ? JSON.parse(raw) : null
    } catch { return null }
}

/** Save user session + JWT */
export function setCurrentUser(user, token) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user))
    if (token) localStorage.setItem(TOKEN_KEY, token)
}

/** Get stored JWT token */
export function getStoredToken() {
    return localStorage.getItem(TOKEN_KEY) || ''
}

/** Clear user session */
export function logout() {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(TOKEN_KEY)
    clearAuthToken()
    window.location.hash = '#/login'
    window.location.reload()
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
            // Session only — store in sessionStorage fallback
            setCurrentUser(session, token)
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
    try {
        const roles = await fetchFullList('system_roles', {
            filter: `name='${sanitizeFilter(user.role)}'`,
            requestKey: null
        })
        if (roles.length > 0) allowedMenus = roles[0].allowed_menus
    } catch {
        if (['mechanic', 'sa'].includes(user.role)) {
            allowedMenus = '#/dashboard,#/kanban,#/job'
        }
    }

    return {
        id: user.id,
        username: user.username || user.name,
        display_name: user.name || user.display_name,
        role: user.role,
        allowed_menus: allowedMenus,
        branch_id: user.branch || '',
        permissions: '{}',
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

/** Check if current session came from SSO */
export function isSSO() {
    const user = getCurrentUser()
    return user && user.sso_source === 'management'
}

/** Get role display name */
export function getRoleLabel(role) {
    const labels = {
        admin: 'ผู้ดูแลระบบ',
        owner: 'เจ้าของ',
        manager: 'ผู้จัดการ',
        mechanic: 'ช่าง',
        sa: 'SA'
    }
    return labels[role] || role
}

/* ═══════════════════════════════════════════════════
   BRANCH (MULTI-SHOP) HELPERS
   ═══════════════════════════════════════════════════ */

export function getBranch() {
    return localStorage.getItem(BRANCH_KEY) || ''
}

export function setBranch(branchId) {
    localStorage.setItem(BRANCH_KEY, branchId || '')
}

export function getBranchFilter(fieldName = 'branch_id') {
    const branch = getBranch()
    if (!branch) return ''
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
