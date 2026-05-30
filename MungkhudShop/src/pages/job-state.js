/**
 * Job Page — Shared State Module (ARCH-2)
 * v2: Adds mechanicsCache for lead/helper mechanic assignment.
 */
import { fetchFullList } from '../services/pb.js'
import { getBranch } from '../services/auth.js'

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
                headers: { 'Authorization': `Bearer ${localStorage.getItem('mungkhud_jwt')}` }
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
        // Include users with role: mechanic, employee, technician
        mechanicsCache = allUsers.filter(u =>
            u.is_active !== false &&
            /mechanic|employee|technician|ช่าง/i.test(u.role || '')
        )
        // Fallback: if no mechanic-role users found, return all active users
        if (mechanicsCache.length === 0) {
            mechanicsCache = allUsers.filter(u => u.is_active !== false)
        }
    }
    if (currentBranch) {
        mechanicsCache = mechanicsCache.filter(u => String(u.branch || u.branch_id || '') === String(currentBranch))
    }
    return mechanicsCache
}
