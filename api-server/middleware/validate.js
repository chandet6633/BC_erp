/**
 * Input Validation Middleware
 * ═══════════════════════════
 * Validates request bodies against table-specific schemas.
 * Rejects malformed data before it reaches NocoDB.
 *
 * DESIGN: Permissive by default — only reject clearly invalid data.
 * Required fields are checked loosely (null/undefined only, not empty string).
 * This prevents blocking legitimate operations from the frontend.
 */

// Numeric fields that must be valid numbers (when provided and non-empty)
const NUMERIC_FIELDS = {
    jobs: ['subtotal', 'discount', 'vat_amount', 'grand_total', 'mileage_in', 'work_duration_minutes'],

    job_items: ['qty', 'price', 'discount', 'total'],
    products: ['price', 'cost', 'min_stock'],
    documents: ['subtotal', 'discount', 'vat_amount', 'grand_total'],
    document_items: ['qty', 'price', 'discount', 'total'],
    financial_entries: ['amount'],
    customers: ['credit_limit', 'credit_days'],
    stock_ledgers: ['qty', 'unit_cost', 'total_value'],
}

// Max string lengths to prevent abuse
const MAX_LENGTHS = {
    name: 500,
    email: 254,
    phone: 30,
    code: 50,
    job_no: 50,
    doc_no: 50,
    pin: 10,
    plate: 30,
    plate_number: 30,
}

/**
 * Tables that can only be modified by admin/owner/manager roles.
 */
const PROTECTED_TABLES = ['users', 'app_users', 'system_settings', 'system_roles']

/**
 * Validate CREATE body for a given table.
 * Permissive: only checks numeric types and string lengths.
 * Does NOT enforce required fields — the frontend may send partial data.
 */
export function validateCreate(table, body) {
    const errors = []
    const tableLower = table.toLowerCase()

    // Check numeric fields (only if provided and non-empty)
    const numerics = NUMERIC_FIELDS[tableLower]
    if (numerics) {
        for (const field of numerics) {
            if (body[field] != null && body[field] !== '' && isNaN(Number(body[field]))) {
                errors.push(`Field "${field}" must be a number, got: ${body[field]}`)
            }
        }
    }

    // Check string lengths
    for (const [field, maxLen] of Object.entries(MAX_LENGTHS)) {
        if (body[field] && typeof body[field] === 'string' && body[field].length > maxLen) {
            errors.push(`Field "${field}" exceeds max length of ${maxLen}`)
        }
    }

    return errors
}

/**
 * Validate UPDATE body — same as create (permissive).
 */
export function validateUpdate(table, body) {
    return validateCreate(table, body)
}

/**
 * Check if a table requires admin/owner to modify.
 */
export function isProtectedTable(table) {
    return PROTECTED_TABLES.includes(table.toLowerCase())
}
