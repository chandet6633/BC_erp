import { createMasterPage } from './master-factory.js'
export const initMasterGroupPage = createMasterPage({
    title: 'กลุ่มสินค้า', icon: 'category', collection: 'product_groups',
    fields: [
        { key: 'code', label: 'รหัสกลุ่ม', required: true },
        { key: 'name', label: 'ชื่อกลุ่ม', required: true },
        {
            key: 'is_active', label: 'สถานะ', type: 'select', options: [
                { value: 'true', label: 'ใช้งาน' },
                { value: 'false', label: 'ไม่ใช้งาน' }
            ]
        },
    ],
    columns: [
        { key: 'code', label: 'รหัส' },
        { key: 'name', label: 'ชื่อกลุ่ม' },
        { key: 'is_active', label: 'สถานะ', render: (r) => r.is_active === 'true' || r.is_active === true ? '✅ ใช้งาน' : '❌ ไม่ใช้งาน' },
    ]
})
