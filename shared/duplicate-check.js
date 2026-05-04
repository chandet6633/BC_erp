/**
 * BC AutoXperience — Shared Duplicate Check Utility
 * ══════════════════════════════════════════════════
 * Generic function to detect duplicate records before save.
 * Used across: jobs (plate), customers (phone), vehicles (plate_number), products (code)
 *
 * @example
 *   const { isDuplicate, existingRecord } = await checkDuplicate('jobs', 'plate', 'กข-1234')
 *   if (isDuplicate) showToast('พบใบงานซ้ำ!', 'warning')
 */

import { fetchFullList } from './nocodb-adapter.js'

/**
 * Generic duplicate check.
 * @param {string} table - NocoDB table name
 * @param {string} field - Field to check against
 * @param {string|number} value - Value to look for
 * @param {string|null} excludeId - Record ID to exclude (for edit mode — don't flag yourself)
 * @returns {{ isDuplicate: boolean, existingRecord: object|null }}
 */
export async function checkDuplicate(table, field, value, excludeId = null) {
    // Guard: empty/null values are never duplicates
    if (value === null || value === undefined || String(value).trim() === '') {
        return { isDuplicate: false, existingRecord: null }
    }

    const safeValue = String(value).trim().replace(/'/g, "''")
    const filter = `(${field},eq,${safeValue})`

    try {
        const results = await fetchFullList(table, { where: filter, requestKey: null })

        // Filter out the record being edited (if excludeId provided)
        const matches = excludeId
            ? results.filter(r => r.id !== excludeId)
            : results

        if (matches.length > 0) {
            return { isDuplicate: true, existingRecord: matches[0] }
        }
        return { isDuplicate: false, existingRecord: null }
    } catch (e) {
        console.warn(`[checkDuplicate] Failed to check ${table}.${field}:`, e.message)
        // On error, don't block the user — let the save proceed
        return { isDuplicate: false, existingRecord: null }
    }
}

// ─── Convenience Wrappers ──────────────────────────────────────────────────

/**
 * Check if an OPEN job exists for the same plate number.
 * Prevents creating duplicate job cards for the same vehicle.
 * @param {string} plate - Plate number (e.g. 'กข-1234')
 * @param {string|null} excludeId - Current job ID in edit mode
 */
export async function checkDuplicateJob(plate, excludeId = null) {
    if (!plate || plate.trim() === '') return { isDuplicate: false, existingRecord: null }

    const safePlate = plate.trim().replace(/'/g, "''")
    const filter = `(plate,eq,${safePlate})~and(status,eq,open)`

    try {
        const results = await fetchFullList('jobs', { where: filter, requestKey: null })
        const matches = excludeId ? results.filter(r => r.id !== excludeId) : results
        return {
            isDuplicate: matches.length > 0,
            existingRecord: matches[0] || null
        }
    } catch (e) {
        console.warn('[checkDuplicateJob] Failed:', e.message)
        return { isDuplicate: false, existingRecord: null }
    }
}

/**
 * Check if a customer with the same phone number already exists.
 * @param {string} phone - Customer phone number
 * @param {string|null} excludeId - Current customer ID in edit mode
 */
export async function checkDuplicateCustomer(phone, excludeId = null) {
    return checkDuplicate('customers', 'phone', phone, excludeId)
}

/**
 * Check if a vehicle with the same plate number already exists.
 * @param {string} plateNumber - Vehicle plate (e.g. 'กข-1234')
 * @param {string|null} excludeId - Current vehicle ID in edit mode
 */
export async function checkDuplicateVehicle(plateNumber, excludeId = null) {
    return checkDuplicate('vehicles', 'plate_number', plateNumber, excludeId)
}

/**
 * Check if a product with the same code already exists.
 * @param {string} code - Product code
 * @param {string|null} excludeId - Current product ID in edit mode
 */
export async function checkDuplicateProduct(code, excludeId = null) {
    return checkDuplicate('products', 'code', code, excludeId)
}
