/**
 * Management — NocoDB Data Service (PocketBase-Compatible Wrapper)
 * ═══════════════════════════════════════════════════════════════════
 * Drop-in replacement for PocketBase SDK.
 * Exposes window.pb with identical .collection() API surface
 * so all 17 downstream files using window.pb.collection() work unchanged.
 *
 * Migration: PocketBase SDK → shared/nocodb-adapter.js
 */
import {
    initAdapter,
    fetchList,
    fetchFullList,
    fetchOne,
    fetchFirstListItem,
    createRecord,
    updateRecord,
    deleteRecord,
    clearAuthToken,
    loginWithPassword,
    getAuthToken
} from '@shared/nocodb-adapter.js'

/* ── Initialize adapter (restores saved JWT) ── */
initAdapter()

/* ══════════════════════════════════════════
   AUTH STORE (mimics PocketBase's pb.authStore)
   ══════════════════════════════════════════ */

const authStore = {
    /** Current authenticated user model */
    get model() {
        try {
            const raw = sessionStorage.getItem('bcauto_auth_model')
            return raw ? JSON.parse(raw) : null
        } catch { return null }
    },
    set model(val) {
        if (val) {
            sessionStorage.setItem('bcauto_auth_model', JSON.stringify(val))
        } else {
            sessionStorage.removeItem('bcauto_auth_model')
        }
    },

    /** Check if user is authenticated */
    get isValid() {
        const role = sessionStorage.getItem('bcauto_role')
        return !!(role && role !== 'null') || !!this.model
    },

    /** PocketBase admin flag — always false (we use role-based) */
    get isAdmin() {
        const model = this.model
        return model?.role === 'admin'
    },

    /** Clear authentication */
    clear() {
        sessionStorage.removeItem('bcauto_auth_model')
        sessionStorage.removeItem('bcauto_role')
        sessionStorage.removeItem('bcauto_user_name')
        sessionStorage.removeItem('bcauto_user_id')
        sessionStorage.removeItem('bcauto_last_login')
        clearAuthToken() // Clear JWT token
    },

    /** Token — not used with NocoDB, kept for compat */
    get token() { return '' }
}

/* ══════════════════════════════════════════
   PB-COMPATIBLE COLLECTION WRAPPER
   Wraps NocoDB adapter calls to match PocketBase's
   pb.collection(name).method() API.
   ══════════════════════════════════════════ */

function createCollectionProxy(collectionName) {
    return {
        /**
         * Paginated list
         * @param {number} page
         * @param {number} perPage
         * @param {object} options - { filter, sort, fields }
         */
        async getList(page = 1, perPage = 25, options = {}) {
            return fetchList(collectionName, page, perPage, options)
        },

        /**
         * Get ALL records (auto-paginates)
         * @param {object} options - { filter, sort, fields }
         */
        async getFullList(options = {}) {
            return fetchFullList(collectionName, options)
        },

        /**
         * Get single record by ID
         * @param {string} id
         * @param {object} options
         */
        async getOne(id, options = {}) {
            return fetchOne(collectionName, id, options)
        },

        /**
         * Get first record matching a filter
         * @param {string} filter - PocketBase filter string
         */
        async getFirstListItem(filter) {
            return fetchFirstListItem(collectionName, filter)
        },

        /**
         * Create a new record
         * @param {object} data
         */
        async create(data) {
            return createRecord(collectionName, data)
        },

        /**
         * Update a record
         * @param {string} id
         * @param {object} data
         */
        async update(id, data) {
            return updateRecord(collectionName, id, data)
        },

        /**
         * Delete a record
         * @param {string} id
         */
        async delete(id) {
            return deleteRecord(collectionName, id)
        },

        /**
         * Auth with password — queries users table + verifies password
         * Only used on the 'users' collection for admin/owner login.
         * @param {string} email
         * @param {string} password
         * @returns {{ record: object }} Auth data compatible with PB SDK
         */
        async authWithPassword(email, password) {
            if (collectionName !== 'users') {
                throw new Error('authWithPassword only supported on users collection')
            }

            // Call Express API server — password verified server-side
            const { user } = await loginWithPassword(email, password)

            // Set auth state
            authStore.model = user
            sessionStorage.setItem('bcauto_last_login', new Date().toISOString())
            sessionStorage.setItem('bcauto_user_name', user.name || 'Admin')
            sessionStorage.setItem('bcauto_role', user.role || 'manager')

            return { record: user }
        },

        /**
         * Get first record matching filter — wraps fetchFirstListItem.
         * Returns null if no match (unlike the raw adapter which throws).
         * This matches how Management pages use getFirstListItem with try/catch.
         */
        async getFirstListItem(filter) {
            try {
                return await fetchFirstListItem(collectionName, filter)
            } catch {
                return null
            }
        },
    }
}

/* ══════════════════════════════════════════
   MAIN EXPORT — pb object
   Audit logging is handled centrally in the adapter layer.
   ══════════════════════════════════════════ */

export const pb = {
    collection(collectionNameOrId) {
        return createCollectionProxy(collectionNameOrId)
    },
    authStore,
    autoCancellation(val) { /* no-op — NocoDB doesn't have this concept */ }
}

// Export for global access (many Management pages use window.pb)
window.pb = pb
