#!/usr/bin/env node

const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, v] = a.replace('--', '').split('=')
        return [k, v]
    })
)

const NOCO_URL = args['url'] || 'http://localhost:9080'
const EMAIL = args['email'] || 'admin@bcauto.work'
const PASSWORD = args['password'] || 'admin123'
let AUTH_TOKEN = ''

async function nocoFetch(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    if (AUTH_TOKEN) headers['xc-auth'] = AUTH_TOKEN
    return fetch(`${NOCO_URL}${path}`, { ...opts, headers })
}

async function runPatch() {
    console.log('--- Patching existing users in NocoDB ---')
    // Get auth token
    const authRes = await fetch(`${NOCO_URL}/api/v1/auth/user/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    })
    
    if (!authRes.ok) {
        console.error('Failed to authenticate:', await authRes.text())
        process.exit(1)
    }
    
    const authData = await authRes.json()
    AUTH_TOKEN = authData.token
    console.log('✅ Authenticated')

    // Find table ID
    const wsRes = await nocoFetch('/api/v2/meta/workspaces')
    const ws = await wsRes.json()
    const wsId = ws.list[0].id
    
    const basesRes = await nocoFetch(`/api/v2/meta/workspaces/${wsId}/bases`)
    const bases = await basesRes.json()
    const base = bases.list.find(b => b.title === 'BC_ERP') || bases.list[0]
    
    const tablesRes = await nocoFetch(`/api/v2/meta/bases/${base.id}/tables`)
    const tables = await tablesRes.json()
    const usersTable = tables.list.find(t => t.title.toLowerCase() === 'users')
    
    if (!usersTable) {
        console.error('Users table not found')
        return
    }

    // Get users with branch = 'all' or 'main'
    const usersRes = await nocoFetch(`/api/v2/tables/${usersTable.id}/records?where=(branch,eq,all)~or(branch,eq,main)`)
    const usersData = await usersRes.json()
    
    if (!usersData.list || usersData.list.length === 0) {
        console.log('✅ No users found needing a branch patch.')
        return
    }

    console.log(`Found ${usersData.list.length} users to patch...`)

    for (const user of usersData.list) {
        console.log(`Patching user: ${user.name} (ID: ${user.Id}) - changing branch from '${user.branch}' to ''`)
        const patchRes = await nocoFetch(`/api/v2/tables/${usersTable.id}/records`, {
            method: 'PATCH',
            body: JSON.stringify({
                Id: user.Id,
                branch: ''
            })
        })
        if (!patchRes.ok) {
            console.error(`❌ Failed to patch ${user.name}:`, await patchRes.text())
        } else {
            console.log(`✅ Patched ${user.name}`)
        }
    }
    console.log('--- Patch complete ---')
}

runPatch().catch(console.error)
