export function isServiceLikeProduct(product = {}) {
    const type = String(product.type || product.product_type || '').trim().toLowerCase()
    return ['service', 'labor', 'labour'].includes(type)
}

export function isStockTrackedProduct(product = {}) {
    if (isServiceLikeProduct(product)) return false
    const value = product.is_track_stock
    if (value === false || value === 0) return false
    if (typeof value === 'string' && ['false', '0', 'no', 'off'].includes(value.toLowerCase())) return false
    return true
}

function toStockNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

export function getMinStockQty(product = {}) {
    return Math.max(0, toStockNumber(product.min_qty ?? product.min_stock, 0))
}

export function getMaxStockQty(product = {}) {
    const maxQty = toStockNumber(product.max_qty ?? product.max_stock, 0)
    return maxQty > 0 ? maxQty : null
}

export function getStockStatus(product = {}, qtyValue = 0) {
    const qty = toStockNumber(qtyValue, 0)
    const minQty = getMinStockQty(product)
    const maxQty = getMaxStockQty(product)

    if (qty <= 0) return { key: 'out', minQty, maxQty }
    if (minQty > 0 && qty <= minQty) return { key: 'low', minQty, maxQty }
    if (maxQty !== null && qty > maxQty) return { key: 'over', minQty, maxQty }
    return { key: 'normal', minQty, maxQty }
}

export function isLowStock(product = {}, qtyValue = 0) {
    const status = getStockStatus(product, qtyValue).key
    return status === 'out' || status === 'low'
}
