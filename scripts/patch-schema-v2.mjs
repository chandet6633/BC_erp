#!/usr/bin/env node
/**
 * BC AUTO XPERIENCE — NocoDB Schema Patch v2
 * ═══════════════════════════════════════════
 * Adds new columns to existing tables for MungkhudShop POS Overhaul (v2.0).
 * Idempotent: skips columns that already exist.
 *
 * New columns:
 *   jobs: lead_mechanic_id, helper_mechanic_ids, payment_status,
 *         payment_proof (Attachment), work_started_at, work_ended_at,
 *         work_duration_minutes
 *   settings: logo_image (Attachment), qr_payment_image (Attachment),
 *             qr_payment_text
 *   job_payments: proof_image (Attachment)
 *
 * Usage:
 *   node scripts/patch-schema-v2.mjs \
 *     --url=http://localhost:9080 \
 *     --email=admin@bcauto.work \
 *     --password=BcAuto2026!
 */

const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, ...rest] = a.replace('--', '').split('=')
        return [k, rest.join('=')]
    })
)

const NOCO_URL = args['url'] || 'http://localhost:9080'
const EMAIL = args['email'] || ''
const PASSWORD = args['password'] || ''

if (!EMAIL || !PASSWORD) {
    console.error('❌ Usage: node patch-schema-v2.mjs --url=... --email=... --password=...')
    process.exit(1)
}

let AUTH_TOKEN = ''

async function api(path, opts = {}) {
    const res = await fetch(`${NOCO_URL}${path}`, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'xc-auth': AUTH_TOKEN,
            ...(opts.headers || {})
        }
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`${res.status} ${path}: ${text}`)
    }
    return res.json()
}

async function signIn() {
    const data = await fetch(`${NOCO_URL}/api/v1/auth/user/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    }).then(r => r.json())
    if (!data.token) throw new Error('Sign-in failed: ' + JSON.stringify(data))
    AUTH_TOKEN = data.token
    console.log('✅ Signed in')
}

async function getBaseId() {
    const ws = await api('/api/v2/meta/workspaces')
    const wsId = ws.list[0].id
    const bases = await api(`/api/v2/meta/workspaces/${wsId}/bases`)
    const base = bases.list.find(b => b.title === 'BC_ERP')
    if (!base) throw new Error('BC_ERP base not found. Run setup-nocodb-tables.mjs first.')
    console.log(`📦 Found base "BC_ERP" (id: ${base.id})`)
    return base.id
}

async function getTableMap(baseId) {
    const tables = await api(`/api/v2/meta/bases/${baseId}/tables`)
    const map = {}
    for (const t of tables.list) {
        map[t.title.toLowerCase()] = t.id
    }
    return map
}

async function getExistingColumns(tableId) {
    const table = await api(`/api/v2/meta/tables/${tableId}`)
    return new Set((table.columns || []).map(c => c.title.toLowerCase()))
}

async function addColumn(tableId, tableName, col, stats) {
    const key = col.title.toLowerCase()
    try {
        await api(`/api/v2/meta/tables/${tableId}/columns`, {
            method: 'POST',
            body: JSON.stringify(col)
        })
        console.log(`  ✅ [${tableName}] ${col.title} (${col.uidt}) — added`)
        stats.added++
    } catch (e) {
        console.error(`  ❌ [${tableName}] ${col.title}: ${e.message}`)
        stats.failed++
    }
}

// ── Column patches to apply ──
// Format: { table: 'table_name', columns: [...] }
const PATCHES = [
    {
        table: 'jobs',
        columns: [
            { title: 'lead_mechanic_id',      uidt: 'SingleLineText' },
            { title: 'helper_mechanic_ids',    uidt: 'SingleLineText' },
            { title: 'payment_status',         uidt: 'SingleLineText' },   // unpaid | partial | paid
            { title: 'payment_proof',          uidt: 'Attachment' },       // transfer slip image
            { title: 'work_started_at',        uidt: 'DateTime' },         // job timer start
            { title: 'work_ended_at',          uidt: 'DateTime' },         // job timer stop
            { title: 'work_duration_minutes',  uidt: 'Number' },           // calculated duration
        ]
    },
    {
        table: 'settings',
        columns: [
            { title: 'logo_image',         uidt: 'Attachment' },  // shop logo for print templates
            { title: 'qr_payment_image',   uidt: 'Attachment' },  // QR code for payment
            { title: 'qr_payment_text',    uidt: 'LongText' },    // payment instructions text
        ]
    },
    {
        table: 'job_payments',
        columns: [
            { title: 'proof_image', uidt: 'Attachment' },  // payment proof per payment record
        ]
    },
    {
        table: 'job_items',
        columns: [
            { title: 'cost', uidt: 'Number' } // v2 ad-hoc cost tracking
        ]
    }
]

async function applyPatches(baseId) {
    const tableMap = await getTableMap(baseId)
    const stats = { added: 0, skipped: 0, failed: 0 }

    for (const patch of PATCHES) {
        const tableId = tableMap[patch.table.toLowerCase()]
        if (!tableId) {
            console.warn(`  ⚠️  Table "${patch.table}" not found — skipping patch`)
            continue
        }

        const existingCols = await getExistingColumns(tableId)
        console.log(`\n📋 Patching: ${patch.table} (${patch.columns.length} columns to check)`)

        for (const col of patch.columns) {
            if (existingCols.has(col.title.toLowerCase())) {
                console.log(`  ⏭  [${patch.table}] ${col.title} — already exists, skipping`)
                stats.skipped++
            } else {
                await addColumn(tableId, patch.table, col, stats)
            }
        }
    }

    return stats
}

async function main() {
    console.log('═══════════════════════════════════════════')
    console.log('  NocoDB Schema Patch v2 — POS Overhaul')
    console.log('═══════════════════════════════════════════')

    await signIn()
    const baseId = await getBaseId()

    console.log('\n🔧 Applying column patches...')
    const stats = await applyPatches(baseId)

    console.log('\n═══════════════════════════════════════════')
    console.log(`✅ Done: ${stats.added} added, ${stats.skipped} skipped, ${stats.failed} failed`)
    if (stats.failed > 0) {
        console.warn('⚠️  Some columns failed to add. Check errors above.')
        process.exit(1)
    }
    console.log('═══════════════════════════════════════════')
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
