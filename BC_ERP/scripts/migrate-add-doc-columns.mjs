/**
 * NocoDB Column Migration Script
 * ════════════════════════════════
 * Adds missing columns to the 'documents' table:
 *   - source_doc_id    (text) — tracks which document this was converted FROM (e.g. QT→IV chain)
 *   - destination_branch_id (text) — for stock transfers (TF): which branch receives stock
 *
 * Usage:
 *   node scripts/migrate-add-doc-columns.mjs [NOCODB_URL] [NOCODB_TOKEN]
 *
 * Defaults to TEST environment if no args provided:
 *   node scripts/migrate-add-doc-columns.mjs
 *
 * For production:
 *   node scripts/migrate-add-doc-columns.mjs http://localhost:8080 YOUR_TOKEN
 */

const NOCODB_URL   = process.argv[2] || 'http://localhost:9080'
const NOCODB_TOKEN = process.argv[3] || 'UmqurJUh0NhbrQWnhMJ-sXRgA6wfrlX4dvk9Y5YD'

async function nocoFetch(path, opts = {}) {
    const res = await fetch(`${NOCODB_URL}${path}`, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'xc-token': NOCODB_TOKEN,
            ...(opts.headers || {})
        }
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`NocoDB ${res.status}: ${text}`)
    return text ? JSON.parse(text) : {}
}

async function main() {
    console.log(`\n🔗 Connecting to NocoDB at ${NOCODB_URL}...\n`)

    // 1. Discover workspace + base
    const ws = await nocoFetch('/api/v2/meta/workspaces')
    if (!ws.list?.length) throw new Error('No workspaces found')
    const wsId = ws.list[0].id
    console.log(`✅ Workspace: ${ws.list[0].title} (${wsId})`)

    const bases = await nocoFetch(`/api/v2/meta/workspaces/${wsId}/bases`)
    const base = bases.list.find(b => b.title === 'BC_ERP') || bases.list[0]
    if (!base) throw new Error('No bases/projects found')
    console.log(`✅ Base: ${base.title} (${base.id})`)

    // 2. Find the 'documents' table
    const tables = await nocoFetch(`/api/v2/meta/bases/${base.id}/tables`)
    const documentsTable = tables.list.find(t => t.title.toLowerCase() === 'documents')
    if (!documentsTable) throw new Error('Table "documents" not found in NocoDB!')
    console.log(`✅ Table: ${documentsTable.title} (${documentsTable.id})`)

    // 3. Get existing columns to check what's already there
    const meta = await nocoFetch(`/api/v2/meta/tables/${documentsTable.id}`)
    const existingCols = new Set((meta.columns || []).map(c => c.title.toLowerCase()))
    console.log(`\n📋 Existing columns (${existingCols.size}): ${[...existingCols].join(', ')}\n`)

    // 4. Define columns to add
    const columnsToAdd = [
        {
            title: 'source_doc_id',
            uidt: 'SingleLineText',  // NocoDB UI Data Type
            description: 'ID of the source document this was converted from (e.g. QT-00001 → IV-00001 chain)'
        },
        {
            title: 'destination_branch_id',
            uidt: 'SingleLineText',
            description: 'For stock transfers (TF): the branch ID that receives the stock'
        }
    ]

    // 5. Add each column if not already present
    let addedCount = 0
    let skippedCount = 0

    for (const col of columnsToAdd) {
        if (existingCols.has(col.title.toLowerCase())) {
            console.log(`⏭️  Skipping '${col.title}' — already exists`)
            skippedCount++
            continue
        }

        try {
            await nocoFetch(`/api/v2/meta/tables/${documentsTable.id}/columns`, {
                method: 'POST',
                body: JSON.stringify({
                    title: col.title,
                    uidt: col.uidt,
                    meta: {},
                    cdf: null,   // no default value
                    rqd: false,  // not required
                    unique: false
                })
            })
            console.log(`✅ Added column '${col.title}' (${col.uidt})`)
            console.log(`   Purpose: ${col.description}\n`)
            addedCount++
        } catch (err) {
            console.error(`❌ Failed to add '${col.title}': ${err.message}`)
        }
    }

    console.log(`\n${'─'.repeat(50)}`)
    console.log(`✅ Migration complete: ${addedCount} added, ${skippedCount} skipped`)
    console.log(`${'─'.repeat(50)}\n`)
}

main().catch(err => {
    console.error('\n❌ Migration failed:', err.message)
    process.exit(1)
})
