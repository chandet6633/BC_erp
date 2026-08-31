import express from 'express'
import { getAllRecords, deleteRecord } from '../lib/nocodb.js'
import { requireAuth } from '../middleware/jwt.js'

const router = express.Router()

router.use(requireAuth)

const DEV_CLEAR_TABLES = new Set([
    'customers',
    'vehicles',
    'vendors',
    'products',
    'product_brands',
    'product_groups',
    'lookups',
    'jobs',
    'job_items',
    'documents',
    'document_items',
    'stock_ledgers',
    'payments',
    'job_payments',
    'favorite_products',
    'job_evaluations',
])

const DEV_CLEAR_DOC_TYPES = new Set([
    'RR', 'RQ', 'RE', 'TF', 'SA',
    'QT', 'IV', 'RC', 'CN',
    'PIV', 'PCN', 'PAY', 'WT',
])

async function deleteRecords(table, records) {
    for (const r of records) {
        try {
            await deleteRecord(table, r.id)
        } catch (err) {
            if (err.status !== 404 && !err.message.includes('not found')) {
                throw err
            }
        }
    }
}

async function clearTable(table, filter = () => true) {
    if (!DEV_CLEAR_TABLES.has(table)) {
        const err = new Error(`Clear is not allowed for table: ${table}`)
        err.status = 400
        throw err
    }
    const data = await getAllRecords(table, {})
    const toDelete = data.filter(filter)
    await deleteRecords(table, toDelete)
    return toDelete.length
}

router.post('/clear-data', async (req, res) => {
    try {
        const { action } = req.body

        if (action === 'transactions') {
            const tables = ['jobs', 'document_items', 'documents', 'stock_ledgers', 'payments']
            for (const t of tables) {
                try {
                    await clearTable(t)
                } catch (err) {
                    console.warn(`[Dev] Cleared table ${t} partial warning:`, err.message)
                }
            }
            return res.json({ message: 'Transaction data cleared successfully' })
        }

        if (action === 'jobs') {
            try {
                await clearTable('job_items')
                await clearTable('job_payments')
                await clearTable('job_evaluations')
                await clearTable('jobs')
            } catch (err) {
                console.warn(`[Dev] Cleared jobs partial warning:`, err.message)
            }
            return res.json({ message: 'All job cards cleared successfully' })
        }

        if (action === 'master_data') {
            const tables = ['customers', 'vehicles', 'products']
            for (const t of tables) {
                try {
                    await clearTable(t)
                } catch (err) {
                    console.warn(`[Dev] Cleared master table ${t} partial warning:`, err.message)
                }
            }
            return res.json({ message: 'Master data reset successfully' })
        }

        if (action === 'table') {
            const { table } = req.body
            const count = await clearTable(String(table || ''))
            return res.json({ message: `Cleared ${count} records from ${table}` })
        }

        if (action === 'lookup_type') {
            const { type } = req.body
            if (!type) return res.status(400).json({ error: 'Lookup type is required' })
            const count = await clearTable('lookups', r => String(r.type || '') === String(type))
            return res.json({ message: `Cleared ${count} lookup records` })
        }

        if (action === 'service_products') {
            const count = await clearTable('products', r => {
                const type = String(r.type || '').toLowerCase()
                return ['service', 'labor', 'labour'].includes(type) || r.is_track_stock === false || String(r.is_track_stock) === 'false'
            })
            return res.json({ message: `Cleared ${count} service items` })
        }

        if (action === 'document_type') {
            const docType = String(req.body.doc_type || '').toUpperCase()
            if (!DEV_CLEAR_DOC_TYPES.has(docType)) {
                return res.status(400).json({ error: `Clear is not allowed for document type: ${docType}` })
            }
            const docs = (await getAllRecords('documents', {})).filter(d => String(d.doc_type || '').toUpperCase() === docType)
            const docIds = new Set(docs.map(d => d.id))
            const docNos = new Set(docs.map(d => d.doc_no).filter(Boolean))
            await clearTable('document_items', r => docIds.has(r.document_id))
            await clearTable('stock_ledgers', r => docIds.has(r.document_id) || docNos.has(r.reference_doc) || docNos.has(r.doc_no))
            await deleteRecords('documents', docs)
            return res.json({ message: `Cleared ${docs.length} ${docType} documents` })
        }

        if (action === 'users_roles') {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden: Admin access required for user/role reset' })
            }
            const tables = ['users', 'system_roles']
            for (const t of tables) {
                try {
                    const data = await getAllRecords(t, {})
                    const toDelete = data.filter(r => {
                        if (t === 'users' && r.username === 'admin') return false;
                        if (t === 'system_roles' && r.name === 'admin') return false;
                        return true;
                    })
                    
                    for (const r of toDelete) {
                        try {
                            await deleteRecord(t, r.id)
                        } catch (err) {
                            if (err.status !== 404 && !err.message.includes('not found')) {
                                throw err
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`[Dev] Cleared users/roles table ${t} partial warning:`, err.message)
                }
            }
            return res.json({ message: 'Users and Roles reset successfully (Admin preserved)' })
        }

        res.status(400).json({ error: 'Unknown action' })
    } catch (e) {
        console.error('Dev clear-data error:', e)
        res.status(500).json({ error: e.message })
    }
})

export default router
