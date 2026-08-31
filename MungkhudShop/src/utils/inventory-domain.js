export const UOM_OPTIONS = [
    { value: 'piece', label: 'Piece' },
    { value: 'liter', label: 'Liter' },
    { value: 'ml', label: 'Milliliter' },
    { value: 'meter', label: 'Meter' },
    { value: 'roll', label: 'Roll' },
    { value: 'box', label: 'Box' },
    { value: 'barrel', label: 'Barrel' },
    { value: 'set', label: 'Set' },
    { value: 'job', label: 'Job' },
]

export const TRACKING_TYPE_OPTIONS = [
    { value: 'NONE', label: 'None' },
    { value: 'SERIALIZED', label: 'Serialized' },
    { value: 'BATCH', label: 'Batch/Lot' },
    { value: 'DIMENSION', label: 'Dimension/Roll' },
]

export function normalizeUom(value, fallback = 'piece') {
    return String(value || fallback).trim().toLowerCase()
}

export function getBaseUom(product) {
    return normalizeUom(product?.base_uom || product?.unit || 'piece')
}

export function getProductTrackingType(product) {
    const metadata = parseMetadata(product)
    const value = String(product?.tracking_type || product?.stock_tracking_type || metadata.tracking_type || 'NONE').toUpperCase()
    return TRACKING_TYPE_OPTIONS.some(o => o.value === value) ? value : 'NONE'
}

export function parseMetadata(record) {
    if (!record?.metadata_json) return {}
    if (typeof record.metadata_json === 'object') return record.metadata_json || {}
    try {
        return JSON.parse(record.metadata_json)
    } catch {
        return {}
    }
}

export function getUomFactor(product, fromUom) {
    const baseUom = getBaseUom(product)
    const sourceUom = normalizeUom(fromUom, baseUom)
    if (sourceUom === baseUom) return 1
    const factor = Number(product?.[`uom_factor_${sourceUom}`] ?? product?.uom_conversion_factor ?? product?.purchase_conversion_factor ?? product?.conversion_factor ?? 1)
    return Number.isFinite(factor) && factor > 0 ? factor : 1
}

export function toBaseQty(qty, product, fromUom) {
    return (Number(qty) || 0) * getUomFactor(product, fromUom)
}

export function formatTrackingType(value) {
    return TRACKING_TYPE_OPTIONS.find(o => o.value === String(value || 'NONE').toUpperCase())?.label || 'None'
}
