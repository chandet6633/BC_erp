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

/* ── Configuration ── */

// API base — proxied through Nginx to Express API server
const API_BASE = '/api/data'
const AUTH_BASE = '/api/auth'

// JWT token — set after login
let JWT_TOKEN = ''

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

    // Restore saved JWT from localStorage
    if (!JWT_TOKEN) {
        try {
            const stored = localStorage.getItem('bcauto_jwt')
            if (stored) JWT_TOKEN = stored
        } catch { /* SSR safety */ }
    }
}

/**
 * Set JWT token (called after login).
 */
export function setAuthToken(token) {
    JWT_TOKEN = token
    try { localStorage.setItem('bcauto_jwt', token) } catch { }
}

/**
 * Clear JWT token (called on logout).
 */
export function clearAuthToken() {
    JWT_TOKEN = ''
    try { localStorage.removeItem('bcauto_jwt') } catch { }
}

/**
 * Get the current JWT token.
 */
export function getAuthToken() {
    return JWT_TOKEN
}

/* ══════════════════════════════════════════
   LOW-LEVEL FETCH
   ══════════════════════════════════════════ */

function _fetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        // Send JWT as Authorization: Bearer header
        ...(JWT_TOKEN ? { 'Authorization': `Bearer ${JWT_TOKEN}` } : {}),
        ...(options.headers || {})
    }
    return fetch(url, { ...options, headers })
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
   MANAGEMENT URL HELPER
   ══════════════════════════════════════════ */

export function getManagementUrl() {
    try {
        return `${window.location.protocol}//${window.location.hostname}:9092`
    } catch {
        return 'http://localhost:9092'
    }
}
