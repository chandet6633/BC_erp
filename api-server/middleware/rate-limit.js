/**
 * Rate Limiting Middleware
 * ═══════════════════════
 * Prevents API abuse and PIN brute-forcing.
 */
import rateLimit from 'express-rate-limit'

/**
 * General API rate limit: 500 requests/minute per IP.
 * NOTE: Dashboard alone fires ~11 concurrent requests on load.
 * 100/min was too low and caused 429 storms. 500/min is still
 * protective against abuse while allowing normal usage.
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 500,
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
