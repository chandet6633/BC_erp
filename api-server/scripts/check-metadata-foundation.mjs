const API_URL = (process.env.API_URL || 'http://localhost:9093').replace(/\/$/, '')

const DEFAULT_ACTIVE_BRANCHES = [
    'BC Auto Service',
    'BC Auto Samchuk',
    'BC Auto Mueng Suphan'
]

const REQUIRED_ROLES = ['admin', 'owner', 'manager', 'sa', 'mechanic']
const REQUIRED_SETTINGS = ['company_name', 'work_start', 'work_end', 'late_after', 'gps_required']
const DISALLOWED_BRANCH_TEXT = [/main branch/i, /สาขาหลัก/i]

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

function devHeaders(role = 'admin') {
    return {
        'x-bcauto-dev-auth': '1',
        'x-bcauto-dev-role': role,
        'x-bcauto-dev-user-id': `dev-${role}-bc-auto-service`,
        'x-bcauto-dev-user-name': `Dev ${role}`,
        'x-bcauto-dev-branch': 'bc-auto-service'
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message)
}

function branchNames(branches) {
    return branches.map(branch => String(branch.display_name || branch.branch_name || branch.name || branch.code || '').trim()).filter(Boolean)
}

function roleNames(roles) {
    return roles.map(role => String(role.role || role.name || role.role_name || '').trim().toLowerCase()).filter(Boolean)
}

const publicMetadata = await request('/api/data/custom/branch-metadata?include_all=true')
assert(publicMetadata.res.status === 200, `branch metadata expected 200, got ${publicMetadata.res.status}`)
assert(Array.isArray(publicMetadata.body?.branches), 'branch metadata response must include branches[]')

const publicBranches = publicMetadata.body.branches
const publicNames = branchNames(publicBranches)
for (const branchName of DEFAULT_ACTIVE_BRANCHES) {
    assert(publicNames.includes(branchName), `branch metadata missing default branch: ${branchName}`)
}

for (const branch of publicBranches) {
    const searchable = [
        branch.branch_id,
        branch.code,
        branch.branch_name,
        branch.display_name,
        branch.display_name_en,
        ...(Array.isArray(branch.aliases) ? branch.aliases : [])
    ].map(value => String(value || '')).join(' ')
    assert(!DISALLOWED_BRANCH_TEXT.some(pattern => pattern.test(searchable)), `branch metadata still contains retired main-branch wording: ${searchable}`)
}

const scopedActiveBranches = publicBranches.filter(branch => branch.is_active !== false && branch.scoped !== false && branch.is_virtual !== true)
assert(scopedActiveBranches.length === DEFAULT_ACTIVE_BRANCHES.length, `expected ${DEFAULT_ACTIVE_BRANCHES.length} active scoped branches, got ${scopedActiveBranches.length}`)

const adminBranches = await request('/api/data/custom/admin/branches?include_inactive=true', { headers: devHeaders('admin') })
assert(adminBranches.res.status === 200, `admin branch endpoint expected 200, got ${adminBranches.res.status}`)
assert(Array.isArray(adminBranches.body?.branches), 'admin branch endpoint must include branches[]')

const roles = await request('/api/data/custom/admin/roles', { headers: devHeaders('admin') })
assert(roles.res.status === 200, `admin role endpoint expected 200, got ${roles.res.status}`)
assert(Array.isArray(roles.body?.roles), 'admin role endpoint must include roles[]')
const names = roleNames(roles.body.roles)
for (const role of REQUIRED_ROLES) {
    assert(names.includes(role), `role metadata missing required role: ${role}`)
}

const managerRole = roles.body.roles.find(role => String(role.role || role.name || role.role_name || '').toLowerCase() === 'manager')
assert(Array.isArray(managerRole?.allowed_tools), 'manager role must expose allowed_tools[]')
assert(managerRole.allowed_tools.includes('dashboard'), 'manager role metadata must include dashboard')
assert(managerRole.allowed_tools.includes('mungkhudshop'), 'manager role metadata must include mungkhudshop')

const expectedRoleTools = {
    admin: ['admin_suite', 'mungkhudshop', 'dashboard'],
    owner: ['mungkhudshop', 'dashboard'],
    manager: ['mungkhudshop', 'dashboard'],
    sa: ['mungkhudshop', 'technical_knowledge', 'sa_docs', 'checkin'],
    mechanic: ['mechanic_dashboard', 'technical_knowledge', 'checkin']
}

for (const [roleName, tools] of Object.entries(expectedRoleTools)) {
    const role = roles.body.roles.find(row => String(row.role || row.name || row.role_name || '').toLowerCase() === roleName)
    assert(Array.isArray(role?.allowed_tools), `${roleName} role must expose allowed_tools[]`)
    assert(role.allowed_tools.length > 0, `${roleName} role must have portal module tools configured`)
    for (const tool of tools) {
        assert(role.allowed_tools.includes(tool), `${roleName} role metadata must include ${tool}`)
    }
}

const sessionRoles = await request('/api/data/custom/role-metadata', { headers: devHeaders('manager') })
assert(sessionRoles.res.status === 200, `session role metadata expected 200, got ${sessionRoles.res.status}`)
assert(Array.isArray(sessionRoles.body?.roles), 'session role metadata must include roles[]')

const settings = await request('/api/data/custom/admin/settings', { headers: devHeaders('admin') })
assert(settings.res.status === 200, `admin settings endpoint expected 200, got ${settings.res.status}`)
assert(Array.isArray(settings.body?.settings), 'admin settings endpoint must include settings[]')
const settingKeys = settings.body.settings.map(row => String(row.key || row.setting_key || row.name || '').trim()).filter(Boolean)
for (const key of REQUIRED_SETTINGS) {
    assert(settingKeys.includes(key), `settings metadata missing required setting: ${key}`)
}

const deniedRoles = await request('/api/data/custom/admin/roles', { headers: devHeaders('mechanic') })
assert(deniedRoles.res.status === 403, `mechanic role-admin access expected 403, got ${deniedRoles.res.status}`)

const deniedSettings = await request('/api/data/custom/admin/settings', { headers: devHeaders('mechanic') })
assert(deniedSettings.res.status === 403, `mechanic settings-admin access expected 403, got ${deniedSettings.res.status}`)

console.log(JSON.stringify({
    ok: true,
    api_url: API_URL,
    public_branch_count: publicBranches.length,
    active_scoped_branches: scopedActiveBranches.map(branch => branch.branch_id),
    roles: names,
    settings: settingKeys,
    session_role_metadata_status: sessionRoles.res.status,
    mechanic_role_admin_status: deniedRoles.res.status,
    mechanic_settings_admin_status: deniedSettings.res.status
}, null, 2))
