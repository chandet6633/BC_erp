const BRANCH_METADATA_URL = '/api/data/custom/branch-metadata'

let branchCache = null
let branchCacheAt = 0
const CACHE_TTL_MS = 60 * 1000

function normalizeBranch(row) {
    const code = String(row?.branch_id || row?.code || row?.id || '').trim()
    const name = String(row?.branch_name || row?.display_name || row?.name || code).trim()
    return {
        ...row,
        id: code,
        branch_id: code,
        code,
        branch_name: name,
        display_name: String(row?.display_name || name).trim(),
        display_name_en: String(row?.display_name_en || row?.name_en || name).trim(),
        aliases: Array.isArray(row?.aliases) ? row.aliases.map(v => String(v || '').trim()).filter(Boolean) : [],
        scoped: row?.scoped !== false,
        is_virtual: row?.is_virtual === true,
        is_active: row?.is_active !== false
    }
}

export async function fetchBranchMetadata({ includeAll = false, includeInactive = false, force = false } = {}) {
    const now = Date.now()
    if (!force && branchCache && now - branchCacheAt < CACHE_TTL_MS) {
        return includeInactive ? branchCache : branchCache.filter(branch => branch.is_active)
    }

    const params = new URLSearchParams({
        include_all: includeAll ? 'true' : 'false',
        include_inactive: includeInactive ? 'true' : 'false'
    })
    const res = await fetch(`${BRANCH_METADATA_URL}?${params}`)
    if (!res.ok) throw new Error(`Branch metadata failed (${res.status})`)
    const data = await res.json()
    branchCache = (data.branches || []).map(normalizeBranch).filter(branch => branch.branch_id)
    branchCacheAt = now
    return includeInactive ? branchCache : branchCache.filter(branch => branch.is_active)
}

export function getCachedBranches() {
    return branchCache || []
}

export function getBranchLabel(branchId, branches = branchCache || [], lang = 'th') {
    const id = String(branchId || '').trim()
    const match = branches.find(branch => {
        if (branch.branch_id === id || branch.code === id || branch.id === id) return true
        return (branch.aliases || []).includes(id)
    })
    if (!match) return id || ''
    return lang === 'en' ? (match.display_name_en || match.branch_name) : (match.display_name || match.branch_name)
}

export function getBranchOptions(branches = branchCache || [], { scopedOnly = false } = {}) {
    return branches.filter(branch => !scopedOnly || branch.scoped)
}
