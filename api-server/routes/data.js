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
import { requireAuth, requireRole } from '../middleware/jwt.js'
import { validateCreate, validateUpdate, isProtectedTable } from '../middleware/validate.js'
import * as db from '../lib/nocodb.js'

const router = Router()

// All data routes require authentication
router.use(requireAuth)

/**
 * Branch enforcement middleware.
 * For non-admin/owner users, inject branch_id filter on tables that have branch data.
 * This prevents SA/mechanic/manager from querying other branches' data.
 */
const BRANCH_SCOPED_TABLES = ['jobs', 'job_items', 'documents', 'document_items', 'stock_ledgers', 'hr_attendance', 'hr_leaves', 'financial_ledger']

router.use((req, res, next) => {
    const { role, branch } = req.user || {}

    // Admin and owner see everything
    if (!role || ['admin', 'owner'].includes(role)) return next()

    // Only enforce on branch-scoped tables
    const table = req.params.table?.toLowerCase()
    if (!table || !BRANCH_SCOPED_TABLES.includes(table)) return next()

    // If user has a specific branch (not 'all'), inject filter
    if (branch && branch !== 'all') {
        const branchClause = `(branch_id,eq,${branch})`
        if (req.query.where) {
            req.query.where = `${req.query.where}~and${branchClause}`
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

const ADMIN_ONLY_TABLES = ['system_settings', 'system_roles', 'app_users']

router.use((req, res, next) => {
    const { role } = req.user || {}
    const table = req.params.table?.toLowerCase()
    if (!table || !role) return next()

    // Financial tables: owner/manager/admin only
    if (FINANCIAL_TABLES.includes(table) && !['owner', 'manager', 'admin'].includes(role)) {
        return res.status(403).json({
            error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
            detail: `Role "${role}" cannot access "${table}"`
        })
    }

    // Admin-only tables
    if (ADMIN_ONLY_TABLES.includes(table) && role !== 'admin') {
        return res.status(403).json({
            error: 'เฉพาะผู้ดูแลระบบเท่านั้น',
            detail: `Role "${role}" cannot access "${table}"`
        })
    }

    next()
})

/**
 * GET /api/data/:table — List with filter/sort/pagination
 * Query params: where, sort, fields, limit, offset
 */
router.get('/:table', async (req, res) => {
    try {
        const { table } = req.params
        const { where, sort, fields, limit = '25', offset = '0' } = req.query

        const result = await db.listRecords(table, {
            where, sort, fields,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10)
        })

        // Return in PocketBase-compatible format for adapter
        res.json({
            items: result.items,
            totalItems: result.totalRows,
            page: Math.floor(parseInt(offset, 10) / parseInt(limit, 10)) + 1,
            perPage: parseInt(limit, 10),
            totalPages: Math.ceil(result.totalRows / parseInt(limit, 10))
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
        res.json(items)
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
        const record = await db.getRecord(table, id)
        res.json(record)
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

        // Validate input
        const errors = validateCreate(table, req.body)
        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors })
        }

        let payload = { ...req.body }
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

        const record = await db.createRecord(table, payload)

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

        res.status(201).json(record)
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

        if (isProtectedTable(table)) {
            if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
                return res.status(403).json({ error: `Only admin/owner can modify "${table}"` })
            }
        }

        const errors = validateUpdate(table, req.body)
        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors })
        }

        let payload = { ...req.body }
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

        const record = await db.updateRecord(table, id, payload)

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

        // Deletes always require admin/owner/manager
        if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only admin/owner/manager can delete records' })
        }

        await db.deleteRecord(table, id)

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
