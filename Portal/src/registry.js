/**
 * ═══════════════════════════════════════════════════════════════
 * TOOL REGISTRY — Single Source of Truth
 * ═══════════════════════════════════════════════════════════════
 *
 * This file lists ALL tools in the BC Auto Portal system.
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
        title: 'แดชบอร์ดสรุป',
        description: 'ภาพรวมรายรับ-รายจ่าย กำไร-ขาดทุน',
        path: '/pages/dashboard/index.html',
        icon: '<span class="material-icons-outlined">bar_chart</span>',
        roles: ['owner', 'manager', 'admin'],
        group: 'financial'
    },

    {
        id: 'audit',
        title: 'ตรวจสอบรายการ',
        description: 'Audit Log และตรวจสอบความถูกต้อง',
        path: '/pages/branch-operations/audit.html',
        icon: '<span class="material-icons-outlined">search</span>',
        roles: ['owner', 'manager', 'admin'],
        group: 'financial',
        hidden: true // Moved to Operations Menu
    },

    // ─────────────── OPERATIONS ───────────────
    {
        id: 'operations_menu',
        title: 'จัดการรายการ',
        description: 'บันทึก, ตรวจสอบ และยืนยันรายการ',
        path: '/pages/operations/index.html',
        icon: '<span class="material-icons-outlined">folder_open</span>',
        roles: ['owner', 'manager', 'admin', 'sa'],
        group: 'operations'
    },
    {
        id: 'entry',
        title: 'บันทึกรายจ่าย',
        description: 'บันทึกค่าใช้จ่ายประจำวัน',
        path: '/pages/branch-operations/entry.html',
        icon: '<span class="material-icons-outlined">receipt_long</span>',
        roles: ['owner', 'manager', 'admin', 'sa'],
        group: 'financial'
    },

    {
        id: 'verification',
        title: 'ยืนยันรายการ',
        description: 'ตรวจสอบและยืนยันรายการที่บันทึก',
        path: '/pages/branch-operations/verification.html',
        icon: '<span class="material-icons-outlined">check_circle</span>',
        roles: ['owner', 'manager', 'admin'],
        group: 'operations',
        hidden: true // Moved to Operations Menu
    },

    // ─────────────── EXTERNAL TOOLS ───────────────
    {
        id: 'bctool_external',
        title: 'BC Tool',
        description: 'เครื่องมือระบบจัดการ (ภายนอก)',
        path: 'https://bctool.netlify.app/',
        icon: '<span class="material-icons-outlined">link</span>',
        roles: ['owner', 'manager', 'admin', 'sa'],
        group: 'operations'
    },
    {
        id: 'mungkhudshop',
        title: 'ระบบจัดการร้าน',
        description: 'ใบงาน สต็อก เอกสาร จัดซื้อ',
        path: '__mungkhudshop__',
        icon: '<span class="material-icons-outlined">store</span>',
        roles: ['owner', 'manager', 'admin', 'sa'],
        group: 'operations'
    },
    {
        id: 'mechanic_dashboard',
        title: 'หน้างานช่าง',
        description: 'ดูงานที่ได้รับมอบหมาย ส่ง QC และดูผลงาน',
        path: '__mungkhudshop_mechanic__',
        icon: '<span class="material-icons-outlined">engineering</span>',
        roles: ['mechanic', 'sa', 'owner', 'manager', 'admin'],
        group: 'operations'
    },
    {
        id: 'technical_knowledge',
        title: 'คลังความรู้เทคนิค',
        description: 'ข้อมูลรุ่นรถ เทคนิคการซ่อม และความรู้สำหรับทีมช่างและ S.A.',
        path: '/pages/knowledge/index.html',
        icon: '<span class="material-icons-outlined">tips_and_updates</span>',
        roles: ['mechanic', 'sa', 'owner', 'manager', 'admin'],
        group: 'operations'
    },
    {
        id: 'sa_docs',
        title: 'ฐานข้อมูลและเอกสาร S.A.',
        description: 'ราคาซัพพลายเออร์ เอกสารบริการ และข้อมูลอ้างอิงของทีม S.A.',
        path: '/pages/sa-docs/index.html',
        icon: '<span class="material-icons-outlined">folder_managed</span>',
        roles: ['sa', 'owner', 'manager', 'admin'],
        group: 'operations'
    },

    // ─────────────── HR ───────────────
    {
        id: 'checkin',
        title: 'เข้า-ออกงาน',
        description: 'ลงเวลาเข้า-ออกพนักงาน',
        path: '/pages/hr/checkin.html',
        icon: '<span class="material-icons-outlined">schedule</span>',
        roles: ['mechanic', 'sa', 'owner', 'manager', 'admin'],
        group: 'hr'
    },
    {
        id: 'hr_dashboard',
        title: 'HR Dashboard',
        description: 'จัดการพนักงาน เวลาทำงาน เงินเดือน',
        path: '/pages/hr/index.html',
        icon: '<span class="material-icons-outlined">groups</span>',
        roles: ['owner', 'manager', 'admin'],
        group: 'hr'
    },

    // ─────────────── ADMIN ───────────────
    {
        id: 'admin_suite',
        title: 'ตั้งค่าระบบ',
        description: 'จัดการผู้ใช้ สิทธิ์ และระบบ',
        path: '/pages/admin/index.html',
        icon: '<span class="material-icons-outlined">settings</span>',
        roles: ['admin'],
        group: 'admin'
    },
    {
        id: 'integrity_check',
        title: 'ตรวจสอบความสมบูรณ์ข้อมูล',
        description: 'ตรวจสอบ Stock, เอกสาร และรายการที่มีปัญหา',
        path: '/pages/admin/integrity-check.html',
        icon: '<span class="material-icons-outlined">fact_check</span>',
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
