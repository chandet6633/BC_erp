/**
 * JWT Middleware — Verify Bearer tokens on every protected route.
 */
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'bcauto_dev_secret_change_in_prod'

/**
 * Sign a JWT for an authenticated user.
 * @param {{ id, name, role, branch }} user
 * @returns {string} JWT token
 */
export function signToken(user) {
    return jwt.sign(
        { id: user.id, name: user.name, role: user.role, branch: user.branch },
        JWT_SECRET,
        { expiresIn: '7d' }
    )
}

/**
 * Express middleware: verify JWT from Authorization header.
 * Sets req.user = { id, name, role, branch } on success.
 * Returns 401 on missing/invalid/expired token.
 */
export function requireAuth(req, res, next) {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authentication token' })
    }

    const token = header.slice(7)
    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        req.user = decoded
        next()
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired — please log in again' })
        }
        return res.status(401).json({ error: 'Invalid authentication token' })
    }
}

/**
 * Express middleware: require specific roles.
 * Must be used AFTER requireAuth.
 * @param {...string} roles - Allowed roles
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' })
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` })
        }
        next()
    }
}
