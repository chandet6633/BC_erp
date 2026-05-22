#!/usr/bin/env node
/**
 * BC AUTO XPERIENCE — PocketBase → NocoDB Data Migration
 * ═══════════════════════════════════════════════════════
 * One-shot migration script: reads all records from PocketBase
 * and inserts them into PostgreSQL via NocoDB API.
 *
 * Usage:
 *   node scripts/migrate-data.mjs \
 *     --pb-url=http://localhost:8091 \
 *     --noco-url=http://localhost:8080 \
 *     --noco-token=YOUR_API_TOKEN
 *
 * Prerequisites:
 *   - Old PocketBase containers running (read-only)
 *   - New NocoDB + PostgreSQL stack running
 *   - NocoDB base created with all tables (via init-postgres.sql)
 *   - npm install pocketbase (for PB SDK)
 */

import PocketBase from 'pocketbase'

// ── Parse CLI args ──
const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, v] = a.replace('--', '').split('=')
        return [k, v]
    })
)

const PB_URL = args['pb-url'] || 'http://localhost:8091'
const NOCO_URL = args['noco-url'] || 'http://localhost:8080'
const NOCO_TOKEN = args['noco-token'] || ''

if (!NOCO_TOKEN) {
    console.error('❌ Missing --noco-token. Get it from NocoDB → Team & Settings → API Tokens')
    process.exit(1)
}

const pb = new PocketBase(PB_URL)
pb.autoCancellation(false)

// ── Collections to migrate ──
// Format: { pb: 'pb_collection_name', pg: 'postgres_table_name' }
const COLLECTIONS = [
    // Shared
    { pb: 'users', pg: 'users' },
    { pb: 'system_settings', pg: 'system_settings' },
    { pb: 'system_roles', pg: 'system_roles' },
    { pb: 'audit_logs', pg: 'audit_logs' },
    // MungkhudShop
    { pb: 'lookups', pg: 'lookups' },
    { pb: 'branches', pg: 'branches' },
    { pb: 'companies', pg: 'companies' },
    { pb: 'customers', pg: 'customers' },
    { pb: 'vehicles', pg: 'vehicles' },
    { pb: 'product_brands', pg: 'product_brands' },
    { pb: 'product_groups', pg: 'product_groups' },
    { pb: 'products', pg: 'products' },
    { pb: 'vendors', pg: 'vendors' },
    { pb: 'jobs', pg: 'jobs' },
    { pb: 'job_items', pg: 'job_items' },
    { pb: 'documents', pg: 'documents' },
    { pb: 'document_items', pg: 'document_items' },
    { pb: 'stock_ledgers', pg: 'stock_ledgers' },
    { pb: 'settings', pg: 'settings' },
    { pb: 'app_settings', pg: 'app_settings' },
    { pb: 'app_users', pg: 'app_users' },
    { pb: 'favorite_products', pg: 'favorite_products' },
    { pb: 'job_evaluations', pg: 'job_evaluations' },
    { pb: 'job_payments', pg: 'job_payments' },
]

// ── NocoDB table ID cache ──
let tableIdMap = {}

async function loadNocoTableIds() {
    const res = await fetch(`${NOCO_URL}/api/v2/meta/bases`, {
        headers: { 'xc-token': NOCO_TOKEN }
    })
    const bases = await res.json()
    if (!bases.list || bases.list.length === 0) {
        throw new Error('No NocoDB bases found. Create one first.')
    }
    const baseId = bases.list[0].id

    const tablesRes = await fetch(`${NOCO_URL}/api/v2/meta/bases/${baseId}/tables`, {
        headers: { 'xc-token': NOCO_TOKEN }
    })
    const tables = await tablesRes.json()
    tables.list.forEach(t => {
        tableIdMap[t.title.toLowerCase()] = t.id
    })
    console.log(`✅ Loaded ${Object.keys(tableIdMap).length} NocoDB table IDs`)
}

async function insertToNoco(tableName, record) {
    const tableId = tableIdMap[tableName.toLowerCase()]
    if (!tableId) {
        console.warn(`⚠️ Table "${tableName}" not found in NocoDB — skipping`)
        return null
    }

    // Remove PocketBase internal fields
    const { collectionId, collectionName, expand, ...data } = record

    const res = await fetch(`${NOCO_URL}/api/v2/tables/${tableId}/records`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xc-token': NOCO_TOKEN
        },
        body: JSON.stringify(data)
    })

    if (!res.ok) {
        const err = await res.text()
        console.error(`  ❌ Insert failed for ${tableName}/${record.id}: ${err}`)
        return null
    }
    return res.json()
}

// ── Main migration ──
async function migrate() {
    console.log('═══════════════════════════════════════════')
    console.log('  PocketBase → NocoDB Migration')
    console.log(`  Source: ${PB_URL}`)
    console.log(`  Target: ${NOCO_URL}`)
    console.log('═══════════════════════════════════════════')
    console.log()

    await loadNocoTableIds()

    let totalMigrated = 0
    let totalFailed = 0

    for (const { pb: pbColl, pg: pgTable } of COLLECTIONS) {
        process.stdout.write(`📦 ${pbColl} → ${pgTable}... `)

        try {
            const records = await pb.collection(pbColl).getFullList({ skipTotal: false })
            let migrated = 0
            let failed = 0

            for (const record of records) {
                const result = await insertToNoco(pgTable, record)
                if (result) {
                    migrated++
                } else {
                    failed++
                }
            }

            console.log(`${migrated}/${records.length} records (${failed} failed)`)
            totalMigrated += migrated
            totalFailed += failed
        } catch (e) {
            console.log(`SKIP (${e.message})`)
        }
    }

    console.log()
    console.log('═══════════════════════════════════════════')
    console.log(`  Migration complete: ${totalMigrated} records migrated, ${totalFailed} failed`)
    console.log('═══════════════════════════════════════════')
}

migrate().catch(e => {
    console.error('Migration failed:', e)
    process.exit(1)
})
