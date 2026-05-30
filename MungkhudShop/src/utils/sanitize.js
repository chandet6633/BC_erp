/**
 * MungkhudShop — Sanitization Utilities
 * Prevents PocketBase filter injection (SEC-2) and XSS (SEC-3).
 */

/**
 * BUG 29 FIX: Escape single quotes AND NocoDB filter operator characters.
 * NocoDB filter syntax also uses ~, (, ), , as operators — a malicious value
 * like `test)~or(1,eq,1` could inject filter logic without this guard.
 * @param {string} val - Raw user input
 * @returns {string} — Safe for embedding in NocoDB filter: `(field,eq,${sanitizeFilter(val)})`
 */
export function sanitizeFilter(val) {
    if (val == null) return ''
    return String(val)
        .replace(/'/g, "\\'")
        .replace(/[~()]/g, '')   // Strip NocoDB filter operator chars
}

/**
 * Encode HTML entities to prevent XSS.
 * Use when injecting user-controlled data into innerHTML.
 * @param {string} str - Raw string
 * @returns {string} — HTML-safe string
 */
export function escapeHtml(str) {
    if (str == null) return ''
    const div = document.createElement('div')
    div.textContent = String(str)
    return div.innerHTML
}

/**
 * Build a safe PocketBase filter comparison.
 * @param {string} field - Field name
 * @param {string} value - Raw value
 * @param {string} [op='='] - Operator
 * @returns {string} — e.g. `field='safe_value'`
 */
export function safeFilter(field, value, op = '=') {
    return `${field}${op}'${sanitizeFilter(value)}'`
}
