import express from 'express'
import { getAllRecords } from '../lib/nocodb.js'
import { requireAuth } from '../middleware/jwt.js'

const router = express.Router()

router.use(requireAuth)

function safeWhereValue(value) {
    return String(value ?? '').replace(/[()~,]/g, '').replace(/['";<>\\]/g, '').trim()
}

// Cache for settings
let settingsCache = null
let settingsCacheTime = 0

async function getTelegramConfig() {
    const now = Date.now()
    if (!settingsCache || now - settingsCacheTime > 60000) { // 1 min cache
        const rows = await getAllRecords('settings')
        const obj = {}
        rows.forEach(r => {
            if (r.key && r.value !== undefined) {
                obj[r.key] = r.value
            }
        })
        settingsCache = obj
        settingsCacheTime = now
    }
    return settingsCache
}

async function getBranchChatId(branchCode, channel = 'jobs') {
    if (!branchCode) return null
    try {
        const branches = await getAllRecords('branches', { where: `(code,eq,${safeWhereValue(branchCode)})` })
        if (branches.length > 0) {
            const b = branches[0]
            if (channel === 'jobs' && b.tg_chat_jobs) return b.tg_chat_jobs
            if (channel === 'hr' && b.tg_chat_hr) return b.tg_chat_hr
            if (channel === 'queue' && b.tg_chat_queue) return b.tg_chat_queue
        }
    } catch (e) {
        console.error('[Notify] Error fetching branch chat ID:', e.message)
    }
    return null
}

async function sendTelegramMessage(message, branchCode, channel, settingKeyToCheck) {
    const config = await getTelegramConfig()
    
    // Global kill switch
    if (config.tg_enabled !== 'true') return { success: true, message: 'Telegram disabled globally' }
    
    // Feature-specific switch
    if (settingKeyToCheck && config[settingKeyToCheck] !== 'true') {
        return { success: true, message: `Notification type ${settingKeyToCheck} disabled` }
    }

    const botToken = config.tg_bot_token
    if (!botToken) throw new Error('Bot token not configured in settings')

    let chatId = await getBranchChatId(branchCode, channel)
    if (!chatId) chatId = config.default_chat_id
    if (!chatId) throw new Error(`No chat ID configured for branch ${branchCode} or default`)

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const tgRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML' // Unified to HTML like the frontend was using
        })
    })

    if (!tgRes.ok) {
        const err = await tgRes.text()
        console.error('[Notify] Telegram API error:', err)
        throw new Error('Telegram API rejected the request')
    }

    return { success: true }
}

router.post('/qc-done', async (req, res) => {
    try {
        const { job, mechanicName, branchCode } = req.body
        if (!job || !job.job_no) return res.status(400).json({ error: 'Missing job data' })

        const mechanic = mechanicName || job.qc_approved_by || 'ช่าง'
        const plate = job.plate || 'ไม่ระบุทะเบียน'
        const customer = job.customer_name || 'ลูกค้าทั่วไป'
        const amount = job.grand_total ? `ยอดรวม: ฿${parseFloat(job.grand_total).toLocaleString('th-TH')}` : ''
        
        const message = `✅ <b>QC เสร็จ — รอเก็บเงิน</b>\n\n`
            + `📋 เลขใบงาน: ${job.job_no}\n`
            + `🚗 ทะเบียน: ${plate}\n`
            + `👤 ลูกค้า: ${customer}\n`
            + `🔧 ช่างหลัก: ${mechanic}\n`
            + `💰 ${amount}\n\n`
            + `🕐 ${new Date().toLocaleString('th-TH')}`

        const result = await sendTelegramMessage(message, branchCode, 'jobs', 'notify_qc_done')
        res.json(result)
    } catch (err) {
        console.error('[Notify] QC Done error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.post('/job-assigned', async (req, res) => {
    try {
        const { job, mechanicName, branchCode } = req.body
        if (!job || !job.job_no) return res.status(400).json({ error: 'Missing job data' })

        const message = `🔔 <b>มอบหมายงานใหม่</b>\n\n`
            + `📋 เลขใบงาน: ${job.job_no || '-'}\n`
            + `🚗 ทะเบียน: ${job.plate || '-'}\n`
            + `👤 ลูกค้า: ${job.customer_name || '-'}\n`
            + `🔧 ช่างหลัก: ${mechanicName || '-'}\n\n`
            + `🕐 ${new Date().toLocaleString('th-TH')}`

        const result = await sendTelegramMessage(message, branchCode, 'jobs', 'notify_job_assigned')
        res.json(result)
    } catch (err) {
        console.error('[Notify] Job Assigned error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.post('/job-completed', async (req, res) => {
    try {
        const { job, branchCode } = req.body
        if (!job || !job.job_no) return res.status(400).json({ error: 'Missing job data' })

        const message = `✅ <b>ปิดใบงานเรียบร้อย</b>\n\n`
            + `📋 เลขใบงาน: ${job.job_no || '-'}\n`
            + `🚗 ทะเบียน: ${job.plate || '-'}\n`
            + `👤 ลูกค้า: ${job.customer_name || '-'}\n`
            + `💰 ยอดรวม: ฿${(job.grand_total || 0).toLocaleString()}\n\n`
            + `🕐 ${new Date().toLocaleString('th-TH')}`

        const result = await sendTelegramMessage(message, branchCode, 'jobs', 'notify_job_close')
        res.json(result)
    } catch (err) {
        console.error('[Notify] Job Completed error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.post('/payment', async (req, res) => {
    try {
        const { job, branchCode } = req.body
        if (!job || !job.job_no) return res.status(400).json({ error: 'Missing job data' })

        let paymentMethod = job.payment_type === 'cash' ? 'เงินสด' :
                            job.payment_type === 'transfer' ? 'โอนเงิน' :
                            job.payment_type === 'card' ? 'บัตรเครดิต' : job.payment_type

        const message = `💳 <b>เก็บเงินเรียบร้อย</b>\n\n`
            + `📋 เลขใบงาน: ${job.job_no || '-'}\n`
            + `💰 ยอดรับ: ฿${(job.grand_total || 0).toLocaleString()} (${paymentMethod})\n\n`
            + `🕐 ${new Date().toLocaleString('th-TH')}`

        const result = await sendTelegramMessage(message, branchCode, 'jobs', 'notify_payment')
        res.json(result)
    } catch (err) {
        console.error('[Notify] Payment error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.post('/low-stock', async (req, res) => {
    try {
        const { products, branchCode } = req.body
        if (!products || products.length === 0) return res.json({ success: true, message: 'No products' })

        const items = products.slice(0, 10).map(p => {
            const threshold = p.minQty != null ? ` / Min: ${p.minQty}` : ''
            return `  • ${p.name} (คงเหลือ: ${p.qty}${threshold})`
        }).join('\n')
        const message = `🚨 <b>แจ้งเตือนสินค้าใกล้หมด</b>\n\n`
            + `พบ ${products.length} รายการที่ต่ำกว่าขั้นต่ำ:\n`
            + `${items}\n`
            + (products.length > 10 ? `  ...และอีก ${products.length - 10} รายการ\n\n` : '\n')
            + `🕐 ${new Date().toLocaleString('th-TH')}`

        const result = await sendTelegramMessage(message, branchCode, 'jobs', 'notify_low_stock')
        res.json(result)
    } catch (err) {
        console.error('[Notify] Low Stock error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.post('/daily-summary', async (req, res) => {
    try {
        const { stats, branchCode } = req.body
        if (!stats) return res.status(400).json({ error: 'Missing stats' })

        const message = `📊 <b>สรุปรายวัน — BC Auto</b>\n\n`
            + `📋 ใบงานใหม่: ${stats.newJobs || 0}\n`
            + `✅ ปิดงาน: ${stats.closedJobs || 0}\n`
            + `💰 รายได้วันนี้: ฿${(stats.revenue || 0).toLocaleString()}\n`
            + `🚨 สินค้าใกล้หมด: ${stats.lowStock || 0} รายการ\n`
            + `👥 ลูกค้าทั้งหมด: ${stats.totalCustomers || 0}\n\n`
            + `📅 ${new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`

        // Note: daily summary goes to HR channel based on original logic
        const result = await sendTelegramMessage(message, branchCode, 'hr', 'notify_daily_summary')
        res.json(result)
    } catch (err) {
        console.error('[Notify] Daily Summary error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

router.post('/test', async (req, res) => {
    try {
        const { branchCode, channel } = req.body
        const now = new Date().toLocaleString('th-TH')
        const branchLabel = branchCode ? ` (สาขา: ${branchCode}, ช่องทาง: ${channel || 'jobs'})` : ' (Default)'
        const message = `🔔 <b>ทดสอบการแจ้งเตือน</b>\n\n✅ ระบบเชื่อมต่อ Telegram สำเร็จ${branchLabel}\n🕐 เวลา: ${now}`

        const result = await sendTelegramMessage(message, branchCode, channel || 'jobs', null)
        res.json(result)
    } catch (err) {
        console.error('[Notify] Test error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

export default router
