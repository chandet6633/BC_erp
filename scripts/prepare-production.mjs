#!/usr/bin/env node
/**
 * BC AUTO XPERIENCE — Prepare Production Database
 * ═══════════════════════════════════════════════
 * Clears out all transactional mock data while keeping master data intact.
 *
 * Usage:
 *   node scripts/prepare-production.mjs \
 *     --url=http://localhost:9080 \
 *     --email=admin@bcauto.work \
 *     --password=YourPassword123
 */

const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, v] = a.replace('--', '').split('=')
        return [k, v]
    })
)

const NOCO_URL = args['url'] || 'http://localhost:9080'
const EMAIL = args['email'] || ''
const PASSWORD = args['password'] || ''
const API_TOKEN = args['token'] || ''

let AUTH_TOKEN = ''

async function nocoFetch(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    if (API_TOKEN) {
        headers['xc-token'] = API_TOKEN
    } else if (AUTH_TOKEN) {
        headers['xc-auth'] = AUTH_TOKEN
    }
    return fetch(`${NOCO_URL}${path}`, { ...opts, headers })
}

async function signIn() {
    if (API_TOKEN) { console.log('✅ Using API token'); return }
    if (!EMAIL || !PASSWORD) {
        console.error('❌ Provide --email + --password OR --token')
        process.exit(1)
    }
    const res = await fetch(`${NOCO_URL}/api/v1/auth/user/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    })
    const data = await res.json()
    AUTH_TOKEN = data.token
    console.log('✅ Signed in')
}

// ── Table ID cache ──
let tableIdMap = {}

async function loadTableIds() {
    const wsRes = await nocoFetch('/api/v2/meta/workspaces')
    const ws = await wsRes.json()
    const wsId = ws.list[0].id
    const basesRes = await nocoFetch(`/api/v2/meta/workspaces/${wsId}/bases`)
    const bases = await basesRes.json()
    const base = bases.list.find(b => b.title === 'BC_ERP') || bases.list[0]
    const tablesRes = await nocoFetch(`/api/v2/meta/bases/${base.id}/tables`)
    const tables = await tablesRes.json()
    tables.list.forEach(t => { tableIdMap[t.title.toLowerCase()] = t.id })
    console.log(`✅ ${Object.keys(tableIdMap).length} tables loaded from base "${base.title}"`)
}

async function truncateTable(table) {
    const tableId = tableIdMap[table.toLowerCase()]
    if (!tableId) { console.warn(`⚠️ Table "${table}" not found`); return }
    
    // Fetch all records
    let offset = 0
    let totalDeleted = 0
    while (true) {
        const res = await nocoFetch(`/api/v2/tables/${tableId}/records?limit=1000&offset=${offset}`)
        if (!res.ok) { console.error(`❌ Fetch ${table} failed`); break }
        const data = await res.json()
        const records = data.list || []
        
        if (records.length === 0) break

        const deletePayload = records.map(r => ({ Id: r.Id }))
        const delRes = await nocoFetch(`/api/v2/tables/${tableId}/records`, {
            method: 'DELETE',
            body: JSON.stringify(deletePayload)
        })

        if (!delRes.ok) {
            console.error(`❌ Delete ${table} failed:`, await delRes.text())
            break
        }
        totalDeleted += records.length
        console.log(`  Deleted ${records.length} records from ${table}...`)
    }
    console.log(`✅ Cleared ${table} (Total: ${totalDeleted})`)
}

async function prepare() {
    console.log('═══════════════════════════════════════')
    console.log('  Preparing Production Database')
    console.log('═══════════════════════════════════════')

    await signIn()
    await loadTableIds()

    const tablesToWipe = [
        'jobs',
        'job_items',
        'job_evaluations',
        'job_payments',
        'documents',
        'document_items',
        'financial_ledger',
        'hr_attendance',
        'hr_leaves',
        'stock_ledgers',
        'audit_logs'
    ]

    console.log('\n🧹 Wiping transactional tables...')
    for (const t of tablesToWipe) {
        await truncateTable(t)
    }

    console.log('\n═══════════════════════════════════════')
    console.log('  ✅ Database is ready for production!')
    console.log('  (Master data, users, and branches preserved)')
    console.log('═══════════════════════════════════════')
}

prepare().catch(e => { console.error('Failed:', e); process.exit(1) })
