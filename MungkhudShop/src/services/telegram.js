/**
 * Telegram Bot Service — API Wrapper
 * ══════════════════════════════════
 * This client now routes all notifications through the /api/notify backend proxy
 * so that the Telegram Bot Token is NEVER exposed to the browser.
 */

// We still keep the config fetch/save logic here for the UI Settings page,
// but we no longer obfuscate/deobfuscate the token because only Admins
// with backend access can view the raw token in NocoDB anyway.
import { fetchFullList, createRecord, updateRecord } from './pb.js'
import { getApiAuthHeaders } from './auth.js'

/** Get Telegram config from app_settings collection (For Settings UI only) */
export async function getTelegramConfig() {
    try {
        const settings = await fetchFullList('system_settings', {
            filter: `key='telegram_config'`,
            requestKey: 'tg_config'
        })
        if (settings.length > 0 && settings[0].value) {
            return JSON.parse(settings[0].value)
        }
    } catch (e) {
        console.warn('Telegram config not found:', e.message)
    }
    return null
}

/** Save Telegram config to app_settings (For Settings UI only) */
export async function saveTelegramConfig(config) {
    try {
        const existing = await fetchFullList('system_settings', {
            filter: `key='telegram_config'`,
            requestKey: 'tg_save'
        })
        const value = JSON.stringify(config)
        if (existing.length > 0) {
            await updateRecord('system_settings', existing[0].id, { value })
        } else {
            await createRecord('system_settings', { key: 'telegram_config', value })
        }
        return true
    } catch (e) {
        console.error('Failed to save Telegram config:', e)
        return false
    }
}

/** Generic internal API proxy caller */
async function callNotifyApi(endpoint, payload) {
    try {
        // Assume API server runs on port 3000 locally, or proxy handles /api/
        // If we are in MungkhudShop, Vite proxies /api to port 3000.
        const res = await fetch(`/api/notify/${endpoint}`, {
            method: 'POST',
            headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'API Error')
        return data.success
    } catch (err) {
        console.error(`[Notify API] Error calling /${endpoint}:`, err)
        return false
    }
}

/** Send test message */
export async function sendTestMessage(branchCode = null, channel = 'jobs') {
    return callNotifyApi('test', { branchCode, channel })
}

/** Notify job completed */
export async function notifyJobCompleted(job, branchCode = null) {
    return callNotifyApi('job-completed', { job, branchCode })
}

/** Notify job assigned */
export async function notifyJobAssigned(job, mechanicName, branchCode = null) {
    return callNotifyApi('job-assigned', { job, mechanicName, branchCode })
}

/** Notify QC done */
export async function notifyQCDone(job, mechanicName, branchCode = null) {
    return callNotifyApi('qc-done', { job, mechanicName, branchCode })
}

/** Notify payment collected */
export async function notifyPaymentCollected(job, branchCode = null) {
    return callNotifyApi('payment', { job, branchCode })
}

/** Notify low stock */
export async function notifyLowStock(products, branchCode = null) {
    return callNotifyApi('low-stock', { products, branchCode })
}

/** Send daily summary */
export async function sendDailySummary(stats, branchCode = null) {
    return callNotifyApi('daily-summary', { stats, branchCode })
}
