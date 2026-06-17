import express from 'express'
import { getAllRecords, deleteRecord } from '../lib/nocodb.js'
import { requireAuth } from '../middleware/jwt.js'

const router = express.Router()

router.use(requireAuth)

router.use((req, res, next) => {
    // SECURITY GUARD: Only allow admin role to access dev routes
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required for Dev Tools' })
    }
    next()
})

router.post('/clear-data', async (req, res) => {
    try {
        const { action } = req.body

        if (action === 'transactions') {
            const tables = ['jobs', 'document_items', 'documents', 'stock_ledgers', 'payments']
            for (const t of tables) {
                try {
                    const data = await getAllRecords(t, {})
                    for (const r of data) {
                        try {
                            await deleteRecord(t, r.id)
                        } catch (err) {
                            if (err.status !== 404 && !err.message.includes('not found')) {
                                throw err
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`[Dev] Cleared table ${t} partial warning:`, err.message)
                }
            }
            return res.json({ message: 'Transaction data cleared successfully' })
        }

        if (action === 'jobs') {
            try {
                const data = await getAllRecords('jobs', {})
                for (const r of data) {
                    try {
                        await deleteRecord('jobs', r.id)
                    } catch (err) {
                        if (err.status !== 404 && !err.message.includes('not found')) {
                            throw err
                        }
                    }
                }
            } catch (err) {
                console.warn(`[Dev] Cleared jobs partial warning:`, err.message)
            }
            return res.json({ message: 'All job cards cleared successfully' })
        }

        if (action === 'master_data') {
            const tables = ['customers', 'vehicles', 'products']
            for (const t of tables) {
                try {
                    const data = await getAllRecords(t, {})
                    for (const r of data) {
                        try {
                            await deleteRecord(t, r.id)
                        } catch (err) {
                            if (err.status !== 404 && !err.message.includes('not found')) {
                                throw err
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`[Dev] Cleared master table ${t} partial warning:`, err.message)
                }
            }
            return res.json({ message: 'Master data reset successfully' })
        }

        if (action === 'users_roles') {
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
