/**
 * In-App Changelog — "What's New" modal shown on version update.
 */

const APP_VERSION = '2.3.0'

const CHANGELOG = [
    {
        version: '2.3.0',
        date: '2026-03-13',
        title: 'Sprint 3 — Kanban, Telegram, Analytics',
        items: [
            '📋 Kanban Board — ลาก-วางเปลี่ยนสถานะใบงาน',
            '💬 Telegram Bot — แจ้งเตือนสรุปรายวัน ปิดงาน สินค้าใกล้หมด',
            '📊 Dashboard Sparklines — กราฟแนวโน้ม 7 วันย้อนหลัง',
            '🧾 PDF Invoice — ออกใบกำกับภาษีภาษาไทย',
            '📤 Excel Export — ส่งออกรายงาน .xlsx',
            '👷 Employee Check-in — ลงเวลาเข้า-ออก',
            '📈 Branch Comparison — เปรียบเทียบยอดรายสาขา',
        ]
    },
    {
        version: '2.2.0',
        date: '2026-03-12',
        title: 'Sprint 2 — Security & UX',
        items: [
            '🔐 PIN Login รวมฐานข้อมูลเดียวกัน',
            '🏠 ปุ่มกลับหน้าหลัก Portal',
            '🌙 Dark Mode — สลับธีมมืด/สว่าง',
            '👷 สิทธิ์พนักงาน — ซ่อนเมนูรายงานและตั้งค่า',
            '🔒 Branch Lock — พนักงานเห็นเฉพาะสาขาตัวเอง',
            '⏱ Session Timeout — ออกจากระบบอัตโนมัติ 30 นาที',
            '🚨 Low-Stock Alert — แจ้งเตือนเมื่อสินค้าใกล้หมด',
        ]
    },
    {
        version: '2.1.0',
        date: '2026-03-11',
        title: 'Sprint 1 — Foundation',
        items: [
            '📱 Mobile Responsive — ใช้งานบนมือถือได้',
            '🦴 Skeleton Loading — แสดงตัวแทนขณะโหลด',
            '⚠️ Error Boundary — หน้าผิดพลาดภาษาไทย',
            '🧪 Playwright Tests — ทดสอบอัตโนมัติ 10 รายการ',
        ]
    }
]

export function initChangelog() {
    const lastSeen = localStorage.getItem('mungkhud_changelog_version')
    if (lastSeen === APP_VERSION) return // Already seen

    showChangelogModal()
}

export function showChangelogModal() {
    // Remove existing modal
    document.getElementById('changelogModal')?.remove()

    const latest = CHANGELOG[0]
    const allEntries = CHANGELOG.map(entry => `
        <div style="margin-bottom:var(--sp-4);">
            <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);">
                <span style="background:var(--color-primary);color:white;padding:2px 8px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:600;">v${entry.version}</span>
                <span style="color:var(--color-text-muted);font-size:0.8rem;">${entry.date}</span>
            </div>
            <h4 style="margin:0 0 var(--sp-2) 0;font-size:0.95rem;">${entry.title}</h4>
            <ul style="margin:0;padding-left:var(--sp-4);line-height:1.8;">
                ${entry.items.map(i => `<li style="font-size:0.85rem;">${i}</li>`).join('')}
            </ul>
        </div>
    `).join('<hr style="border:none;border-top:1px solid var(--color-border);margin:var(--sp-3) 0;">')

    const modal = document.createElement('div')
    modal.id = 'changelogModal'
    modal.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:var(--sp-4);">
            <div style="background:var(--color-surface);border-radius:var(--radius-lg);max-width:520px;width:100%;max-height:80vh;display:flex;flex-direction:column;box-shadow:var(--shadow-xl);">
                <div style="padding:var(--sp-4) var(--sp-5);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center;">
                    <h2 style="margin:0;font-size:1.1rem;">🆕 มีอะไรใหม่</h2>
                    <button id="changelogClose" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--color-text-muted);">✕</button>
                </div>
                <div style="padding:var(--sp-4) var(--sp-5);overflow-y:auto;flex:1;">
                    ${allEntries}
                </div>
                <div style="padding:var(--sp-3) var(--sp-5);border-top:1px solid var(--color-border);text-align:right;">
                    <button id="changelogDismiss" class="btn btn-primary btn-sm">เข้าใจแล้ว</button>
                </div>
            </div>
        </div>
    `
    document.body.appendChild(modal)

    const dismiss = () => {
        localStorage.setItem('mungkhud_changelog_version', APP_VERSION)
        modal.remove()
    }
    modal.querySelector('#changelogClose').addEventListener('click', dismiss)
    modal.querySelector('#changelogDismiss').addEventListener('click', dismiss)
    modal.querySelector('div').addEventListener('click', (e) => {
        if (e.target === modal.querySelector('div')) dismiss()
    })
}
