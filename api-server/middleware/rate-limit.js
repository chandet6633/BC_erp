/**
 * Rate Limiting Middleware
 * ═══════════════════════
 * Prevents API abuse and PIN brute-forcing.
 */
import rateLimit from 'express-rate-limit'

/**
 * General API rate limit: 100 requests/minute per IP.
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests — please try again later' }
})

/**
 * Auth rate limit: 5 login attempts/minute per IP.
 * Prevents PIN brute-forcing.
 */
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts — please wait 1 minute' }
})
