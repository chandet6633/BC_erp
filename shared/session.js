export const SESSION_KEYS = {
    devAuth: 'app.session.devAuth',
    role: 'app.session.role',
    userId: 'app.session.userId',
    userName: 'app.session.userName',
    authModel: 'app.session.authModel',
    branchId: 'app.session.branchId',
    branchLocked: 'app.session.branchLocked',
    language: 'app.session.language',
    lastLogin: 'app.session.lastLogin'
}

const LEGACY_KEYS = {
    devAuth: 'bcauto_dev_auth',
    role: 'bcauto_role',
    userId: 'bcauto_user_id',
    userName: 'bcauto_user_name',
    authModel: 'bcauto_auth_model',
    branchId: 'bcauto_branch',
    branchLocked: 'bcauto_branch_locked',
    language: 'bcauto_lang',
    lastLogin: 'bcauto_last_login'
}

const LEGACY_SESSION_STORAGE_FIELDS = new Set(['role', 'userId', 'userName', 'authModel', 'lastLogin'])

function storageFor() {
    if (typeof window === 'undefined') return null
    return window.localStorage
}

function legacyStorageFor(field) {
    if (typeof window === 'undefined') return null
    return LEGACY_SESSION_STORAGE_FIELDS.has(field) ? window.sessionStorage : window.localStorage
}

function getStored(field) {
    try {
        const store = storageFor(field)
        const legacyStore = legacyStorageFor(field)
        if (!store) return ''
        return store.getItem(SESSION_KEYS[field]) ?? legacyStore?.getItem(LEGACY_KEYS[field]) ?? ''
    } catch {
        return ''
    }
}

function setStored(field, value) {
    try {
        const store = storageFor(field)
        if (!store) return
        if (value === undefined || value === null || value === '') store.removeItem(SESSION_KEYS[field])
        else store.setItem(SESSION_KEYS[field], String(value))
    } catch { /* storage unavailable */ }
}

function removeStored(field) {
    try {
        const store = storageFor(field)
        if (!store) return
        store.removeItem(SESSION_KEYS[field])
    } catch { /* storage unavailable */ }
}

export function isRealBranchId(branchId) {
    const value = String(branchId || '').trim()
    return !!value && value !== 'all'
}

export function getSessionLanguage() {
    return getStored('language') === 'en' ? 'en' : 'th'
}

export function setSessionLanguage(lang) {
    setStored('language', lang === 'en' ? 'en' : 'th')
}

export function getSession() {
    let authModel = null
    const rawAuthModel = getStored('authModel')
    if (rawAuthModel) {
        try {
            authModel = JSON.parse(rawAuthModel)
        } catch { /* ignore invalid session model */ }
    }

    return {
        devAuth: getStored('devAuth') === '1',
        role: getStored('role'),
        userId: getStored('userId'),
        userName: getStored('userName'),
        authModel,
        branchId: getStored('branchId'),
        branchLocked: getStored('branchLocked') === 'true',
        language: getSessionLanguage(),
        lastLogin: getStored('lastLogin')
    }
}

export function setDevSession({ role, userId, userName, authModel, branchId, branchLocked = true }) {
    setStored('role', role)
    setStored('userId', userId)
    setStored('userName', userName)
    setStored('authModel', JSON.stringify(authModel || {}))
    setStored('branchId', branchId)
    setStored('branchLocked', branchLocked ? 'true' : 'false')
    setStored('devAuth', '1')
    setStored('lastLogin', new Date().toISOString())
}

export function setSessionBranch(branchId, { locked } = {}) {
    setStored('branchId', branchId)
    if (locked !== undefined) setStored('branchLocked', locked ? 'true' : 'false')
}

export function clearAppSession() {
    Object.keys(SESSION_KEYS).forEach(removeStored)
}

export function clearLegacySessionKeys() {
    if (typeof window === 'undefined') return
    for (const [field, legacyKey] of Object.entries(LEGACY_KEYS)) {
        try {
            const store = legacyStorageFor(field)
            store.removeItem(legacyKey)
        } catch { /* storage unavailable */ }
    }
}

export function buildDevAuthHeaders(extra = {}) {
    const session = getSession()
    if (!session.devAuth) return { ...extra }
    return {
        'x-bcauto-dev-auth': '1',
        'x-bcauto-dev-role': session.role || '',
        'x-bcauto-dev-user-id': session.userId || '',
        'x-bcauto-dev-user-name': encodeURIComponent(session.userName || ''),
        'x-bcauto-dev-branch': session.branchId || '',
        ...extra
    }
}

export function hasDevSession() {
    const session = getSession()
    return session.devAuth || !!session.role
}
