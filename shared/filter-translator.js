/**
 * PocketBase Filter → NocoDB Where Clause Translator
 * ═══════════════════════════════════════════════════
 * Translates PocketBase filter syntax used throughout the codebase
 * into NocoDB's `where` query parameter format.
 *
 * PocketBase:  "status='open' && branch_id='samchuk'"
 * NocoDB:      "(status,eq,open)~and(branch_id,eq,samchuk)"
 */

/**
 * Translate a PocketBase filter string to NocoDB where clause.
 * @param {string} pbFilter - PocketBase filter string
 * @returns {string} NocoDB where clause (empty string if no filter)
 */
export function translateFilter(pbFilter) {
    if (!pbFilter || typeof pbFilter !== 'string') return ''

    const trimmed = pbFilter.trim()
    if (!trimmed) return ''

    // PocketBase's "always true" filter — skip it
    if (trimmed === 'id!=""' || trimmed === "id!=''") return ''

    // Split on logical operators while preserving them
    const parts = splitLogical(trimmed)

    const translated = parts.map(part => {
        if (part.type === 'and') return '~and'
        if (part.type === 'or') return '~or'
        return translateCondition(part.expr)
    })

    return translated.join('')
}

/**
 * Split a filter string into conditions and logical operators.
 * Handles: &&, ||, parenthesized groups
 */
function splitLogical(filter) {
    const results = []
    let current = ''
    let depth = 0
    let i = 0

    while (i < filter.length) {
        const ch = filter[i]

        // Track parenthesis depth (for grouped conditions like (a='x' || b='y'))
        if (ch === '(') {
            // Check if this is a PB-style group like (role='owner' || role='manager')
            depth++
            current += ch
            i++
            continue
        }
        if (ch === ')') {
            depth--
            current += ch
            i++
            continue
        }

        // Only split on top-level logical operators
        if (depth === 0) {
            // Check for &&
            if (filter[i] === '&' && filter[i + 1] === '&') {
                if (current.trim()) {
                    results.push({ type: 'expr', expr: current.trim() })
                }
                results.push({ type: 'and' })
                current = ''
                i += 2
                continue
            }
            // Check for ||
            if (filter[i] === '|' && filter[i + 1] === '|') {
                if (current.trim()) {
                    results.push({ type: 'expr', expr: current.trim() })
                }
                results.push({ type: 'or' })
                current = ''
                i += 2
                continue
            }
        }

        current += ch
        i++
    }

    if (current.trim()) {
        results.push({ type: 'expr', expr: current.trim() })
    }

    return results
}

/**
 * Translate a single PB condition to NocoDB format.
 * Supports: =, !=, >=, <=, >, <, ~
 *
 * Input:  "status='open'"
 * Output: "(status,eq,open)"
 *
 * Input:  "(role='owner' || role='manager')"
 * Output: "(role,eq,owner)~or(role,eq,manager)"
 */
function translateCondition(expr) {
    if (!expr) return ''

    // Handle parenthesized groups recursively
    const unwrapped = expr.trim()
    if (unwrapped.startsWith('(') && unwrapped.endsWith(')')) {
        const inner = unwrapped.slice(1, -1).trim()
        // Check if inner contains || or &&
        if (inner.includes('||') || inner.includes('&&')) {
            return translateFilter(inner)
        }
    }

    // Operator patterns (order matters: >= before >, etc.)
    const operators = [
        { pb: '!=', noco: 'neq' },
        { pb: '>=', noco: 'gte' },
        { pb: '<=', noco: 'lte' },
        { pb: '>', noco: 'gt' },
        { pb: '<', noco: 'lt' },
        { pb: '~', noco: 'like' },
        { pb: '=', noco: 'eq' },
    ]

    for (const op of operators) {
        const idx = findOperator(expr, op.pb)
        if (idx !== -1) {
            const field = expr.substring(0, idx).trim()
            let value = expr.substring(idx + op.pb.length).trim()

            // Strip quotes from value
            value = stripQuotes(value)

            // Skip empty/null comparisons that are always-true patterns
            if (op.noco === 'neq' && value === '' && field === 'id') {
                return '' // id!="" is always-true in PB
            }

            return `(${field},${op.noco},${value})`
        }
    }

    // If we can't parse it, return empty (safe fallback)
    console.warn('[FilterTranslator] Could not parse:', expr)
    return ''
}

/**
 * Find operator position, avoiding matches inside quoted strings.
 */
function findOperator(expr, op) {
    let inQuote = false
    let quoteChar = ''

    for (let i = 0; i < expr.length - op.length + 1; i++) {
        const ch = expr[i]
        if (!inQuote && (ch === "'" || ch === '"')) {
            inQuote = true
            quoteChar = ch
            continue
        }
        if (inQuote && ch === quoteChar) {
            inQuote = false
            continue
        }
        if (!inQuote && expr.substring(i, i + op.length) === op) {
            // Make sure we're not matching a longer operator (e.g. != when looking for =)
            if (op === '=' && i > 0 && (expr[i - 1] === '!' || expr[i - 1] === '>' || expr[i - 1] === '<')) {
                continue
            }
            if (op === '>' && expr[i + 1] === '=') continue
            if (op === '<' && expr[i + 1] === '=') continue
            return i
        }
    }
    return -1
}

/**
 * Strip surrounding quotes from a value.
 */
function stripQuotes(val) {
    if (!val) return val
    if ((val.startsWith("'") && val.endsWith("'")) ||
        (val.startsWith('"') && val.endsWith('"'))) {
        return val.slice(1, -1)
    }
    return val
}

/**
 * Translate PB sort string to NocoDB sort parameter.
 * PB uses -field for descending, +field or field for ascending.
 * NocoDB uses the same format — direct passthrough.
 */
export function translateSort(pbSort) {
    return pbSort || ''
}
