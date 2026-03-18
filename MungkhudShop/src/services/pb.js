/**
 * MungkhudShop — PocketBase Service
 * Handles all database operations with automatic audit logging.
 */
import PocketBase from 'pocketbase'

const PB_URL = '/'
const pb = new PocketBase(PB_URL)

// Management PocketBase (shared user database for PIN auth)
// Domain mapping: Cloudflare tunnels don't expose ports, so we map known domains
const TUNNEL_MAP = {
    'shop.bcauto.work': 'https://bcauto.work'   // MungkhudShop tunnel → Management tunnel
}

function getManagementPBUrl() {
    const tunnelUrl = TUNNEL_MAP[window.location.hostname]
    if (tunnelUrl) return tunnelUrl
    // LAN fallback: port-based
    const mgmtPort = window.location.port === '9091' ? '9092' : '8092'
    return `${window.location.protocol}//${window.location.hostname}:${mgmtPort}`
}

export const managementPB = new PocketBase(getManagementPBUrl())

/** Get the resolved Management URL (for "Back to Management" etc.) */
export function getManagementUrl() {
    return getManagementPBUrl()
}

export default pb

/* ── Audit Logging ── */
const SKIP_AUDIT = ['audit_logs'] // Don't audit the audit table itself

function getAuditUser() {
    try {
        const raw = localStorage.getItem('mungkhud_auth')
        if (raw) {
            const u = JSON.parse(raw)
            return u.display_name || u.username || 'Unknown'
        }
    } catch { /* ignore */ }
    return 'System'
}

async function logAudit(action, collection, details) {
    if (SKIP_AUDIT.includes(collection)) return
    try {
        await pb.collection('audit_logs').create({
            action,
            collection_name: collection,
            user_name: getAuditUser(),
            details: typeof details === 'string' ? details : JSON.stringify(details),
            timestamp: new Date().toISOString()
        })
    } catch (e) {
        console.warn('[Audit] Failed to log:', e.message)
    }
}

/* ── Generic CRUD helpers ── */

/**
 * Fetch a paginated list from a collection.
 * @param {string} collection
 * @param {number} page
 * @param {number} perPage
 * @param {object} options  — PocketBase list options (filter, sort, expand…)
 */
export async function fetchList(collection, page = 1, perPage = 25, options = {}) {
    try {
        return await pb.collection(collection).getList(page, perPage, options)
    } catch (err) {
        console.error(`[PB] fetchList ${collection}:`, err)
        return { page: 1, perPage, totalItems: 0, totalPages: 0, items: [] }
    }
}

export async function fetchOne(collection, id, options = {}) {
    return pb.collection(collection).getOne(id, options)
}

export async function createRecord(collection, data) {
    const result = await pb.collection(collection).create(data)
    logAudit('create', collection, { id: result.id, ...data })
    return result
}

export async function updateRecord(collection, id, data) {
    const result = await pb.collection(collection).update(id, data)
    logAudit('update', collection, { id, changes: data })
    return result
}

export async function deleteRecord(collection, id) {
    await pb.collection(collection).delete(id)
    logAudit('delete', collection, { id })
}

export async function fetchFullList(collection, options = {}) {
    try {
        // PB SDK v0.26+ sends skipTotal=1 by default, but server v0.25 rejects it.
        // Explicitly disable until server is upgraded.
        return await pb.collection(collection).getFullList({ skipTotal: false, ...options })
    } catch (err) {
        console.error(`[PB] fetchFullList ${collection}:`, err)
        return []
    }
}
