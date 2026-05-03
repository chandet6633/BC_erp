/**
 * Upload Routes — File Upload Proxy to NocoDB Storage
 * ════════════════════════════════════════════════════
 * Accepts multipart file uploads from the browser,
 * forwards them to NocoDB's internal storage API using the server-side xc-token.
 * The browser NEVER touches the xc-token.
 *
 * POST /api/upload — Upload one or more files
 *   Request: multipart/form-data with field "files" (multiple)
 *   Response: Array of NocoDB attachment metadata objects
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/jwt.js'

const router = Router()

// All upload routes require authentication
router.use(requireAuth)

const NOCODB_URL = process.env.NOCODB_URL || 'http://bctest-nocodb:8080'
const NOCODB_TOKEN = process.env.NOCODB_TOKEN || ''

/**
 * POST /api/upload
 * Accepts raw multipart/form-data, re-uploads to NocoDB storage.
 *
 * We parse the raw body manually because we don't want to add multer/busboy deps.
 * Instead, we pipe the entire request to NocoDB's storage endpoint.
 */
router.post('/', async (req, res) => {
    try {
        // Forward the entire multipart request to NocoDB storage
        const contentType = req.headers['content-type']
        if (!contentType || !contentType.includes('multipart/form-data')) {
            return res.status(400).json({ error: 'Content-Type must be multipart/form-data' })
        }

        // Collect the raw body chunks
        const chunks = []
        for await (const chunk of req) {
            chunks.push(chunk)
        }
        const body = Buffer.concat(chunks)

        // Forward to NocoDB storage upload
        const nocoRes = await fetch(`${NOCODB_URL}/api/v2/storage/upload`, {
            method: 'POST',
            headers: {
                'xc-token': NOCODB_TOKEN,
                'Content-Type': contentType,
                'Content-Length': String(body.length)
            },
            body
        })

        if (!nocoRes.ok) {
            const errText = await nocoRes.text()
            console.error('[Upload] NocoDB storage error:', nocoRes.status, errText)
            return res.status(nocoRes.status).json({ error: 'Upload failed', detail: errText })
        }

        const result = await nocoRes.json()
        console.log(`[Upload] ${Array.isArray(result) ? result.length : 1} file(s) uploaded by ${req.user?.name || 'unknown'}`)
        res.json(result)
    } catch (err) {
        console.error('[Upload] Error:', err.message)
        res.status(500).json({ error: 'Upload failed: ' + err.message })
    }
})

export default router
