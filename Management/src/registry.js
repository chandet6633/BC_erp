/**
 * ═══════════════════════════════════════════════════════════════
 * TOOL REGISTRY — Single Source of Truth
 * ═══════════════════════════════════════════════════════════════
 *
 * This file lists ALL tools in the BC Auto Management system.
 * The main menu reads this to render tool cards dynamically.
 *
 * HOW TO ADD A NEW TOOL:
 * 1. Copy src/pages/_tool-template/ → src/pages/[your-tool]/
 * 2. Add an entry to the TOOLS array below
 * 3. Add an entry to vite.config.js → build.rollupOptions.input
 * 4. Write your logic in src/pages/[your-tool]/logic.js
 *
 * FIELDS:
 *   id          — Unique identifier (snake_case)
 *   title       — Display name (Thai preferred)
 *   description — Short description shown on card
 *   path        — URL path relative to src/pages/
 *   icon        — Emoji icon for the card
 *   roles       — Array of roles that can access this tool
 *   group       — Category: 'financial' | 'operations' | 'hr' | 'admin' | 'comms'
 *   branch      — Optional: locks this tool card to set a specific branch on click
 * ═══════════════════════════════════════════════════════════════
 */

export const TOOLS = [
    // ─────────────── FINANCIAL ───────────────
    {
        id: 'dashboard',
        title: '📊 แดชบอร์ดสรุป',
        description: 'ภาพรวมรายรับ-รายจ่าย กำไร-ขาดทุน',
        path: '../dashboard/index.html',
        icon: '📊',
        roles: ['owner', 'manager', 'admin'],
        group: 'financial'
    },
    {
        id: 'database',
        title: '💾 ฐานข้อมูล',
        description: 'ดูและค้นหาข้อมูลธุรกรรมทั้งหมด',
        path: '../branch-operations/database.html',
        icon: '💾',
        roles: ['owner', 'manager', 'admin'],
        group: 'financial'
    },
    {
        id: 'audit',
        title: '🔍 ตรวจสอบรายการ',
        description: 'Audit Log และตรวจสอบความถูกต้อง',
        path: '../branch-operations/audit.html',
        icon: '🔍',
        roles: ['owner', 'manager', 'admin'],
        group: 'financial',
        hidden: true // Moved to Operations Menu
    },

    // ─────────────── OPERATIONS ───────────────
    {
        id: 'operations_menu',
        title: '📂 จัดการรายการ',
        description: 'บันทึก, ตรวจสอบ และยืนยันรายการ',
        path: '../operations/index.html',
        icon: '📂',
        roles: ['owner', 'manager', 'admin', 'sa'],
        group: 'operations'
    },
    {
        id: 'entry',
        title: '📝 บันทึกรายการ',
        description: 'บันทึกรายรับ-รายจ่ายประจำวัน',
        path: '../branch-operations/entry.html',
        icon: '📝',
        roles: ['owner', 'manager', 'sa'],
        group: 'operations',
        hidden: true // Moved to Operations Menu
    },
    {
        id: 'employee_entry',
        title: '🛠️ บันทึก (พนักงาน)',
        description: 'หน้าบันทึกสำหรับพนักงาน',
        path: '../branch-operations/employee-entry.html',
        icon: '🛠️',
        roles: ['sa', 'manager', 'admin'],
        group: 'operations',
        hidden: true // Moved to Operations Menu
    },
    {
        id: 'verification',
        title: '✅ ยืนยันรายการ',
        description: 'ตรวจสอบและยืนยันรายการที่บันทึก',
        path: '../branch-operations/verification.html',
        icon: '✅',
        roles: ['owner', 'manager', 'admin'],
        group: 'operations',
        hidden: true // Moved to Operations Menu
    },

    // ─────────────── EXTERNAL TOOLS ───────────────
    {
        id: 'bctool_external',
        title: '🔗 BC Tool',
        description: 'เครื่องมือระบบจัดการ (ภายนอก)',
        path: 'https://bctool.netlify.app/',
        icon: '🔗',
        roles: ['owner', 'manager', 'admin', 'sa'],
        group: 'operations'
    },
    {
        id: 'mungkhudshop',
        title: '🏪 ระบบจัดการร้าน',
        description: 'ใบงาน สต็อก เอกสาร จัดซื้อ',
        path: '__mungkhudshop__',
        icon: '🏪',
        roles: ['owner', 'manager', 'admin', 'sa'],
        group: 'operations'
    },

    // ─────────────── HR ───────────────
    {
        id: 'checkin',
        title: '⏰ เข้า-ออกงาน',
        description: 'ลงเวลาเข้า-ออกพนักงาน',
        path: '../hr/checkin.html',
        icon: '⏰',
        roles: ['mechanic', 'sa', 'owner', 'manager', 'admin'],
        group: 'hr'
    },
    {
        id: 'hr_dashboard',
        title: '👥 HR Dashboard',
        description: 'จัดการพนักงาน เวลาทำงาน เงินเดือน',
        path: '../hr/index.html',
        icon: '👥',
        roles: ['owner', 'manager', 'admin'],
        group: 'hr'
    },

    // ─────────────── ADMIN ───────────────
    {
        id: 'admin_suite',
        title: '⚙️ ตั้งค่าระบบ',
        description: 'จัดการผู้ใช้ สิทธิ์ และระบบ',
        path: '../admin/index.html',
        icon: '⚙️',
        roles: ['admin'],
        group: 'admin'
    }
];

/**
 * Get tools accessible by a specific role
 */
export function getToolsForRole(role) {
    return TOOLS.filter(tool => tool.roles.includes(role));
}

/**
 * Get a tool by its ID
 */
export function getToolById(id) {
    return TOOLS.find(tool => tool.id === id);
}

// Global access for legacy support
window['ToolRegistry'] = { TOOLS, getToolsForRole, getToolById };
