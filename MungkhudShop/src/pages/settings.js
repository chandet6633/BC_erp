/**
 * Settings page — persists to PocketBase `settings` collection (single-record pattern).
 * Now includes VAT defaults and print layout configuration.
 */
import { showToast } from '../components/ui.js'
import { fetchFullList, createRecord, updateRecord } from '../services/pb.js'
import { saveTelegramConfig, sendTestMessage } from '../services/telegram.js'
import { sanitizeFilter } from '../utils/sanitize.js'

export function initSettingsPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">settings</span>
                <h1>ตั้งค่าระบบ</h1>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);">
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
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-top:var(--sp-5);">
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

        <!-- Telegram Config -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-top:var(--sp-5);">
            <div class="card" style="grid-column:span 2;">
                <div class="card-header"><h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">send</span> Telegram Bot</h3></div>
                <div class="card-body">
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">Bot Token</label>
                            <input type="text" class="form-control" id="settingTgBotToken" placeholder="123456:ABC-DEF...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Chat ID / Group ID</label>
                            <input type="text" class="form-control" id="settingTgChatId" placeholder="-100123456789">
                        </div>
                    </div>
                    <div class="form-row-2" style="margin-top:var(--sp-3);">
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
                        <button class="btn btn-sm btn-outline" id="btnSaveTelegram"><span class="material-icons-outlined" style="font-size:16px;">save</span> บันทึก Telegram</button>
                        <button class="btn btn-sm btn-outline" id="btnTestTelegram"><span class="material-icons-outlined" style="font-size:16px;">send</span> ส่งข้อความทดสอบ</button>
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-top:var(--sp-5);text-align:right;">
            <button class="btn btn-primary btn-lg" id="btnSaveSettings"><span class="material-icons-outlined">save</span> บันทึกการตั้งค่า</button>
        </div>
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
                // A1: Cache settings to localStorage for calcVat
                localStorage.setItem('mungkhud_settings', JSON.stringify(s))
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
        }
        try {
            if (settingsId) {
                await updateRecord('settings', settingsId, data)
            } else {
                const created = await createRecord('settings', data)
                settingsId = created.id
            }
            showToast('บันทึกการตั้งค่าเรียบร้อย', 'success')
            // A1: Cache settings to localStorage for calcVat and other components
            localStorage.setItem('mungkhud_settings', JSON.stringify(data))
        } catch (e) {
            console.error(e)
            showToast('เกิดข้อผิดพลาด: ' + e.message, 'error')
        }
    })

    // Telegram config handlers
    container.querySelector('#btnSaveTelegram')?.addEventListener('click', async () => {
        const config = {
            bot_token: container.querySelector('#settingTgBotToken').value.trim(),
            chat_id: container.querySelector('#settingTgChatId').value.trim(),
            notify_job_close: container.querySelector('#settingTgJobClose').checked,
            notify_low_stock: container.querySelector('#settingTgLowStock').checked,
            notify_daily_summary: container.querySelector('#settingTgDailySummary').checked,
        }
        const ok = await saveTelegramConfig(config)
        showToast(ok ? 'บันทึก Telegram config สำเร็จ' : 'ไม่สามารถบันทึกได้', ok ? 'success' : 'error')
    })

    container.querySelector('#btnTestTelegram')?.addEventListener('click', async () => {
        const ok = await sendTestMessage()
        showToast(ok ? 'ส่งข้อความสำเร็จ ✅' : 'ส่งไม่ได้ — ตรวจสอบ Token / Chat ID', ok ? 'success' : 'error')
    })

    // Load Telegram config
    async function loadTelegramConfig() {
        try {
            const settings = await fetchFullList('app_settings', { filter: `key='telegram_config'`, requestKey: 'tg_load' })
            if (settings.length > 0 && settings[0].value) {
                const config = JSON.parse(settings[0].value)
                const el = (id) => container.querySelector(id)
                if (el('#settingTgBotToken')) el('#settingTgBotToken').value = config.bot_token || ''
                if (el('#settingTgChatId')) el('#settingTgChatId').value = config.chat_id || ''
                if (el('#settingTgJobClose')) el('#settingTgJobClose').checked = !!config.notify_job_close
                if (el('#settingTgLowStock')) el('#settingTgLowStock').checked = !!config.notify_low_stock
                if (el('#settingTgDailySummary')) el('#settingTgDailySummary').checked = !!config.notify_daily_summary
            }
        } catch { /* app_settings may not exist */ }
    }

    loadSettings()
    loadTelegramConfig()
}
