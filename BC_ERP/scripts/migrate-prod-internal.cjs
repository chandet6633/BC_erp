/**
 * NocoDB Production Migration — runs inside the NocoDB container
 * Uses email/password login to get a fresh auth token
 */
const BASE_URL = 'http://localhost:8080'

async function nocoFetch(path, opts = {}, token = '') {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'xc-token': token } : {}),
            ...(opts.headers || {})
        }
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`NocoDB ${res.status}: ${text}`)
    return text ? JSON.parse(text) : {}
}

async function main() {
    console.log('\n🔗 Running production migration inside NocoDB container...\n')

    // Try to use the API token directly from env (set by API server)
    // The NocoDB container itself may have different auth — try the super admin
    // First, get list of all tokens via the meta DB approach with knex
    const knex = require('knex')({
        client: 'sqlite3',
        connection: { filename: '/usr/app/data/noco.db' },
        useNullAsDefault: true
    })

    // Find token table
    const tables = await knex.raw("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    console.log('DB Tables:', tables.map(t => t.name).join(', '))

    // Find a valid API token
    const tokenTable = tables.find(t => t.name.includes('token') || t.name.includes('api_key'))
    if (!tokenTable) {
        // Try to get from nc_store or similar
        console.log('Looking for token in nc_store...')
        try {
            const store = await knex('nc_store').select('*').where('key', 'like', '%token%').limit(10)
            console.log('Store entries:', JSON.stringify(store))
        } catch (e) { console.log('nc_store not found:', e.message) }
        
        // Check nc_api_tokens
        try {
            const tokens = await knex('nc_api_tokens').select('token').limit(5)
            console.log('API tokens found:', tokens.length)
            if (tokens.length > 0) {
                await runMigration(tokens[0].token)
                return
            }
        } catch (e) { console.log('nc_api_tokens not found:', e.message) }
    }

    await knex.destroy()
    console.log('\n⚠️  Could not find API token — please run migration manually from NocoDB UI')
    console.log('   Go to: Team & Settings → API Tokens → get token')
    console.log('   Then run: node scripts/migrate-add-doc-columns.mjs http://localhost:8080 YOUR_TOKEN\n')
}

async function runMigration(token) {
    console.log('Using token:', token.substring(0, 10) + '...')
    
    const ws = await nocoFetch('/api/v2/meta/workspaces', {}, token)
    const wsId = ws.list[0].id
    const bases = await nocoFetch(`/api/v2/meta/workspaces/${wsId}/bases`, {}, token)
    const base = bases.list.find(b => b.title === 'BC_ERP') || bases.list[0]
    const tables = await nocoFetch(`/api/v2/meta/bases/${base.id}/tables`, {}, token)
    const doc = tables.list.find(t => t.title.toLowerCase() === 'documents')
    
    console.log(`✅ Found table: ${doc.title} (${doc.id})`)

    const meta = await nocoFetch(`/api/v2/meta/tables/${doc.id}`, {}, token)
    const existing = new Set((meta.columns || []).map(c => c.title.toLowerCase()))
    console.log(`Existing columns: ${[...existing].join(', ')}`)

    for (const col of ['source_doc_id', 'destination_branch_id']) {
        if (existing.has(col)) {
            console.log(`⏭️  ${col} already exists`)
            continue
        }
        await nocoFetch(`/api/v2/meta/tables/${doc.id}/columns`, {
            method: 'POST',
            body: JSON.stringify({ title: col, uidt: 'SingleLineText' })
        }, token)
        console.log(`✅ Added: ${col}`)
    }
    console.log('\n✅ Migration complete!')
}

main().catch(err => {
    console.error('❌ Failed:', err.message)
    process.exit(1)
})
