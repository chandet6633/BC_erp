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
    products: ['price', 'cost', 'min_stock', 'min_qty', 'max_qty', 'uom_conversion_factor', 'purchase_conversion_factor', 'conversion_factor'],
    documents: ['subtotal', 'discount', 'vat_amount', 'grand_total'],
    document_items: ['qty', 'price', 'discount', 'total', 'dimension_qty'],
    financial_ledger: ['amount'],
    customers: ['credit_limit', 'credit_days'],
    stock_ledgers: ['qty', 'qty_base_delta', 'balance_after', 'unit_cost', 'total_value', 'value_delta'],
}

// Max string lengths to prevent abuse
const MAX_LENGTHS = {
    name: 500,
    email: 254,
    phone: 30,
    code: 50,
    job_no: 50,
    doc_no: 50,
    pin: 64,
    plate: 30,
    plate_number: 30,
}

/**
 * Tables that can only be modified by admin/owner/manager roles.
 * During the current dev phase, product/service master data is intentionally open
 * to all logged-in roles so every role can test metadata setup flows.
 */
const PROTECTED_TABLES = ['users', 'system_settings', 'system_roles']

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

    // BUG 72 FIX: Prevent Negative Quantities and Prices in Job Items and Ledgers (Anti-Fraud)
    if (tableLower === 'job_items' || tableLower === 'document_items') {
        if (body.qty !== undefined && Number(body.qty) < 0) {
            errors.push('จำนวนสินค้าไม่สามารถติดลบได้ (ป้องกันการทุจริต)');
        }
        const itemPrice = body.unit_price !== undefined ? body.unit_price : body.price;
        if (itemPrice !== undefined && Number(itemPrice) < 0) {
            errors.push('ราคาสินค้าไม่สามารถติดลบได้');
        }
    }

    // BUG 29 FIX: Prevent Negative Invoices (Refund Exploit)
    if ((tableLower === 'documents' || tableLower === 'jobs') && body.grand_total !== undefined) {
        if (Number(body.grand_total) < 0) {
            errors.push('ยอดรวมสุทธิไม่สามารถติดลบได้');
        }

        // BUG 53 FIX: Server-Side Math Verification (Anti-Tampering)
        if (body.subtotal !== undefined) {
            const sub = Number(body.subtotal) || 0;
            const disc = Number(body.discount) || 0;
            const vat = Number(body.vat_amount) || 0;
            // BUG 16 FIX: shop_absorbs VAT mode — shop pays VAT from their margin, so grand_total = sub - disc (VAT already included)
            // In this mode, vat_amount is informational, not additive.
            const isShopAbsorbsVat = body.vat_mode === 'shop_absorbs'
            const expectedTotal = isShopAbsorbsVat ? (sub - disc) : (sub - disc + vat);
            
            // Allow 1.00 THB floating point tolerance due to inclusive VAT rounding
            if (Math.abs(expectedTotal - Number(body.grand_total)) > 1.00) {
                errors.push(`ยอดรวมไม่ถูกต้อง (คำนวณได้ ${expectedTotal} แต่ส่งมา ${body.grand_total})`);
            }
        }
    }

    // BUG 30 FIX: Prevent Phantom Inventory (Zero Cost items)
    if (tableLower === 'document_items') {
        // unit_price or price based on table schema
        const itemPrice = body.unit_price !== undefined ? body.unit_price : body.price;
        // BUG 15 FIX: Allow zero-price items explicitly flagged as gifts/promotions
        const isGift = body.is_gift === true || body.is_gift === 'true' || body.is_gift === 1
        if (!isGift && Number(body.qty) > 0 && itemPrice !== undefined && Number(itemPrice) <= 0) {
            errors.push('ราคาสินค้าต้องมากกว่า 0 สำหรับรายการที่มีจำนวนมากกว่า 0 (ใช้ is_gift=true สำหรับของแถม/ส่งเสริม)');
        }
    }

    // Check string lengths
    for (const [field, maxLen] of Object.entries(MAX_LENGTHS)) {
        if (body[field] && typeof body[field] === 'string' && body[field].length > maxLen) {
            errors.push(`Field "${field}" exceeds max length of ${maxLen}`)
        }
    }

    // INTEGRITY: stock_ledger must always reference a document
    if (tableLower === 'stock_ledgers') {
        if (!body.reference_doc || String(body.reference_doc).trim() === '') {
            errors.push('Stock ledger entries must reference a document (reference_doc is required)');
        }
        const validTypes = ['IN', 'OUT', 'ADJ'];
        if (body.transaction_type && !validTypes.includes(String(body.transaction_type).toUpperCase())) {
            errors.push(`transaction_type must be one of: ${validTypes.join(', ')}`);
        }
    }

    // INTEGRITY: Enum validations
    const VALID_DOC_TYPES = ['RR','RQ','RE','TF','SA','QT','IV','RC','CN','PI','PCN','PAY','WT','JOB']
    if (tableLower === 'documents' && body.doc_type) {
        const dt = String(body.doc_type).toUpperCase()
        if (!VALID_DOC_TYPES.includes(dt)) {
            errors.push(`doc_type "${body.doc_type}" is not valid. Must be one of: ${VALID_DOC_TYPES.join(', ')}`)
        }
    }

    const VALID_PRODUCT_TYPES = ['part', 'accessory', 'fluid', 'service', 'labor', 'labour', 'other']
    if (tableLower === 'products' && body.type !== undefined) {
        const pt = String(body.type).toLowerCase()
        if (!VALID_PRODUCT_TYPES.includes(pt)) {
            errors.push(`product type "${body.type}" is not valid. Must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`)
        }
    }

    const VALID_TRACKING_TYPES = ['NONE', 'SERIALIZED', 'BATCH', 'DIMENSION']
    if ((tableLower === 'products' || tableLower === 'document_items' || tableLower === 'job_items') && body.tracking_type !== undefined) {
        const tt = String(body.tracking_type || 'NONE').toUpperCase()
        if (!VALID_TRACKING_TYPES.includes(tt)) {
            errors.push(`tracking_type "${body.tracking_type}" is not valid. Must be one of: ${VALID_TRACKING_TYPES.join(', ')}`)
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
