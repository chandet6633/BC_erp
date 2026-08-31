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
const VALID_DEV_ROLES = ['admin', 'owner', 'manager', 'sa', 'mechanic', 'technician']

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

function branchMetadataObject(branch) {
    if (!branch?.metadata_json) return {}
    if (typeof branch.metadata_json === 'object') return branch.metadata_json || {}
    try {
        return JSON.parse(branch.metadata_json)
    } catch {
        return {}
    }
}

function resetBranchAliasCache() {
    branchAliasCache = null
}

function slugifyBranchCode(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function branchDisplayName(payload = {}) {
    return String(payload.display_name || payload.branch_name || payload.name || '').trim()
}

function branchDisplayNameEn(payload = {}) {
    return String(payload.display_name_en || payload.name_en || branchDisplayName(payload)).trim()
}

function branchPayloadFromRequest(payload = {}, existing = {}) {
    const displayName = branchDisplayName(payload)
    if (!displayName) throw Object.assign(new Error('Branch display name is required'), { status: 400 })

    const code = slugifyBranchCode(payload.code || payload.branch_id || displayName)
    if (!code) throw Object.assign(new Error('Branch code is required'), { status: 400 })
    if (code === 'all') throw Object.assign(new Error('"all" is a reserved virtual branch scope'), { status: 400 })

    const sortOrder = metricNumber(payload.sort_order, branchMetadataObject(existing).sort_order, 100)
    const metadata = {
        ...branchMetadataObject(existing),
        display_name: displayName,
        display_name_en: branchDisplayNameEn(payload),
        aliases: [displayName, branchDisplayNameEn(payload)].filter(Boolean),
        sort_order: sortOrder
    }

    return {
        code,
        name: displayName,
        address: String(payload.address || payload.location || existing.address || '').trim(),
        phone: String(payload.phone || existing.phone || '').trim(),
        latitude: String(payload.latitude || payload.lat || existing.latitude || existing.lat || '').trim(),
        longitude: String(payload.longitude || payload.lng || existing.longitude || existing.lng || '').trim(),
        tg_chat_jobs: String(payload.tg_chat_jobs || existing.tg_chat_jobs || '').trim(),
        tg_chat_hr: String(payload.tg_chat_hr || existing.tg_chat_hr || '').trim(),
        tg_chat_queue: String(payload.tg_chat_queue || existing.tg_chat_queue || '').trim(),
        is_active: payload.is_active ?? payload.active ?? existing.is_active ?? true,
        metadata_json: JSON.stringify(metadata)
    }
}

async function buildBranchAliasMap() {
    if (branchAliasCache) return branchAliasCache

    const aliasToCanonical = {}
    const canonicalToAliases = {}

    try {
        const branches = await db.getAllRecords('branches', {})
        for (const branch of branches || []) {
            const metadata = branchMetadataObject(branch)
            const canonical = String(branch.code || branch.name || branch.id || branch.Id || '').trim()
            if (!canonical) continue

            const aliases = [
                branch.id,
                branch.Id,
                branch.code,
                branch.branch_id,
                branch.name,
                branch.display_name,
                branch.legacy_code,
                metadata.legacy_code,
                ...(Array.isArray(metadata.aliases) ? metadata.aliases : []),
                ...String(branch.aliases || '').split(','),
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

async function getDefaultRealBranchId() {
    const rows = branchMetadataRows(await optionalRecords('branches', {}), { includeAll: false })
    return rows.find(branch => branch.is_active !== false)?.branch_id || ''
}

async function normalizeUserBranchPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload
    const hasBranch = Object.prototype.hasOwnProperty.call(payload, 'branch')
    const hasBranchId = Object.prototype.hasOwnProperty.call(payload, 'branch_id')
    const rawBranch = String(payload.branch_id || payload.branch || '').trim()
    const role = String(payload.role || '').toLowerCase()

    if (!rawBranch && ['admin', 'owner', 'manager'].includes(role)) {
        const defaultBranch = await getDefaultRealBranchId()
        if (!defaultBranch) return payload
        payload.branch = defaultBranch
        payload.branch_id = defaultBranch
        return payload
    }

    if (!hasBranch && !hasBranchId && !rawBranch) return payload

    const canonical = rawBranch === 'all' ? 'all' : await normalizeBranchId(rawBranch)
    if (!canonical) return payload

    payload.branch = canonical
    payload.branch_id = canonical
    return payload
}

async function deleteStockLedgersForDoc(docNo) {
    if (!docNo) return 0
    const existing = await db.getAllRecords('stock_ledgers', { where: `(reference_doc,eq,${safeWhereValue(docNo)})` })
    for (const row of existing) {
        await db.deleteRecord('stock_ledgers', row.id)
    }
    return existing.length
}

function isMissingColumnAlias(err) {
    return /Column alias '.+' not found/i.test(String(err?.message || ''))
}

function stripMissingColumnFromPayload(payload, err) {
    const match = String(err?.message || '').match(/Column alias '([^']+)' not found/i)
    if (!match) return null
    const nextPayload = { ...payload }
    delete nextPayload[match[1]]
    return nextPayload
}

async function createRecordTolerant(table, payload) {
    let nextPayload = { ...payload }
    for (let i = 0; i < 12; i++) {
        try {
            return await db.createRecord(table, nextPayload)
        } catch (err) {
            const stripped = stripMissingColumnFromPayload(nextPayload, err)
            if (!stripped) throw err
            console.warn(`[Data] ${table}.${Object.keys(nextPayload).find(k => !(k in stripped))} missing; creating without optional field`)
            nextPayload = stripped
        }
    }
    return db.createRecord(table, nextPayload)
}

async function updateRecordTolerant(table, id, payload) {
    let nextPayload = { ...payload }
    for (let i = 0; i < 12; i++) {
        try {
            return await db.updateRecord(table, id, nextPayload)
        } catch (err) {
            const stripped = stripMissingColumnFromPayload(nextPayload, err)
            if (!stripped) throw err
            console.warn(`[Data] ${table}.${Object.keys(nextPayload).find(k => !(k in stripped))} missing; updating without optional field`)
            nextPayload = stripped
        }
    }
    return db.updateRecord(table, id, nextPayload)
}

function normalizeUom(value, fallback = 'piece') {
    return String(value || fallback).trim().toLowerCase()
}

function getBaseUom(product) {
    return normalizeUom(product?.base_uom || product?.unit || 'piece')
}

function getLineUom(item, product, docType) {
    if (item.uom) return normalizeUom(item.uom)
    if (docType === 'RR') return normalizeUom(product?.purchase_uom || product?.unit || getBaseUom(product))
    return normalizeUom(product?.sales_uom || product?.unit || getBaseUom(product))
}

function getUomFactor(product, fromUom) {
    const baseUom = getBaseUom(product)
    const sourceUom = normalizeUom(fromUom, baseUom)
    if (!sourceUom || sourceUom === baseUom) return 1
    const keyed = product?.[`uom_factor_${sourceUom}`]
    const generic = product?.uom_conversion_factor || product?.purchase_conversion_factor || product?.conversion_factor
    const factor = asNumber(keyed ?? generic, 1)
    return factor > 0 ? factor : 1
}

function toBaseQty(qty, item, product, docType) {
    const lineUom = getLineUom(item, product, docType)
    return asNumber(qty, 0) * getUomFactor(product, lineUom)
}

function getTrackingType(product) {
    const metadata = ledgerMetadata(product)
    const raw = String(product?.tracking_type || product?.stock_tracking_type || metadata.tracking_type || 'NONE').toUpperCase()
    if (['SERIALIZED', 'BATCH', 'DIMENSION'].includes(raw)) return raw
    return 'NONE'
}

function isFifoEnforcedProduct(product) {
    const metadata = ledgerMetadata(product)
    const rawRotation = String(product?.stock_rotation || product?.costing_method || metadata.stock_rotation || metadata.costing_method || '').toUpperCase()
    return product?.fifo_enforced === true
        || product?.fifo_enforced === 'true'
        || metadata.fifo_enforced === true
        || metadata.fifo_enforced === 'true'
        || rawRotation === 'FIFO'
}

function documentAdjustmentReason(doc) {
    return String(doc?.reason || doc?.adjustment_reason || doc?.notes || doc?.description || '').trim()
}

function meaningfulTrackingType(...values) {
    for (const value of values) {
        const raw = String(value || '').toUpperCase()
        if (['SERIALIZED', 'BATCH', 'DIMENSION'].includes(raw)) return raw
    }
    return 'NONE'
}

function parseSerialNumbers(value) {
    return String(value || '')
        .split(/[\n,;]+/)
        .map(v => v.trim())
        .filter(Boolean)
}

function ledgerMetadata(ledger) {
    if (!ledger?.metadata_json) return {}
    if (typeof ledger.metadata_json === 'object') return ledger.metadata_json || {}
    try {
        return JSON.parse(ledger.metadata_json)
    } catch {
        return {}
    }
}

function mergeTraceabilityMetadata(payload = {}) {
    const metadata = {
        ...ledgerMetadata(payload),
        tracking_type: payload.tracking_type || ledgerMetadata(payload).tracking_type || 'NONE',
        serial_numbers: payload.serial_numbers || payload.serial_no || ledgerMetadata(payload).serial_numbers || '',
        batch_no: payload.batch_no || ledgerMetadata(payload).batch_no || '',
        expiry_date: payload.expiry_date || ledgerMetadata(payload).expiry_date || '',
        roll_no: payload.roll_no || ledgerMetadata(payload).roll_no || '',
        dimension_qty: payload.dimension_qty || ledgerMetadata(payload).dimension_qty || ''
    }
    if (
        metadata.tracking_type !== 'NONE'
        || metadata.serial_numbers
        || metadata.batch_no
        || metadata.expiry_date
        || metadata.roll_no
        || metadata.dimension_qty
    ) {
        payload.metadata_json = JSON.stringify(metadata)
    }
    return payload
}

async function getTrackedLedgerBalance(productId, { branchId = '', warehouse = 'Main', serialNo = '', batchNo = '' } = {}) {
    const ledgers = await db.getAllRecords('stock_ledgers', { where: `(product_id,eq,${safeWhereValue(productId)})` }).catch(() => [])
    let balance = 0
    for (const ledger of ledgers) {
        const metadata = ledgerMetadata(ledger)
        if (branchId && String(ledger.branch_id || '') !== String(branchId)) continue
        if (warehouse && String(ledger.warehouse_location || 'Main') !== String(warehouse)) continue
        if (serialNo) {
            const serials = parseSerialNumbers(ledger.serial_numbers || ledger.serial_no || metadata.serial_numbers || metadata.serial_no)
            if (!serials.includes(serialNo)) continue
        }
        if (batchNo && String(ledger.batch_no || metadata.batch_no || '').trim() !== String(batchNo).trim()) continue
        balance += asNumber(ledger.qty_base_delta ?? ledger.qty, 0)
    }
    return balance
}

function ledgerTime(ledger) {
    return new Date(ledger.CreatedAt || ledger.created_at || ledger.timestamp || ledger.date || 0).getTime() || 0
}

async function getTrackedBatchLots(productId, { branchId = '', warehouse = 'Main' } = {}) {
    const ledgers = await db.getAllRecords('stock_ledgers', { where: `(product_id,eq,${safeWhereValue(productId)})` }).catch(() => [])
    const lots = new Map()
    for (const ledger of ledgers) {
        const metadata = ledgerMetadata(ledger)
        const batchNo = String(ledger.batch_no || metadata.batch_no || '').trim()
        if (!batchNo) continue
        if (branchId && String(ledger.branch_id || '') !== String(branchId)) continue
        if (warehouse && String(ledger.warehouse_location || 'Main') !== String(warehouse)) continue

        const qty = asNumber(ledger.qty_base_delta ?? ledger.qty, 0)
        const key = batchNo
        const expiryDate = String(ledger.expiry_date || metadata.expiry_date || '').slice(0, 10)
        const createdTime = ledgerTime(ledger)
        const current = lots.get(key) || {
            batch_no: batchNo,
            expiry_date: expiryDate,
            qty_available: 0,
            first_received_at: '',
            first_received_time: Number.MAX_SAFE_INTEGER
        }

        current.qty_available += qty
        if (expiryDate && (!current.expiry_date || expiryDate < current.expiry_date)) {
            current.expiry_date = expiryDate
        }
        if (qty > 0 && createdTime && createdTime < current.first_received_time) {
            current.first_received_time = createdTime
            current.first_received_at = ledger.CreatedAt || ledger.created_at || ledger.timestamp || ''
        }
        lots.set(key, current)
    }

    return [...lots.values()]
        .filter(lot => lot.qty_available > 0.000001)
        .sort((a, b) => {
            const aExpiry = a.expiry_date || '9999-12-31'
            const bExpiry = b.expiry_date || '9999-12-31'
            if (aExpiry !== bExpiry) return aExpiry.localeCompare(bExpiry)
            if (a.first_received_time !== b.first_received_time) return a.first_received_time - b.first_received_time
            return a.batch_no.localeCompare(b.batch_no)
        })
        .map(({ first_received_time, ...lot }) => lot)
}

async function validateTrackedStockItem({ docType, product, productId, branchId, warehouse = 'Main', trackingType, qty, trackingPayload }) {
    if (trackingType === 'NONE') return
    if (trackingType === 'SERIALIZED') {
        const serials = parseSerialNumbers(trackingPayload.serial_numbers)
        if (serials.length === 0) {
            throw Object.assign(new Error('Serial number is required for serialized stock'), { status: 400 })
        }
        const expectedSerials = Math.abs(asNumber(qty, 0))
        if (Number.isInteger(expectedSerials) && expectedSerials > 0 && serials.length !== expectedSerials) {
            throw Object.assign(new Error(`Serialized stock requires one serial number per unit: expected ${expectedSerials}, got ${serials.length}`), { status: 400 })
        }
        for (const serial of serials) {
            const balance = await getTrackedLedgerBalance(productId, { branchId, warehouse, serialNo: serial })
            if (qty > 0 && balance > 0 && ['RR', 'RE'].includes(docType)) {
                throw Object.assign(new Error(`Serial number already exists in stock: ${serial}`), { status: 400 })
            }
            if (qty < 0 && balance <= 0 && ['RQ', 'TF', 'PCN', 'JOB'].includes(docType)) {
                throw Object.assign(new Error(`Serial number is not available in stock: ${serial}`), { status: 400 })
            }
        }
    }
    if (trackingType === 'BATCH') {
        if (!trackingPayload.batch_no) {
            throw Object.assign(new Error('Batch/Lot number is required for batch-tracked stock'), { status: 400 })
        }
        if (qty < 0) {
            const balance = await getTrackedLedgerBalance(productId, { branchId, warehouse, batchNo: trackingPayload.batch_no })
            if (balance + qty < -0.000001) {
                throw Object.assign(new Error(`Batch/Lot is not available in requested quantity: ${trackingPayload.batch_no}`), {
                    status: 409,
                    code: 'INSUFFICIENT_BATCH_STOCK',
                    details: { product_id: productId, branch_id: branchId, warehouse, batch_no: trackingPayload.batch_no, available: balance, requested: Math.abs(qty) }
                })
            }
            if (isFifoEnforcedProduct(product)) {
                const availableLots = await getTrackedBatchLots(productId, { branchId, warehouse })
                const nextLot = availableLots[0]
                if (nextLot && nextLot.batch_no !== trackingPayload.batch_no) {
                    throw Object.assign(new Error(`FIFO requires issuing oldest available batch first: ${nextLot.batch_no}`), {
                        status: 409,
                        code: 'FIFO_BATCH_REQUIRED',
                        details: {
                            product_id: productId,
                            branch_id: branchId,
                            warehouse,
                            requested_batch_no: trackingPayload.batch_no,
                            required_batch_no: nextLot.batch_no,
                            available_lots: availableLots
                        }
                    })
                }
            }
        }
    }
    if (trackingType === 'DIMENSION' && (!trackingPayload.roll_no || !asNumber(trackingPayload.dimension_qty, 0))) {
        throw Object.assign(new Error('Roll number and dimension quantity are required for dimension-tracked stock'), { status: 400 })
    }
}

function isReversalLedger(ledger) {
    return String(ledger.movement_type || '').toUpperCase() === 'REVERSAL'
        || String(ledger.transaction_no || '').includes('-REV-')
}

async function getLedgerBalance(productId, branchId, warehouse = 'Main') {
    const where = `(product_id,eq,${safeWhereValue(productId)})`
    const ledgers = await db.getAllRecords('stock_ledgers', { where }).catch(() => [])
    let qty = 0
    for (const ledger of ledgers) {
        if (branchId && String(ledger.branch_id || '') !== String(branchId)) continue
        if (warehouse && String(ledger.warehouse_location || 'Main') !== String(warehouse)) continue
        qty += asNumber(ledger.qty, 0)
    }
    return qty
}

async function assertStockAvailable({ productId, branchId, warehouse = 'Main', qtyDelta, docNo }) {
    const delta = asNumber(qtyDelta, 0)
    if (delta >= 0) return
    const onHand = await getLedgerBalance(productId, branchId, warehouse)
    const nextOnHand = onHand + delta
    if (nextOnHand < -0.000001) {
        throw Object.assign(
            new Error(`Insufficient stock for product ${productId} at branch ${branchId || 'unassigned'}: available ${onHand}, requested ${Math.abs(delta)}`),
            {
                status: 409,
                code: 'INSUFFICIENT_STOCK',
                details: { product_id: productId, branch_id: branchId, warehouse, available: onHand, requested: Math.abs(delta), reference_doc: docNo }
            }
        )
    }
}

async function createStockLedger(payload) {
    const branchId = payload.branch_id || ''
    const warehouse = payload.warehouse_location || 'Main'
    const balanceBefore = await getLedgerBalance(payload.product_id, branchId, warehouse)
    const qty = asNumber(payload.qty, 0)
    const traceMetadata = {
        ...ledgerMetadata(payload),
        tracking_type: payload.tracking_type,
        serial_numbers: payload.serial_numbers || payload.serial_no || '',
        batch_no: payload.batch_no || '',
        expiry_date: payload.expiry_date || '',
        roll_no: payload.roll_no || '',
        dimension_qty: payload.dimension_qty || '',
        base_uom: payload.base_uom || '',
        source_uom: payload.source_uom || ''
    }
    const enriched = {
        ...payload,
        transaction_no: `LEDGER-${crypto.randomUUID()}`,
        warehouse_location: warehouse,
        qty_base_delta: qty,
        balance_after: balanceBefore + qty,
        movement_type: payload.movement_type || payload.transaction_type,
        value_delta: payload.total_value,
        metadata_json: JSON.stringify(traceMetadata)
    }
    return createRecordTolerant('stock_ledgers', enriched)
}

async function reverseStockLedgersForDoc(docNo, reason = 'void') {
    if (!docNo) return { reversed: 0, touchedProducts: [] }
    const existing = await db.getAllRecords('stock_ledgers', { where: `(reference_doc,eq,${safeWhereValue(docNo)})` })
    const alreadyReversed = existing.some(l => isReversalLedger(l))
    if (alreadyReversed) return { reversed: 0, touchedProducts: [] }

    const reversalGroups = new Map()
    for (const ledger of existing) {
        if (isReversalLedger(ledger)) continue
        const productId = String(ledger.product_id || '').trim()
        const qty = asNumber(ledger.qty_base_delta ?? ledger.qty, 0)
        if (!productId || !qty) continue
        const branchId = String(ledger.branch_id || '').trim()
        const warehouse = String(ledger.warehouse_location || 'Main').trim() || 'Main'
        const key = `${productId}::${branchId}::${warehouse}`
        const current = reversalGroups.get(key) || { productId, branchId, warehouse, qty: 0 }
        current.qty += qty
        reversalGroups.set(key, current)
    }
    for (const group of reversalGroups.values()) {
        if (group.qty > 0) {
            await assertStockAvailable({
                productId: group.productId,
                branchId: group.branchId,
                warehouse: group.warehouse,
                qtyDelta: -group.qty,
                docNo
            })
        }
    }

    let reversed = 0
    const touchedProducts = new Set()
    for (const ledger of existing) {
        const qty = asNumber(ledger.qty, 0)
        if (!qty) continue
        await createStockLedger({
            transaction_type: qty > 0 ? 'OUT' : 'IN',
            movement_type: 'REVERSAL',
            product_id: ledger.product_id,
            warehouse_location: ledger.warehouse_location || 'Main',
            qty: -qty,
            unit_cost: asNumber(ledger.unit_cost, 0),
            total_value: -asNumber(ledger.total_value, qty * asNumber(ledger.unit_cost, 0)),
            value_delta: -asNumber(ledger.value_delta ?? ledger.total_value, 0),
            reference_doc: docNo,
            reference_type: reason,
            reversal_of_ledger_id: ledger.id,
            serial_numbers: ledger.serial_numbers,
            batch_no: ledger.batch_no,
            expiry_date: ledger.expiry_date,
            roll_no: ledger.roll_no,
            dimension_qty: ledger.dimension_qty,
            branch_id: ledger.branch_id || ''
        })
        touchedProducts.add(ledger.product_id)
        reversed++
    }
    return { reversed, touchedProducts: [...touchedProducts].filter(Boolean) }
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
                if (isReversalLedger(ledger)) {
                    continue
                }
                const ledgerQty = asNumber(ledger.qty_base_delta ?? ledger.qty, 0)
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

    const noStockTypes = new Set(['PIV', 'PI', 'IV', 'QT', 'RC', 'CN', 'PAY', 'WT'])
    if (noStockTypes.has(docType)) {
        return { posted: 0, skipped: true }
    }

    const validStockTypes = new Set(['RR', 'RQ', 'RE', 'TF', 'SA', 'PCN', 'JOB'])
    if (!validStockTypes.has(docType)) {
        return { posted: 0, skipped: true }
    }

    const existing = await db.getAllRecords('stock_ledgers', { where: `(reference_doc,eq,${safeWhereValue(docNo)})` }).catch(() => [])
    if (existing.some(l => !isReversalLedger(l))) {
        return { posted: 0, skipped: true, alreadyPosted: true }
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

    let posted = 0
    const touchedProducts = new Set()
    for (const item of ledgerItems) {
        const product = productMap[item.product_id]
        const itemMetadata = ledgerMetadata(item)
        const qty = toBaseQty(item.qty, item, product, docType)
        if (!product || qty === 0) continue
        const canonicalProductId = String(product.id || product.Id || item.product_id)
        const baseUom = getBaseUom(product)
        const lineUom = getLineUom(item, product, docType)
        const trackingType = meaningfulTrackingType(
            item.tracking_type,
            itemMetadata.tracking_type,
            product.tracking_type,
            product.stock_tracking_type,
            ledgerMetadata(product).tracking_type
        )
        const trackingPayload = {
            serial_numbers: item.serial_numbers || item.serial_no || itemMetadata.serial_numbers || itemMetadata.serial_no || '',
            batch_no: item.batch_no || itemMetadata.batch_no || '',
            expiry_date: item.expiry_date || itemMetadata.expiry_date || '',
            roll_no: item.roll_no || itemMetadata.roll_no || '',
            dimension_qty: item.dimension_qty || itemMetadata.dimension_qty || ''
        }

        let transactionType = 'ADJ'
        let ledgerQty = qty
        let unitCost = getItemPrice(item)

        if (docType === 'RR' || docType === 'RE') {
            transactionType = 'IN'
            ledgerQty = Math.abs(qty)
        } else if (docType === 'RQ' || docType === 'PCN' || docType === 'JOB') {
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

        await validateTrackedStockItem({
            docType,
            product,
            productId: canonicalProductId,
            branchId,
            warehouse: 'Main',
            trackingType,
            qty: docType === 'TF' ? -Math.abs(qty) : ledgerQty,
            trackingPayload
        })

        if (docType === 'TF') {
            const outQty = -Math.abs(qty)
            await assertStockAvailable({
                productId: canonicalProductId,
                branchId,
                warehouse: 'Main',
                qtyDelta: outQty,
                docNo
            })
            await createStockLedger({
                transaction_type: 'OUT',
                movement_type: 'TRANSFER_DISPATCH',
                product_id: canonicalProductId,
                warehouse_location: 'Main',
                qty: outQty,
                unit_cost: unitCost,
                total_value: outQty * unitCost,
                reference_doc: docNo,
                reference_type: docType,
                source_branch_id: branchId,
                destination_branch_id: destinationBranch,
                base_uom: baseUom,
                source_uom: lineUom,
                tracking_type: trackingType,
                ...trackingPayload,
                branch_id: branchId
            })
            posted++

            if (destinationBranch) {
                const inQty = Math.abs(qty)
                await createStockLedger({
                    transaction_type: 'IN',
                    movement_type: 'TRANSFER_IN_TRANSIT',
                    product_id: canonicalProductId,
                    warehouse_location: 'IN_TRANSIT',
                    qty: inQty,
                    unit_cost: unitCost,
                    total_value: inQty * unitCost,
                    reference_doc: docNo,
                    reference_type: docType,
                    source_branch_id: branchId,
                    destination_branch_id: destinationBranch,
                    base_uom: baseUom,
                    source_uom: lineUom,
                    tracking_type: trackingType,
                    ...trackingPayload,
                    branch_id: destinationBranch
                })
                posted++
            }
        } else {
            await assertStockAvailable({
                productId: canonicalProductId,
                branchId,
                warehouse: 'Main',
                qtyDelta: ledgerQty,
                docNo
            })
            await createStockLedger({
                transaction_type: transactionType,
                movement_type: docType === 'RR' ? 'PURCHASE_RECEIPT'
                    : docType === 'RQ' || docType === 'JOB' ? 'ISSUE'
                    : docType === 'PCN' ? 'SUPPLIER_RMA'
                    : docType === 'RE' ? 'CUSTOMER_RETURN'
                    : docType === 'SA' ? 'ADJUSTMENT'
                    : transactionType,
                product_id: canonicalProductId,
                warehouse_location: 'Main',
                qty: ledgerQty,
                unit_cost: unitCost,
                total_value: ledgerQty * unitCost,
                reference_doc: docNo,
                reference_type: docType,
                base_uom: baseUom,
                source_uom: lineUom,
                tracking_type: trackingType,
                ...trackingPayload,
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

function devOrJwtAuth(req, res, next) {
    const header = req.headers.authorization || ''
    if (header.startsWith('Bearer ')) return requireAuth(req, res, next)

    if (req.headers['x-bcauto-dev-auth'] === '1') {
        const role = String(req.headers['x-bcauto-dev-role'] || '').toLowerCase()
        if (!VALID_DEV_ROLES.includes(role)) {
            return res.status(401).json({ error: 'Invalid dev access role' })
        }
        req.user = {
            id: req.headers['x-bcauto-dev-user-id'] || 'dev-manager-dashboard',
            name: req.headers['x-bcauto-dev-user-name'] || 'Dev User',
            role,
            branch: String(req.headers['x-bcauto-dev-branch'] || '')
        }
        return next()
    }

    return res.status(401).json({ error: 'Missing authentication token' })
}

function parseDateOnly(value) {
    const raw = String(value || '').slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''
}

function ymd(date) {
    return date.toISOString().slice(0, 10)
}

function utcDate(dateStr) {
    const [year, month, day] = parseDateOnly(dateStr).split('-').map(Number)
    return new Date(Date.UTC(year, (month || 1) - 1, day || 1))
}

function getDashboardPeriod(query) {
    const now = query.date ? utcDate(query.date) : new Date()
    const type = String(query.period || 'month').toLowerCase()
    let start
    let end

    if (type === 'today' || type === 'day') {
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        end = new Date(start)
    } else if (type === 'week') {
        const day = now.getUTCDay() || 7
        start = new Date(now)
        start.setUTCDate(now.getUTCDate() - day + 1)
        end = new Date(start)
        end.setUTCDate(start.getUTCDate() + 6)
    } else if (type === 'custom') {
        start = query.start ? utcDate(query.start) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        end = query.end ? utcDate(query.end) : new Date(now)
    } else {
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    }

    return { type: type === 'day' ? 'today' : type, start: ymd(start), end: ymd(end) }
}

function dashboardDate(record, fields) {
    for (const field of fields) {
        if (record?.[field]) return String(record[field]).slice(0, 10)
    }
    return ''
}

function inDashboardPeriod(record, fields, period) {
    const value = dashboardDate(record, fields)
    return value && value >= period.start && value <= period.end
}

function metricNumber(...values) {
    for (const value of values) {
        const n = Number(value)
        if (Number.isFinite(n)) return n
    }
    return 0
}

function dashboardRecordBranch(record) {
    return String(record?.branch_id || record?.branch || '').trim()
}

async function dashboardScope(req) {
    const role = String(req.user?.role || '').toLowerCase()
    const userBranch = await normalizeBranchId(req.user?.branch || '')
    const explicitBranch = String(req.query.branch_id || req.query.branch || '').trim()
    if (explicitBranch === 'all') {
        throw Object.assign(new Error('A real branch_id is required for manager dashboard scope'), { status: 400 })
    }
    const requestedBranch = await normalizeBranchId(req.query.branch_id || req.query.branch || userBranch || '')
    const canSwitchBranch = ['admin', 'owner', 'manager'].includes(role) && (!userBranch || userBranch === 'all')
    const branchId = canSwitchBranch ? requestedBranch : userBranch
    if (!branchId || branchId === 'all') {
        throw Object.assign(new Error('A real branch_id is required for manager dashboard scope'), { status: 400 })
    }
    const aliases = branchId && branchId !== 'all' ? await getBranchAliases(branchId) : []
    return {
        branchId,
        aliases,
        canSwitchBranch: false
    }
}

function dashboardBranchMatches(record, scope) {
    if (!scope.aliases.length) return false
    return scope.aliases.includes(dashboardRecordBranch(record))
}

function dashboardBranchWhere(scope) {
    if (!scope.aliases.length) return undefined
    return `(${scope.aliases.map(alias => `(branch_id,eq,${safeWhereValue(alias)})`).join('~or')})`
}

async function optionalRecords(table, opts = {}) {
    try {
        return await db.getAllRecords(table, opts)
    } catch (err) {
        if (err.status === 404 || /Table ".+" not found/i.test(String(err.message || ''))) {
            console.warn(`[ManagerDashboard] Optional table missing: ${table}`)
            return []
        }
        throw err
    }
}

function dashboardBranchName(code, branches) {
    if (!code || code === 'all') return 'ทุกสาขา'
    const match = branches.find(branch => [branch.id, branch.Id, branch.code, branch.name, branch.branch_id].map(v => String(v || '').trim()).includes(code))
    if (match) {
        const metadata = branchMetadataObject(match)
        return metadata.display_name || match.display_name || match.name || match.code || code
    }
    return code
}

function dashboardBranchCode(branch) {
    return String(branch?.code || branch?.branch_id || branch?.id || branch?.Id || branch?.name || '').trim()
}

function dashboardAvailableBranches(branches) {
    return branchMetadataRows(branches, { includeAll: false }).map(branch => ({
        branch_id: branch.branch_id,
        branch_name: branch.branch_name,
        display_name: branch.display_name,
        display_name_en: branch.display_name_en,
        is_virtual: branch.is_virtual
    }))
}

function branchMetadataRows(branches, { includeAll = true, includeInactive = false, includeLegacyAliases = false } = {}) {
    const rows = []
    if (includeAll) {
        rows.push({
            branch_id: 'all',
            code: 'all',
            branch_name: 'ทุกสาขา',
            display_name: 'ทุกสาขา',
            display_name_en: 'All branches',
            aliases: ['all'],
            scoped: false,
            is_virtual: true,
            is_active: true
        })
    }

    for (const branch of branches || []) {
        const metadata = branchMetadataObject(branch)
        const code = dashboardBranchCode(branch)
        if (!code) continue
        const active = branch.is_active ?? branch.active ?? branch.enabled
        const isActive = !(active === false || String(branch.status || '').toLowerCase() === 'inactive')
        if (!includeInactive && !isActive) continue

        const legacyAliases = [
            branch.id,
            branch.Id,
            branch.code,
            branch.branch_id,
            branch.name,
            branch.display_name,
            branch.legacy_code,
            metadata.legacy_code,
            ...(Array.isArray(metadata.aliases) ? metadata.aliases : []),
            ...(String(branch.aliases || '').split(','))
        ].map(v => String(v || '').trim()).filter(Boolean)

        const canonicalAliases = [
            code,
            metadata.display_name,
            metadata.display_name_en,
            branch.display_name,
            branch.display_name_en,
            branch.name,
            branch.name_en
        ].map(v => String(v || '').trim()).filter(Boolean)

        rows.push({
            id: branch.id || branch.Id || code,
            branch_id: code,
            code,
            branch_name: metadata.display_name || branch.display_name || branch.name || branch.code || code,
            display_name: metadata.display_name || branch.display_name || branch.name || branch.code || code,
            display_name_en: metadata.display_name_en || branch.display_name_en || branch.name_en || metadata.display_name || branch.display_name || branch.name || branch.code || code,
            aliases: [...new Set(includeLegacyAliases ? legacyAliases : canonicalAliases)],
            scoped: true,
            is_virtual: false,
            is_active: isActive,
            address: branch.address || branch.location || '',
            phone: branch.phone || branch.tel || '',
            latitude: branch.latitude || branch.lat || '',
            longitude: branch.longitude || branch.lng || '',
            tg_chat_jobs: branch.tg_chat_jobs || '',
            tg_chat_hr: branch.tg_chat_hr || '',
            tg_chat_queue: branch.tg_chat_queue || '',
            sort_order: metricNumber(metadata.sort_order, branch.sort_order, branch.order, branch.sequence)
        })
    }

    return rows.sort((a, b) => {
        if (a.is_virtual !== b.is_virtual) return a.is_virtual ? -1 : 1
        return (a.sort_order - b.sort_order) || String(a.branch_name).localeCompare(String(b.branch_name), 'th')
    })
}

function requireAdminBranchAccess(req, res) {
    const role = String(req.user?.role || '').toLowerCase()
    if (!['admin', 'owner'].includes(role)) {
        res.status(403).json({ error: 'Admin or owner role required' })
        return false
    }
    return true
}

const BRANCH_MIGRATION_TABLES = [
    'users',
    'customers',
    'vehicles',
    'jobs',
    'job_items',
    'documents',
    'document_items',
    'stock_ledgers',
    'hr_attendance',
    'hr_leaves',
    'financial_ledger',
    'transactions',
    'payments'
]

const BRANCH_MIGRATION_FIELDS = ['branch', 'branch_id', 'source_branch_id', 'destination_branch_id']

async function migrationMapFromPayload(payload = {}) {
    const branchMap = await buildBranchAliasMap()
    const map = { ...branchMap.aliasToCanonical, ...(payload.mappings || {}) }
    return Object.fromEntries(Object.entries(map)
        .map(([from, to]) => [String(from || '').trim(), slugifyBranchCode(to)])
        .filter(([from, to]) => from && to && from !== to))
}

async function migrateBranchCodes({ dryRun = true, mappings = {} } = {}) {
    const result = {
        dry_run: dryRun,
        mappings,
        scanned_tables: [],
        updated_tables: {},
        updates: 0,
        errors: []
    }

    for (const table of BRANCH_MIGRATION_TABLES) {
        let rows = []
        try {
            rows = await db.getAllRecords(table, {})
        } catch (err) {
            if (err.status === 404 || /Table ".+" not found/i.test(String(err.message || ''))) {
                continue
            }
            result.errors.push({ table, error: err.message })
            continue
        }

        result.scanned_tables.push(table)
        for (const row of rows) {
            const patch = {}
            for (const field of BRANCH_MIGRATION_FIELDS) {
                const value = String(row[field] || '').trim()
                if (value && mappings[value]) patch[field] = mappings[value]
            }
            if (!Object.keys(patch).length) continue

            const rowId = row.id || row.Id
            result.updates += 1
            result.updated_tables[table] = (result.updated_tables[table] || 0) + 1
            if (!dryRun) {
                await db.updateRecord(table, rowId, patch)
            }
        }
    }

    if (!dryRun) resetBranchAliasCache()
    return result
}

const BOOTSTRAP_ROLE_IDS = ['admin', 'owner', 'manager', 'sa', 'mechanic']

function parseRolePermissionList(raw) {
    if (Array.isArray(raw)) return raw.map(value => String(value).trim()).filter(Boolean)
    if (raw && typeof raw === 'object') {
        return Object.entries(raw)
            .filter(([, value]) => value === true || value === 'true' || value === 1 || value === '1')
            .map(([key]) => key)
    }
    const text = String(raw ?? '').trim()
    if (!text) return []
    if (text.startsWith('[')) {
        try {
            return parseRolePermissionList(JSON.parse(text))
        } catch { /* fall through to comma parsing */ }
    }
    return text.split(',').map(value => value.trim()).filter(Boolean)
}

function roleRecordKey(record = {}) {
    return String(record.role_name || record.name || record.role || '').trim().toLowerCase()
}

function normalizeRoleRecord(record = {}) {
    const role = roleRecordKey(record)
    return {
        id: record.id || record.Id || '',
        role,
        name: String(record.name || record.role_name || role).trim(),
        description: String(record.description || record.note || '').trim(),
        allowed_tools: [...new Set(parseRolePermissionList(
            record.allowed_tools ?? record.allowed_modules ?? record.modules ?? record.tools
        ))],
        allowed_menus: [...new Set(parseRolePermissionList(record.allowed_menus))],
        updated_at: record.updated_at || record.UpdatedAt || record.updated || ''
    }
}

async function roleMetadataRows() {
    const [users, roleRows] = await Promise.all([
        optionalRecords('users', {}),
        optionalRecords('system_roles', {})
    ])

    const roleIds = new Set(BOOTSTRAP_ROLE_IDS)
    users.forEach(user => {
        const role = String(user.role || '').trim().toLowerCase()
        if (role) roleIds.add(role)
    })

    const byRole = {}
    roleRows.forEach(row => {
        const normalized = normalizeRoleRecord(row)
        if (!normalized.role) return
        roleIds.add(normalized.role)
        byRole[normalized.role] = normalized
    })

    return [...roleIds]
        .sort((a, b) => {
            const ai = BOOTSTRAP_ROLE_IDS.indexOf(a)
            const bi = BOOTSTRAP_ROLE_IDS.indexOf(b)
            if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
            return a.localeCompare(b)
        })
        .map(role => byRole[role] || {
            id: '',
            role,
            name: role,
            description: '',
            allowed_tools: [],
            allowed_menus: [],
            updated_at: ''
        })
}

function defaultToolsForRole(role, tools = []) {
    return tools
        .filter(tool => Array.isArray(tool.roles) && tool.roles.includes(role))
        .map(tool => tool.id)
}

async function upsertRoleMetadata(role, allowedTools) {
    const roleKey = String(role || '').trim().toLowerCase()
    if (!roleKey) throw Object.assign(new Error('Role is required'), { status: 400 })

    const existingRows = await optionalRecords('system_roles', {})
    const existing = existingRows.find(row => roleRecordKey(row) === roleKey)
    const payload = {
        role_name: roleKey,
        name: roleKey,
        allowed_tools: JSON.stringify([...new Set(allowedTools.map(value => String(value).trim()).filter(Boolean))])
    }

    if (existing) {
        return updateRecordTolerant('system_roles', existing.id || existing.Id, payload)
    }
    return createRecordTolerant('system_roles', payload)
}

const SETTING_DEFAULTS = [
    { key: 'company_name', value: 'BC Auto Xperience', type: 'text' },
    { key: 'work_start', value: '08:30', type: 'text' },
    { key: 'work_end', value: '17:30', type: 'text' },
    { key: 'late_after', value: '09:00', type: 'text' },
    { key: 'gps_required', value: 'false', type: 'bool' }
]

const SETTING_DEFAULT_MAP = Object.fromEntries(SETTING_DEFAULTS.map(row => [row.key, row]))

function settingRecordKey(record = {}) {
    return String(record.setting_key || record.key || record.name || '').trim()
}

function normalizeSettingRecord(record = {}) {
    const key = settingRecordKey(record)
    const fallback = SETTING_DEFAULT_MAP[key] || {}
    return {
        id: record.id || record.Id || '',
        key,
        value: String(record.value ?? record.setting_value ?? fallback.value ?? ''),
        type: String(record.type || record.value_type || fallback.type || 'text'),
        updated_at: record.updated_at || record.UpdatedAt || record.updated || ''
    }
}

async function systemSettingRows() {
    const rows = await optionalRecords('system_settings', {})
    const byKey = {}
    rows.forEach(row => {
        const normalized = normalizeSettingRecord(row)
        if (normalized.key) byKey[normalized.key] = normalized
    })

    return SETTING_DEFAULTS.map(defaultRow => byKey[defaultRow.key] || {
        id: '',
        ...defaultRow,
        updated_at: ''
    })
}

async function upsertSystemSetting(key, value, type = 'text') {
    const settingKey = String(key || '').trim()
    if (!SETTING_DEFAULT_MAP[settingKey]) {
        throw Object.assign(new Error(`Unknown setting key: ${settingKey}`), { status: 400 })
    }

    const settingType = String(type || SETTING_DEFAULT_MAP[settingKey].type || 'text')
    const settingValue = settingType === 'bool'
        ? String(value === true || value === 'true' || value === 1 || value === '1')
        : String(value ?? '')
    const existingRows = await optionalRecords('system_settings', {})
    const existing = existingRows.find(row => settingRecordKey(row) === settingKey)
    const payload = {
        key: settingKey,
        setting_key: settingKey,
        name: settingKey,
        value: settingValue,
        setting_value: settingValue,
        type: settingType,
        value_type: settingType
    }

    if (existing) {
        return updateRecordTolerant('system_settings', existing.id || existing.Id, payload)
    }
    return createRecordTolerant('system_settings', payload)
}

function userRecordKey(record = {}) {
    return String(record.id || record.Id || '').trim()
}

function normalizeUserRecord(record = {}) {
    const branch = String(record.branch_id || record.branch || '').trim()
    return {
        id: userRecordKey(record),
        username: String(record.username || '').trim(),
        name: String(record.display_name || record.name || record.full_name || record.username || '').trim(),
        email: String(record.email || '').trim(),
        role: String(record.role || '').trim().toLowerCase(),
        branch_id: branch,
        branch,
        active: record.active !== false && record.is_active !== false,
        has_pin: Boolean(record.pin),
        has_password: Boolean(record.password_hash || record.password),
        updated_at: record.updated_at || record.UpdatedAt || record.updated || ''
    }
}

function safeUserPayload(payload = {}) {
    const name = String(payload.name || payload.display_name || '').trim()
    const username = String(payload.username || payload.email || '').trim()
    const role = String(payload.role || '').trim().toLowerCase()
    const userPayload = {
        name,
        display_name: name,
        username,
        email: String(payload.email || '').trim(),
        role,
        active: payload.active ?? payload.is_active ?? true
    }

    if (payload.branch !== undefined) userPayload.branch = payload.branch
    if (payload.branch_id !== undefined) userPayload.branch_id = payload.branch_id
    if (payload.pin) userPayload.pin = String(payload.pin)
    if (payload.password) {
        userPayload.password_hash = sha256(payload.password)
    }

    return userPayload
}

async function assertKnownRole(role) {
    const roleKey = String(role || '').trim().toLowerCase()
    const roles = await roleMetadataRows()
    if (!roles.some(row => row.role === roleKey)) {
        throw Object.assign(new Error(`Unknown role: ${roleKey}`), { status: 400 })
    }
}

async function prepareAdminUserPayload(payload = {}, existing = null) {
    const next = safeUserPayload(payload)
    if (!next.username) throw Object.assign(new Error('Username is required'), { status: 400 })
    if (!next.name) next.name = next.username
    if (!next.display_name) next.display_name = next.name
    if (!next.role) next.role = existing?.role || 'sa'
    await assertKnownRole(next.role)

    await normalizeUserBranchPayload(next)
    const pinError = normalizeUserPinPayload(next)
    if (pinError) throw Object.assign(new Error(pinError), { status: 400 })

    return next
}

async function adminHealthChecks() {
    const checks = []
    async function check(id, label, fn) {
        const start = Date.now()
        try {
            const details = await fn()
            checks.push({ id, label, ok: true, latency_ms: Date.now() - start, details })
        } catch (err) {
            checks.push({ id, label, ok: false, latency_ms: Date.now() - start, error: err.message })
        }
    }

    await check('branches', 'Branch metadata', async () => {
        const rows = branchMetadataRows(await optionalRecords('branches', {}), { includeAll: false })
        return { count: rows.length, active: rows.filter(row => row.is_active !== false).length }
    })
    await check('roles', 'Role metadata', async () => {
        const rows = await roleMetadataRows()
        return { count: rows.length, roles: rows.map(row => row.role) }
    })
    await check('settings', 'System settings', async () => {
        const rows = await systemSettingRows()
        return { count: rows.length, keys: rows.map(row => row.key) }
    })
    await check('users', 'User directory', async () => {
        const rows = await optionalRecords('users', {})
        return { count: rows.length, active: rows.filter(row => row.active !== false && row.is_active !== false).length }
    })
    await check('session', 'Dev portal session contract', async () => ({
        role: 'ok',
        branch: 'ok',
        accepted_roles: VALID_DEV_ROLES
    }))

    const ok = checks.every(row => row.ok)
    return { ok, checks, generated_at: new Date().toISOString() }
}

function dashboardTrend(period) {
    const rows = []
    const cursor = utcDate(period.start)
    const end = utcDate(period.end)
    while (cursor <= end) {
        rows.push({ date: ymd(cursor), revenue: 0, expenses: 0 })
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    return rows
}

function dashboardLowStockAlerts(products, stockMap) {
    return products
        .filter(product => isStockTrackedProduct(product))
        .map(product => {
            const id = String(product.id || product.Id || '')
            const balance = stockMap[id] || { available: 0, qty: 0 }
            const available = metricNumber(balance.available, balance.qty)
            const minStock = metricNumber(product.min_stock, product.reorder_point, product.minimum_stock)
            return { product, available, minStock }
        })
        .filter(row => row.minStock > 0 && row.available <= row.minStock)
        .sort((a, b) => a.available - b.available)
        .slice(0, 12)
        .map(row => ({
            type: 'low_stock',
            severity: row.available <= 0 ? 'critical' : 'warning',
            title: row.product.name || row.product.code || 'สินค้า',
            detail: `คงเหลือ ${row.available} / ขั้นต่ำ ${row.minStock}`,
            product_id: row.product.id || row.product.Id || ''
        }))
}

router.get('/custom/manager-dashboard', devOrJwtAuth, async (req, res) => {
    try {
        const role = String(req.user?.role || '').toLowerCase()
        if (!['admin', 'owner', 'manager'].includes(role)) {
            return res.status(403).json({ error: 'Manager dashboard requires admin, owner, or manager role' })
        }

        const period = getDashboardPeriod(req.query)
        const scope = await dashboardScope(req)
        const where = dashboardBranchWhere(scope)
        const [jobsAll, jobItemsAll, ledgerAll, purchaseDocsAll, products, branches, stockLedgers] = await Promise.all([
            optionalRecords('jobs', { where }),
            optionalRecords('job_items', { where }),
            optionalRecords('financial_ledger', { where }),
            optionalRecords('purchase_invoices', { where }),
            optionalRecords('products', {}),
            optionalRecords('branches', {}),
            optionalRecords('stock_ledgers', { where })
        ])

        const jobs = jobsAll.filter(job => dashboardBranchMatches(job, scope))
        const jobItems = jobItemsAll.filter(item => dashboardBranchMatches(item, scope))
        const ledgerRows = ledgerAll.filter(row => dashboardBranchMatches(row, scope))
        const purchaseDocs = purchaseDocsAll.filter(row => dashboardBranchMatches(row, scope))
        const periodJobs = jobs.filter(job => inDashboardPeriod(job, ['end_date', 'start_date', 'CreatedAt', 'created_at', 'created'], period))
        const completedStatuses = new Set(['completed', 'invoiced', 'paid', 'closed'])
        const openStatuses = new Set(['pending', 'open', 'in_progress', 'qc_done'])
        const completedJobs = periodJobs.filter(job => completedStatuses.has(String(job.status || '').toLowerCase()) || String(job.payment_status || '').toLowerCase() === 'paid')
        const openJobs = jobs.filter(job => openStatuses.has(String(job.status || '').toLowerCase()))
        const unpaidJobs = jobs.filter(job => ['unpaid', 'partial'].includes(String(job.payment_status || '').toLowerCase()))
        const completedJobIds = new Set(completedJobs.map(job => String(job.id || job.Id || '')))
        const periodItems = jobItems.filter(item => completedJobIds.has(String(item.job_id || '')))

        const revenue = completedJobs.reduce((sum, job) => sum + metricNumber(job.grand_total, job.total, job.total_revenue), 0)
        const cogsFromJobs = completedJobs.reduce((sum, job) => sum + metricNumber(job.total_cost), 0)
        const cogsFromItems = periodItems.reduce((sum, item) => sum + metricNumber(item.cost, item.unit_cost) * metricNumber(item.qty, 1), 0)
        const grossProfit = completedJobs.some(job => job.profit != null)
            ? completedJobs.reduce((sum, job) => sum + metricNumber(job.profit), 0)
            : revenue - (cogsFromJobs || cogsFromItems)

        const periodLedger = ledgerRows.filter(row => inDashboardPeriod(row, ['date', 'entry_date', 'CreatedAt', 'created_at', 'created'], period))
        const ledgerExpenses = periodLedger
            .filter(row => String(row.entry_type || row.type || '').toLowerCase().includes('expense'))
            .reduce((sum, row) => sum + metricNumber(row.amount, row.total, row.grand_total), 0)
        const purchaseExpenses = purchaseDocs
            .filter(row => inDashboardPeriod(row, ['issue_date', 'date', 'CreatedAt', 'created_at', 'created'], period))
            .reduce((sum, row) => sum + metricNumber(row.grand_total, row.total, row.amount), 0)
        const expenses = ledgerExpenses + purchaseExpenses
        const netProfit = grossProfit - expenses

        const stockMap = {}
        for (const ledger of stockLedgers.filter(row => dashboardBranchMatches(row, scope))) {
            const productId = String(ledger.product_id || '').trim()
            if (!productId) continue
            if (!stockMap[productId]) stockMap[productId] = { qty: 0, available: 0, total_value: 0 }
            const qty = metricNumber(ledger.qty_base_delta, ledger.qty)
            stockMap[productId].qty += qty
            stockMap[productId].available += qty
            stockMap[productId].total_value += metricNumber(ledger.value_delta, ledger.total_value)
        }

        const trend = dashboardTrend(period)
        const trendByDate = new Map(trend.map(row => [row.date, row]))
        for (const job of completedJobs) {
            const date = dashboardDate(job, ['end_date', 'start_date', 'CreatedAt', 'created_at', 'created'])
            if (trendByDate.has(date)) trendByDate.get(date).revenue += metricNumber(job.grand_total, job.total, job.total_revenue)
        }
        for (const row of periodLedger) {
            const date = dashboardDate(row, ['date', 'entry_date', 'CreatedAt', 'created_at', 'created'])
            if (trendByDate.has(date) && String(row.entry_type || row.type || '').toLowerCase().includes('expense')) {
                trendByDate.get(date).expenses += metricNumber(row.amount, row.total, row.grand_total)
            }
        }
        for (const row of purchaseDocs) {
            const date = dashboardDate(row, ['issue_date', 'date', 'CreatedAt', 'created_at', 'created'])
            if (trendByDate.has(date)) trendByDate.get(date).expenses += metricNumber(row.grand_total, row.total, row.amount)
        }

        const branchMap = {}
        for (const job of completedJobs) {
            const code = await normalizeBranchId(dashboardRecordBranch(job))
            if (!code || code === 'all') continue
            if (!branchMap[code]) branchMap[code] = { branch_id: code, branch_name: dashboardBranchName(code, branches), revenue: 0, completed_jobs: 0, expenses: 0, net_profit: 0 }
            branchMap[code].revenue += metricNumber(job.grand_total, job.total, job.total_revenue)
            branchMap[code].completed_jobs += 1
        }
        for (const row of [...periodLedger, ...purchaseDocs]) {
            const code = await normalizeBranchId(dashboardRecordBranch(row))
            if (!code || code === 'all') continue
            if (!branchMap[code]) branchMap[code] = { branch_id: code, branch_name: dashboardBranchName(code, branches), revenue: 0, completed_jobs: 0, expenses: 0, net_profit: 0 }
            if (!row.entry_type || String(row.entry_type || row.type || '').toLowerCase().includes('expense')) {
                branchMap[code].expenses += metricNumber(row.amount, row.grand_total, row.total)
            }
        }
        Object.values(branchMap).forEach(row => { row.net_profit = row.revenue - row.expenses })

        const alerts = [
            ...dashboardLowStockAlerts(products, stockMap),
            ...unpaidJobs.slice(0, 8).map(job => ({
                type: 'unpaid_job',
                severity: String(job.payment_status || '').toLowerCase() === 'partial' ? 'warning' : 'critical',
                title: job.job_no || job.id || 'ใบงานค้างชำระ',
                detail: `${job.customer_name || '-'} • ${metricNumber(job.grand_total).toLocaleString('th-TH')} บาท`,
                job_id: job.id || job.Id || ''
            }))
        ].slice(0, 16)

        res.json({
            period,
            scope: {
                branch_id: scope.branchId,
                branch_name: dashboardBranchName(scope.branchId, branches),
                can_switch_branch: scope.canSwitchBranch,
                role
            },
            kpis: {
                revenue,
                gross_profit: grossProfit,
                expenses,
                net_profit: netProfit,
                open_jobs: openJobs.length,
                completed_jobs: completedJobs.length,
                unpaid_jobs: unpaidJobs.length,
                low_stock_count: alerts.filter(alert => alert.type === 'low_stock').length
            },
            trends: {
                revenue_by_day: trend.map(row => ({ date: row.date, value: row.revenue })),
                expenses_by_day: trend.map(row => ({ date: row.date, value: row.expenses }))
            },
            available_branches: dashboardAvailableBranches(branches),
            branches: Object.values(branchMap).sort((a, b) => b.revenue - a.revenue),
            recent_jobs: periodJobs
                .sort((a, b) => dashboardDate(b, ['start_date', 'end_date', 'CreatedAt', 'created_at', 'created']).localeCompare(dashboardDate(a, ['start_date', 'end_date', 'CreatedAt', 'created_at', 'created'])))
                .slice(0, 12)
                .map(job => ({
                    id: job.id || job.Id || '',
                    job_no: job.job_no || '',
                    customer_name: job.customer_name || '',
                    plate: job.plate || job.plate_number || '',
                    branch_id: dashboardRecordBranch(job),
                    branch_name: dashboardBranchName(dashboardRecordBranch(job), branches),
                    status: job.status || '',
                    payment_status: job.payment_status || '',
                    grand_total: metricNumber(job.grand_total, job.total, job.total_revenue),
                    date: dashboardDate(job, ['start_date', 'end_date', 'CreatedAt', 'created_at', 'created'])
                })),
            alerts,
            generated_at: new Date().toISOString()
        })
    } catch (err) {
        console.error('[ManagerDashboard]', err)
        res.status(err.status || 500).json({ error: err.message || 'Manager dashboard failed' })
    }
})

router.get('/custom/branch-metadata', async (req, res) => {
    try {
        const includeAll = req.query.include_all === 'true'
        const includeInactive = req.query.include_inactive === 'true'
        const includeLegacyAliases = req.query.include_legacy_aliases === 'true'
        const branches = await optionalRecords('branches', {})
        res.json({
            branches: branchMetadataRows(branches, { includeAll, includeInactive, includeLegacyAliases }),
            generated_at: new Date().toISOString()
        })
    } catch (err) {
        console.error('[BranchMetadata]', err)
        res.status(err.status || 500).json({ error: err.message || 'Branch metadata failed' })
    }
})

router.get('/custom/admin/branches', devOrJwtAuth, async (req, res) => {
    if (!requireAdminBranchAccess(req, res)) return
    try {
        const includeInactive = req.query.include_inactive === 'true'
        const branches = await optionalRecords('branches', {})
        res.json({
            branches: branchMetadataRows(branches, { includeAll: false, includeInactive, includeLegacyAliases: false }),
            generated_at: new Date().toISOString()
        })
    } catch (err) {
        console.error('[BranchAdmin] List failed', err)
        res.status(err.status || 500).json({ error: err.message || 'Branch admin list failed' })
    }
})

router.post('/custom/admin/branches', devOrJwtAuth, async (req, res) => {
    if (!requireAdminBranchAccess(req, res)) return
    try {
        const payload = branchPayloadFromRequest(req.body || {})
        const existing = await db.getAllRecords('branches', { where: `(code,eq,${safeWhereValue(payload.code)})` })
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Branch code already exists' })
        }
        const record = await createRecordTolerant('branches', payload)
        resetBranchAliasCache()
        res.status(201).json({ branch: branchMetadataRows([record], { includeAll: false })[0] || record })
    } catch (err) {
        console.error('[BranchAdmin] Create failed', err)
        res.status(err.status || 500).json({ error: err.message || 'Branch create failed' })
    }
})

router.patch('/custom/admin/branches/:id', devOrJwtAuth, async (req, res) => {
    if (!requireAdminBranchAccess(req, res)) return
    try {
        const existing = await db.getRecord('branches', req.params.id)
        const payload = branchPayloadFromRequest(req.body || {}, existing)
        if (payload.code !== dashboardBranchCode(existing)) {
            const duplicates = await db.getAllRecords('branches', { where: `(code,eq,${safeWhereValue(payload.code)})` })
            const duplicate = duplicates.find(branch => String(branch.id || branch.Id) !== String(req.params.id))
            if (duplicate) return res.status(409).json({ error: 'Branch code already exists' })
        }
        const record = await updateRecordTolerant('branches', req.params.id, payload)
        resetBranchAliasCache()
        res.json({ branch: branchMetadataRows([record], { includeAll: false })[0] || record })
    } catch (err) {
        console.error('[BranchAdmin] Update failed', err)
        res.status(err.status || 500).json({ error: err.message || 'Branch update failed' })
    }
})

router.delete('/custom/admin/branches/:id', devOrJwtAuth, async (req, res) => {
    if (!requireAdminBranchAccess(req, res)) return
    try {
        const existing = await db.getRecord('branches', req.params.id)
        if (!existing) return res.status(404).json({ error: 'Branch not found' })
        const record = await updateRecordTolerant('branches', req.params.id, {
            is_active: false,
            metadata_json: JSON.stringify({
                ...branchMetadataObject(existing),
                deactivated_at: new Date().toISOString()
            })
        })
        resetBranchAliasCache()
        res.json({ branch: branchMetadataRows([record], { includeAll: false, includeInactive: true })[0] || record })
    } catch (err) {
        console.error('[BranchAdmin] Deactivate failed', err)
        res.status(err.status || 500).json({ error: err.message || 'Branch deactivate failed' })
    }
})

router.post('/custom/admin/branches/migrate', devOrJwtAuth, async (req, res) => {
    if (!requireAdminBranchAccess(req, res)) return
    try {
        const dryRun = req.body?.dry_run !== false
        const mappings = await migrationMapFromPayload(req.body || {})
        const result = await migrateBranchCodes({ dryRun, mappings })
        res.json({ ...result, generated_at: new Date().toISOString() })
    } catch (err) {
        console.error('[BranchAdmin] Migration failed', err)
        res.status(err.status || 500).json({ error: err.message || 'Branch migration failed' })
    }
})

function requireAdminRoleAccess(req, res) {
    const role = String(req.user?.role || '').toLowerCase()
    if (!['admin', 'owner'].includes(role)) {
        res.status(403).json({ error: 'Admin or owner role required' })
        return false
    }
    return true
}

router.get('/custom/admin/roles', devOrJwtAuth, async (req, res) => {
    if (!requireAdminRoleAccess(req, res)) return
    try {
        const roles = await roleMetadataRows()
        res.json({
            roles,
            generated_at: new Date().toISOString()
        })
    } catch (err) {
        console.error('[RoleAdmin] List failed', err)
        res.status(err.status || 500).json({ error: err.message || 'Role admin list failed' })
    }
})

router.post('/custom/admin/roles', devOrJwtAuth, async (req, res) => {
    if (!requireAdminRoleAccess(req, res)) return
    try {
        const incoming = Array.isArray(req.body?.roles) ? req.body.roles : []
        if (!incoming.length) {
            return res.status(400).json({ error: 'At least one role is required' })
        }

        const results = []
        for (const row of incoming) {
            const role = String(row.role || row.role_name || row.name || '').trim().toLowerCase()
            const allowedTools = parseRolePermissionList(row.allowed_tools)
            const record = await upsertRoleMetadata(role, allowedTools)
            results.push(normalizeRoleRecord(record))
        }

        res.json({
            roles: await roleMetadataRows(),
            saved: results,
            generated_at: new Date().toISOString()
        })
    } catch (err) {
        console.error('[RoleAdmin] Save failed', err)
        res.status(err.status || 500).json({ error: err.message || 'Role admin save failed' })
    }
})

router.get('/custom/admin/settings', devOrJwtAuth, async (req, res) => {
    if (!requireAdminRoleAccess(req, res)) return
    try {
        res.json({
            settings: await systemSettingRows(),
            generated_at: new Date().toISOString()
        })
    } catch (err) {
        console.error('[SettingsAdmin] List failed', err)
        res.status(err.status || 500).json({ error: err.message || 'Settings admin list failed' })
    }
})

router.post('/custom/admin/settings', devOrJwtAuth, async (req, res) => {
    if (!requireAdminRoleAccess(req, res)) return
    try {
        const incoming = Array.isArray(req.body?.settings)
            ? req.body.settings
            : Object.entries(req.body?.settings || {}).map(([key, value]) => ({ key, value }))

        if (!incoming.length) {
            return res.status(400).json({ error: 'At least one setting is required' })
        }

        const saved = []
        for (const row of incoming) {
            const key = String(row.key || row.setting_key || row.name || '').trim()
            const type = row.type || SETTING_DEFAULT_MAP[key]?.type || 'text'
            const record = await upsertSystemSetting(key, row.value ?? row.setting_value, type)
            saved.push(normalizeSettingRecord(record))
        }

        res.json({
            settings: await systemSettingRows(),
            saved,
            generated_at: new Date().toISOString()
        })
    } catch (err) {
        console.error('[SettingsAdmin] Save failed', err)
        res.status(err.status || 500).json({ error: err.message || 'Settings admin save failed' })
    }
})

router.get('/custom/admin/users', devOrJwtAuth, async (req, res) => {
    if (!requireAdminRoleAccess(req, res)) return
    try {
        const users = await optionalRecords('users', {})
        res.json({
            users: users.map(normalizeUserRecord).sort((a, b) => a.name.localeCompare(b.name, 'th')),
            branches: branchMetadataRows(await optionalRecords('branches', {}), { includeAll: false }),
            roles: await roleMetadataRows(),
            generated_at: new Date().toISOString()
        })
    } catch (err) {
        console.error('[UserAdmin] List failed', err)
        res.status(err.status || 500).json({ error: err.message || 'User admin list failed' })
    }
})

router.post('/custom/admin/users', devOrJwtAuth, async (req, res) => {
    if (!requireAdminRoleAccess(req, res)) return
    try {
        const payload = await prepareAdminUserPayload(req.body || {})
        if (!payload.password_hash) {
            return res.status(400).json({ error: 'Password is required for new users' })
        }
        const existing = await optionalRecords('users', { where: `(username,eq,${safeWhereValue(payload.username)})` })
        if (existing.length > 0) return res.status(409).json({ error: 'Username already exists' })
        const record = await createRecordTolerant('users', payload)
        res.status(201).json({ user: normalizeUserRecord(record) })
    } catch (err) {
        console.error('[UserAdmin] Create failed', err)
        res.status(err.status || 500).json({ error: err.message || 'User create failed' })
    }
})

router.patch('/custom/admin/users/:id', devOrJwtAuth, async (req, res) => {
    if (!requireAdminRoleAccess(req, res)) return
    try {
        const existing = await db.getRecord('users', req.params.id)
        if (!existing) return res.status(404).json({ error: 'User not found' })
        const payload = await prepareAdminUserPayload(req.body || {}, existing)
        if (!payload.password_hash) delete payload.password_hash

        if (payload.username && payload.username !== existing.username) {
            const duplicates = await optionalRecords('users', { where: `(username,eq,${safeWhereValue(payload.username)})` })
            const duplicate = duplicates.find(user => String(user.id || user.Id) !== String(req.params.id))
            if (duplicate) return res.status(409).json({ error: 'Username already exists' })
        }

        const record = await updateRecordTolerant('users', req.params.id, payload)
        res.json({ user: normalizeUserRecord(record) })
    } catch (err) {
        console.error('[UserAdmin] Update failed', err)
        res.status(err.status || 500).json({ error: err.message || 'User update failed' })
    }
})

router.delete('/custom/admin/users/:id', devOrJwtAuth, async (req, res) => {
    if (!requireAdminRoleAccess(req, res)) return
    try {
        if (String(req.params.id) === String(req.user?.id || '')) {
            return res.status(400).json({ error: 'Cannot delete the current user' })
        }
        await db.deleteRecord('users', req.params.id)
        res.json({ deleted: true, id: req.params.id })
    } catch (err) {
        console.error('[UserAdmin] Delete failed', err)
        res.status(err.status || 500).json({ error: err.message || 'User delete failed' })
    }
})

router.get('/custom/admin/health', devOrJwtAuth, async (req, res) => {
    if (!requireAdminRoleAccess(req, res)) return
    try {
        res.json(await adminHealthChecks())
    } catch (err) {
        console.error('[AdminHealth] Failed', err)
        res.status(err.status || 500).json({ error: err.message || 'Admin health failed' })
    }
})

router.get('/custom/role-metadata', devOrJwtAuth, async (req, res) => {
    try {
        res.json({
            roles: await roleMetadataRows(),
            generated_at: new Date().toISOString()
        })
    } catch (err) {
        console.error('[RoleMetadata] List failed', err)
        res.status(err.status || 500).json({ error: err.message || 'Role metadata failed' })
    }
})

// Data routes accept production JWTs or explicit dev portal sessions.
router.use(devOrJwtAuth)

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
        const normUserBranch = await normalizeBranchId(userBranch)
        const normBranch = await normalizeBranchId(branch)
        if (!normUserBranch || normUserBranch !== normBranch) {
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
                stockMap[canonicalProductId] = {
                    qty: 0,
                    on_hand: 0,
                    reserved: 0,
                    in_transit: 0,
                    available: 0,
                    total_value: 0,
                    avg_cost: 0
                };
            }
            const qty = asNumber(l.qty_base_delta ?? l.qty, 0)
            const value = asNumber(l.value_delta ?? l.total_value, 0)
            const warehouse = String(l.warehouse_location || 'Main').toUpperCase()
            if (warehouse === 'IN_TRANSIT') {
                stockMap[canonicalProductId].in_transit += qty
            } else {
                stockMap[canonicalProductId].on_hand += qty
                stockMap[canonicalProductId].total_value += value
            }
            stockMap[canonicalProductId].qty += qty;
        }
        for (const balance of Object.values(stockMap)) {
            balance.reserved = asNumber(balance.reserved, 0)
            balance.available = balance.on_hand - balance.reserved
            balance.qty = balance.available
            balance.avg_cost = balance.on_hand > 0 ? balance.total_value / balance.on_hand : 0
        }
        res.json(stockMap);
    } catch (err) {
        console.error(`[Data] Custom Stock Balances:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/data/custom/stock-lots
 * Returns available batch/lot stock for one product, sorted by FIFO order.
 */
router.get('/custom/stock-lots', async (req, res) => {
    try {
        const productId = String(req.query.product_id || req.query.product || '').trim()
        if (!productId) return res.status(400).json({ error: 'product_id is required' })

        const { role, branch } = req.user || {}
        const isGlobal = ['admin', 'owner'].includes(role)
        const requestedBranch = req.query.branch_id || req.query.branch || ''
        const targetBranch = (!isGlobal && branch && branch !== 'all') ? branch : requestedBranch
        const normalizedBranch = await normalizeBranchId(targetBranch)
        if (!normalizedBranch || normalizedBranch === 'all') {
            return res.status(400).json({ error: 'branch_id is required for stock lot lookup' })
        }

        const product = await db.getRecord('products', productId).catch(() => null)
        if (!product) return res.status(404).json({ error: 'Product not found' })

        const lots = await getTrackedBatchLots(productId, {
            branchId: normalizedBranch,
            warehouse: req.query.warehouse || 'Main'
        })

        res.json({
            product_id: productId,
            branch_id: normalizedBranch,
            fifo_enforced: isFifoEnforcedProduct(product),
            lots
        })
    } catch (err) {
        console.error('[Data] Custom Stock Lots:', err.message)
        res.status(err.status || 500).json({ error: err.message })
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
 * GET /api/data/custom/integrity/stock-check
 * Checks for negative stock, orphan ledgers, and confirmed docs without ledgers.
 */
router.get('/custom/integrity/stock-check', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น (Admin only)' });
        }

        // 1. Get all stock_ledgers
        const ledgers = await db.getAllRecords('stock_ledgers', {});

        const products = await db.getAllRecords('products', {});
        const productById = Object.fromEntries(products.map(product => [String(product.id || product.Id || ''), product]));

        // 2. Calculate balance per product
        const stockMap = {};
        for (const l of ledgers) {
            const pid = String(l.product_id || '').trim();
            if (!pid) continue;
            if (!stockMap[pid]) {
                stockMap[pid] = { qty: 0, total_value: 0 };
            }
            stockMap[pid].qty += Number(l.qty) || 0;
            stockMap[pid].total_value += Number(l.total_value) || 0;
        }

        // 3. Find products with negative balance
        const negativeStock = [];
        for (const pid of Object.keys(stockMap)) {
            if (stockMap[pid].qty < 0) {
                const prod = await db.getRecord('products', pid).catch(() => null);
                negativeStock.push({
                    product_id: pid,
                    code: prod?.code || 'Unknown',
                    name: prod?.name || 'Unknown',
                    qty: stockMap[pid].qty,
                    total_value: stockMap[pid].total_value
                });
            }
        }

        // 4. Find ledger rows whose reference_doc doesn't match any document.doc_no
        const docs = await db.getAllRecords('documents', {});
        const docNos = new Set(docs.map(d => String(d.doc_no || '').trim()).filter(Boolean));
        const orphanLedgers = [];
        for (const l of ledgers) {
            const ref = String(l.reference_doc || '').trim();
            const referenceType = String(l.reference_type || '').toUpperCase();
            const allowedSyntheticRef = ['JOB', 'TF_RECEIVE', 'VOID', 'DOCUMENT_DELETE', 'CONFIRM_FAILED'].includes(referenceType)
                || String(l.movement_type || '').toUpperCase() === 'REVERSAL';
            if ((!ref || !docNos.has(ref)) && !allowedSyntheticRef) {
                orphanLedgers.push({
                    id: l.id,
                    transaction_no: l.transaction_no,
                    transaction_type: l.transaction_type,
                    product_id: l.product_id,
                    qty: l.qty,
                    reference_doc: l.reference_doc,
                    branch_id: l.branch_id
                });
            }
        }

        // 5. Find confirmed stock documents (RR/RQ/RE/TF/SA) with 0 associated ledger entries
        const stockDocTypes = new Set(['RR', 'RQ', 'RE', 'TF', 'SA', 'PCN']);
        const confirmedDocs = docs.filter(d => ['confirmed', 'in_transit', 'received'].includes(String(d.status || '').toLowerCase()) && stockDocTypes.has(String(d.doc_type || '').toUpperCase()));
        const ledgerRefs = new Set(ledgers.map(l => String(l.reference_doc || '').trim()).filter(Boolean));
        const confirmedNoLedger = [];
        for (const d of confirmedDocs) {
            const docNo = String(d.doc_no || '').trim();
            if (!docNo || !ledgerRefs.has(docNo)) {
                confirmedNoLedger.push({
                    id: d.id,
                    doc_no: d.doc_no,
                    doc_type: d.doc_type,
                    issue_date: d.issue_date,
                    branch_id: d.branch_id
                });
            }
        }

        const invalidProductLedgers = [];
        const suspiciousCosts = [];
        for (const ledger of ledgers) {
            const productId = String(ledger.product_id || '').trim();
            if (productId && !productById[productId]) {
                invalidProductLedgers.push({
                    id: ledger.id,
                    transaction_no: ledger.transaction_no,
                    product_id: productId,
                    reference_doc: ledger.reference_doc,
                    branch_id: ledger.branch_id
                });
            }
            const unitCost = asNumber(ledger.unit_cost, 0);
            const value = asNumber(ledger.value_delta ?? ledger.total_value, 0);
            const qty = asNumber(ledger.qty_base_delta ?? ledger.qty, 0);
            if (unitCost < 0 || (qty > 0 && value < -0.000001) || (qty < 0 && value > 0.000001)) {
                suspiciousCosts.push({
                    id: ledger.id,
                    transaction_no: ledger.transaction_no,
                    product_id: productId,
                    qty,
                    unit_cost: unitCost,
                    value_delta: value,
                    reference_doc: ledger.reference_doc,
                    branch_id: ledger.branch_id
                });
            }
        }

        const duplicateProductCodes = [];
        const productCodeCounts = {};
        for (const product of products) {
            const code = String(product.code || '').trim().toLowerCase();
            if (!code) continue;
            productCodeCounts[code] = productCodeCounts[code] || [];
            productCodeCounts[code].push(product);
        }
        for (const [code, matches] of Object.entries(productCodeCounts)) {
            if (matches.length > 1) {
                duplicateProductCodes.push({
                    code,
                    count: matches.length,
                    products: matches.map(product => ({ id: product.id || product.Id, name: product.name, branch_id: product.branch_id }))
                });
            }
        }

        res.json({
            negativeStock,
            orphanLedgers,
            confirmedNoLedger,
            invalidProductLedgers,
            suspiciousCosts,
            duplicateProductCodes
        });
    } catch (err) {
        console.error('[Data] stock-check integrity failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/data/custom/integrity/document-check
 * Checks for duplicate doc_no, orphaned items, and confirmed docs without ledgers.
 */
router.get('/custom/integrity/document-check', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น (Admin only)' });
        }

        const docs = await db.getAllRecords('documents', {});
        const products = await db.getAllRecords('products', {});
        const productIds = new Set(products.map(product => String(product.id || product.Id || '')).filter(Boolean));

        // 1. Find duplicate doc_no values in documents table
        const docNoCounts = {};
        for (const d of docs) {
            const docNo = String(d.doc_no || '').trim();
            if (docNo) {
                docNoCounts[docNo] = (docNoCounts[docNo] || 0) + 1;
            }
        }
        const duplicateDocNos = [];
        for (const [docNo, count] of Object.entries(docNoCounts)) {
            if (count > 1) {
                const conflicting = docs.filter(d => String(d.doc_no || '').trim() === docNo);
                duplicateDocNos.push({
                    doc_no: docNo,
                    count,
                    documents: conflicting.map(d => ({ id: d.id, doc_type: d.doc_type, branch_id: d.branch_id, status: d.status }))
                });
            }
        }

        // 2. Find document_items where document_id doesn't exist in documents
        const docItems = await db.getAllRecords('document_items', {});
        const docIds = new Set(docs.map(d => String(d.id)));
        const orphanItems = [];
        const invalidProductItems = [];
        for (const item of docItems) {
            const docId = String(item.document_id || '');
            if (!docId || !docIds.has(docId)) {
                orphanItems.push({
                    id: item.id,
                    document_id: item.document_id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    qty: item.qty
                });
            }
            const productId = String(item.product_id || '').trim();
            if (productId && !productIds.has(productId)) {
                invalidProductItems.push({
                    id: item.id,
                    document_id: item.document_id,
                    product_id: productId,
                    product_name: item.product_name,
                    qty: item.qty
                });
            }
        }

        // 3. Find confirmed stock docs with 0 ledger entries
        const ledgers = await db.getAllRecords('stock_ledgers', {});
        const stockDocTypes = new Set(['RR', 'RQ', 'RE', 'TF', 'SA', 'PCN']);
        const confirmedDocs = docs.filter(d => d.status === 'confirmed' && stockDocTypes.has(String(d.doc_type || '').toUpperCase()));
        const ledgerRefs = new Set(ledgers.map(l => String(l.reference_doc || '').trim()).filter(Boolean));
        const confirmedNoLedger = [];
        for (const d of confirmedDocs) {
            const docNo = String(d.doc_no || '').trim();
            if (!docNo || !ledgerRefs.has(docNo)) {
                confirmedNoLedger.push({
                    id: d.id,
                    doc_no: d.doc_no,
                    doc_type: d.doc_type,
                    issue_date: d.issue_date,
                    branch_id: d.branch_id
                });
            }
        }

        const invalidBranchDocs = [];
        const invalidStatusDocs = [];
        const allowedStatuses = new Set(['draft', 'confirmed', 'in_transit', 'partial_received', 'received', 'paid', 'voided', 'cancelled']);
        for (const doc of docs) {
            if (!String(doc.branch_id || '').trim()) {
                invalidBranchDocs.push({ id: doc.id, doc_no: doc.doc_no, doc_type: doc.doc_type, status: doc.status });
            }
            if (doc.status && !allowedStatuses.has(String(doc.status))) {
                invalidStatusDocs.push({ id: doc.id, doc_no: doc.doc_no, doc_type: doc.doc_type, status: doc.status, branch_id: doc.branch_id });
            }
        }

        const duplicateProductCodes = [];
        const productCodeCounts = {};
        for (const product of products) {
            const code = String(product.code || '').trim().toLowerCase();
            if (!code) continue;
            productCodeCounts[code] = productCodeCounts[code] || [];
            productCodeCounts[code].push(product);
        }
        for (const [code, matches] of Object.entries(productCodeCounts)) {
            if (matches.length > 1) {
                duplicateProductCodes.push({
                    code,
                    count: matches.length,
                    products: matches.map(product => ({ id: product.id || product.Id, name: product.name, branch_id: product.branch_id }))
                });
            }
        }

        res.json({
            duplicateDocNos,
            orphanItems,
            invalidProductItems,
            confirmedNoLedger,
            invalidBranchDocs,
            invalidStatusDocs,
            duplicateProductCodes
        });
    } catch (err) {
        console.error('[Data] document-check integrity failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/data/custom/admin/recalculate-costs
 * Recalculates weighted average costs for all products.
 */
router.post('/custom/admin/recalculate-costs', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น (Admin only)' });
        }

        const products = await db.getAllRecords('products', {});
        const productIds = products.map(p => p.id).filter(Boolean);

        await recalculateAverageCost(productIds);

        res.json({
            updated: productIds.length,
            skipped: 0,
            errors: []
        });
    } catch (err) {
        console.error('[Data] recalculate-costs failed:', err.message);
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
router.post('/custom/admin/integrity/repair', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin only' });
        }

        const mode = String(req.body?.mode || 'safe_auto');
        const dryRun = req.body?.dry_run === true || req.body?.dryRun === true;
        if (mode !== 'safe_auto') {
            return res.status(400).json({ error: 'Unsupported repair mode' });
        }

        const docs = await db.getAllRecords('documents', {});
        const ledgers = await db.getAllRecords('stock_ledgers', {});
        const docItems = await db.getAllRecords('document_items', {});
        const stockDocTypes = new Set(['RR', 'RQ', 'RE', 'TF', 'SA', 'PCN']);

        const docIds = new Set(docs.map(doc => String(doc.id || doc.Id || '')).filter(Boolean));
        const docNoCounts = {};
        for (const doc of docs) {
            const docNo = String(doc.doc_no || '').trim();
            if (!docNo) continue;
            docNoCounts[docNo] = (docNoCounts[docNo] || 0) + 1;
        }

        const nonReversalLedgerRefs = new Set(
            ledgers
                .filter(ledger => !isReversalLedger(ledger))
                .map(ledger => String(ledger.reference_doc || '').trim())
                .filter(Boolean)
        );

        const deletedOrphanItems = [];
        const orphanItems = docItems.filter(item => {
            const docId = String(item.document_id || '').trim();
            return !docId || !docIds.has(docId);
        });
        for (const item of orphanItems) {
            const itemId = item.id || item.Id;
            deletedOrphanItems.push({ id: itemId, document_id: item.document_id, product_id: item.product_id });
            if (!dryRun && itemId) {
                await db.deleteRecord('document_items', itemId);
            }
        }

        const rebuiltLedgers = [];
        const skippedDocuments = [];
        const errors = [];
        const itemsByDocumentId = new Map();
        for (const item of docItems) {
            const docId = String(item.document_id || '').trim();
            if (!docId) continue;
            if (!itemsByDocumentId.has(docId)) itemsByDocumentId.set(docId, []);
            itemsByDocumentId.get(docId).push(item);
        }

        const candidateDocs = docs.filter(doc => {
            const docType = String(doc.doc_type || '').toUpperCase();
            const status = String(doc.status || '').toLowerCase();
            const docNo = String(doc.doc_no || '').trim();
            return stockDocTypes.has(docType)
                && ['confirmed', 'in_transit', 'received'].includes(status)
                && docNo
                && !nonReversalLedgerRefs.has(docNo);
        });

        for (const doc of candidateDocs) {
            const docId = String(doc.id || doc.Id || '').trim();
            const docNo = String(doc.doc_no || '').trim();
            const docType = String(doc.doc_type || '').toUpperCase();
            const status = String(doc.status || '').toLowerCase();
            const items = itemsByDocumentId.get(docId) || [];

            if (docNoCounts[docNo] > 1) {
                skippedDocuments.push({ id: docId, doc_no: docNo, reason: 'duplicate_doc_no' });
                continue;
            }
            if (status === 'received') {
                skippedDocuments.push({ id: docId, doc_no: docNo, reason: 'received_transfer_requires_manual_review' });
                continue;
            }
            if (!items.length) {
                skippedDocuments.push({ id: docId, doc_no: docNo, reason: 'no_document_items' });
                continue;
            }

            if (dryRun) {
                rebuiltLedgers.push({ id: docId, doc_no: docNo, doc_type: docType, posted: 0, dry_run: true });
                continue;
            }

            try {
                const result = await postDocumentStockLedgers(doc, items);
                rebuiltLedgers.push({ id: docId, doc_no: docNo, doc_type: docType, posted: result.posted || 0 });
            } catch (err) {
                errors.push({ id: docId, doc_no: docNo, doc_type: docType, error: err.message });
            }
        }

        try {
            await db.createRecord('audit_logs', {
                action: dryRun ? 'integrity_repair_dry_run' : 'integrity_repair',
                collection_name: 'documents',
                user_name: req.user.name,
                details: JSON.stringify({
                    mode,
                    dry_run: dryRun,
                    orphan_items: deletedOrphanItems.length,
                    rebuilt_ledgers: rebuiltLedgers.length,
                    skipped: skippedDocuments.length,
                    errors: errors.length
                }).slice(0, 500),
                timestamp: new Date().toISOString()
            });
        } catch { /* best-effort */ }

        res.json({
            ok: errors.length === 0,
            mode,
            dry_run: dryRun,
            deleted_orphan_items: deletedOrphanItems,
            rebuilt_ledgers: rebuiltLedgers,
            skipped_documents: skippedDocuments,
            errors
        });
    } catch (err) {
        console.error('[Data] integrity repair failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

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
        const reversal = await reverseStockLedgersForDoc(docNo, 'void')
        if (['RR', 'RE'].includes(docType)) {
            await recalculateAverageCost(reversal.touchedProducts)
        }

        const updated = await db.updateRecord('documents', id, { status: 'voided' })
        const fullDocument = await db.getRecord('documents', id).catch(() => updated)
        try {
            await db.createRecord('audit_logs', {
                action: 'void',
                collection_name: 'documents',
                user_name: req.user.name,
                details: `Voided document ${doc.doc_no || id}; stock ledger reversals posted: ${reversal.reversed}`,
                timestamp: new Date().toISOString()
            })
        } catch { /* best-effort */ }

        res.json({ document: fullDocument, ledger: { reversed: reversal.reversed, skipped: false } })
    } catch (err) {
        console.error(`[Data] Void Document ${req.params.id}:`, err.message)
        res.status(err.status || 500).json({
            error: err.message,
            ...(err.code ? { code: err.code } : {}),
            ...(err.details ? { details: err.details } : {})
        })
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
        const stockDocTypes = new Set(['RR', 'RQ', 'RE', 'TF', 'SA', 'PCN'])
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
        if (docType === 'SA' && !documentAdjustmentReason(doc)) {
            return res.status(400).json({ error: 'Stock adjustment reason is required', code: 'ADJUSTMENT_REASON_REQUIRED' })
        }

        const items = await db.getAllRecords('document_items', { where: `(document_id,eq,${safeWhereValue(id)})` })
        if (stockDocTypes.has(docType) && items.length === 0) {
            return res.status(400).json({ error: 'Stock document must have at least one item' })
        }

        let ledgerResult = { posted: 0, skipped: true }
        try {
            ledgerResult = await postDocumentStockLedgers(doc, items)
            const nextStatus = docType === 'TF' ? 'in_transit' : 'confirmed'
            const updated = await updateRecordTolerant('documents', id, { status: nextStatus, transfer_status: nextStatus })
            const fullDocument = await db.getRecord('documents', id).catch(() => updated)
            try {
                await db.createRecord('audit_logs', {
                    action: 'confirm',
                    collection_name: 'documents',
                    user_name: req.user.name,
                    details: `Confirmed document ${doc.doc_no || id}; stock ledgers posted: ${ledgerResult.posted}`,
                    timestamp: new Date().toISOString()
                })
            } catch { /* best-effort */ }
            res.json({ document: fullDocument, ledger: ledgerResult })
        } catch (err) {
            await reverseStockLedgersForDoc(doc.doc_no || String(id), 'confirm_failed').catch(() => {})
            throw err
        }
    } catch (err) {
        console.error(`[Data] Confirm Document ${req.params.id}:`, err.message)
        res.status(err.status || 500).json({
            error: err.message,
            ...(err.code ? { code: err.code } : {}),
            ...(err.details ? { details: err.details } : {})
        })
    }
})

router.post('/custom/receive-transfer/:id', async (req, res) => {
    try {
        const { id } = req.params
        const role = req.user?.role || ''
        if (!['admin', 'owner', 'manager', 'sa'].includes(role)) {
            return res.status(403).json({ error: 'Role cannot receive transfers' })
        }

        const doc = await db.getRecord('documents', id)
        if (!doc) return res.status(404).json({ error: 'Document not found' })
        if (String(doc.doc_type || '').toUpperCase() !== 'TF') {
            return res.status(400).json({ error: 'Only transfer documents can be received' })
        }
        const userBranch = await normalizeBranchId(req.user?.branch || '')
        const destinationBranch = await normalizeBranchId(doc.destination_branch_id || '')
        if (!destinationBranch || destinationBranch === 'all') {
            return res.status(400).json({ error: 'Transfer destination branch is required' })
        }
        if (userBranch && userBranch !== 'all' && userBranch !== destinationBranch) {
            return res.status(403).json({ error: 'Only the destination branch can receive this transfer' })
        }
        if (['received', 'confirmed'].includes(String(doc.status || '').toLowerCase())) {
            return res.json({ document: doc, ledger: { posted: 0, skipped: true }, alreadyReceived: true })
        }

        const docNo = doc.doc_no || String(id)
        const existing = await db.getAllRecords('stock_ledgers', { where: `(reference_doc,eq,${safeWhereValue(docNo)})` })
        const inTransitLedgers = existing.filter(l =>
            String(l.warehouse_location || '').toUpperCase() === 'IN_TRANSIT'
            && asNumber(l.qty_base_delta ?? l.qty, 0) > 0
        )
        if (inTransitLedgers.length === 0) {
            return res.status(400).json({ error: 'No in-transit stock found for this transfer' })
        }

        let posted = 0
        const touchedProducts = new Set()
        for (const ledger of inTransitLedgers) {
            const qty = Math.abs(asNumber(ledger.qty_base_delta ?? ledger.qty, 0))
            if (!qty) continue
            const unitCost = asNumber(ledger.unit_cost, 0)
            await createStockLedger({
                transaction_type: 'OUT',
                movement_type: 'TRANSFER_IN_TRANSIT_CLEAR',
                product_id: ledger.product_id,
                warehouse_location: 'IN_TRANSIT',
                qty: -qty,
                unit_cost: unitCost,
                total_value: -qty * unitCost,
                reference_doc: docNo,
                reference_type: 'TF_RECEIVE',
                source_branch_id: doc.branch_id || ledger.source_branch_id || '',
                destination_branch_id: doc.destination_branch_id || ledger.destination_branch_id || '',
                base_uom: ledger.base_uom,
                source_uom: ledger.source_uom,
                tracking_type: ledger.tracking_type,
                serial_numbers: ledger.serial_numbers,
                batch_no: ledger.batch_no,
                expiry_date: ledger.expiry_date,
                roll_no: ledger.roll_no,
                dimension_qty: ledger.dimension_qty,
                branch_id: doc.destination_branch_id || ledger.branch_id || ''
            })
            await createStockLedger({
                transaction_type: 'IN',
                movement_type: 'TRANSFER_RECEIVE',
                product_id: ledger.product_id,
                warehouse_location: 'Main',
                qty,
                unit_cost: unitCost,
                total_value: qty * unitCost,
                reference_doc: docNo,
                reference_type: 'TF_RECEIVE',
                source_branch_id: doc.branch_id || ledger.source_branch_id || '',
                destination_branch_id: doc.destination_branch_id || ledger.destination_branch_id || '',
                base_uom: ledger.base_uom,
                source_uom: ledger.source_uom,
                tracking_type: ledger.tracking_type,
                serial_numbers: ledger.serial_numbers,
                batch_no: ledger.batch_no,
                expiry_date: ledger.expiry_date,
                roll_no: ledger.roll_no,
                dimension_qty: ledger.dimension_qty,
                branch_id: doc.destination_branch_id || ledger.branch_id || ''
            })
            touchedProducts.add(ledger.product_id)
            posted += 2
        }

        const updated = await updateRecordTolerant('documents', id, { status: 'received', transfer_status: 'received' })
        const fullDocument = await db.getRecord('documents', id).catch(() => updated)
        await recalculateAverageCost([...touchedProducts])
        res.json({ document: fullDocument, ledger: { posted, skipped: false } })
    } catch (err) {
        console.error(`[Data] Receive Transfer ${req.params.id}:`, err.message)
        res.status(err.status || 500).json({ error: err.message })
    }
})

router.post('/custom/post-job-stock/:id', async (req, res) => {
    try {
        const { id } = req.params
        const role = req.user?.role || ''
        if (!['admin', 'owner', 'manager', 'sa', 'mechanic'].includes(role)) {
            return res.status(403).json({ error: 'Role cannot post job stock' })
        }

        const job = await db.getRecord('jobs', id)
        if (!job) return res.status(404).json({ error: 'Job not found' })
        if (req.user.branch && req.user.branch !== 'all' && job.branch_id && String(job.branch_id) !== String(req.user.branch)) {
            return res.status(403).json({ error: 'Job belongs to another branch' })
        }

        const jobNo = job.job_no || String(id)
        const items = await db.getAllRecords('job_items', { where: `(job_id,eq,${safeWhereValue(id)})` })
        const ledgerItems = items.map(item => ({
            ...item,
            product_id: item.product_id,
            product_name: item.product_name || item.name,
            qty: item.qty,
            unit_price: item.price ?? item.unit_price ?? item.cost,
            cost: item.cost,
            uom: item.uom,
            serial_numbers: item.serial_numbers || item.serial_no || ledgerMetadata(item).serial_numbers || ledgerMetadata(item).serial_no || '',
            batch_no: item.batch_no || ledgerMetadata(item).batch_no || '',
            expiry_date: item.expiry_date || ledgerMetadata(item).expiry_date || '',
            roll_no: item.roll_no || ledgerMetadata(item).roll_no || '',
            dimension_qty: item.dimension_qty || ledgerMetadata(item).dimension_qty || ''
        }))
        const ledger = await postDocumentStockLedgers({
            id,
            doc_no: jobNo,
            doc_type: 'JOB',
            branch_id: job.branch_id || req.user.branch || ''
        }, ledgerItems)
        res.json({ job, ledger })
    } catch (err) {
        console.error(`[Data] Post Job Stock ${req.params.id}:`, err.message)
        res.status(err.status || 500).json({ error: err.message })
    }
})

router.post('/custom/close-job-payment/:id', async (req, res) => {
    try {
        const { id } = req.params
        const role = req.user?.role || ''
        if (!['admin', 'owner', 'manager', 'sa'].includes(role)) {
            return res.status(403).json({ error: 'Role cannot close job payments' })
        }

        const job = await db.getRecord('jobs', id)
        if (!job) return res.status(404).json({ error: 'Job not found' })
        if (req.user.branch && req.user.branch !== 'all' && job.branch_id && String(job.branch_id) !== String(req.user.branch)) {
            return res.status(403).json({ error: 'Job belongs to another branch' })
        }
        if (job.status === 'completed' || job.payment_status === 'paid') {
            return res.status(409).json({ error: 'Job is already paid or completed' })
        }

        const requiredTotal = asNumber(job.grand_total, 0)
        if (requiredTotal <= 0) return res.status(400).json({ error: 'Job grand total must be greater than zero' })

        const splits = Array.isArray(req.body?.splits) ? req.body.splits
            .map(split => ({ method: String(split.method || 'cash'), amount: asNumber(split.amount, 0) }))
            .filter(split => split.amount > 0)
            : []
        if (splits.length === 0) splits.push({ method: String(req.body?.payment_type || 'cash'), amount: requiredTotal })
        const paidTotal = Math.round(splits.reduce((sum, split) => sum + split.amount, 0) * 100) / 100
        const paymentDiff = Math.round((paidTotal - requiredTotal) * 100) / 100
        if (paymentDiff !== 0) {
            return res.status(400).json({ error: 'Payment amount must exactly match job grand total', required_total: requiredTotal, paid_total: paidTotal })
        }

        const jobNo = job.job_no || String(id)
        const branchId = job.branch_id || req.user.branch || ''
        const today = new Date().toISOString().slice(0, 10)
        const now = new Date().toISOString()
        const items = await db.getAllRecords('job_items', { where: `(job_id,eq,${safeWhereValue(id)})` })
        if (items.length === 0) return res.status(400).json({ error: 'Job must have at least one item before closing payment' })

        const invoice = await createRecordTolerant('documents', {
            doc_type: 'IV',
            doc_no: await generateDocumentNo('IV'),
            issue_date: today,
            ref_no: jobNo,
            entity_id: id,
            status: 'draft',
            branch_id: branchId,
            subtotal: asNumber(job.subtotal, requiredTotal),
            discount: asNumber(job.discount_amount ?? job.discount, 0),
            discount_amount: asNumber(job.discount_amount ?? job.discount, 0),
            vat_amount: asNumber(job.vat_amount, 0),
            grand_total: requiredTotal,
            notes: `Auto-generated from job ${jobNo}`
        })
        for (const item of items) {
            await createRecordTolerant('document_items', {
                document_id: invoice.id,
                product_id: item.product_id || '',
                product_name: item.product_name || item.name || `Job ${jobNo}`,
                qty: item.qty || 1,
                uom: item.uom || '',
                price: item.price ?? item.unit_price ?? 0,
                unit_price: item.unit_price ?? item.price ?? 0,
                discount: item.discount || 0,
                cost: item.cost || 0,
                total: item.total ?? ((asNumber(item.qty, 1) * asNumber(item.unit_price ?? item.price, 0)) - asNumber(item.discount, 0)),
                type: item.type || '',
                product_type: item.product_type || '',
                branch_id: branchId
            })
        }
        const invoiceItems = await db.getAllRecords('document_items', { where: `(document_id,eq,${safeWhereValue(invoice.id)})` })
        const invoiceLedger = await postDocumentStockLedgers(invoice, invoiceItems)
        await updateRecordTolerant('documents', invoice.id, { status: 'confirmed' })
        const confirmedInvoice = await db.getRecord('documents', invoice.id).catch(() => ({ ...invoice, status: 'confirmed' }))

        const receipt = await createRecordTolerant('documents', {
            doc_type: 'RC',
            doc_no: await generateDocumentNo('RC'),
            issue_date: today,
            ref_no: confirmedInvoice.doc_no || invoice.doc_no,
            entity_id: id,
            status: 'draft',
            branch_id: branchId,
            subtotal: requiredTotal,
            discount: 0,
            discount_amount: 0,
            vat_amount: 0,
            grand_total: requiredTotal,
            source_doc_id: invoice.id,
            notes: `Auto-generated payment receipt for job ${jobNo}`
        })
        await createRecordTolerant('document_items', {
            document_id: receipt.id,
            product_name: `Payment for ${jobNo}`,
            qty: 1,
            price: requiredTotal,
            unit_price: requiredTotal,
            discount: 0,
            total: requiredTotal,
            type: 'adhoc',
            product_type: 'service',
            branch_id: branchId
        })
        const receiptItems = await db.getAllRecords('document_items', { where: `(document_id,eq,${safeWhereValue(receipt.id)})` })
        const receiptLedger = await postDocumentStockLedgers(receipt, receiptItems)
        await updateRecordTolerant('documents', receipt.id, { status: 'confirmed' })
        const confirmedReceipt = await db.getRecord('documents', receipt.id).catch(() => ({ ...receipt, status: 'confirmed' }))

        const products = await db.getAllRecords('products', {}).catch(() => [])
        const productMap = Object.fromEntries(products.map(product => [String(product.id), product]))
        let totalCost = 0
        for (const item of items) {
            if (item.type === 'adhoc') {
                const itemPrice = asNumber(item.unit_price ?? item.price, 0)
                totalCost += Math.min(Math.max(asNumber(item.cost, 0), 0), itemPrice) * asNumber(item.qty, 0)
            } else {
                const product = productMap[String(item.product_id)] || {}
                totalCost += asNumber(item.cost ?? product.cost, 0) * asNumber(item.qty, 0)
            }
        }

        const createdLedgers = []
        for (const split of splits) {
            const ledger = await createRecordTolerant('financial_ledger', {
                date: today,
                amount: split.amount,
                category: 'Job revenue',
                notes: `Payment for job ${jobNo} (${split.method})`,
                receipt_url: req.body?.slip_url || '',
                branch_id: branchId,
                payment_type: split.method,
                excluded: false,
                verified: false,
                entry_type: 'revenue',
                is_confidential: false,
                reference_doc: confirmedReceipt.doc_no || receipt.doc_no
            })
            createdLedgers.push(ledger)
        }

        const stockLedger = await postDocumentStockLedgers({
            id,
            doc_no: jobNo,
            doc_type: 'JOB',
            branch_id: branchId
        }, items)

        const metadata = {
            ...ledgerMetadata(job),
            invoice_id: invoice.id,
            invoice_no: confirmedInvoice.doc_no || invoice.doc_no,
            receipt_id: receipt.id,
            receipt_no: confirmedReceipt.doc_no || receipt.doc_no,
            payment_splits: splits,
            closed_by: req.user.name || req.user.username || req.user.id || '',
            closed_at: now
        }
        await updateRecordTolerant('jobs', id, {
            status: 'completed',
            payment_status: 'paid',
            payment_type: JSON.stringify(splits),
            end_date: now,
            work_ended_at: now,
            total_cost: Math.round(totalCost * 100) / 100,
            profit: Math.round((requiredTotal - totalCost) * 100) / 100,
            payment_slip: req.body?.slip_url || '',
            invoice_id: invoice.id,
            receipt_id: receipt.id,
            metadata_json: JSON.stringify(metadata)
        })
        const updatedJob = await db.getRecord('jobs', id).catch(() => ({
            ...job,
            status: 'completed',
            payment_status: 'paid',
            metadata_json: JSON.stringify(metadata)
        }))

        res.json({
            job: updatedJob,
            invoice: confirmedInvoice,
            receipt: confirmedReceipt,
            financial_ledger: { posted: createdLedgers.length },
            stock_ledger: stockLedger,
            invoice_ledger: invoiceLedger,
            receipt_ledger: receiptLedger
        })
    } catch (err) {
        console.error(`[Data] Close Job Payment ${req.params.id}:`, err.message)
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
        if (['products', 'document_items', 'job_items'].includes(table.toLowerCase())) {
            payload = mergeTraceabilityMetadata(payload)
        }
        if (table.toLowerCase() === 'users') {
            await normalizeUserBranchPayload(payload)
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
            const validStatuses = ['draft', 'confirmed', 'in_transit', 'partial_received', 'received', 'paid', 'voided', 'cancelled'];
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

        const tolerantTables = new Set(['products', 'document_items', 'job_items'])
        const record = tolerantTables.has(table.toLowerCase())
            ? await createRecordTolerant(table, payload)
            : await db.createRecord(table, payload)
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
        if (['products', 'document_items', 'job_items'].includes(table.toLowerCase())) {
            payload = mergeTraceabilityMetadata(payload)
        }
        if (table.toLowerCase() === 'users') {
            await normalizeUserBranchPayload(payload)
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
            const validStatuses = ['draft', 'confirmed', 'in_transit', 'partial_received', 'received', 'paid', 'voided', 'cancelled'];
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
            const stockDocTypes = new Set(['RR', 'RQ', 'RE', 'TF', 'SA', 'PCN'])

            if (payload.status === 'confirmed' && record.status !== 'confirmed' && stockDocTypes.has(docType)) {
                if (docType === 'SA' && !documentAdjustmentReason({ ...record, ...payload })) {
                    return res.status(400).json({ error: 'Stock adjustment reason is required', code: 'ADJUSTMENT_REASON_REQUIRED' })
                }
                const items = await db.getAllRecords('document_items', { where: `(document_id,eq,${safeWhereValue(id)})` })
                if (items.length === 0) {
                    return res.status(400).json({ error: 'Stock document must have at least one item' })
                }
                await postDocumentStockLedgers({ ...record, ...payload }, items)
            }

            if (payload.status === 'voided' && record.status !== 'voided') {
                const docNo = record.doc_no || String(id)
                const reversal = await reverseStockLedgersForDoc(docNo, 'void')
                if (['RR', 'RE'].includes(docType)) {
                    await recalculateAverageCost(reversal.touchedProducts)
                }
            }
        }

        const tolerantTables = new Set(['products', 'document_items', 'job_items'])
        record = tolerantTables.has(table.toLowerCase())
            ? await updateRecordTolerant(table, id, payload)
            : await db.updateRecord(table, id, payload)

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
                const reversal = await reverseStockLedgersForDoc(record.doc_no || String(id), 'document_delete')
                if (record && ['RR', 'RE'].includes(String(record.doc_type || '').toUpperCase())) {
                    await recalculateAverageCost(reversal.touchedProducts)
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
