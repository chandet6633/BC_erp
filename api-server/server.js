/**
 * BC AutoXperience — API Server
 * ═════════════════════════════
 * Express middleware between frontends and NocoDB.
 * Handles: JWT auth, input validation, rate limiting, audit logging.
 *
 * Environment variables:
 *   NOCODB_URL    — NocoDB internal URL (default: http://bctest-nocodb:8080)
 *   NOCODB_TOKEN  — NocoDB API token (xc-token)
 *   JWT_SECRET    — Secret for signing JWT tokens
 *   PORT          — Server port (default: 3000)
 */
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { apiLimiter } from './middleware/rate-limit.js'
import { init as initNocoDB } from './lib/nocodb.js'
import authRoutes from './routes/auth.js'
import dataRoutes from './routes/data.js'
import uploadRoutes from './routes/upload.js'

const app = express()
const PORT = process.env.PORT || 3000

// ─── Trust proxy (behind Nginx) — required for rate-limiter ───
app.set('trust proxy', 1)

// ─── Security headers ───
app.use(helmet())

// ─── CORS (allow both frontend origins) ───
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

// ─── Body parsing ───
app.use(express.json({ limit: '10mb' }))

// ─── Health check (before rate limiter) ───
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'bcauto-api', uptime: process.uptime() })
})

// ─── Rate limiting ───
app.use('/api/', apiLimiter)

// ─── Routes ───
app.use('/api/auth', authRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/upload', uploadRoutes)

// ─── 404 fallback ───
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
})

// ─── Error handler ───
app.use((err, req, res, _next) => {
    console.error('[Server] Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
})

// ─── Start ───
async function start() {
    console.log('═══════════════════════════════════════')
    console.log('  BC AutoXperience — API Server')
    console.log('═══════════════════════════════════════')
    console.log(`  NocoDB:     ${process.env.NOCODB_URL || 'http://bctest-nocodb:8080'}`)
    console.log(`  Port:       ${PORT}`)
    console.log(`  JWT Expiry: 24h`)
    console.log('')

    // Initialize NocoDB connection + cache table IDs
    await initNocoDB()

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 API server running on port ${PORT}`)
    })
}

start().catch(err => {
    console.error('❌ Failed to start:', err.message)
    process.exit(1)
})
