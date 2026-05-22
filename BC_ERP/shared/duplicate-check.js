/**
 * BC AutoXperience — Shared Duplicate Check Utility
 * ══════════════════════════════════════════════════
 * Generic function to detect duplicate records before save.
 * Used across: jobs (plate), customers (phone/cust_code), vehicles (plate_number), products (code)
 */

import { fetchFullList } from './nocodb-adapter.js'

/**
 * Generic duplicate check.
 * @param {string} table - NocoDB table name
 * @param {string} field - Field to check against
 * @param {string|number} value - Value to look for
 * @param {string|null} excludeId - Record ID to exclude (for edit mode)
 * @returns {{ isDuplicate: boolean, existingRecord: object|null }}
 */
export async function checkDuplicate(table, field, value, excludeId = null) {
    if (value === null || value === undefined || String(value).trim() === '') {
        return { isDuplicate: false, existingRecord: null }
    }

    const safeValue = String(value).trim().replace(/'/g, "''")
    // BUG FIX: was { where: filter } — adapter ignores 'where', requires 'filter'
    const filter = `(${field},eq,${safeValue})`

    try {
        const results = await fetchFullList(table, { filter, requestKey: null })

        const matches = excludeId
            ? results.filter(r => r.id !== excludeId)
            : results

        if (matches.length > 0) {
            return { isDuplicate: true, existingRecord: matches[0] }
        }
        return { isDuplicate: false, existingRecord: null }
    } catch (e) {
        console.warn(`[checkDuplicate] Failed to check ${table}.${field}:`, e.message)
        return { isDuplicate: false, existingRecord: null }
    }
}

// ─── Convenience Wrappers ──────────────────────────────────────────────────

/**
 * Check if an OPEN job exists for the same plate number.
 * BUG FIX: was checking status='open' which never matches — fixed to check all active statuses.
 * @param {string} plate - Plate number
 * @param {string|null} excludeId - Current job ID in edit mode
 */
export async function checkDuplicateJob(plate, excludeId = null) {
    if (!plate || plate.trim() === '') return { isDuplicate: false, existingRecord: null }

    const safePlate = plate.trim().replace(/'/g, "''")
    // BUG FIX: was (status,eq,open) — jobs use pending/in_progress/qc_done for active statuses
    const filter = `(plate,eq,${safePlate})~and((status,eq,pending)~or(status,eq,in_progress)~or(status,eq,qc_done))`

    try {
        const results = await fetchFullList('jobs', { filter, requestKey: null })
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
 */
export async function checkDuplicateCustomer(phone, excludeId = null) {
    return checkDuplicate('customers', 'phone', phone, excludeId)
}

/**
 * Check if a customer code already exists (before assigning a new one).
 */
export async function checkDuplicateCustomerCode(code, excludeId = null) {
    return checkDuplicate('customers', 'cust_code', code, excludeId)
}

/**
 * Check if a vehicle with the same plate number already exists.
 */
export async function checkDuplicateVehicle(plateNumber, excludeId = null) {
    return checkDuplicate('vehicles', 'plate_number', plateNumber, excludeId)
}

/**
 * Check if a product with the same code already exists.
 */
export async function checkDuplicateProduct(code, excludeId = null) {
    return checkDuplicate('products', 'code', code, excludeId)
}
