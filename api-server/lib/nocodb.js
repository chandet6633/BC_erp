/**
 * NocoDB Client — Server-Side Only
 * ═══════════════════════════════════
 * Holds the xc-token. Browser never sees it.
 * All NocoDB API calls go through this module.
 *
 * Key design decisions:
 * - DateTime comparison filters (gte/lte on date fields) are extracted from
 *   the where clause and applied server-side in JavaScript, because NocoDB v2
 *   doesn't support standard gte/lte on DateTime columns.
 * - Write operations are serialized to prevent SQLITE_BUSY errors.
 * - Id → id normalization on all responses.
 */

const NOCODB_URL = process.env.NOCODB_URL || 'http://bctest-nocodb:8080'
const NOCODB_TOKEN = process.env.NOCODB_TOKEN || ''

// Table name → NocoDB table ID cache
let tableIdMap = {}
let baseId = ''

// Write queue to prevent SQLITE_BUSY (serialize writes)
let writeQueue = Promise.resolve()
function enqueueWrite(fn) {
    writeQueue = writeQueue.then(fn, fn)
    return writeQueue
}

/**
 * Raw fetch to NocoDB with xc-token, includes retry logic for SQLITE_BUSY
 */
async function nocoFetch(path, opts = {}, retries = 5, backoff = 100) {
    try {
        const res = await fetch(`${NOCODB_URL}${path}`, {
            ...opts,
            headers: {
                'Content-Type': 'application/json',
                'xc-token': NOCODB_TOKEN,
                ...(opts.headers || {})
            }
        })
        if (!res.ok) {
            const text = await res.text()
            // If database is locked, retry with backoff
            if (text.includes('SQLITE_BUSY') && retries > 0) {
                console.warn(`[NocoDB] SQLITE_BUSY on ${path}, retrying in ${backoff}ms... (${retries} left)`)
                await new Promise(r => setTimeout(r, backoff))
                return nocoFetch(path, opts, retries - 1, backoff * 1.5)
            }
            const err = new Error(`NocoDB ${res.status}: ${text}`)
            err.status = res.status
            throw err
        }
        return res.json()
    } catch (err) {
        // Handle network connection failures as well
        if (err.cause && err.cause.code === 'ECONNREFUSED' && retries > 0) {
            console.warn(`[NocoDB] Connection refused on ${path}, retrying in ${backoff}ms... (${retries} left)`)
            await new Promise(r => setTimeout(r, backoff))
            return nocoFetch(path, opts, retries - 1, backoff * 1.5)
        }
        throw err
    }
}

/**
 * Initialize: discover workspace → base → cache table IDs.
 */
export async function init() {
    try {
        const ws = await nocoFetch('/api/v2/meta/workspaces')
        if (!ws.list?.length) throw new Error('No workspaces found')
        const wsId = ws.list[0].id

        const bases = await nocoFetch(`/api/v2/meta/workspaces/${wsId}/bases`)
        const target = bases.list.find(b => b.title === 'BC_ERP') || bases.list[0]
        if (!target) throw new Error('No bases found')
        baseId = target.id

        const tables = await nocoFetch(`/api/v2/meta/bases/${baseId}/tables`)
        tableIdMap = {}
        for (const t of (tables.list || [])) {
            tableIdMap[t.title.toLowerCase()] = t.id
        }
        console.log(`✅ NocoDB: ${Object.keys(tableIdMap).length} tables cached`)
    } catch (err) {
        console.error('❌ NocoDB init failed:', err.message)
        throw err
    }
}

function resolveTable(name) {
    const id = tableIdMap[name.toLowerCase()]
    if (!id) throw Object.assign(new Error(`Table "${name}" not found`), { status: 404 })
    return id
}

/**
 * Normalize NocoDB record: Id → id
 */
function normalize(record) {
    if (!record) return record
    if (record.Id != null && record.id == null) {
        record.id = record.Id
    }
    return record
}

/**
 * Extract date comparison clauses from NocoDB where string.
 * Returns { cleanWhere, dateFilters[] }.
 *
 * NocoDB v2 doesn't support gte/lte/gt/lt on DateTime columns.
 * We extract them and apply in JavaScript after fetching.
 *
 * Pattern: (field_name,gte,2026-04-30) → extracted
 * Pattern: (status,eq,closed)          → kept in where
 */
const DATE_REGEX = /\((\w+),(gt|gte|lt|lte),(\d{4}-\d{2}-\d{2}[^)]*)\)/g
const TILDE_AND_OR = /^~(and|or)/

function extractDateFilters(where) {
    if (!where) return { cleanWhere: '', dateFilters: [] }

    const dateFilters = []
    let cleanWhere = where

    // Find and extract all date comparison clauses
    const matches = [...where.matchAll(DATE_REGEX)]
    for (const m of matches) {
        dateFilters.push({
            field: m[1],
            op: m[2],       // gt, gte, lt, lte
            value: m[3].trim()  // '2026-04-30' or '2026-04-01'
        })
        // Remove this clause from where string
        cleanWhere = cleanWhere.replace(m[0], '')
    }

    // Clean up leftover connectors: leading/trailing ~and / ~or
    cleanWhere = cleanWhere.replace(/^~(and|or)/g, '')
    cleanWhere = cleanWhere.replace(/~(and|or)$/g, '')
    // Fix double connectors from removed middle clauses
    cleanWhere = cleanWhere.replace(/~(and|or)~(and|or)/g, '~$2')
    cleanWhere = cleanWhere.trim()

    return { cleanWhere, dateFilters }
}

/**
 * Apply extracted date filters to records in JavaScript.
 */
function applyDateFilters(items, dateFilters) {
    if (!dateFilters.length) return items

    return items.filter(item => {
        return dateFilters.every(({ field, op, value }) => {
            const recordVal = item[field]
            if (!recordVal) return false

            // Parse both to comparable date strings (YYYY-MM-DD)
            const recordDate = String(recordVal).slice(0, 10)
            const filterDate = value.slice(0, 10)

            switch (op) {
                case 'gt':  return recordDate > filterDate
                case 'gte': return recordDate >= filterDate
                case 'lt':  return recordDate < filterDate
                case 'lte': return recordDate <= filterDate
                default:    return true
            }
        })
    })
}

// ─── CRUD ───

export async function listRecords(table, { where, sort, fields, limit = 25, offset = 0 } = {}) {
    const tableId = resolveTable(table)
    const { cleanWhere, dateFilters } = extractDateFilters(where)

    const params = new URLSearchParams()
    // If we have date filters, fetch more records since we'll filter in JS
    const fetchLimit = dateFilters.length > 0 ? 1000 : limit
    params.set('limit', String(fetchLimit))
    if (!dateFilters.length) params.set('offset', String(offset))
    if (cleanWhere) params.set('where', cleanWhere)
    if (sort) params.set('sort', sort)
    if (fields) params.set('fields', fields)

    const data = await nocoFetch(`/api/v2/tables/${tableId}/records?${params}`)
    let items = (data.list || []).map(normalize)

    // Apply date filters in JavaScript
    if (dateFilters.length) {
        items = applyDateFilters(items, dateFilters)
        // Apply pagination on filtered results
        const total = items.length
        items = items.slice(offset, offset + limit)
        return { items, totalRows: total, pageInfo: { totalRows: total } }
    }

    return {
        items,
        totalRows: data.pageInfo?.totalRows || items.length,
        pageInfo: data.pageInfo
    }
}

export async function getAllRecords(table, { where, sort, fields } = {}) {
    const { cleanWhere, dateFilters } = extractDateFilters(where)

    const all = []
    let offset = 0
    const batchSize = 200
    while (true) {
        const { items, totalRows } = await listRecords(table, {
            where: cleanWhere ? (dateFilters.length ? cleanWhere : where) : where,
            sort, fields, limit: batchSize, offset
        })
        all.push(...items)
        offset += batchSize
        if (items.length < batchSize || offset >= totalRows) break
    }

    // If we have date filters, apply them on the full set
    if (dateFilters.length) {
        return applyDateFilters(all, dateFilters)
    }
    return all
}

export async function getRecord(table, id) {
    const tableId = resolveTable(table)
    const data = await nocoFetch(`/api/v2/tables/${tableId}/records/${id}`)
    return normalize(data)
}

// Writes are serialized to prevent SQLITE_BUSY

export function createRecord(table, data) {
    return enqueueWrite(async () => {
        const tableId = resolveTable(table)
        const result = await nocoFetch(`/api/v2/tables/${tableId}/records`, {
            method: 'POST',
            body: JSON.stringify(data)
        })
        return normalize(result)
    })
}

export function updateRecord(table, id, data) {
    return enqueueWrite(async () => {
        const tableId = resolveTable(table)
        const result = await nocoFetch(`/api/v2/tables/${tableId}/records`, {
            method: 'PATCH',
            body: JSON.stringify({ Id: id, ...data })
        })
        return normalize(result)
    })
}

export function deleteRecord(table, id) {
    return enqueueWrite(async () => {
        const tableId = resolveTable(table)
        await nocoFetch(`/api/v2/tables/${tableId}/records`, {
            method: 'DELETE',
            body: JSON.stringify({ Id: id })
        })
        return { success: true }
    })
}

export function getTableNames() {
    return Object.keys(tableIdMap)
}
