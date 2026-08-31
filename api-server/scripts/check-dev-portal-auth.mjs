const API_URL = (process.env.API_URL || 'http://localhost:9093').replace(/\/$/, '')

async function request(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, options)
    const text = await res.text()
    let body = null
    try {
        body = text ? JSON.parse(text) : null
    } catch {
        body = text
    }
    return { res, body }
}

function devHeaders(role = 'manager') {
    return {
        'x-bcauto-dev-auth': '1',
        'x-bcauto-dev-role': role,
        'x-bcauto-dev-user-id': `dev-${role}-all`,
        'x-bcauto-dev-user-name': `Dev ${role}`,
        'x-bcauto-dev-branch': 'bc-auto-service'
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message)
}

const metadata = await request('/api/data/custom/branch-metadata')
assert(metadata.res.status === 200, `branch metadata expected 200, got ${metadata.res.status}`)
assert(Array.isArray(metadata.body?.branches), 'branch metadata response must include branches[]')

const jobs = await request('/api/data/jobs?limit=1&offset=0', { headers: devHeaders('manager') })
assert(jobs.res.status === 200, `dev jobs expected 200, got ${jobs.res.status}`)
assert(Array.isArray(jobs.body?.items), 'dev jobs response must include items[]')

const invalid = await request('/api/data/jobs?limit=1&offset=0', { headers: devHeaders('badrole') })
assert(invalid.res.status === 401, `invalid dev role expected 401, got ${invalid.res.status}`)

console.log(JSON.stringify({
    ok: true,
    api_url: API_URL,
    branch_count: metadata.body.branches.length,
    jobs_status: jobs.res.status,
    invalid_role_status: invalid.res.status
}, null, 2))
