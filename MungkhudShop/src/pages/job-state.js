/**
 * Job Page — Shared State Module (ARCH-2)
 * Centralizes mutable state that was at module-level in job.js.
 * All functions that need state import from here.
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
