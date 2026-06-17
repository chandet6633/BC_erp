/**
 * Data Routes — CRUD Proxy to NocoDB
 * ═══════════════════════════════════
 * All routes require JWT authentication.
 * Validates input before writing to NocoDB.
 *
 * GET    /api/data/:table          — List records (with filter/sort/pagination)
 * GET    /api/data/:table/all      — Get ALL records (paginated internally)
 * GET    /api/data/:table/:id      — Get single record
 * POST   /api/data/:table          — Create record
 * PATCH  /api/data/:table/:id      — Update record
 * DELETE /api/data/:table/:id      — Delete record (admin/owner/manager only)
 */
import { Router } from 'express'
import crypto from 'crypto'
import { requireAuth, requireRole } from '../middleware/jwt.js'
import { validateCreate, validateUpdate, isProtectedTable } from '../middleware/validate.js'
import * as db from '../lib/nocodb.js'

const router = Router()

function sha256(input) {
    return crypto.createHash('sha256').update(String(input), 'utf8').digest('hex')
}

function isSha256Hash(value) {
    return /^[a-f0-9]{64}$/i.test(String(value || ''))
}

function normalizeUserPinPayload(payload) {
    if (!Object.prototype.hasOwnProperty.call(payload, 'pin') || payload.pin === '') return null
    const pin = String(payload.pin)
    if (isSha256Hash(pin)) return null
    if (!/^\d{4,6}$/.test(pin)) {
        return 'PIN must be 4-6 digits'
    }
    payload.pin = sha256(pin)
    return null
}

function safeWhereValue(value) {
    return String(value ?? '').replace(/[()~,]/g, '').replace(/['";<>\\]/g, '').trim()
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function documentPeriod(date = new Date()) {
    const yy = String(date.getFullYear()).slice(-2)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    return `${yy}${mm}`
}

function nextDocumentNoFromRecords(prefix, records, date = new Date()) {
    const cleanPrefix = safeWhereValue(prefix).toUpperCase()
    const period = documentPeriod(date)
    const re = new RegExp(`^${escapeRegex(cleanPrefix)}${period}-(\\d+)$`, 'i')
    let maxSeq = 0

    for (const rec of records || []) {
        if (rec.doc_type && String(rec.doc_type).toUpperCase() !== cleanPrefix) continue
        const match = String(rec.doc_no || '').match(re)
        if (!match) continue
        maxSeq = Math.max(maxSeq, Number(match[1]) || 0)
    }

    return `${cleanPrefix}${period}-${String(maxSeq + 1).padStart(4, '0')}`
}

async function getDocumentRecordsForPrefix(prefix) {
    const cleanPrefix = safeWhereValue(prefix).toUpperCase()
    try {
        return await db.getAllRecords('documents', { where: `(doc_type,eq,${cleanPrefix})` })
    } catch (err) {
        console.warn(`[Data] Could not filter documents by doc_type=${cleanPrefix}; scanning all documents`, err.message)
        return db.getAllRecords('documents', {})
    }
}

async function generateDocumentNo(prefix) {
    const records = await getDocumentRecordsForPrefix(prefix)
    return nextDocumentNoFromRecords(prefix, records)
}

async function ensureCreateDocumentNo(payload) {
    const prefix = safeWhereValue(payload.doc_type).toUpperCase()
    if (!prefix) throw Object.assign(new Error('Document type is required before generating doc_no'), { status: 400 })

    const records = await getDocumentRecordsForPrefix(prefix)
    const desired = String(payload.doc_no || '').trim()
    const duplicate = desired && records.some(r => String(r.doc_no || '').trim() === desired)
    const placeholder = !desired || desired.includes('กำลัง') || desired.includes('creating')

    if (placeholder || duplicate) {
        payload.doc_no = nextDocumentNoFromRecords(prefix, records)
    }
}

function getRequestBranch(req, fallbackBranch = '') {
    if (req.user?.branch && req.user.branch !== 'all') return safeWhereValue(req.user.branch)
    return safeWhereValue(fallbackBranch)
}

function withBranchWhere(where, branch) {
    return branch ? `(${where})~and(branch_id,eq,${safeWhereValue(branch)})` : where
}

function isMissingColumn(err, column) {
    return String(err?.message || '').includes(`Column alias '${column}' not found`)
}

async function getAllWithOptionalBranch(table, where, branch) {
    if (!branch) return db.getAllRecords(table, { where })
    try {
        return await db.getAllRecords(table, { where: withBranchWhere(where, branch) })
    } catch (err) {
        if (!isMissingColumn(err, 'branch_id')) throw err
        console.warn(`[Data] ${table}.branch_id missing; falling back to unscoped lookup`)
        return db.getAllRecords(table, { where })
    }
}

async function createWithOptionalBranch(table, payload, branch) {
    if (!branch) return db.createRecord(table, payload)
    try {
        return await db.createRecord(table, { ...payload, branch_id: branch })
    } catch (err) {
        if (!isMissingColumn(err, 'branch_id')) throw err
        console.warn(`[Data] ${table}.branch_id missing; creating without branch_id`)
        return db.createRecord(table, payload)
    }
}

async function updateWithOptionalBranch(table, id, payload) {
    try {
        return await db.updateRecord(table, id, payload)
    } catch (err) {
        if (!payload.branch_id || !isMissingColumn(err, 'branch_id')) throw err
        const { branch_id, ...fallbackPayload } = payload
        console.warn(`[Data] ${table}.branch_id missing; updating without branch_id`)
        return db.updateRecord(table, id, fallbackPayload)
    }
}

function asNumber(value, fallback = 0) {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

function isStockTrackedProduct(product) {
    if (!product) return false
    if (product.is_track_stock === false || product.is_track_stock === 'false' || product.is_track_stock === 0 || product.is_track_stock === '0') {
        return false
    }
    const type = String(product.type || '').toLowerCase()
    return !['service', 'labor', 'labour'].includes(type)
}

function getItemPrice(item) {
    return asNumber(item.unit_price ?? item.price ?? item.cost, 0)
}

function productAliases(product) {
    return [
        product?.id,
        product?.Id,
        product?.code,
        product?.barcode,
        product?.name,
    ].map(v => String(v || '').trim()).filter(Boolean)
}

async function resolveProductFromStockItem(item) {
    const candidates = [
        item.product_id,
        item.product_code,
        item.product_name,
    ].map(v => String(v || '').trim()).filter(Boolean)

    for (const candidate of candidates) {
        try {
            return await db.getRecord('products', candidate)
        } catch { /* try aliases below */ }

        for (const field of ['code', 'barcode', 'name']) {
            try {
                const matches = await db.getAllRecords('products', { where: `(${field},eq,${safeWhereValue(candidate)})` })
                if (matches.length > 0) return matches[0]
            } catch { /* try next alias */ }
        }
    }

    return null
}

async function buildProductAliasMap() {
    const products = await db.getAllRecords('products', {})
    const aliasMap = {}
    for (const product of products) {
        const canonicalId = String(product.id || product.Id || '').trim()
        if (!canonicalId) continue
        for (const alias of productAliases(product)) {
            aliasMap[alias] = canonicalId
        }
    }
    return aliasMap
}

let branchAliasCache = null

async function buildBranchAliasMap() {
    if (branchAliasCache) return branchAliasCache

    const aliasToCanonical = {}
    const canonicalToAliases = {}

    try {
        const branches = await db.getAllRecords('branches', {})
        for (const branch of branches || []) {
            const canonical = String(branch.code || branch.name || branch.id || branch.Id || '').trim()
            if (!canonical) continue

            const aliases = [
                branch.id,
                branch.Id,
                branch.code,
                branch.name,
            ].map(v => String(v || '').trim()).filter(Boolean)

            if (!canonicalToAliases[canonical]) canonicalToAliases[canonical] = new Set()
            canonicalToAliases[canonical].add(canonical)

            for (const alias of aliases) {
                aliasToCanonical[alias] = canonical
                canonicalToAliases[canonical].add(alias)
            }
        }
    } catch (err) {
        console.warn('[Data] Could not build branch alias map:', err.message)
    }

    branchAliasCache = {
        aliasToCanonical,
        canonicalToAliases: Object.fromEntries(
            Object.entries(canonicalToAliases).map(([key, values]) => [key, [...values]])
        )
    }
    return branchAliasCache
}

async function normalizeBranchId(value) {
    const raw = String(value || '').trim()
    if (!raw || raw === 'all') return raw
    const branchMap = await buildBranchAliasMap()
    return branchMap.aliasToCanonical[raw] || raw
}

async function getBranchAliases(value) {
    const canonical = await normalizeBranchId(value)
    if (!canonical || canonical === 'all') return []
    const branchMap = await buildBranchAliasMap()
    return branchMap.canonicalToAliases[canonical] || [canonical]
}

async function deleteStockLedgersForDoc(docNo) {
    if (!docNo) return 0
    const existing = await db.getAllRecords('stock_ledgers', { where: `(reference_doc,eq,${safeWhereValue(docNo)})` })
    for (const row of existing) {
        await db.deleteRecord('stock_ledgers', row.id)
    }
    return existing.length
}

async function recalculateAverageCost(productIds) {
    const uniqueIds = [...new Set(productIds.map(id => String(id || '')).filter(Boolean))]
    for (const productId of uniqueIds) {
        try {
            const product = await db.getRecord('products', productId)
            const ledgers = await db.getAllRecords('stock_ledgers', { where: `(product_id,eq,${safeWhereValue(productId)})` })
            const sortedLedgers = ledgers.sort((a, b) => {
                const aTime = new Date(a.CreatedAt || a.created_at || 0).getTime()
                const bTime = new Date(b.CreatedAt || b.created_at || 0).getTime()
                return aTime - bTime
            })

            let qty = 0
            let value = 0
            for (const ledger of sortedLedgers) {
                const ledgerQty = asNumber(ledger.qty, 0)
                const ledgerValue = asNumber(ledger.total_value, 0)
                if (ledgerQty > 0 && ['IN', 'ADJ'].includes(String(ledger.transaction_type || '').toUpperCase())) {
                    qty += ledgerQty
                    value += ledgerValue
                } else if (ledgerQty < 0) {
                    const avg = qty > 0 ? value / qty : 0
                    qty += ledgerQty
                    value += ledgerQty * avg
                }
                if (qty <= 0) {
                    qty = 0
                    value = 0
                }
            }

            if (qty <= 0) continue
            const newCost = Math.round((value / qty) * 100) / 100
            if (Math.abs(newCost - asNumber(product.cost, 0)) > 0.01) {
                await db.updateRecord('products', productId, { cost: newCost })
            }
        } catch (err) {
            console.warn(`[Data] Failed to recalculate average cost for product ${productId}: ${err.message}`)
        }
    }
}

async function postDocumentStockLedgers(doc, items) {
    const docType = String(doc.doc_type || '').toUpperCase()
    const docNo = doc.doc_no || String(doc.id)
    const branchId = await normalizeBranchId(doc.branch_id || '')
    const destinationBranch = await normalizeBranchId(doc.destination_branch_id || '')

    const noStockTypes = new Set(['PIV', 'PI', 'PCN', 'IV', 'QT', 'RC', 'CN', 'PAY', 'WT'])
    if (noStockTypes.has(docType)) {
        await deleteStockLedgersForDoc(docNo)
        return { posted: 0, skipped: true }
    }

    const validStockTypes = new Set(['RR', 'RQ', 'RE', 'TF', 'SA', 'JOB'])
    if (!validStockTypes.has(docType)) {
        await deleteStockLedgersForDoc(docNo)
        return { posted: 0, skipped: true }
    }

    const productMap = {}
    for (const item of items || []) {
        const productKey = String(item.product_id || '').trim()
        if (!productKey || productMap[productKey]) continue
        const product = await resolveProductFromStockItem(item)
        if (product) {
            productMap[productKey] = product
        } else {
            console.warn(`[Data] Document ${docNo}: product ${productKey} not found`)
        }
    }

    const ledgerItems = items
        .filter(item => item.product_id && asNumber(item.qty, 0) !== 0)
        .filter(item => isStockTrackedProduct(productMap[item.product_id]))

    await deleteStockLedgersForDoc(docNo)

    let posted = 0
    const touchedProducts = new Set()
    for (const item of ledgerItems) {
        const product = productMap[item.product_id]
        const qty = asNumber(item.qty, 0)
        if (!product || qty === 0) continue
        const canonicalProductId = String(product.id || product.Id || item.product_id)

        let transactionType = 'ADJ'
        let ledgerQty = qty
        let unitCost = getItemPrice(item)

        if (docType === 'RR' || docType === 'RE') {
            transactionType = 'IN'
            ledgerQty = Math.abs(qty)
        } else if (docType === 'RQ' || docType === 'JOB') {
            transactionType = 'OUT'
            ledgerQty = -Math.abs(qty)
            unitCost = asNumber(product.cost, 0)
        } else if (docType === 'TF') {
            unitCost = asNumber(product.cost, 0)
        } else if (docType === 'SA') {
            transactionType = 'ADJ'
            ledgerQty = qty
            unitCost = asNumber(item.cost ?? product.cost ?? getItemPrice(item), 0)
        }

        if (docType === 'TF') {
            const outQty = -Math.abs(qty)
            await db.createRecord('stock_ledgers', {
                transaction_no: `LEDGER-${crypto.randomUUID()}`,
                transaction_type: 'OUT',
                product_id: canonicalProductId,
                warehouse_location: 'Main',
                qty: outQty,
                unit_cost: unitCost,
                total_value: outQty * unitCost,
                reference_doc: docNo,
                branch_id: branchId
            })
            posted++

            if (destinationBranch) {
                const inQty = Math.abs(qty)
                await db.createRecord('stock_ledgers', {
                    transaction_no: `LEDGER-${crypto.randomUUID()}`,
                    transaction_type: 'IN',
                    product_id: canonicalProductId,
                    warehouse_location: 'Main',
                    qty: inQty,
                    unit_cost: unitCost,
                    total_value: inQty * unitCost,
                    reference_doc: docNo,
                    branch_id: destinationBranch
                })
                posted++
            }
        } else {
            await db.createRecord('stock_ledgers', {
                transaction_no: `LEDGER-${crypto.randomUUID()}`,
                transaction_type: transactionType,
                product_id: canonicalProductId,
                warehouse_location: 'Main',
                qty: ledgerQty,
                unit_cost: unitCost,
                total_value: ledgerQty * unitCost,
                reference_doc: docNo,
                branch_id: branchId
            })
            posted++
        }
        touchedProducts.add(canonicalProductId)
    }

    if (docType === 'RR' || docType === 'RE') {
        await recalculateAverageCost([...touchedProducts])
    }

    return { posted, skipped: false }
}

async function buildValidationBody(table, body, existingId = null) {
    if (table.toLowerCase() !== 'document_items' || Number(body.qty) >= 0) {
        return body
    }

    let documentId = body.document_id
    if (!documentId && existingId) {
        try {
            const existingItem = await db.getRecord('document_items', existingId)
            documentId = existingItem?.document_id
        } catch { /* use default validation */ }
    }

    if (!documentId) return body

    try {
        const parentDoc = await db.getRecord('documents', documentId)
        if (String(parentDoc?.doc_type || '').toUpperCase() === 'SA') {
            return { ...body, qty: Math.abs(Number(body.qty)) }
        }
    } catch { /* use default validation */ }

    return body
}

// All data routes require authentication
router.use(requireAuth)

// BUG 21 FIX: Strip sensitive fields from responses based on role
function stripSensitiveFields(table, items, role) {
    if (!items) return items;
    const isPrivileged = ['admin', 'owner', 'manager'].includes(role);
    
    const arr = Array.isArray(items) ? items : [items];
    
    if (table.toLowerCase() === 'products' && !isPrivileged) {
        arr.forEach(item => {
            delete item.cost;
        });
    }
    
    if (table.toLowerCase() === 'users' && !isPrivileged) {
        arr.forEach(item => {
            delete item.pin;
            delete item.password;
        });
    }
    
    return items;
}

function userBranchOf(user) {
    return String(user?.branch || user?.branch_id || '').trim()
}

function isMechanicAssignable(user) {
    const role = String(user?.role || '').toLowerCase()
    return ['mechanic', 'employee', 'technician'].includes(role) || /mechanic|technician|employee|ช่าง/i.test(role)
}

function filterUserDirectoryForRequester(items, requester) {
    if (!Array.isArray(items)) return items
    const role = requester?.role || ''
    if (['admin', 'owner'].includes(role)) return items
    const requesterBranch = String(requester?.branch || '').trim()
    if (!requesterBranch || requesterBranch === 'all') return items
    return items.filter(item => {
        const itemBranch = userBranchOf(item)
        return !itemBranch || itemBranch === requesterBranch
    })
}

async function assertJobMechanicsBelongToBranch(payload, targetBranch) {
    const branch = String(targetBranch || '').trim()
    if (!branch) return

    const ids = [
        payload.lead_mechanic_id,
        ...String(payload.helper_mechanic_ids || '')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean)
    ].filter(Boolean)

    for (const id of [...new Set(ids)]) {
        const user = await db.getRecord('users', id)
        if (!user || !isMechanicAssignable(user)) {
            throw Object.assign(new Error('Selected mechanic is not a mechanic/employee user'), { status: 400 })
        }
        const userBranch = userBranchOf(user)
        if (!userBranch || userBranch !== branch) {
            throw Object.assign(new Error('Selected mechanic belongs to another branch'), { status: 403 })
        }
    }
}

/**
 * Branch enforcement middleware.
 * For non-admin/owner users, inject branch_id filters on operational tables.
 * Customer and vehicle masters are intentionally global so an SA can find
 * returning customers and vehicle history across branches.
 */
const BRANCH_SCOPED_TABLES = ['jobs', 'job_items', 'documents', 'document_items', 'stock_ledgers', 'hr_attendance', 'hr_leaves', 'financial_ledger', 'transactions']
const BRANCH_AWARE_MASTER_TABLES = ['customers', 'vehicles']

router.use((req, res, next) => {
    const { role, branch } = req.user || {}

    // Admin and owner see everything
    if (!role || ['admin', 'owner'].includes(role)) return next()

    // Only enforce on branch-scoped tables
    const table = req.params.table?.toLowerCase()
    if (!table || !BRANCH_SCOPED_TABLES.includes(table)) return next()

    // If user has a specific branch (not 'all'), inject filter
    if (branch && branch !== 'all') {
        // BUG 59 FIX: Sanitize branch value from JWT — strip only dangerous SQL/injection chars.
        // BUG 3 FIX: Previous regex [^a-zA-Z0-9_\-] stripped ALL Thai characters, breaking branch
        // isolation for Thai branch names like "สามชุก". Branch comes from server-signed JWT so
        // it is already trusted — we only need to strip actual injection chars.
        const safeBranch = String(branch).replace(/['";<>\\]/g, '')
        const branchClause = `(branch_id,eq,${safeBranch})`
        if (req.query.where) {
            // BUG 11 FIX: Wrap original where clause in parens to prevent filter injection
            req.query.where = `(${req.query.where})~and${branchClause}`
        } else {
            req.query.where = branchClause
        }
    }

    next()
})

/**
 * Role-based table access control (RBAC).
 * Financial/sensitive tables are restricted to owner, manager, and admin roles.
 * SA and mechanic users receive 403 Forbidden.
 */
const FINANCIAL_TABLES = [
    'transactions', 'financial_entries', 'financial_ledger', 'revenue', 'expenses',
    'documents', 'document_items', 'audit_logs'
]

const ADMIN_ONLY_TABLES = ['system_settings', 'system_roles', 'users']

router.use((req, res, next) => {
    const { role } = req.user || {}
    const table = req.params.table?.toLowerCase()
    if (!table || !role) return next()

    // Financial tables: owner/manager/admin only
    if (FINANCIAL_TABLES.includes(table)) {
        if (!['owner', 'manager', 'admin'].includes(role)) {
            // BUG 17 FIX: Allow SA to POST financial_ledger entries
            const isSA_POST_LEDGER = role === 'sa' && req.method === 'POST' && table === 'financial_ledger';
            // BUG 38 FIX: Allow SA to GET documents (quotations, invoices for job reference)
            const isSA_READ_DOC = role === 'sa' && req.method === 'GET' && table === 'documents';
            // BUG 9 FIX: Allow SA to POST documents (create quotations/invoices at POS)
            const isSA_CREATE_DOC = role === 'sa' && req.method === 'POST' && table === 'documents';
            const isSA_UPDATE_DOC = role === 'sa' && req.method === 'PATCH' && table === 'documents';
            // BUG 10 FIX: Allow SA to manage document_items for draft stock/sales documents
            const isSA_DOC_ITEMS = role === 'sa' && ['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method) && table === 'document_items';
            if (!isSA_POST_LEDGER && !isSA_READ_DOC && !isSA_CREATE_DOC && !isSA_UPDATE_DOC && !isSA_DOC_ITEMS) {
                return res.status(403).json({
                    error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
                    detail: `Role "${role}" cannot access "${table}"`
                })
            }
        }
    }

    // BUG 36 FIX: Admin-only tables — owner should also have full access
    if (ADMIN_ONLY_TABLES.includes(table) && !['admin', 'owner'].includes(role)) {
        const isBranchStaffLookup = table === 'users' && req.method === 'GET'
        if (isBranchStaffLookup) return next()
        return res.status(403).json({
            error: 'เฉพาะผู้ดูแลระบบ/เจ้าของเท่านั้น',
            detail: `Role "${role}" cannot access "${table}"`
        })
    }

    next()
})

/**
 * BUG 13 & 16 FIX: Server-side aggregation for stock balances to prevent client OOM
 * GET /api/data/custom/stock-balances
 */
router.get('/custom/stock-balances', async (req, res) => {
    try {
        const { role, branch } = req.user || {};

        // BUG 48 FIX: Branch-scoped stock balances — non-admin/owner only see their branch
        let whereClause = undefined;
        const isGlobal = ['admin', 'owner'].includes(role);
        const requestedBranch = req.query.branch_id || req.query.branch || '';
        const targetBranch = (!isGlobal && branch && branch !== 'all') ? branch : requestedBranch;
        const normalizedTargetBranch = await normalizeBranchId(targetBranch);
        const branchAliases = normalizedTargetBranch && normalizedTargetBranch !== 'all'
            ? await getBranchAliases(normalizedTargetBranch)
            : [];

        if (branchAliases.length === 1) {
            whereClause = `(branch_id,eq,${safeWhereValue(branchAliases[0])})`;
        } else if (branchAliases.length > 1) {
            whereClause = `(${branchAliases.map(alias => `(branch_id,eq,${safeWhereValue(alias)})`).join('~or')})`;
        }

        let ledgers = [];
        try {
            ledgers = await db.getAllRecords('stock_ledgers', { where: whereClause });
        } catch (err) {
            if (!whereClause) throw err;
            console.warn('[Data] Could not filter stock balances by branch aliases; falling back to all ledgers:', err.message);
            ledgers = await db.getAllRecords('stock_ledgers', {});
        }

        const [productAliasMap, branchAliasMap] = await Promise.all([
            buildProductAliasMap().catch(err => {
                console.warn('[Data] Could not build product alias map for stock balances:', err.message)
                return {}
            }),
            buildBranchAliasMap()
        ]);
        const stockMap = {};
        for (const l of ledgers) {
            if (normalizedTargetBranch && normalizedTargetBranch !== 'all') {
                const ledgerBranch = String(l.branch_id || '').trim();
                const ledgerCanonicalBranch = branchAliasMap.aliasToCanonical[ledgerBranch] || ledgerBranch;
                if (ledgerCanonicalBranch !== normalizedTargetBranch) continue;
            }
            const canonicalProductId = productAliasMap[String(l.product_id || '').trim()] || l.product_id
            if (!canonicalProductId) continue
            if (!stockMap[canonicalProductId]) {
                stockMap[canonicalProductId] = { qty: 0, total_value: 0 };
            }
            stockMap[canonicalProductId].qty += asNumber(l.qty, 0);
            stockMap[canonicalProductId].total_value += asNumber(l.total_value, 0);
        }
        res.json(stockMap);
    } catch (err) {
        console.error(`[Data] Custom Stock Balances:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * BUG 84 FIX: Atomic Upsert for Customers to prevent duplicate race conditions
 * POST /api/data/custom/upsert-customer
 */
router.post('/custom/upsert-customer', async (req, res) => {
    try {
        // BUG 46 FIX: Block mechanic role from creating customers
        if (req.user?.role === 'mechanic') {
            return res.status(403).json({ error: 'ช่างไม่มีสิทธิ์สร้างลูกค้า' })
        }
        const { phone, name, cust_code, branch_id } = req.body;
        if (!phone && !name) return res.status(400).json({ error: 'Phone or Name required' });
        const recordBranch = getRequestBranch(req, branch_id)

        // BUG 26 FIX: Match on BOTH phone AND name together to prevent false merges.
        // Customer master data is global: a customer from another branch should be reusable
        // when they visit the current branch.
        // Previously matched on phone OR name independently — two customers named "สมชาย"
        // with different phones would be incorrectly merged.
        let existing = [];
        if (phone && name) {
            // Prefer exact match on both fields
            existing = await db.getAllRecords('customers', { where: `(phone,eq,${safeWhereValue(phone)})` });
            // If phone matched but name differs, treat as different customer (same phone, different person — rare but possible)
            if (existing.length > 0 && existing[0].name && existing[0].name.toLowerCase() !== name.toLowerCase()) {
                existing = []; // Do not merge different names even if phone matches
            }
        } else if (phone) {
            existing = await db.getAllRecords('customers', { where: `(phone,eq,${safeWhereValue(phone)})` });
        } else if (name) {
            existing = await db.getAllRecords('customers', { where: `(name,eq,${safeWhereValue(name)})` });
        }

        if (existing && existing.length > 0) {
            return res.json(existing[0]); // Return existing, don't create duplicate
        }

        // Create new
        const record = await createWithOptionalBranch('customers', { phone, name, cust_code }, recordBranch);
        res.status(201).json(record);
    } catch (err) {
        console.error(`[Data] Upsert Customer:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * BUG 85 FIX: Atomic Upsert for Vehicles to prevent duplicate race conditions
 * POST /api/data/custom/upsert-vehicle
 */
router.post('/custom/upsert-vehicle', async (req, res) => {
    try {
        // BUG 46 FIX: Block mechanic role from creating vehicles independently
        if (req.user?.role === 'mechanic') {
            return res.status(403).json({ error: 'ช่างไม่มีสิทธิ์เพิ่มยานพาหนะ' })
        }
        const { plate_number, model, color, mileage, vin, customer_id, branch_id } = req.body;
        if (!plate_number) return res.status(400).json({ error: 'Plate number required' });
        const recordBranch = getRequestBranch(req, branch_id)

        // Vehicle master data is global so SAs can locate existing vehicle details
        // and history when a customer visits another branch.
        const existing = await db.getAllRecords('vehicles', { where: `(plate_number,eq,${safeWhereValue(plate_number)})` });
        if (existing && existing.length > 0) {
            // Update existing with new mileage/customer_id if provided
            const updates = {};
            if (mileage) updates.mileage = mileage;
            if (customer_id) updates.customer_id = customer_id;
            if (color) updates.color = color;
            
            if (Object.keys(updates).length > 0) {
                const updated = await updateWithOptionalBranch('vehicles', existing[0].id, updates);
                return res.json(updated);
            }
            return res.json(existing[0]);
        }

        const record = await createWithOptionalBranch('vehicles', req.body, recordBranch);
        res.status(201).json(record);
    } catch (err) {
        console.error(`[Data] Upsert Vehicle:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * BUG 3 FIX: Atomic Document ID Generator
 * GET /api/data/custom/generate-doc-id
 */
router.get('/custom/generate-doc-id', async (req, res) => {
    try {
        const { prefix, table, field } = req.query;
        if (!prefix) return res.status(400).json({ error: 'Prefix required' });

        if (!table && !field) {
            return res.json({ doc_no: await generateDocumentNo(prefix) })
        }

        // Generic: specify table+field to generate codes for any collection (e.g. customers)
        const targetTable = table || 'documents';
        const targetField = field || 'doc_no';
        const filterByDocType = !table; // only restrict by doc_type for the documents table

        const records = await db.getAllRecords(targetTable, {});
        let maxInt = 0;
        for (const rec of records) {
            const val = rec[targetField];
            if (!val) continue;
            if (filterByDocType && rec.doc_type !== prefix) continue;
            const match = String(val).match(new RegExp(`^${prefix}-(\\d+)`));
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxInt) maxInt = num;
            }
        }

        const nextId = `${prefix}-${String(maxInt + 1).padStart(5, '0')}`;
        res.json({ doc_no: nextId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/data/:table — List with filter/sort/pagination
 * Query params: where, sort, fields, limit, offset
 */
/**
 * POST /api/data/custom/confirm-document/:id
 * Confirms one document and posts stock ledgers server-side for RR/RQ/RE/TF/SA.
 */
router.post('/custom/void-document/:id', async (req, res) => {
    try {
        const { id } = req.params
        const role = req.user?.role || ''
        if (!['admin', 'owner', 'manager', 'sa'].includes(role)) {
            return res.status(403).json({ error: 'Role cannot void documents' })
        }

        const doc = await db.getRecord('documents', id)
        if (!doc) return res.status(404).json({ error: 'Document not found' })

        const docType = String(doc.doc_type || '').toUpperCase()
        const saAllowedTypes = new Set(['RR', 'RQ', 'RE', 'TF', 'SA', 'QT', 'IV', 'RC'])
        if (role === 'sa' && !saAllowedTypes.has(docType)) {
            return res.status(403).json({ error: 'SA cannot void this document type' })
        }

        if (req.user.branch && req.user.branch !== 'all' && doc.branch_id && String(doc.branch_id) !== String(req.user.branch)) {
            return res.status(403).json({ error: 'Document belongs to another branch' })
        }
        if (doc.status === 'paid') {
            return res.status(403).json({ error: 'Paid documents cannot be voided' })
        }
        if (doc.status === 'voided') {
            return res.json({ document: doc, ledger: { deleted: 0, skipped: true }, alreadyVoided: true })
        }

        const docNo = doc.doc_no || String(id)
        const ledgers = await db.getAllRecords('stock_ledgers', { where: `(reference_doc,eq,${safeWhereValue(docNo)})` })
        const touchedProducts = [...new Set(ledgers.map(l => l.product_id).filter(Boolean))]
        for (const ledger of ledgers) {
            await db.deleteRecord('stock_ledgers', ledger.id)
        }
        if (['RR', 'RE'].includes(docType)) {
            await recalculateAverageCost(touchedProducts)
        }

        const updated = await db.updateRecord('documents', id, { status: 'voided' })
        try {
            await db.createRecord('audit_logs', {
                action: 'void',
                collection_name: 'documents',
                user_name: req.user.name,
                details: `Voided document ${doc.doc_no || id}; stock ledgers deleted: ${ledgers.length}`,
                timestamp: new Date().toISOString()
            })
        } catch { /* best-effort */ }

        res.json({ document: updated, ledger: { deleted: ledgers.length, skipped: false } })
    } catch (err) {
        console.error(`[Data] Void Document ${req.params.id}:`, err.message)
        res.status(err.status || 500).json({ error: err.message })
    }
})

router.post('/custom/confirm-document/:id', async (req, res) => {
    try {
        const { id } = req.params
        const role = req.user?.role || ''
        if (!['admin', 'owner', 'manager', 'sa'].includes(role)) {
            return res.status(403).json({ error: 'Role cannot confirm documents' })
        }

        const doc = await db.getRecord('documents', id)
        if (!doc) return res.status(404).json({ error: 'Document not found' })

        const docType = String(doc.doc_type || '').toUpperCase()
        const stockDocTypes = new Set(['RR', 'RQ', 'RE', 'TF', 'SA'])
        const saAllowedTypes = new Set(['RR', 'RQ', 'RE', 'TF', 'SA', 'QT', 'IV', 'RC'])
        if (role === 'sa' && !saAllowedTypes.has(docType)) {
            return res.status(403).json({ error: 'SA cannot confirm this document type' })
        }

        if (req.user.branch && req.user.branch !== 'all' && doc.branch_id && String(doc.branch_id) !== String(req.user.branch)) {
            return res.status(403).json({ error: 'Document belongs to another branch' })
        }

        if (doc.status === 'confirmed') {
            return res.json({ document: doc, ledger: { posted: 0, skipped: true }, alreadyConfirmed: true })
        }
        if (['paid', 'voided'].includes(doc.status)) {
            return res.status(403).json({ error: 'Paid or voided documents cannot be confirmed' })
        }
        if (docType === 'TF' && !doc.destination_branch_id) {
            return res.status(400).json({ error: 'Transfer destination branch is required' })
        }

        const items = await db.getAllRecords('document_items', { where: `(document_id,eq,${safeWhereValue(id)})` })
        if (stockDocTypes.has(docType) && items.length === 0) {
            return res.status(400).json({ error: 'Stock document must have at least one item' })
        }

        let ledgerResult = { posted: 0, skipped: true }
        try {
            ledgerResult = await postDocumentStockLedgers(doc, items)
            const updated = await db.updateRecord('documents', id, { status: 'confirmed' })
            try {
                await db.createRecord('audit_logs', {
                    action: 'confirm',
                    collection_name: 'documents',
                    user_name: req.user.name,
                    details: `Confirmed document ${doc.doc_no || id}; stock ledgers posted: ${ledgerResult.posted}`,
                    timestamp: new Date().toISOString()
                })
            } catch { /* best-effort */ }
            res.json({ document: updated, ledger: ledgerResult })
        } catch (err) {
            await deleteStockLedgersForDoc(doc.doc_no || String(id)).catch(() => {})
            throw err
        }
    } catch (err) {
        console.error(`[Data] Confirm Document ${req.params.id}:`, err.message)
        res.status(err.status || 500).json({ error: err.message })
    }
})

router.get('/:table', async (req, res) => {
    try {
        const { table } = req.params
        const { where, sort, fields, limit = '25', offset = '0' } = req.query

        const result = await db.listRecords(table, {
            where, sort, fields,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10)
        })

        const responseItems = table.toLowerCase() === 'users'
            ? filterUserDirectoryForRequester(result.items, req.user)
            : result.items

        // Return in PocketBase-compatible format for adapter
        res.json({
            items: stripSensitiveFields(table, responseItems, req.user?.role),
            totalItems: table.toLowerCase() === 'users' ? responseItems.length : result.totalRows,
            page: Math.floor(parseInt(offset, 10) / parseInt(limit, 10)) + 1,
            perPage: parseInt(limit, 10),
            totalPages: Math.ceil((table.toLowerCase() === 'users' ? responseItems.length : result.totalRows) / parseInt(limit, 10))
        })
    } catch (err) {
        console.error(`[Data] List ${req.params.table}:`, err.message)
        res.status(err.status || 500).json({ error: err.message })
    }
})

/**
 * GET /api/data/:table/all — Get ALL records (for dropdowns, selects)
 */
router.get('/:table/all', async (req, res) => {
    try {
        const { table } = req.params
        const { where, sort, fields } = req.query

        const items = await db.getAllRecords(table, { where, sort, fields })
        const responseItems = table.toLowerCase() === 'users'
            ? filterUserDirectoryForRequester(items, req.user)
            : items
        res.json(stripSensitiveFields(table, responseItems, req.user?.role))
    } catch (err) {
        console.error(`[Data] GetAll ${req.params.table}:`, err.message)
        res.status(err.status || 500).json({ error: err.message })
    }
})

/**
 * GET /api/data/:table/:id — Get single record
 */
router.get('/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params

        // BUG 12 FIX: Branch Isolation on GET
        if (req.user.branch && req.user.branch !== 'all' && BRANCH_SCOPED_TABLES.includes(table.toLowerCase())) {
            const record = await db.getRecord(table, id);
            if (record.branch_id && String(record.branch_id) !== String(req.user.branch)) {
                return res.status(403).json({ error: 'ข้อมูลนี้อยู่ต่างสาขา ไม่สามารถเข้าถึงได้' });
            }
            return res.json(stripSensitiveFields(table, record, req.user?.role));
        }

        const record = await db.getRecord(table, id)
        res.json(stripSensitiveFields(table, record, req.user?.role))
    } catch (err) {
        console.error(`[Data] Get ${req.params.table}/${req.params.id}:`, err.message)
        res.status(err.status || 500).json({ error: err.message })
    }
})

/**
 * POST /api/data/:table — Create record
 */
router.post('/:table', async (req, res) => {
    try {
        const { table } = req.params

        // Protected tables require admin/owner/manager
        if (isProtectedTable(table)) {
            if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
                return res.status(403).json({ error: `Only admin/owner can modify "${table}"` })
            }
        }

        // BUG 45 FIX: Privilege Escalation Guard
        // Block non-admin users from creating or assigning the 'admin' role to any user account.
        if (table.toLowerCase() === 'users' && req.body.role === 'admin') {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'เฉพาะ Admin เท่านั้นที่สามารถสร้างบัญชีระดับ Admin ได้' });
            }
        }

        // Validate input
        const validationBody = await buildValidationBody(table, req.body)
        const errors = validateCreate(table, validationBody)
        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors })
        }

        let payload = { ...req.body }
        if (table.toLowerCase() === 'users') {
            const pinError = normalizeUserPinPayload(payload)
            if (pinError) return res.status(400).json({ error: pinError })
        }

        // SYSTEMATIC FIX: "กำลังสร้าง..." Bug (Auto-generate job_no server-side)
        if (table.toLowerCase() === 'jobs' && (payload.job_no === 'กำลังสร้าง...' || !payload.job_no)) {
            const records = await db.getAllRecords('jobs', {});
            let maxInt = 0;
            for (const rec of records) {
                const val = rec.job_no;
                if (!val) continue;
                const match = String(val).match(/^JOB-(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxInt) maxInt = num;
                }
            }
            payload.job_no = `JOB-${String(maxInt + 1).padStart(5, '0')}`;
        }

        // BUG 39 FIX: Amount cap for SA financial_ledger entries to prevent large unauthorized postings
        if (table.toLowerCase() === 'financial_ledger' && req.user?.role === 'sa') {
            const amount = Number(payload.amount || 0)
            if (Math.abs(amount) > 10000) {
                return res.status(403).json({ error: 'SA ไม่สามารถบันทึกรายการเกิน 10,000 บาท' })
            }
        }

        // BACKEND BUSINESS LOGIC: Credit Limit Cap
        if (table.toLowerCase() === 'customers' && payload.credit_limit !== undefined) {
            payload.credit_limit = Math.max(0, Math.min(50000, Number(payload.credit_limit) || 0));
        }

        // BACKEND BUSINESS LOGIC: Status Enum Validation
        if (table.toLowerCase() === 'jobs' && payload.status) {
            const validStatuses = ['pending', 'in_progress', 'qc_done', 'completed', 'voided', 'cancelled'];
            if (!validStatuses.includes(payload.status)) {
                return res.status(400).json({ error: 'สถานะใบงานไม่ถูกต้อง' });
            }
        }
        if (table.toLowerCase() === 'documents' && payload.status) {
            const validStatuses = ['draft', 'confirmed', 'paid', 'voided'];
            if (!validStatuses.includes(payload.status)) {
                return res.status(400).json({ error: 'สถานะเอกสารไม่ถูกต้อง' });
            }
        }

        // BACKEND BUSINESS LOGIC: Backdate Protection
        if (table.toLowerCase() === 'jobs' && payload.start_date) {
            if (!['admin', 'owner'].includes(req.user.role)) {
                payload.start_date = new Date().toISOString().slice(0, 10);
            }
        }
        if (table.toLowerCase() === 'documents' && payload.issue_date) {
            if (!['admin', 'owner'].includes(req.user.role)) {
                payload.issue_date = new Date().toISOString().slice(0, 10);
            }
        }

        // BACKEND BUSINESS LOGIC: Phantom Inventory Protection
        if (table.toLowerCase() === 'stock_adjusts' || table.toLowerCase() === 'stock_ledgers') {
            if (payload.type === 'adjust' && (!payload.reason || String(payload.reason).trim() === '')) {
                return res.status(400).json({ error: 'ต้องระบุเหตุผลในการปรับปรุงสต็อก (Reason is required)' });
            }
        }

        // BACKEND BUSINESS LOGIC: Prevent Negative Discount Exploit
        if (payload.discount !== undefined) {
            payload.discount = Math.max(0, Number(payload.discount) || 0);
        }
        
        // BUG 15 FIX: Branch Spoofing Protection
        if (BRANCH_SCOPED_TABLES.includes(table.toLowerCase())) {
            if (req.user.branch && req.user.branch !== 'all') {
                payload.branch_id = req.user.branch; // Force override to user's branch
            }
        } else if (BRANCH_AWARE_MASTER_TABLES.includes(table.toLowerCase())) {
            if (req.user.branch && req.user.branch !== 'all' && !payload.branch_id) {
                payload.branch_id = req.user.branch; // Remember first-created branch without limiting lookup
            }
        }

        if (table.toLowerCase() === 'jobs') {
            await assertJobMechanicsBelongToBranch(payload, payload.branch_id || req.user.branch)
        }

        // BACKEND BUSINESS LOGIC: Prevent Cost Spoofing
        if ((table.toLowerCase() === 'job_items' || table.toLowerCase() === 'document_items') && payload.product_id && payload.type !== 'adhoc') {
            try {
                const prod = await db.getRecord('products', payload.product_id);
                if (prod && prod.cost !== undefined) {
                    payload.cost = prod.cost;
                }
            } catch (e) {
                console.warn(`[Data] Failed to verify product cost for ID: ${payload.product_id}`);
            }
        }

        // BUG 22 & 24 FIX: Secure Payload Overrides
        if (table.toLowerCase() === 'hr_leaves') {
            payload.status = 'pending'; // Enforce pending status
        }
        if (table.toLowerCase() === 'hr_attendance') {
            // Only admin/manager can backdate, otherwise force server time
            if (!['admin', 'manager', 'owner'].includes(req.user.role)) {
                payload.timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
            }
        }

        if (table.toLowerCase() === 'users') {
            const crypto = await import('crypto');
            const sha256 = (input) => crypto.createHash('sha256').update(input, 'utf8').digest('hex');
            
            if (payload.password) {
                payload.password_hash = sha256(payload.password);
                delete payload.password;
                delete payload.passwordConfirm;
            }
            if (payload.pin && payload.pin.length < 64) {
                payload.pin = sha256(payload.pin);
            }
            // Ensure username is set
            if (!payload.username && payload.email) {
                payload.username = payload.email.split('@')[0];
            }
        }

        // INTEGRITY: Unique product code
        if (table.toLowerCase() === 'products' && payload.code) {
            const existing = await db.getAllRecords('products', {
                where: `(code,eq,${safeWhereValue(payload.code)})`
            })
            if (existing.length > 0) {
                return res.status(400).json({
                    error: `รหัสสินค้า "${payload.code}" มีอยู่แล้วในระบบ`,
                    conflicting_id: existing[0].id
                })
            }
        }

        if (table.toLowerCase() === 'documents') {
            if (payload.branch_id) payload.branch_id = await normalizeBranchId(payload.branch_id)
            if (payload.destination_branch_id) payload.destination_branch_id = await normalizeBranchId(payload.destination_branch_id)
            await ensureCreateDocumentNo(payload)
        }

        const record = await db.createRecord(table, payload)
        const fullRecord = await db.getRecord(table, record.id).catch(() => record)

        // Audit log (skip audit_logs to prevent loops)
        if (table.toLowerCase() !== 'audit_logs') {
            try {
                await db.createRecord('audit_logs', {
                    action: 'create',
                    collection_name: table,
                    user_name: req.user.name,
                    details: `Created record in ${table} (id: ${record.id})`,
                    timestamp: new Date().toISOString()
                })
            } catch { /* best-effort */ }
        }

        res.status(201).json(fullRecord)
    } catch (err) {
        console.error(`[Data] Create ${req.params.table}:`, err.message)
        res.status(err.status || 500).json({ error: err.message })
    }
})

/**
 * PATCH /api/data/:table/:id — Update record
 */
router.patch('/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params

        // BUG 45 FIX: Privilege Escalation Guard on PATCH
        // Block non-admin users from changing any user's role to 'admin'.
        if (table.toLowerCase() === 'users' && req.body.role === 'admin') {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'เฉพาะ Admin เท่านั้นที่สามารถกำหนด Role ระดับ Admin ได้' });
            }
        }

        // BUG 13 FIX: Branch Isolation on PATCH
        let record = null;
        const branchLockedTables = BRANCH_SCOPED_TABLES;
        if (req.user.branch && req.user.branch !== 'all' && branchLockedTables.includes(table.toLowerCase())) {
            record = await db.getRecord(table, id);
            if (record.branch_id && String(record.branch_id) !== String(req.user.branch)) {
                return res.status(403).json({ error: 'ข้อมูลนี้อยู่ต่างสาขา ไม่สามารถแก้ไขได้' });
            }
        }

        // BUG 11 FIX: Server-Side PATCH Locks for sealed records
        if (!['admin', 'owner'].includes(req.user.role)) {
            if (table.toLowerCase() === 'jobs') {
                if (!record) record = await db.getRecord(table, id);
                if (['completed', 'paid'].includes(record.status)) {
                    return res.status(403).json({ error: 'ไม่สามารถแก้ไขใบงานที่ปิดหรือชำระเงินแล้วได้' });
                }
            }
            if (table.toLowerCase() === 'documents') {
                if (!record) record = await db.getRecord(table, id);
                if (['confirmed', 'paid', 'voided'].includes(record.status)) {
                    return res.status(403).json({ error: 'ไม่สามารถแก้ไขเอกสารที่ยืนยันหรือยกเลิกแล้วได้' });
                }
            }
            if (table.toLowerCase() === 'document_items') {
                const itemToCheck = await db.getRecord('document_items', id);
                if (itemToCheck?.document_id) {
                    const parentDoc = await db.getRecord('documents', itemToCheck.document_id).catch(() => null);
                    if (parentDoc && ['confirmed', 'paid', 'voided'].includes(parentDoc.status)) {
                        return res.status(403).json({
                            error: 'ไม่สามารถแก้ไขรายการของเอกสารที่ยืนยันแล้ว',
                            documentStatus: parentDoc.status
                        });
                    }
                }
            }
        }

        if (isProtectedTable(table)) {
            if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
                return res.status(403).json({ error: `Only admin/owner can modify "${table}"` })
            }
        }

        const validationBody = await buildValidationBody(table, req.body, id)
        const errors = validateUpdate(table, validationBody)
        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors })
        }

        let payload = { ...req.body }
        if (table.toLowerCase() === 'users') {
            const pinError = normalizeUserPinPayload(payload)
            if (pinError) return res.status(400).json({ error: pinError })
        }

        // BACKEND BUSINESS LOGIC: Credit Limit Cap
        if (table.toLowerCase() === 'customers' && payload.credit_limit !== undefined) {
            payload.credit_limit = Math.max(0, Math.min(50000, Number(payload.credit_limit) || 0));
        }

        // BACKEND BUSINESS LOGIC: Status Enum Validation
        if (table.toLowerCase() === 'jobs' && payload.status) {
            const validStatuses = ['pending', 'in_progress', 'qc_done', 'completed', 'voided', 'cancelled'];
            if (!validStatuses.includes(payload.status)) {
                return res.status(400).json({ error: 'สถานะใบงานไม่ถูกต้อง' });
            }
        }
        if (table.toLowerCase() === 'documents' && payload.status) {
            const validStatuses = ['draft', 'confirmed', 'paid', 'voided'];
            if (!validStatuses.includes(payload.status)) {
                return res.status(400).json({ error: 'สถานะเอกสารไม่ถูกต้อง' });
            }
        }

        // BACKEND BUSINESS LOGIC: Prevent voiding of paid documents
        if (table.toLowerCase() === 'documents' && payload.status === 'voided') {
            if (!record) record = await db.getRecord(table, id);
            if (record.status === 'paid') {
                return res.status(403).json({ error: 'ไม่สามารถยกเลิกเอกสารที่ชำระเงินแล้วได้ กรุณาออกใบลดหนี้ (Credit Note)' });
            }
        }
        
        // BACKEND BUSINESS LOGIC: Backdate Protection
        if (table.toLowerCase() === 'jobs' && payload.start_date) {
            if (!['admin', 'owner'].includes(req.user.role)) {
                payload.start_date = new Date().toISOString().slice(0, 10);
            }
        }
        if (table.toLowerCase() === 'documents' && payload.issue_date) {
            if (!['admin', 'owner'].includes(req.user.role)) {
                payload.issue_date = new Date().toISOString().slice(0, 10);
            }
        }

        // BACKEND BUSINESS LOGIC: Prevent Negative Discount Exploit
        if (payload.discount !== undefined) {
            payload.discount = Math.max(0, Number(payload.discount) || 0);
        }

        if (table.toLowerCase() === 'jobs' && (payload.lead_mechanic_id !== undefined || payload.helper_mechanic_ids !== undefined || payload.branch_id !== undefined)) {
            if (!record) record = await db.getRecord(table, id)
            await assertJobMechanicsBelongToBranch(
                { ...record, ...payload },
                payload.branch_id || record.branch_id || req.user.branch
            )
        }

        // BACKEND BUSINESS LOGIC: Prevent Cost Spoofing
        if ((table.toLowerCase() === 'job_items' || table.toLowerCase() === 'document_items') && payload.product_id && payload.type !== 'adhoc') {
            try {
                const prod = await db.getRecord('products', payload.product_id);
                if (prod && prod.cost !== undefined) {
                    payload.cost = prod.cost;
                }
            } catch (e) {
                console.warn(`[Data] Failed to verify product cost for ID: ${payload.product_id}`);
            }
        }

        // BUG 27 FIX: Prevent unprivileged users from reopening completed jobs
        if (table.toLowerCase() === 'jobs' && payload.status) {
            const currentRecord = await db.getRecord(table, id);
            if (currentRecord.status === 'completed' && payload.status !== 'completed' && !['admin', 'manager', 'owner'].includes(req.user.role)) {
                return res.status(403).json({ error: 'ไม่สามารถเปลี่ยนสถานะใบงานที่ปิดแล้วได้' });
            }
        }
        if (table.toLowerCase() === 'users') {
            const crypto = await import('crypto');
            const sha256 = (input) => crypto.createHash('sha256').update(input, 'utf8').digest('hex');
            
            if (payload.password) {
                payload.password_hash = sha256(payload.password);
                delete payload.password;
                delete payload.passwordConfirm;
            }
            if (payload.pin && payload.pin.length < 64) {
                payload.pin = sha256(payload.pin);
            }
        }

        if (table.toLowerCase() === 'documents') {
            if (payload.branch_id) payload.branch_id = await normalizeBranchId(payload.branch_id)
            if (payload.destination_branch_id) payload.destination_branch_id = await normalizeBranchId(payload.destination_branch_id)
        }

        if (table.toLowerCase() === 'documents' && ['confirmed', 'voided'].includes(payload.status)) {
            if (!record) record = await db.getRecord(table, id)
            const docType = String(record.doc_type || '').toUpperCase()
            const stockDocTypes = new Set(['RR', 'RQ', 'RE', 'TF', 'SA'])

            if (payload.status === 'confirmed' && record.status !== 'confirmed' && stockDocTypes.has(docType)) {
                const items = await db.getAllRecords('document_items', { where: `(document_id,eq,${safeWhereValue(id)})` })
                if (items.length === 0) {
                    return res.status(400).json({ error: 'Stock document must have at least one item' })
                }
                await postDocumentStockLedgers({ ...record, ...payload }, items)
            }

            if (payload.status === 'voided' && record.status !== 'voided') {
                const docNo = record.doc_no || String(id)
                const ledgers = await db.getAllRecords('stock_ledgers', { where: `(reference_doc,eq,${safeWhereValue(docNo)})` })
                const touchedProducts = [...new Set(ledgers.map(l => l.product_id).filter(Boolean))]
                for (const ledger of ledgers) {
                    await db.deleteRecord('stock_ledgers', ledger.id)
                }
                if (['RR', 'RE'].includes(docType)) {
                    await recalculateAverageCost(touchedProducts)
                }
            }
        }

        record = await db.updateRecord(table, id, payload)

        if (table.toLowerCase() !== 'audit_logs') {
            try {
                await db.createRecord('audit_logs', {
                    action: 'update',
                    collection_name: table,
                    user_name: req.user.name,
                    details: `Updated record ${id} in ${table}: ${JSON.stringify(req.body).slice(0, 500)}`,
                    timestamp: new Date().toISOString()
                })
            } catch { /* best-effort */ }
        }

        res.json(record)
    } catch (err) {
        console.error(`[Data] Update ${req.params.table}/${req.params.id}:`, err.message)
        res.status(err.status || 500).json({ error: err.message })
    }
})

/**
 * DELETE /api/data/:table/:id — Delete record (restricted)
 */
router.delete('/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params

        let record = null;

        // Deletes normally require admin/owner/manager. SA can remove line items
        // only while the parent document is still draft/pending.
        if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
            if (req.user.role === 'sa' && table.toLowerCase() === 'document_items') {
                record = await db.getRecord(table, id)
                const parentDoc = record?.document_id ? await db.getRecord('documents', record.document_id) : null
                if (!parentDoc || ['confirmed', 'paid', 'voided'].includes(parentDoc.status)) {
                    return res.status(403).json({ error: 'Only draft document items can be deleted by SA' })
                }
                if (req.user.branch && req.user.branch !== 'all' && parentDoc.branch_id && String(parentDoc.branch_id) !== String(req.user.branch)) {
                    return res.status(403).json({ error: 'Document item belongs to another branch' })
                }
            } else {
                return res.status(403).json({ error: 'Only admin/owner/manager can delete records' })
            }
        }

        // BUG 14 FIX: Branch Isolation on DELETE
        const branchLockedTablesDelete = BRANCH_SCOPED_TABLES;
        if (branchLockedTablesDelete.includes(table.toLowerCase()) || table.toLowerCase() === 'jobs' || table.toLowerCase() === 'documents') {
            if (!record) record = await db.getRecord(table, id);
            if (req.user.branch && req.user.branch !== 'all') {
                if (record.branch_id && String(record.branch_id) !== String(req.user.branch)) {
                    return res.status(403).json({ error: 'ข้อมูลนี้อยู่ต่างสาขา ไม่สามารถลบได้' });
                }
            }
        }

        // BUG 49/51 FIX: Block Deletion of Completed/Paid Jobs to preserve Financial Ledgers
        if (table.toLowerCase() === 'jobs' && record) {
            if (record.status === 'completed' || record.payment_status === 'paid') {
                return res.status(403).json({ error: 'ไม่สามารถลบใบงานที่ชำระเงินหรือเสร็จสิ้นแล้วได้ (กระทบกระแสเงินสด)' });
            }
        }

        // INTEGRITY: Block delete on sealed documents
        if (table.toLowerCase() === 'documents' && record) {
            if (['confirmed', 'paid', 'voided'].includes(record.status)) {
                return res.status(403).json({
                    error: 'ไม่สามารถลบเอกสารที่ยืนยัน/ชำระเงิน/ยกเลิกแล้ว กรุณาออกใบลดหนี้หรือใช้ฟังก์ชัน Void',
                    status: record.status
                });
            }
        }

        let deletedDocumentLedgers = []
        if (table.toLowerCase() === 'documents' && record) {
            const docNo = record.doc_no || String(id)
            deletedDocumentLedgers = await db.getAllRecords('stock_ledgers', { where: `(reference_doc,eq,${safeWhereValue(docNo)})` }).catch(() => [])
        }

        await db.deleteRecord(table, id)

        // BUG 56 FIX: Cascade deletes for document_items and job_items to prevent orphaned rows
        if (table.toLowerCase() === 'documents') {
            try {
                const childItems = await db.getAllRecords('document_items', { where: `(document_id,eq,${id})` })
                for (const item of childItems) {
                    await db.deleteRecord('document_items', item.id)
                }
            } catch (e) { console.error('Cascade delete document_items failed', e.message) }
            try {
                for (const ledger of deletedDocumentLedgers) {
                    await db.deleteRecord('stock_ledgers', ledger.id)
                }
                if (record && ['RR', 'RE'].includes(String(record.doc_type || '').toUpperCase())) {
                    await recalculateAverageCost([...new Set(deletedDocumentLedgers.map(l => l.product_id).filter(Boolean))])
                }
            } catch (e) { console.error('Cascade delete stock_ledgers failed', e.message) }
        }
        if (table.toLowerCase() === 'jobs') {
            try {
                const childItems = await db.getAllRecords('job_items', { where: `(job_id,eq,${id})` })
                for (const item of childItems) {
                    await db.deleteRecord('job_items', item.id)
                }
            } catch (e) { console.error('Cascade delete job_items failed', e.message) }
        }

        if (table.toLowerCase() !== 'audit_logs') {
            try {
                await db.createRecord('audit_logs', {
                    action: 'delete',
                    collection_name: table,
                    user_name: req.user.name,
                    details: `Deleted record ${id} from ${table}`,
                    timestamp: new Date().toISOString()
                })
            } catch { /* best-effort */ }
        }

        res.json({ success: true })
    } catch (err) {
        console.error(`[Data] Delete ${req.params.table}/${req.params.id}:`, err.message)
        res.status(err.status || 500).json({ error: err.message })
    }
})

export default router
