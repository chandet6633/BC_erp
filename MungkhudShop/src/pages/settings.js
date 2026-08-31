/**
 * Settings page — persists to PocketBase `settings` collection (single-record pattern).
 * Now includes VAT defaults and print layout configuration.
 */
import { showToast } from '../components/ui.js'
import { fetchFullList, createRecord, updateRecord, uploadAttachment } from '../services/pb.js'
import { saveTelegramConfig, sendTestMessage } from '../services/telegram.js'
import { sanitizeFilter } from '../utils/sanitize.js'
import { getCurrentUser } from '../services/auth.js'

export function initSettingsPage(container) {
    // BUG 44 FIX: Role guard — only admin and manager can access settings
    const user = getCurrentUser()
    if (!user || !['admin', 'manager', 'owner'].includes(user.role)) {
        container.innerHTML = `
            <div class="empty-state" style="padding:var(--sp-16);text-align:center;">
                <span class="material-icons-outlined" style="font-size:64px;color:var(--color-danger);">lock</span>
                <h2>ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
                <p style="color:var(--color-text-muted);">เฉพาะ Admin / Manager / เจ้าของเท่านั้น</p>
            </div>`
        return
    }
    container.innerHTML = `
        <style>
            .settings-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: var(--sp-5);
            }
            .settings-grid + .settings-grid { margin-top: var(--sp-5); }
            .settings-span-all { grid-column: 1 / -1; }
            .settings-toggle-grid {
                margin-top: var(--sp-3);
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
            }
            @media (max-width: 768px) {
                .settings-grid { grid-template-columns: 1fr; }
                .settings-span-all { grid-column: auto; }
                .settings-toggle-grid { grid-template-columns: 1fr; }
            }
        </style>
        <!-- BUG 77 FIX: Unified sticky save toolbar -->
        <div class="page-header" style="position:sticky;top:0;z-index:100;background:var(--color-surface);border-bottom:var(--glass-border);margin-bottom:var(--sp-4);">
            <div class="page-title">
                <span class="material-icons-outlined">settings</span>
                <h1>ตั้งค่าระบบ</h1>
            </div>
            <div class="toolbar-actions">
                <span class="text-sm text-muted" id="settingsSaveStatus" style="align-self:center;"></span>
                <button class="btn btn-primary" id="btnSaveSettings">
                    <span class="material-icons-outlined">save</span> บันทึกทั้งหมด
                </button>
            </div>
        </div>
        <div class="settings-grid">
            <div class="card">
                <div class="card-header"><h3>ข้อมูลร้าน</h3></div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label required">ชื่อร้าน</label>
                        <input type="text" class="form-control" id="settingShopName" value="MungkhudShop">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ที่อยู่</label>
                        <textarea class="form-control" rows="2" id="settingAddress"></textarea>
                    </div>
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">เบอร์โทรศัพท์</label>
                            <input type="text" class="form-control" id="settingPhone">
                        </div>
                        <div class="form-group">
                            <label class="form-label">อีเมล</label>
                            <input type="email" class="form-control" id="settingEmail">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">เลขประจำตัวผู้เสียภาษี</label>
                        <input type="text" class="form-control" id="settingTaxId">
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>ตั้งค่าเอกสาร</h3></div>
                <div class="card-body">
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">Prefix ใบงาน</label>
                            <input type="text" class="form-control" id="settingPrefixJob" value="JOB">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Prefix ใบเสนอราคา</label>
                            <input type="text" class="form-control" id="settingPrefixQT" value="QT">
                        </div>
                    </div>
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">Prefix ใบแจ้งหนี้</label>
                            <input type="text" class="form-control" id="settingPrefixIV" value="IV">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Prefix ใบเสร็จ</label>
                            <input type="text" class="form-control" id="settingPrefixRC" value="RC">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">อัตราภาษีมูลค่าเพิ่ม (%)</label>
                        <input type="number" class="form-control" id="settingVatRate" value="7" min="0" max="100">
                    </div>
                </div>
            </div>
        </div>

        <!-- VAT & Print Config -->
        <div class="settings-grid">
            <div class="card">
                <div class="card-header"><h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">receipt</span> ค่าเริ่มต้น VAT</h3></div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">เปิดใช้ VAT เป็นค่าเริ่มต้น</label>
                        <select class="form-control" id="settingDefaultVat">
                            <option value="false">ปิด — ไม่คิด VAT (ค่าเริ่มต้น)</option>
                            <option value="true">เปิด — คิด VAT 7%</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">โหมด VAT เริ่มต้น</label>
                        <select class="form-control" id="settingDefaultVatMode">
                            <option value="customer_pays">ลูกค้าจ่าย VAT (ราคา + 7%)</option>
                            <option value="shop_absorbs">ร้านออก VAT ให้ (ราคาเท่าเดิม)</option>
                        </select>
                    </div>
                    <div style="padding:var(--sp-3);background:var(--color-warning-light);border-radius:var(--radius-sm);font-size:0.85rem;">
                        <strong>💡 คำแนะนำ:</strong> ร้านส่วนใหญ่ไม่เปิด VAT เป็นค่าเริ่มต้น เนื่องจากลูกค้าส่วนใหญ่ไม่ต้องการใบกำกับภาษี
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">print</span> จัดการแบบฟอร์มพิมพ์</h3></div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">แสดง VAT ในเอกสาร</label>
                        <select class="form-control" id="settingPrintVat">
                            <option value="auto">อัตโนมัติ (ตาม VAT ใบงาน)</option>
                            <option value="always">แสดงเสมอ</option>
                            <option value="never">ไม่แสดง</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">แสดงส่วนลดในเอกสาร</label>
                        <select class="form-control" id="settingPrintDiscount">
                            <option value="true">แสดง</option>
                            <option value="false">ไม่แสดง</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">แสดงข้อมูลธนาคาร</label>
                        <select class="form-control" id="settingPrintBank">
                            <option value="true">แสดง</option>
                            <option value="false">ไม่แสดง</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">แสดงช่องลายเซ็น</label>
                        <select class="form-control" id="settingPrintSignature">
                            <option value="true">แสดง</option>
                            <option value="false">ไม่แสดง</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- Logo & Payment Config -->
        <div class="settings-grid">
            <div class="card settings-span-all">
                <div class="card-header"><h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">image</span> โลโก้และการรับชำระเงิน</h3></div>
                <div class="card-body">
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">โลโก้ร้าน (Logo)</label>
                            <input type="file" id="settingLogoImage" accept="image/*" class="form-control">
                            <div id="settingLogoPreview" style="margin-top:8px; max-height:80px;"></div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">QR Code รับเงิน</label>
                            <input type="file" id="settingQrImage" accept="image/*" class="form-control">
                            <div id="settingQrPreview" style="margin-top:8px; max-height:80px;"></div>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top:var(--sp-3);">
                        <label class="form-label">ข้อความคำแนะนำการโอนเงิน (แสดงในบิล)</label>
                        <textarea class="form-control" id="settingQrText" rows="3" placeholder="ตัวอย่าง: ธนาคารกสิกรไทย สาขา... เลขที่บัญชี... ชื่อบัญชี..."></textarea>
                    </div>
                </div>
            </div>
        </div>

        <!-- Telegram Config -->
        <div class="settings-grid">
            <div class="card settings-span-all">
                <div class="card-header"><h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">send</span> Telegram Bot</h3></div>
                <div class="card-body">
                    <div style="padding:var(--sp-3);background:var(--color-primary-light);border-radius:var(--radius-sm);font-size:0.85rem;margin-bottom:var(--sp-3);">
                        <strong>ℹ️ ข้อมูล:</strong> คุณสามารถตั้งค่า Chat ID แยกรายสาขา (Jobs / HR / Queue) ได้ที่หน้า <strong>การจัดการสาขา</strong> ในระบบหลังบ้าน (Portal) ระบบจะใช้ Default Chat ID หากสาขานั้นไม่ได้ตั้งค่าไว้
                    </div>
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">Bot Token</label>
                            <input type="text" class="form-control" id="settingTgBotToken" placeholder="123456:ABC-DEF...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Default Chat ID (สำรอง)</label>
                            <input type="text" class="form-control" id="settingTgDefaultChatId" placeholder="-100123456789">
                        </div>
                    </div>
                    <div class="settings-toggle-grid">
                        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;">
                            <input type="checkbox" id="settingTgJobAssigned"> แจ้งเตือนมอบหมายงาน (SA)
                        </label>
                        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;">
                            <input type="checkbox" id="settingTgQcDone"> แจ้งเตือนส่ง QC เสร็จ (ช่าง)
                        </label>
                        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;">
                            <input type="checkbox" id="settingTgPayment"> แจ้งเตือนเก็บเงินเสร็จ (SA)
                        </label>
                        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;">
                            <input type="checkbox" id="settingTgJobClose"> แจ้งเตือนเมื่อปิดใบงาน
                        </label>
                        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;">
                            <input type="checkbox" id="settingTgLowStock"> แจ้งเตือนสินค้าใกล้หมด
                        </label>
                        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;">
                            <input type="checkbox" id="settingTgDailySummary"> สรุปรายวัน
                        </label>
                    </div>
                    <div style="margin-top:var(--sp-3);display:flex;gap:var(--sp-3);">
                        <button class="btn btn-sm btn-outline" id="btnTestTelegram"><span class="material-icons-outlined" style="font-size:16px;">send</span> ทดสอบส่ง (Default Jobs)</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Spacer for bottom padding -->
        <div style="height:var(--sp-8);"></div>
    `

    let settingsId = null

    // Load existing settings
    async function loadSettings() {
        try {
            const list = await fetchFullList('settings', { requestKey: null })
            if (list.length > 0) {
                const s = list[0]
                settingsId = s.id
                container.querySelector('#settingShopName').value = s.shop_name || ''
                container.querySelector('#settingAddress').value = s.address || ''
                container.querySelector('#settingPhone').value = s.phone || ''
                container.querySelector('#settingEmail').value = s.email || ''
                container.querySelector('#settingTaxId').value = s.tax_id || ''
                container.querySelector('#settingPrefixJob').value = s.prefix_job || 'JOB'
                container.querySelector('#settingPrefixQT').value = s.prefix_qt || 'QT'
                container.querySelector('#settingPrefixIV').value = s.prefix_iv || 'IV'
                container.querySelector('#settingPrefixRC').value = s.prefix_rc || 'RC'
                container.querySelector('#settingVatRate').value = s.vat_rate ?? 7
                container.querySelector('#settingDefaultVat').value = s.default_vat_enabled ? 'true' : 'false'
                container.querySelector('#settingDefaultVatMode').value = s.default_vat_mode || 'customer_pays'
                container.querySelector('#settingQrText').value = s.qr_payment_text || ''
                
                if (s.logo_image && s.logo_image.length > 0) {
                    const url = typeof s.logo_image[0] === 'string' ? s.logo_image[0] : s.logo_image[0].url
                    container.querySelector('#settingLogoPreview').innerHTML = `<img src="${url}" style="max-height:80px; border-radius:4px;">`
                }
                if (s.qr_payment_image && s.qr_payment_image.length > 0) {
                    const url = typeof s.qr_payment_image[0] === 'string' ? s.qr_payment_image[0] : s.qr_payment_image[0].url
                    container.querySelector('#settingQrPreview').innerHTML = `<img src="${url}" style="max-height:80px; border-radius:4px;">`
                }
                // A1: Cache settings to localStorage (strip sensitive fields first)
                // BUG 58 FIX: Do NOT cache bot_token in localStorage (XSS would expose it)
                const cacheData = { ...s }
                delete cacheData.bot_token
                delete cacheData.tg_bot_token
                localStorage.setItem('mungkhud_settings', JSON.stringify(cacheData))
            }
        } catch (e) {
            console.warn('Settings collection may not exist yet:', e.message)
        }
    }

    // Save settings
    container.querySelector('#btnSaveSettings').addEventListener('click', async () => {
        const data = {
            shop_name: container.querySelector('#settingShopName').value,
            address: container.querySelector('#settingAddress').value,
            phone: container.querySelector('#settingPhone').value,
            email: container.querySelector('#settingEmail').value,
            tax_id: container.querySelector('#settingTaxId').value,
            prefix_job: container.querySelector('#settingPrefixJob').value,
            prefix_qt: container.querySelector('#settingPrefixQT').value,
            prefix_iv: container.querySelector('#settingPrefixIV').value,
            prefix_rc: container.querySelector('#settingPrefixRC').value,
            vat_rate: parseFloat(container.querySelector('#settingVatRate').value) || 7,
            default_vat_enabled: container.querySelector('#settingDefaultVat').value === 'true',
            default_vat_mode: container.querySelector('#settingDefaultVatMode').value,
            qr_payment_text: container.querySelector('#settingQrText').value,
        }
        
        try {
            const btn = container.querySelector('#btnSaveSettings')
            const ogText = btn.innerHTML
            btn.innerHTML = 'กำลังบันทึก...'
            btn.disabled = true

            // Handle uploads
            const logoInput = container.querySelector('#settingLogoImage')
            if (logoInput && logoInput.files.length > 0) {
                data.logo_image = await uploadAttachment(logoInput.files[0])
            }
            const qrInput = container.querySelector('#settingQrImage')
            if (qrInput && qrInput.files.length > 0) {
                data.qr_payment_image = await uploadAttachment(qrInput.files[0])
            }
            if (settingsId) {
                await updateRecord('settings', settingsId, data)
            } else {
                const created = await createRecord('settings', data)
                settingsId = created.id
            }

            // BUG 77 FIX: Save Telegram config together with main settings
            const tgConfig = {
                bot_token: container.querySelector('#settingTgBotToken').value.trim(),
                default_chat_id: container.querySelector('#settingTgDefaultChatId').value.trim(),
                notify_job_assigned: container.querySelector('#settingTgJobAssigned').checked,
                notify_qc_done: container.querySelector('#settingTgQcDone').checked,
                notify_payment: container.querySelector('#settingTgPayment').checked,
                notify_job_close: container.querySelector('#settingTgJobClose').checked,
                notify_low_stock: container.querySelector('#settingTgLowStock').checked,
                notify_daily_summary: container.querySelector('#settingTgDailySummary').checked,
            }
            await saveTelegramConfig(tgConfig)

            showToast('บันทึกการตั้งค่าเรียบร้อย', 'success')
            // BUG 17 FIX: Re-fetch from server before caching so upload URLs are real server paths, not local File objects
            try {
                const savedRecords = await fetchFullList('settings', { filter: `id='${settingsId}'`, requestKey: null })
                const savedData = savedRecords[0] || data
                const cacheData = { ...savedData }
                delete cacheData.bot_token
                delete cacheData.tg_bot_token
                localStorage.setItem('mungkhud_settings', JSON.stringify(cacheData))
            } catch {
                // Fallback to the local payload if re-fetch fails
                const cacheData = { ...data }
                delete cacheData.bot_token
                delete cacheData.tg_bot_token
                localStorage.setItem('mungkhud_settings', JSON.stringify(cacheData))
            }
            btn.innerHTML = ogText
            btn.disabled = false
            // Reload to show new previews
            loadSettings()
        } catch (e) {
            console.error(e)
            showToast('เกิดข้อผิดพลาด: ' + e.message, 'error')
            const statusEl = container.querySelector('#settingsSaveStatus')
            if (statusEl) statusEl.textContent = ''
            const btn = container.querySelector('#btnSaveSettings')
            btn.innerHTML = '<span class="material-icons-outlined">save</span> บันทึกทั้งหมด'
            btn.disabled = false
        }
    })

    // BUG 77 FIX: Telegram is now saved as part of the unified save (above).
    // Standalone save button removed. Only test button remains.
    container.querySelector('#btnSaveTelegram')?.remove()

    container.querySelector('#btnTestTelegram')?.addEventListener('click', async () => {
        const ok = await sendTestMessage(null, 'jobs')
        showToast(ok ? 'ส่งข้อความทดสอบสำเร็จ ✅' : 'ส่งไม่ได้ — ตรวจสอบ Token / Default Chat ID', ok ? 'success' : 'error')
    })

    // Load Telegram config
    async function loadTelegramConfig() {
        try {
            const settings = await fetchFullList('system_settings', { filter: `key='telegram_config'`, requestKey: 'tg_load' })
            if (settings.length > 0 && settings[0].value) {
                const config = JSON.parse(settings[0].value)
                const el = (id) => container.querySelector(id)
                if (el('#settingTgBotToken')) el('#settingTgBotToken').value = config.bot_token || ''
                if (el('#settingTgDefaultChatId')) el('#settingTgDefaultChatId').value = config.default_chat_id || config.chat_id || ''
                if (el('#settingTgJobAssigned')) el('#settingTgJobAssigned').checked = !!config.notify_job_assigned
                if (el('#settingTgQcDone')) el('#settingTgQcDone').checked = !!config.notify_qc_done
                if (el('#settingTgPayment')) el('#settingTgPayment').checked = !!config.notify_payment
                if (el('#settingTgJobClose')) el('#settingTgJobClose').checked = !!config.notify_job_close
                if (el('#settingTgLowStock')) el('#settingTgLowStock').checked = !!config.notify_low_stock
                if (el('#settingTgDailySummary')) el('#settingTgDailySummary').checked = !!config.notify_daily_summary
            }
        } catch { /* app_settings may not exist */ }
    }

    loadSettings()
    loadTelegramConfig()
}
