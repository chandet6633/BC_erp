#!/usr/bin/env node
/**
 * Copy master data between NocoDB BC_ERP bases.
 *
 * Required:
 *   --source-url=http://localhost:9080 --source-token=...
 *   --target-url=https://example.com --target-token=...
 */

const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, ...rest] = a.replace(/^--/, '').split('=')
        return [k, rest.join('=')]
    })
)

const SOURCE_URL = args['source-url'] || process.env.SOURCE_NOCO_URL
const SOURCE_TOKEN = args['source-token'] || process.env.SOURCE_NOCO_TOKEN
const TARGET_URL = args['target-url'] || process.env.TARGET_NOCO_URL
const TARGET_TOKEN = args['target-token'] || process.env.TARGET_NOCO_TOKEN
const BASE_TITLE = args['base'] || 'BC_ERP'
const RESUME = args['resume'] === 'true' || args['resume'] === '1'

if (!SOURCE_URL || !SOURCE_TOKEN || !TARGET_URL || !TARGET_TOKEN) {
    console.error('Usage: node scripts/copy-master-data-nocodb.mjs --source-url=... --source-token=... --target-url=... --target-token=...')
    process.exit(1)
}

const SYSTEM_COLUMNS = new Set([
    'id', 'createdat', 'updatedat', 'created at', 'updated at',
    'nc_created_by', 'nc_updated_by', 'nc_order', '__nc_deleted'
])

const MASTER_TABLES = [
    'system_roles',
    'branches',
    'users',
    'companies',
    'product_brands',
    'product_groups',
    'vendors',
    'lookups',
    'settings',
    'customers',
    'vehicles',
    'products',
    'app_settings',
    'system_settings'
]

const RELATION_FIELDS = {
    vehicles: {
        customer_id: 'customers',
        branch_id: 'branches'
    },
    customers: {
        branch_id: 'branches'
    },
    products: {
        brand_id: 'product_brands',
        group_id: 'product_groups',
        vendor_id: 'vendors'
    }
}

async function nocoFetch(url, token, path, opts = {}) {
    for (let attempt = 1; attempt <= 5; attempt++) {
        const res = await fetch(`${url}${path}`, {
            ...opts,
            headers: {
                'Content-Type': 'application/json',
                'xc-token': token,
                ...(opts.headers || {})
            }
        })
        if (res.ok) return res.json()

        const text = await res.text()
        if ((text.includes('SQLITE_BUSY') || text.includes('database is locked')) && attempt < 5) {
            await new Promise(resolve => setTimeout(resolve, attempt * 750))
            continue
        }
        throw new Error(`${res.status} ${path}: ${text}`)
    }
}

async function getBase(url, token) {
    const workspaces = await nocoFetch(url, token, '/api/v2/meta/workspaces')
    const wsId = workspaces.list?.[0]?.id
    if (!wsId) throw new Error(`No workspace found at ${url}`)
    const bases = await nocoFetch(url, token, `/api/v2/meta/workspaces/${wsId}/bases`)
    const base = bases.list?.find(b => b.title === BASE_TITLE)
    if (!base) throw new Error(`Base "${BASE_TITLE}" not found at ${url}`)
    const tables = await nocoFetch(url, token, `/api/v2/meta/bases/${base.id}/tables`)
    const tableMap = Object.fromEntries((tables.list || []).map(t => [t.title.toLowerCase(), t.id]))
    return { base, tableMap }
}

async function getColumns(url, token, tableId) {
    const meta = await nocoFetch(url, token, `/api/v2/meta/tables/${tableId}`)
    return (meta.columns || [])
        .filter(c => !SYSTEM_COLUMNS.has(String(c.title || '').toLowerCase()))
        .filter(c => !['ID', 'CreatedTime', 'LastModifiedTime', 'CreatedBy', 'LastModifiedBy', 'Order', 'Deleted', 'Meta'].includes(c.uidt))
        .map(c => ({ title: c.title, uidt: c.uidt }))
}

async function fetchAllRecords(url, token, tableId) {
    const all = []
    const limit = 1000
    let offset = 0
    while (true) {
        const data = await nocoFetch(url, token, `/api/v2/tables/${tableId}/records?limit=${limit}&offset=${offset}`)
        const list = data.list || []
        all.push(...list)
        if (list.length < limit) break
        offset += limit
    }
    return all
}

function recordId(record) {
    return record.Id ?? record.id ?? record.ID
}

function naturalKey(table, record) {
    const parts = {
        system_roles: [record.name, record.role_name],
        branches: [record.code, record.name],
        users: [record.username, record.email, record.name],
        companies: [record.code, record.name],
        product_brands: [record.code, record.name],
        product_groups: [record.code, record.name],
        vendors: [record.code, record.name],
        lookups: [record.type, record.value, record.label],
        settings: [record.shop_name, record.phone],
        customers: [record.code || record.cust_code, record.phone, record.name],
        vehicles: [record.plate_number, record.province, record.customer_id],
        products: [record.code, record.name],
        app_settings: [record.key],
        system_settings: [record.key]
    }[table] || []
    return parts.map(v => String(v ?? '').trim().toLowerCase()).join('|')
}

function buildIdMapFromExisting(table, sourceRecords, targetRecords) {
    const targetsByKey = new Map(targetRecords.map(r => [naturalKey(table, r), r]))
    const map = new Map()
    sourceRecords.forEach((sourceRecord, index) => {
        const targetRecord = targetsByKey.get(naturalKey(table, sourceRecord)) || targetRecords[index]
        if (targetRecord) map.set(String(recordId(sourceRecord)), String(recordId(targetRecord)))
    })
    return map
}

function sanitizeRecord(record, targetColumns, idMaps, table) {
    const out = {}
    const allowed = new Map(targetColumns.map(c => [c.title.toLowerCase(), c]))
    for (const [key, value] of Object.entries(record)) {
        const lower = key.toLowerCase()
        if (SYSTEM_COLUMNS.has(lower)) continue
        const column = allowed.get(lower)
        if (!column) continue
        out[key] = normalizeValue(value, column.uidt)
    }

    const relations = RELATION_FIELDS[table] || {}
    for (const [field, targetTable] of Object.entries(relations)) {
        if (!out[field]) continue
        const mapped = idMaps[targetTable]?.get(String(out[field]))
        if (mapped) out[field] = mapped
    }
    return out
}

function normalizeValue(value, uidt) {
    if (['Decimal', 'Number', 'Currency', 'Percent'].includes(uidt)) {
        if (value === '' || value === undefined) return null
        return value
    }
    if (uidt === 'Checkbox') {
        if (value === '' || value === undefined || value === null) return false
        if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase())
        return !!value
    }
    return value
}

async function insertRecord(url, token, tableId, payload) {
    return nocoFetch(url, token, `/api/v2/tables/${tableId}/records`, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
}

async function getTargetRecords(target, table) {
    const tableId = target.tableMap[table]
    if (!tableId) return false
    return fetchAllRecords(TARGET_URL, TARGET_TOKEN, tableId)
}

async function main() {
    console.log('Master data copy: NocoDB -> NocoDB')
    const source = await getBase(SOURCE_URL, SOURCE_TOKEN)
    const target = await getBase(TARGET_URL, TARGET_TOKEN)
    console.log(`Source base: ${source.base.title} (${source.base.id})`)
    console.log(`Target base: ${target.base.title} (${target.base.id})`)

    const idMaps = {}
    const totals = {}

    for (const table of MASTER_TABLES) {
        if (!source.tableMap[table]) {
            console.log(`skip ${table}: source table missing`)
            continue
        }
        if (!target.tableMap[table]) {
            console.log(`skip ${table}: target table missing`)
            continue
        }

        const sourceRecords = await fetchAllRecords(SOURCE_URL, SOURCE_TOKEN, source.tableMap[table])
        const targetRecords = await getTargetRecords(target, table)
        if (targetRecords.length > 0) {
            if (RESUME && targetRecords.length === sourceRecords.length) {
                idMaps[table] = buildIdMapFromExisting(table, sourceRecords, targetRecords)
                totals[table] = `already copied (${targetRecords.length})`
                console.log(`resume ${table}: ${targetRecords.length} already copied`)
                continue
            }
            throw new Error(`Target table "${table}" is not empty (${targetRecords.length} records). Refusing to duplicate master data.`)
        }

        const targetColumns = await getColumns(TARGET_URL, TARGET_TOKEN, target.tableMap[table])
        idMaps[table] = new Map()
        totals[table] = sourceRecords.length

        for (const record of sourceRecords) {
            const payload = sanitizeRecord(record, targetColumns, idMaps, table)
            const created = await insertRecord(TARGET_URL, TARGET_TOKEN, target.tableMap[table], payload)
            idMaps[table].set(String(recordId(record)), String(recordId(created)))
        }
        console.log(`copied ${table}: ${sourceRecords.length}`)
    }

    console.log('Done.')
    console.log(JSON.stringify(totals, null, 2))
}

main().catch(err => {
    console.error('Copy failed:', err.message)
    process.exit(1)
})
