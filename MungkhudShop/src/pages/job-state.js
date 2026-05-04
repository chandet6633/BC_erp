/**
 * Job Page — Shared State Module (ARCH-2)
 * v2: Adds mechanicsCache for lead/helper mechanic assignment.
 */
import { fetchFullList } from '../services/pb.js'

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
    invalidateProductCache()
}

/** PERF-1+5: Shared product & stock cache */
export async function getProductsWithStock() {
    if (!productsCache) {
        const [products, ledgers] = await Promise.all([
            fetchFullList('products', { requestKey: null }),
            fetchFullList('stock_ledgers', { requestKey: null })
        ])
        productsCache = products
        stockMapCache = {}
        ledgers.forEach(l => {
            stockMapCache[l.product_id] = (stockMapCache[l.product_id] || 0) + (l.qty || 0)
        })
    }
    return { products: productsCache, stockMap: stockMapCache }
}

export function invalidateProductCache() {
    productsCache = null
    stockMapCache = null
}

/** v2: Fetch and cache mechanic users (role contains 'mechanic' or 'employee') */
export async function getMechanics() {
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
    return mechanicsCache
}
