const API_URL = (process.env.API_URL || 'http://localhost:9093').replace(/\/$/, '')

function devHeaders(role = 'admin') {
    return {
        'x-bcauto-dev-auth': '1',
        'x-bcauto-dev-role': role,
        'x-bcauto-dev-user-id': `dev-${role}-bc-auto-service`,
        'x-bcauto-dev-user-name': `Dev ${role}`,
        'x-bcauto-dev-branch': 'bc-auto-service'
    }
}

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

function assert(condition, message) {
    if (!condition) throw new Error(message)
}

const users = await request('/api/data/custom/admin/users', { headers: devHeaders('admin') })
assert(users.res.status === 200, `admin users endpoint expected 200, got ${users.res.status}`)
assert(Array.isArray(users.body?.users), 'admin users endpoint must include users[]')
assert(Array.isArray(users.body?.roles), 'admin users endpoint must include roles[]')
assert(Array.isArray(users.body?.branches), 'admin users endpoint must include branches[]')
assert(users.body.roles.some(role => role.role === 'admin'), 'admin role must be available to user portal')
assert(!users.body.branches.some(branch => branch.branch_id === 'all'), 'admin user branches must not expose the virtual all-branches scope')
assert(users.body.branches.some(branch => branch.branch_id === 'bc-auto-service'), 'admin user branches must include a real default branch')

for (const user of users.body.users) {
    assert(user.password_hash === undefined, 'admin users endpoint must not expose password_hash')
    assert(user.pin === undefined, 'admin users endpoint must not expose raw/hashed pin')
}

const deniedUsers = await request('/api/data/custom/admin/users', { headers: devHeaders('mechanic') })
assert(deniedUsers.res.status === 403, `mechanic users-admin access expected 403, got ${deniedUsers.res.status}`)

const health = await request('/api/data/custom/admin/health', { headers: devHeaders('admin') })
assert(health.res.status === 200, `admin health endpoint expected 200, got ${health.res.status}`)
assert(health.body?.ok === true, 'admin health must report ok=true')
assert(Array.isArray(health.body?.checks), 'admin health must include checks[]')
for (const id of ['branches', 'roles', 'settings', 'users', 'session']) {
    const check = health.body.checks.find(row => row.id === id)
    assert(check, `admin health missing check: ${id}`)
    assert(check.ok === true, `admin health check failed: ${id}`)
}

const deniedHealth = await request('/api/data/custom/admin/health', { headers: devHeaders('mechanic') })
assert(deniedHealth.res.status === 403, `mechanic health-admin access expected 403, got ${deniedHealth.res.status}`)

console.log(JSON.stringify({
    ok: true,
    api_url: API_URL,
    user_count: users.body.users.length,
    role_count: users.body.roles.length,
    branch_count: users.body.branches.length,
    health_checks: health.body.checks.map(row => row.id),
    mechanic_users_admin_status: deniedUsers.res.status,
    mechanic_health_admin_status: deniedHealth.res.status
}, null, 2))
