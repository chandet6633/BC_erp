#!/usr/bin/env node
/**
 * BC AUTO XPERIENCE - NocoDB Schema Patch v6
 *
 * Adds optional branch markers to global customer/vehicle master tables.
 * These fields record where the master record was first created, but the API
 * no longer uses them to hide customers or vehicles from other branches.
 *
 * Usage:
 *   node scripts/patch-schema-v6.mjs --url=http://localhost:9080 --email=admin@example.com --password=secret
 */

const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, ...rest] = a.replace('--', '').split('=')
        return [k, rest.join('=')]
    })
)

const NOCO_URL = args.url || 'http://localhost:9080'
const EMAIL = args.email || ''
const PASSWORD = args.password || ''

if (!EMAIL || !PASSWORD) {
    console.error('Usage: node scripts/patch-schema-v6.mjs --url=... --email=... --password=...')
    process.exit(1)
}

let authToken = ''

async function api(path, opts = {}) {
    const res = await fetch(`${NOCO_URL}${path}`, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'xc-auth': authToken,
            ...(opts.headers || {})
        }
    })
    if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`)
    return res.json()
}

async function signIn() {
    const res = await fetch(`${NOCO_URL}/api/v1/auth/user/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
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
    const base = bases.list?.find(b => b.title === 'BC_ERP') || bases.list?.[0]
    if (!base) throw new Error('No NocoDB base found')
    return base.id
}

async function getTableMap(baseId) {
    const tables = await api(`/api/v2/meta/bases/${baseId}/tables`)
    return Object.fromEntries((tables.list || []).map(t => [t.title.toLowerCase(), t.id]))
}

async function getColumnNames(tableId) {
    const table = await api(`/api/v2/meta/tables/${tableId}`)
    return new Set((table.columns || []).map(c => c.title.toLowerCase()))
}

async function ensureBranchId(tableMap, tableName) {
    const tableId = tableMap[tableName]
    if (!tableId) {
        console.warn(`[skip] ${tableName}: table not found`)
        return { added: 0, skipped: 1 }
    }

    const columns = await getColumnNames(tableId)
    if (columns.has('branch_id')) {
        console.log(`[ok] ${tableName}.branch_id already exists`)
        return { added: 0, skipped: 1 }
    }

    await api(`/api/v2/meta/tables/${tableId}/columns`, {
        method: 'POST',
        body: JSON.stringify({ title: 'branch_id', uidt: 'SingleLineText' })
    })
    console.log(`[added] ${tableName}.branch_id`)
    return { added: 1, skipped: 0 }
}

async function main() {
    await signIn()
    const baseId = await getBaseId()
    const tableMap = await getTableMap(baseId)

    const results = await Promise.all([
        ensureBranchId(tableMap, 'customers'),
        ensureBranchId(tableMap, 'vehicles')
    ])

    const added = results.reduce((sum, r) => sum + r.added, 0)
    const skipped = results.reduce((sum, r) => sum + r.skipped, 0)
    console.log(`Done. Added: ${added}, skipped: ${skipped}`)
}

main().catch(err => {
    console.error(err.message)
    process.exit(1)
})
