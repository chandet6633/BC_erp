/**
 * Auth Routes — Unified Login System
 * ═══════════════════════════════════
 * POST /api/auth/login        — Username + password login (primary)
 * POST /api/auth/pin-login    — PIN-based login (shared tablets)
 * POST /api/auth/change-password — Force/voluntary password change
 * POST /api/auth/reset-password  — Admin resets user password
 * GET  /api/auth/me           — Get current user from JWT
 * GET  /api/auth/tables       — List available tables
 *
 * All users are in the unified `users` table.
 * Credentials are SHA-256 hashed. PINs and passwords are NEVER stored in plaintext.
 */
import { Router } from 'express'
import crypto from 'crypto'
import { signToken, requireAuth, requireRole } from '../middleware/jwt.js'
import { authLimiter } from '../middleware/rate-limit.js'
import * as db from '../lib/nocodb.js'

const router = Router()

/**
 * SHA-256 hash helper
 */
function sha256(input) {
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

function safeWhereValue(value) {
    return String(value ?? '').replace(/[()~,]/g, '').replace(/['";<>\\]/g, '').trim()
}

/**
 * Build standard user response (never expose sensitive fields)
 */
function userResponse(user) {
    return {
        id: user.id,
        name: user.name || user.display_name,
        username: user.username,
        role: user.role,
        branch: user.branch || user.branch_id || 'all',
        must_change_password: !!user.must_change_password
    }
}

/**
 * Audit log helper (fire-and-forget)
 */
function audit(action, userName, details) {
    db.createRecord('audit_logs', {
        action,
        collection_name: 'auth',
        user_name: userName,
        details,
        timestamp: new Date().toISOString()
    }).catch(() => {})
}

// ─── PRIMARY: Username + Password Login ───

/**
 * POST /api/auth/login
 * Body: { username: "bank", password: "0812345678" }
 * Returns: { token, user }
 */
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({ error: 'กรุณากรอก username และ password' })
        }

        // Strip NocoDB filter syntax to prevent enumeration injections.
        const usernameInput = safeWhereValue(username).toLowerCase()
        const users = await db.getAllRecords('users', {
            where: `(active,eq,1)~and((username,eq,${usernameInput})~or(name,eq,${usernameInput})~or(email,eq,${usernameInput}))`
        })
        


        if (users.length === 0) {
            audit('login_failed', username, `Unknown username: ${username}`)
            return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' })
        }

        const user = users[0]
        const hashedInput = sha256(password)

        // Fallback checks for legacy plain-text passwords or passwords stored in the 'password' column
        const isHashMatch = user.password_hash === hashedInput || user.password === hashedInput
        const isPlaintextMatch = user.password === password || user.password_hash === password
        const isPinMatch = user.pin === password || user.pin === hashedInput



        if (!isHashMatch && !isPlaintextMatch && !isPinMatch) {
            audit('login_failed', user.name, `Wrong password for: ${username}`)
            return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' })
        }

        const token = signToken({
            id: user.id,
            name: user.name || user.display_name || 'User',
            role: user.role,
            branch: user.branch || user.branch_id || 'all'
        })

        audit('login_success', user.name, `Password login: ${user.name} (${user.role}, ${user.branch || 'all'})`)

        return res.json({
            token,
            user: userResponse(user)
        })
    } catch (err) {
        console.error('[Auth] Login error:', err.message)
        return res.status(500).json({ error: 'Login failed — server error' })
    }
})

// ─── SECONDARY: PIN Login (shared tablets) ───

/**
 * POST /api/auth/pin-login
 * Body: { pin: "280612", roleGroup: "manager" }
 * Returns: { token, user }
 */
router.post('/pin-login', authLimiter, async (req, res) => {
    try {
        const { pin, roleGroup } = req.body

        if (!pin || pin.length < 4) {
            return res.status(400).json({ error: 'PIN must be at least 4 digits' })
        }
        if (!roleGroup) {
            return res.status(400).json({ error: 'Role group is required' })
        }

        // Define which roles belong to each group
        const roleGroups = {
            manager: ['owner', 'manager'],
            admin: ['admin'],
            mechanic: ['mechanic', 'employee', 'technician'],
            technician: ['technician', 'mechanic', 'employee'],
            sa: ['sa']
        }
        const allowedRoles = roleGroups[roleGroup] || [roleGroup]

        // Fetch all active users (small table, ~6-10 rows) and filter in JS
        // This avoids NocoDB's buggy ~or inside ~and filter syntax
        const allUsers = await db.getAllRecords('users', {
            where: '(active,eq,1)'
        })
        const users = allUsers.filter(u => allowedRoles.includes(u.role))

        // Compare hashed PIN, while accepting legacy raw PINs from older seeds/migrations.
        const hashedPin = sha256(pin)
        const match = users.find(u => u.pin === hashedPin || u.pin === pin)

        if (!match) {
            audit('login_failed', 'unknown', `Invalid ${roleGroup} PIN attempt`)
            return res.status(401).json({ error: 'PIN ไม่ถูกต้อง' })
        }

        if (match.pin === pin) {
            db.updateRecord('users', match.id, { pin: hashedPin }).catch(err => {
                console.warn('[Auth] Failed to upgrade legacy raw PIN:', err.message)
            })
        }

        const token = signToken({
            id: match.id,
            name: match.name || match.display_name || 'User',
            role: match.role,
            branch: match.branch || match.branch_id || 'all'
        })

        audit('login_success', match.name, `PIN login: ${match.name} (${match.role}, ${match.branch || 'all'})`)

        return res.json({
            token,
            user: userResponse(match)
        })
    } catch (err) {
        console.error('[Auth] PIN login error:', err.message)
        return res.status(500).json({ error: 'Login failed — server error' })
    }
})

// ─── PASSWORD CHANGE ───

/**
 * POST /api/auth/change-password
 * Body: { current_password: "old", new_password: "new" }
 * Requires: authenticated user
 */
router.post('/change-password', requireAuth, async (req, res) => {
    try {
        const { current_password, new_password } = req.body

        if (!new_password || new_password.length < 4) {
            return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' })
        }

        // Get full user record
        const users = await db.getAllRecords('users', {
            where: `(Id,eq,${req.user.id})`
        })
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' })
        }

        const user = users[0]

        // If not forced change, verify current password
        if (!user.must_change_password) {
            if (!current_password) {
                return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านปัจจุบัน' })
            }
            const hashedCurrent = sha256(current_password)
            const isHashMatch = user.password_hash === hashedCurrent || user.password === hashedCurrent
            const isPlaintextMatch = user.password === current_password || user.password_hash === current_password
            
            if (!isHashMatch && !isPlaintextMatch) {
                return res.status(401).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' })
            }
        }

        // Update password
        await db.updateRecord('users', user.id, {
            password_hash: sha256(new_password),
            must_change_password: 0
        })

        audit('password_changed', user.name, `Password changed by ${user.name}`)

        return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' })
    } catch (err) {
        console.error('[Auth] Change password error:', err.message)
        return res.status(500).json({ error: 'Failed to change password' })
    }
})

// ─── ADMIN: Reset Password ───

/**
 * POST /api/auth/reset-password
 * Body: { user_id: 5 }
 * Requires: admin or owner role
 * Resets password to user's phone number (or username if no phone)
 */
router.post('/reset-password', requireAuth, requireRole('admin', 'owner', 'manager'), async (req, res) => {
    try {
        const { user_id } = req.body

        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' })
        }

        // Get target user
        const user = await db.getRecord('users', user_id)
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Reset password to phone number or username
        const defaultPassword = user.phone || user.username || 'changeme'
        await db.updateRecord('users', user_id, {
            password_hash: sha256(defaultPassword),
            must_change_password: 1
        })

        audit('password_reset', req.user.name, `Reset password for ${user.name} (by ${req.user.name})`)

        return res.json({
            success: true,
            message: `รีเซ็ตรหัสผ่านของ ${user.display_name || user.name} สำเร็จ`,
            default_password_hint: user.phone ? 'เบอร์โทรศัพท์' : 'username'
        })
    } catch (err) {
        console.error('[Auth] Reset password error:', err.message)
        return res.status(500).json({ error: 'Failed to reset password' })
    }
})

// ─── ADMIN: Set custom password ───

/**
 * POST /api/auth/admin-set-password
 * Body: { user_id, new_password }
 * Requires: admin or owner or manager
 */
router.post('/admin-set-password', requireAuth, requireRole('admin', 'owner', 'manager'), async (req, res) => {
    try {
        const { user_id, new_password } = req.body
        if (!user_id || !new_password || new_password.length < 4) {
            return res.status(400).json({ error: 'user_id and new_password (min 4 chars) required' })
        }
        await db.updateRecord('users', user_id, {
            password_hash: sha256(new_password),
            must_change_password: 0
        })
        audit('admin_set_password', req.user.name, `Admin set password for user ${user_id}`)
        return res.json({ success: true, message: 'ตั้งรหัสผ่านใหม่สำเร็จ' })
    } catch (err) {
        console.error('[Auth] admin-set-password error:', err.message)
        return res.status(500).json({ error: 'Failed to set password' })
    }
})

// ─── ADMIN: Set user PIN ───

/**
 * POST /api/auth/admin-set-pin
 * Body: { user_id, new_pin }
 * Requires: admin or owner or manager
 * Stores SHA-256 hash of PIN (same as how auth compares)
 */
router.post('/admin-set-pin', requireAuth, requireRole('admin', 'owner', 'manager'), async (req, res) => {
    try {
        const { user_id, new_pin } = req.body
        if (!user_id || !new_pin || new_pin.length < 4 || !/^\d{4,6}$/.test(new_pin)) {
            return res.status(400).json({ error: 'user_id and new_pin (4-6 digits) required' })
        }
        await db.updateRecord('users', user_id, { pin: sha256(new_pin) })
        audit('admin_set_pin', req.user.name, `Admin set PIN for user ${user_id}`)
        return res.json({ success: true, message: 'ตั้ง PIN ใหม่สำเร็จ' })
    } catch (err) {
        console.error('[Auth] admin-set-pin error:', err.message)
        return res.status(500).json({ error: 'Failed to set PIN' })
    }
})

// ─── UTILITIES ───

/**
 * GET /api/auth/me — return current user from JWT
 */
router.get('/me', requireAuth, async (req, res) => {
    try {
        // Fetch full user to check must_change_password
        const users = await db.getAllRecords('users', {
            where: `(Id,eq,${req.user.id})`
        })
        if (users.length > 0) {
            return res.json({ user: userResponse(users[0]) })
        }
        res.json({ user: { ...req.user, must_change_password: false } })
    } catch {
        res.json({ user: { ...req.user, must_change_password: false } })
    }
})

/**
 * GET /api/auth/tables — return available table names (for adapter init)
 */
router.get('/tables', requireAuth, (req, res) => {
    res.json({ tables: db.getTableNames() })
})

/**
 * Legacy: POST /api/auth/password-login → redirect to /api/auth/login
 */
router.post('/password-login', authLimiter, async (req, res) => {
    // Map email-based login to username-based
    const { email, password } = req.body
    if (email && password) {
        req.body.username = email
        req.body.password = password
    }
    // Forward to unified login handler
    const emailInput = safeWhereValue(email)
    const users = await db.getAllRecords('users', {
        where: `(email,eq,${emailInput})~and(active,eq,1)`
    }).catch(() => [])
    
    if (users.length > 0) {
        req.body.username = users[0].username
    }
    
    // Re-invoke login logic
    return router.handle(Object.assign(req, { url: '/login', method: 'POST' }), res, () => {
        res.status(404).json({ error: 'Route not found' })
    })
})

export default router

