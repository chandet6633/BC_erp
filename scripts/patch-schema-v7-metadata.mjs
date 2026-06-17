#!/usr/bin/env node
/**
 * BC AUTO XPERIENCE - NocoDB Schema Patch v7
 *
 * Adds standard ERP metadata columns to existing business/system tables.
 * Idempotent: skips columns that already exist.
 *
 * Usage:
 *   node scripts/patch-schema-v7-metadata.mjs --url=https://nocodb.example --token=... --base=BC_ERP_testing
 *   node scripts/patch-schema-v7-metadata.mjs --url=http://localhost:9080 --email=admin@example.com --password=secret --base=BC_ERP
 */

const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, ...rest] = a.replace(/^--/, '').split('=')
        return [k, rest.join('=')]
    })
)

const NOCO_URL = args.url || process.env.NOCO_URL || 'http://localhost:9080'
const BASE_TITLE = args.base || process.env.NOCO_BASE || 'BC_ERP'
const API_TOKEN = args.token || process.env.NOCO_TOKEN || process.env.NOCODB_TOKEN || ''
const EMAIL = args.email || ''
const PASSWORD = args.password || ''

let authToken = ''

const STANDARD_METADATA_COLUMNS = [
    { title: 'created_by', uidt: 'SingleLineText' },
    { title: 'updated_by', uidt: 'SingleLineText' },
    { title: 'source', uidt: 'SingleLineText' },
    { title: 'is_active', uidt: 'Checkbox' },
    { title: 'deleted_at', uidt: 'DateTime' },
    { title: 'metadata_json', uidt: 'LongText' },
]

const METADATA_TABLES = [
    'users',
    'app_users',
    'system_settings',
    'system_roles',
    'branches',
    'companies',
    'customers',
    'vehicles',
    'product_brands',
    'product_groups',
    'products',
    'vendors',
    'lookups',
    'jobs',
    'job_items',
    'documents',
    'document_items',
    'stock_ledgers',
    'settings',
    'app_settings',
    'favorite_products',
    'job_evaluations',
    'job_payments',
    'hr_employees',
    'hr_attendance',
    'hr_leaves',
    'financial_entries',
    'financial_ledger',
    'daily_summaries',
]

async function api(path, opts = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { 'xc-token': API_TOKEN } : { 'xc-auth': authToken }),
        ...(opts.headers || {}),
    }
    const res = await fetch(`${NOCO_URL}${path}`, { ...opts, headers })
    if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`)
    return res.json()
}

async function signIn() {
    if (API_TOKEN) return
    if (!EMAIL || !PASSWORD) {
        throw new Error('Provide --token or --email + --password')
    }
    const res = await fetch(`${NOCO_URL}/api/v1/auth/user/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
    const data = await res.json()
    if (!data.token) throw new Error(`Sign-in failed: ${JSON.stringify(data)}`)
    authToken = data.token
}

async function getBaseId() {
    const workspaces = await api('/api/v2/meta/workspaces')
    const workspaceId = workspaces.list?.[0]?.id
    if (!workspaceId) throw new Error('No NocoDB workspace found')

    const bases = await api(`/api/v2/meta/workspaces/${workspaceId}/bases`)
    const base = bases.list?.find(b => b.title === BASE_TITLE)
    if (!base) throw new Error(`Base "${BASE_TITLE}" not found`)
    return base.id
}

async function getTableMap(baseId) {
    const tables = await api(`/api/v2/meta/bases/${baseId}/tables`)
    return Object.fromEntries((tables.list || []).map(t => [t.title.toLowerCase(), t.id]))
}

async function getExistingColumns(tableId) {
    const table = await api(`/api/v2/meta/tables/${tableId}`)
    return new Set((table.columns || []).map(c => String(c.title || '').toLowerCase()))
}

async function addColumn(tableId, tableName, column, stats) {
    try {
        await api(`/api/v2/meta/tables/${tableId}/columns`, {
            method: 'POST',
            body: JSON.stringify(column),
        })
        console.log(`[added] ${tableName}.${column.title}`)
        stats.added++
    } catch (err) {
        console.error(`[failed] ${tableName}.${column.title}: ${err.message}`)
        stats.failed++
    }
}

async function main() {
    await signIn()
    const baseId = await getBaseId()
    const tableMap = await getTableMap(baseId)
    const stats = { added: 0, skipped: 0, missingTables: 0, failed: 0 }

    for (const tableName of METADATA_TABLES) {
        const tableId = tableMap[tableName]
        if (!tableId) {
            console.warn(`[skip] ${tableName}: table not found`)
            stats.missingTables++
            continue
        }

        const existing = await getExistingColumns(tableId)
        for (const column of STANDARD_METADATA_COLUMNS) {
            if (existing.has(column.title.toLowerCase())) {
                stats.skipped++
                continue
            }
            await addColumn(tableId, tableName, column, stats)
        }
    }

    console.log(`Done. Added: ${stats.added}, skipped: ${stats.skipped}, missing tables: ${stats.missingTables}, failed: ${stats.failed}`)
    if (stats.failed > 0) process.exit(1)
}

main().catch(err => {
    console.error(err.message)
    process.exit(1)
})
