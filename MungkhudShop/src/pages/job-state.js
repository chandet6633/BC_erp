/**
 * Job Page - Shared State Module (ARCH-2)
 * v2: Adds mechanicsCache for lead/helper mechanic assignment.
 */
import { fetchFullList } from '../services/pb.js'
import { getApiAuthHeaders, getBranch } from '../services/auth.js'

// Module state
let currentItems = []
let editingId = null
let plateAC = null
let customerAC = null
let vatToggle = null

// Product cache
let productsCache = null
let stockMapCache = null

// v2: Mechanics cache
let mechanicsCache = null
let mechanicsCacheBranch = null

export function getState() {
    return { currentItems, editingId, plateAC, customerAC, vatToggle }
}

export function setCurrentItems(items) { currentItems = items }
export function setEditingId(id) { editingId = id }
export function setPlateAC(ac) { plateAC = ac }
export function setCustomerAC(ac) { customerAC = ac }
export function setVatToggle(vt) { vatToggle = vt }

export function resetState() {
    currentItems = []
    editingId = null
    plateAC = null
    customerAC = null
    vatToggle = null
    mechanicsCache = null
    mechanicsCacheBranch = null
    invalidateProductCache()
}

/** PERF-1+5: Shared product & stock cache */
export async function getProductsWithStock() {
    if (!productsCache) {
        productsCache = await fetchFullList('products', { requestKey: null })
        stockMapCache = {}
        try {
            const res = await fetch(`/api/data/custom/stock-balances?branch_id=${encodeURIComponent(getBranch() || '')}`, {
                headers: getApiAuthHeaders()
            })
            if (res.ok) {
                const stockMap = await res.json()
                for (const pid in stockMap) {
                    stockMapCache[pid] = stockMap[pid].qty || 0
                }
            }
        } catch (e) {
            console.warn('[job-state] Failed to fetch stock balances:', e)
        }
    }
    return { products: productsCache, stockMap: stockMapCache }
}

export function invalidateProductCache() {
    productsCache = null
    stockMapCache = null
}

/** v2: Fetch and cache mechanic users (role contains 'mechanic' or 'employee') */
export async function getMechanics() {
    const currentBranch = getBranch()
    if (mechanicsCacheBranch !== currentBranch) {
        mechanicsCache = null
        mechanicsCacheBranch = currentBranch
    }
    if (!mechanicsCache) {
        const allUsers = await fetchFullList('users', { requestKey: null })
        const branchAliases = await getBranchAliases()
        const selectedBranches = normalizeBranchKeys(currentBranch, branchAliases)

        // Include users with role: mechanic, employee, technician.
        mechanicsCache = allUsers.filter(u =>
            isActiveUser(u) &&
            /mechanic|employee|technician|ช่าง/i.test(u.role || '') &&
            (!selectedBranches.size || hasMatchingBranch(u, selectedBranches, branchAliases))
        )
        // Fallback: if no mechanic-role users found, return active users in the branch.
        if (mechanicsCache.length === 0) {
            mechanicsCache = allUsers.filter(u =>
                isActiveUser(u) &&
                (!selectedBranches.size || hasMatchingBranch(u, selectedBranches, branchAliases))
            )
        }
    }
    return mechanicsCache
}

function isActiveUser(user) {
    if (user.active !== undefined) return user.active !== false && user.active !== 'false' && user.active !== 0
    return user.is_active !== false && user.is_active !== 'false' && user.is_active !== 0
}

async function getBranchAliases() {
    try {
        const branches = await fetchFullList('branches', { requestKey: 'branch_aliases' })
        const aliases = new Map()
        branches.forEach(branch => {
            const keys = normalizeBranchKeys([branch.id, branch.code, branch.name, branch.branch_id])
            keys.forEach(key => aliases.set(key, keys))
        })
        return aliases
    } catch (e) {
        console.warn('[job-state] Failed to load branch aliases:', e.message)
        return new Map()
    }
}

function hasMatchingBranch(user, selectedBranches, branchAliases) {
    const userBranches = normalizeBranchKeys([user.branch, user.branch_id, user.branch_code], branchAliases)
    return [...userBranches].some(key => selectedBranches.has(key))
}

function normalizeBranchKeys(value, aliases = new Map()) {
    const values = Array.isArray(value) ? value : [value]
    const keys = new Set()
    values.forEach(v => {
        const key = String(v || '').trim().toLowerCase()
        if (!key) return
        keys.add(key)
        const linked = aliases.get(key)
        if (linked) linked.forEach(alias => keys.add(alias))
    })
    return keys
}

