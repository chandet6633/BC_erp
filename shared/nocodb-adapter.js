/**
 * NocoDB Adapter — Frontend API Client (JWT-authenticated)
 * ═══════════════════════════════════════════════════════════
 * Drop-in replacement for PocketBase SDK. All CRUD signatures
 * are identical — page code requires zero changes.
 *
 * Architecture:
 *   Browser → Nginx → Express API → NocoDB
 *   JWT token stored in localStorage, sent as Authorization: Bearer
 *   No xc-token ever reaches the browser.
 */

import { translateFilter } from './filter-translator.js'
import { compressImage } from './image-compressor.js'
import { buildDevAuthHeaders, hasDevSession } from './session.js'

/* ── Configuration ── */

// API base — proxied through Nginx to Express API server
const API_BASE = '/api/data'
const AUTH_BASE = '/api/auth'

// JWT token — set after login
let JWT_TOKEN = ''
const PRIMARY_TOKEN_KEY = 'mungkhud_jwt'
const LEGACY_TOKEN_KEY = 'bcauto_jwt'

/* ══════════════════════════════════════════
   INITIALIZATION
   ══════════════════════════════════════════ */

/**
 * Initialize the adapter.
 * In the new architecture, table IDs are resolved server-side.
 * We just need to restore any saved JWT token.
 *
 * @param {object} [config]
 * @param {string} [config.token] - Pre-set JWT token (for SSR/testing)
 */
export async function initAdapter(config = {}) {
    if (config.token) {
        JWT_TOKEN = config.token
    }

    // Restore saved JWT from localStorage first, then sessionStorage fallback
    if (!JWT_TOKEN) {
        try {
            const stored =
                localStorage.getItem(PRIMARY_TOKEN_KEY) ||
                sessionStorage.getItem(PRIMARY_TOKEN_KEY) ||
                localStorage.getItem(LEGACY_TOKEN_KEY) ||
                sessionStorage.getItem(LEGACY_TOKEN_KEY)
            if (stored) JWT_TOKEN = stored
        } catch { /* SSR safety */ }
    }
}

/**
 * Set JWT token (called after login).
 */
export function setAuthToken(token) {
    JWT_TOKEN = token
    try {
        localStorage.setItem(PRIMARY_TOKEN_KEY, token)
        localStorage.setItem(LEGACY_TOKEN_KEY, token)
    } catch { }
}

/**
 * Clear JWT token (called on logout).
 */
export function clearAuthToken() {
    JWT_TOKEN = ''
    try {
        localStorage.removeItem(PRIMARY_TOKEN_KEY)
        localStorage.removeItem(LEGACY_TOKEN_KEY)
        sessionStorage.removeItem(PRIMARY_TOKEN_KEY)
        sessionStorage.removeItem(LEGACY_TOKEN_KEY)
    } catch { }
}

/**
 * Get the current JWT token.
 */
export function getAuthToken() {
    if (!JWT_TOKEN) {
        try {
            JWT_TOKEN =
                localStorage.getItem(PRIMARY_TOKEN_KEY) ||
                sessionStorage.getItem(PRIMARY_TOKEN_KEY) ||
                localStorage.getItem(LEGACY_TOKEN_KEY) ||
                sessionStorage.getItem(LEGACY_TOKEN_KEY) ||
                ''
        } catch { /* SSR safety */ }
    }
    return JWT_TOKEN
}

/* ══════════════════════════════════════════
   LOW-LEVEL FETCH
   ══════════════════════════════════════════ */

async function _fetch(url, options = {}) {
    const token = getAuthToken()
    const devHeaders = !token ? buildDevAuthHeaders() : {}

    const headers = {
        'Content-Type': 'application/json',
        // Send JWT as Authorization: Bearer header
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...devHeaders,
        ...(options.headers || {})
    }
    const res = await fetch(url, { ...options, headers })

    // Global 401 interceptor: stale/invalid token → clear session & redirect to login
    // NOTE: NO reload() here — that would cause a request storm hitting the rate limiter
    if (res.status === 401 && !url.includes('/api/auth/') && !window._authRedirecting) {
        if (typeof window !== 'undefined') {
            const isDevPortalSession = hasDevSession()
            if (isDevPortalSession && !token) {
                return res
            }
        }

        clearAuthToken()
        try {
            localStorage.removeItem(PRIMARY_TOKEN_KEY)
            localStorage.removeItem(LEGACY_TOKEN_KEY)
            localStorage.removeItem('mungkhud_auth')
            sessionStorage.removeItem(PRIMARY_TOKEN_KEY)
            sessionStorage.removeItem(LEGACY_TOKEN_KEY)
            sessionStorage.removeItem('mungkhud_auth')
        } catch { }
        if (typeof window !== 'undefined') {
            // Navigate without reload — the router will redirect to login
            const pathname = window.location.pathname || '/'
            const isPortalApp =
                window.location.port === '9092' ||
                window.location.port === '8092' ||
                pathname.includes('/pages/main')
            if (isPortalApp) {
                return res
            }

            window._authRedirecting = true
            const url = new URL(getPortalUrl(), window.location.href)
            url.searchParams.set('from', 'mungkhudshop')
            url.searchParams.set('reason', 'token_expired')
            window.location.href = url.toString()
        }
    }

    return res
}

/* ══════════════════════════════════════════
   CRUD OPERATIONS
   Signatures match PocketBase SDK for zero-change migration.
   ══════════════════════════════════════════ */

/**
 * Fetch a paginated list of records.
 * Compatible with: pb.collection('x').getList(page, perPage, { filter, sort })
 */
export async function fetchList(collection, page = 1, perPage = 50, opts = {}) {
    const params = new URLSearchParams()
    params.set('limit', String(perPage))
    params.set('offset', String((page - 1) * perPage))

    if (opts.filter) {
        const where = translateFilter(opts.filter)
        if (where) params.set('where', where)
    }
    if (opts.sort) params.set('sort', opts.sort)
    if (opts.fields) params.set('fields', opts.fields)

    const res = await _fetch(`${API_BASE}/${collection}?${params}`)
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`List failed on ${collection}: ${text}`)
    }
    const data = await res.json()

    return {
        items: data.items || [],
        totalItems: data.totalItems || 0,
        totalPages: data.totalPages || 1,
        page: data.page || page,
        perPage: data.perPage || perPage
    }
}

/**
 * Fetch ALL records (auto-paginates).
 * Compatible with: pb.collection('x').getFullList({ filter, sort })
 */
export async function fetchFullList(collection, opts = {}) {
    const params = new URLSearchParams()

    if (opts.filter) {
        const where = translateFilter(opts.filter)
        if (where) params.set('where', where)
    }
    if (opts.sort) params.set('sort', opts.sort)
    if (opts.fields) params.set('fields', opts.fields)

    const res = await _fetch(`${API_BASE}/${collection}/all?${params}`)
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`FullList failed on ${collection}: ${text}`)
    }
    return res.json()
}

/**
 * Fetch a single record by ID.
 * Compatible with: pb.collection('x').getOne(id)
 */
export async function fetchOne(collection, id) {
    const res = await _fetch(`${API_BASE}/${collection}/${id}`)
    if (!res.ok) throw new Error(`Record ${id} not found in ${collection}`)
    return res.json()
}

/**
 * Create a new record.
 * Compatible with: pb.collection('x').create(data)
 */
export async function createRecord(collection, data) {
    const res = await _fetch(`${API_BASE}/${collection}`, {
        method: 'POST',
        body: JSON.stringify(data)
    })
    if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`Create failed on ${collection}: ${errBody}`)
    }
    return res.json()
}

/**
 * Update an existing record.
 * Compatible with: pb.collection('x').update(id, data)
 */
export async function updateRecord(collection, id, data) {
    const res = await _fetch(`${API_BASE}/${collection}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    })
    if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`Update failed on ${collection}/${id}: ${errBody}`)
    }
    return res.json()
}

/**
 * Delete a record.
 * Compatible with: pb.collection('x').delete(id)
 */
export async function deleteRecord(collection, id) {
    const res = await _fetch(`${API_BASE}/${collection}/${id}`, {
        method: 'DELETE'
    })
    if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`Delete failed on ${collection}/${id}: ${errBody}`)
    }
    return { success: true }
}

/**
 * Fetch first record matching a filter.
 * PocketBase-compatible: throws on no match.
 */
export async function fetchFirstListItem(collection, filter) {
    const result = await fetchList(collection, 1, 1, { filter })
    if (result.items.length > 0) return result.items[0]
    throw new Error(`No record found in ${collection} matching filter`)
}

/**
 * Upload a file as an attachment.
 * Calls the backend Express API /api/upload proxy.
 * @param {File} file - The file object from <input type="file">
 * @returns {Promise<Array>} NocoDB attachment object array
 */
export async function uploadAttachment(file) {
    let uploadFile = file
    if (file?.type?.startsWith('image/') && file.size > 1024 * 1024) {
        try {
            const compressed = await compressImage(file, {
                maxWidth: 1600,
                maxHeight: 1600,
                quality: 0.78,
                outputType: 'image/jpeg'
            })
            const baseName = String(file.name || 'upload').replace(/\.[^.]+$/, '')
            uploadFile = new File([compressed.blob], `${baseName}.jpg`, { type: 'image/jpeg' })
        } catch (err) {
            console.warn('[Upload] Image compression failed; uploading original file:', err.message)
        }
    }

    const formData = new FormData()
    formData.append('file', uploadFile) // NocoDB expects 'file' for single upload or 'files' for multi. We use 'file' usually.

    const headers = {}
    if (JWT_TOKEN) headers['Authorization'] = `Bearer ${JWT_TOKEN}`

    // Do NOT set Content-Type to application/json or multipart/form-data.
    // fetch will automatically set it to multipart/form-data with the correct boundary when body is FormData.
    const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers
    })

    if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`Upload failed: ${errBody}`)
    }
    return res.json()
}

/* ══════════════════════════════════════════
   AUTH API — Login/Logout via Express API
   ══════════════════════════════════════════ */

/**
 * Login with PIN via the API server.
 * @param {string} pin
 * @param {string} roleGroup - 'manager' | 'admin' | 'mechanic' | 'employee'
 * @returns {{ token, user }} — JWT + user info
 */
export async function loginWithPin(pin, roleGroup) {
    const res = await fetch(`${AUTH_BASE}/pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, roleGroup })
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Login failed' }))
        throw new Error(err.error || 'Login failed')
    }
    const data = await res.json()
    setAuthToken(data.token)
    return data
}

/**
 * Login with email+password via the API server.
 */
export async function loginWithPassword(email, password) {
    const res = await fetch(`${AUTH_BASE}/password-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Login failed' }))
        throw new Error(err.error || 'Invalid credentials')
    }
    const data = await res.json()
    setAuthToken(data.token)
    return data
}

/**
 * Login with username + password via the API server (primary login).
 * @param {string} username
 * @param {string} password
 * @returns {{ token, user }} — JWT + user info
 */
export async function loginWithUsername(username, password) {
    const res = await fetch(`${AUTH_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Login failed' }))
        throw new Error(err.error || 'Login failed')
    }
    const data = await res.json()
    setAuthToken(data.token)
    return data
}

/**
 * Change password for the currently authenticated user.
 * @param {string} currentPassword — required unless must_change_password is true
 * @param {string} newPassword — minimum 4 characters
 */
export async function changePassword(currentPassword, newPassword) {
    const res = await _fetch(`${AUTH_BASE}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Password change failed')
    }
    return res.json()
}

/**
 * Validate a stored JWT token. Returns user info or null.
 * @param {string} token
 */
export async function validateToken(token) {
    if (!token) return null
    try {
        setAuthToken(token)
        const res = await _fetch(`${AUTH_BASE}/me`)
        if (!res.ok) { clearAuthToken(); return null }
        const data = await res.json()
        return data.user
    } catch {
        clearAuthToken()
        return null
    }
}

/**
 * Get current authenticated user info.
 */
export async function getCurrentUser() {
    if (!JWT_TOKEN) return null
    try {
        const res = await _fetch(`${AUTH_BASE}/me`)
        if (!res.ok) return null
        const data = await res.json()
        return data.user
    } catch {
        return null
    }
}

/* ══════════════════════════════════════════
   PORTAL URL HELPER
   ══════════════════════════════════════════ */

export function getPortalUrl() {
    try {
        const portMap = {
            '3000': '3000',
            '4000': '3000',
            '9092': '9092',
            '9091': '9092',
            '8092': '8092',
            '8091': '8092'
        }
        const targetPort = portMap[window.location.port] || '9092'
        return `${window.location.protocol}//${window.location.hostname}:${targetPort}`
    } catch {
        return 'http://localhost:9092'
    }
}
