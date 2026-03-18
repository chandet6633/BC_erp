/**
 * Telegram Bot Service — Send notifications via Telegram Bot API.
 * Used for: job completion, daily summary, low-stock alerts.
 */
import { fetchFullList, createRecord, updateRecord, fetchOne } from './pb.js'

const TELEGRAM_API = 'https://api.telegram.org/bot'

// SEC-6: Simple XOR obfuscation for bot token (not crypto — just prevents casual exposure)
const OBF_KEY = 'MungkhudShop2026'
function obfuscate(str) {
    return btoa(str.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length))
    ).join(''))
}
function deobfuscate(encoded) {
    try {
        const decoded = atob(encoded)
        return decoded.split('').map((c, i) =>
            String.fromCharCode(c.charCodeAt(0) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length))
        ).join('')
    } catch { return encoded } // Fallback for unobfuscated legacy values
}

/** Get Telegram config from app_settings collection */
async function getTelegramConfig() {
    try {
        const settings = await fetchFullList('app_settings', {
            filter: `key='telegram_config'`,
            requestKey: 'tg_config'
        })
        if (settings.length > 0 && settings[0].value) {
            const config = JSON.parse(settings[0].value)
            // SEC-6: Deobfuscate token on read
            if (config.bot_token) config.bot_token = deobfuscate(config.bot_token)
            return config
        }
    } catch (e) {
        console.warn('Telegram config not found:', e.message)
    }
    return null
}

/** Save Telegram config to app_settings */
export async function saveTelegramConfig(config) {
    try {
        const existing = await fetchFullList('app_settings', {
            filter: `key='telegram_config'`,
            requestKey: 'tg_save'
        })
        // SEC-6: Obfuscate token before storing
        const stored = { ...config }
        if (stored.bot_token) stored.bot_token = obfuscate(stored.bot_token)
        const value = JSON.stringify(stored)
        if (existing.length > 0) {
            await updateRecord('app_settings', existing[0].id, { value })
        } else {
            await createRecord('app_settings', { key: 'telegram_config', value })
        }
        return true
    } catch (e) {
        console.error('Failed to save Telegram config:', e)
        return false
    }
}

/** Send message via Telegram Bot API */
export async function sendTelegram(message) {
    const config = await getTelegramConfig()
    if (!config || !config.bot_token || !config.chat_id) {
        console.warn('Telegram not configured')
        return false
    }

    try {
        const url = `${TELEGRAM_API}${config.bot_token}/sendMessage`
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.chat_id,
                text: message,
                parse_mode: 'HTML'
            })
        })
        return res.ok
    } catch (e) {
        console.error('Telegram send failed:', e)
        return false
    }
}

/** Send test message */
export async function sendTestMessage() {
    const now = new Date().toLocaleString('th-TH')
    return sendTelegram(`🔔 <b>ทดสอบการแจ้งเตือน</b>\n\n✅ ระบบ MungkhudShop เชื่อมต่อ Telegram สำเร็จ\n🕐 เวลา: ${now}`)
}

/** Notify job completed */
export async function notifyJobCompleted(job) {
    const config = await getTelegramConfig()
    if (!config?.notify_job_close) return

    const message = [
        '✅ <b>ปิดใบงานเรียบร้อย</b>',
        '',
        `📋 เลขใบงาน: ${job.job_no || '-'}`,
        `🚗 ทะเบียน: ${job.plate || '-'}`,
        `👤 ลูกค้า: ${job.customer_name || '-'}`,
        `💰 ยอดรวม: ฿${(job.grand_total || 0).toLocaleString()}`,
        '',
        `🕐 ${new Date().toLocaleString('th-TH')}`
    ].join('\n')

    return sendTelegram(message)
}

/** Notify low stock */
export async function notifyLowStock(products) {
    const config = await getTelegramConfig()
    if (!config?.notify_low_stock) return
    if (products.length === 0) return

    const items = products.slice(0, 10).map(p => `  • ${p.name} (คงเหลือ: ${p.qty})`).join('\n')
    const message = [
        '🚨 <b>แจ้งเตือนสินค้าใกล้หมด</b>',
        '',
        `พบ ${products.length} รายการที่ต่ำกว่าขั้นต่ำ:`,
        items,
        products.length > 10 ? `  ...และอีก ${products.length - 10} รายการ` : '',
        '',
        `🕐 ${new Date().toLocaleString('th-TH')}`
    ].join('\n')

    return sendTelegram(message)
}

/** Send daily summary */
export async function sendDailySummary(stats) {
    const config = await getTelegramConfig()
    if (!config?.notify_daily_summary) return

    const message = [
        '📊 <b>สรุปรายวัน — MungkhudShop</b>',
        '',
        `📋 ใบงานใหม่: ${stats.newJobs || 0}`,
        `✅ ปิดงาน: ${stats.closedJobs || 0}`,
        `💰 รายได้วันนี้: ฿${(stats.revenue || 0).toLocaleString()}`,
        `🚨 สินค้าใกล้หมด: ${stats.lowStock || 0} รายการ`,
        `👥 ลูกค้าทั้งหมด: ${stats.totalCustomers || 0}`,
        '',
        `📅 ${new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    ].join('\n')

    return sendTelegram(message)
}
