/**
 * MungkhudShop — Crypto Utilities
 * SHA-256 password hashing with per-user salt using Web Crypto API.
 * Backward-compatible with legacy unsalted hashes.
 */

/**
 * Generate a random hex salt.
 * @param {number} [bytes=16] — Number of random bytes
 * @returns {string} — hex-encoded salt
 */
function generateSalt(bytes = 16) {
    const arr = crypto.getRandomValues(new Uint8Array(bytes))
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * SHA-256 digest helper.
 * @param {string} input — raw string to hash
 * @returns {Promise<string>} — hex-encoded hash
 */
async function sha256(input) {
    const data = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash a password with a random salt.
 * Returns `salt:hash` format for storage.
 * If no salt provided, generates a new one (for new/migrated passwords).
 * 
 * BACKWARD COMPAT: If called without salt, also returns just the bare hash
 * so login comparison works against legacy unsalted hashes.
 * 
 * @param {string} password — plaintext password
 * @param {string} [salt] — optional salt (for verification)
 * @returns {Promise<string>} — `salt:hash` format (or bare hash for legacy compat)
 */
export async function hashPassword(password, salt) {
    if (salt) {
        // Salted hash for verification
        return salt + ':' + await sha256(salt + password)
    }
    // For login: return bare hash (legacy compat — matches old unsalted hashes)
    return await sha256(password)
}

/**
 * Create a new salted hash for storage (use when saving/migrating passwords).
 * @param {string} password — plaintext password
 * @returns {Promise<string>} — `salt:hash` format
 */
export async function hashPasswordSalted(password) {
    const salt = generateSalt()
    const hash = await sha256(salt + password)
    return salt + ':' + hash
}

/**
 * Verify a plaintext password against a stored hash.
 * Supports both salted (`salt:hash`) and legacy unsalted formats.
 * @param {string} password — plaintext input
 * @param {string} storedHash — previously hashed value
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
    if (!storedHash) return false

    // Salted format: `salt:hash`
    if (storedHash.includes(':')) {
        const [salt, hash] = storedHash.split(':')
        const inputHash = await sha256(salt + password)
        return inputHash === hash
    }

    // Legacy unsalted format: bare hash
    const inputHash = await sha256(password)
    return inputHash === storedHash
}

/**
 * Check if a stored hash is using the legacy unsalted format.
 * @param {string} storedHash
 * @returns {boolean} — true if needs migration
 */
export function needsMigration(storedHash) {
    return storedHash && !storedHash.includes(':')
}
