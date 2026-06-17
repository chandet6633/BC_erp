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
const isTestEnv = process.env.NOCODB_BASE_TITLE === 'BC_ERP_testing' || 
                  process.env.NODE_ENV === 'test' || 
                  process.env.DISABLE_RATE_LIMIT === 'true';

const standardApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests — please try again later' }
})

const standardAuthLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts — please wait 1 minute' }
})

export const apiLimiter = (req, res, next) => {
    if (isTestEnv) return next();
    return standardApiLimiter(req, res, next);
}

export const authLimiter = (req, res, next) => {
    if (isTestEnv) return next();
    return standardAuthLimiter(req, res, next);
}

