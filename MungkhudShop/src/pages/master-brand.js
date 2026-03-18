import { createMasterPage } from './master-factory.js'
export const initMasterBrandPage = createMasterPage({
    title: 'ยี่ห้อสินค้า', icon: 'branding_watermark', collection: 'product_brands',
    fields: [
        { key: 'code', label: 'รหัสยี่ห้อ', required: true },
        { key: 'name', label: 'ชื่อยี่ห้อ', required: true },
        {
            key: 'is_active', label: 'สถานะ', type: 'select', options: [
                { value: 'true', label: 'ใช้งาน' },
                { value: 'false', label: 'ไม่ใช้งาน' }
            ]
        },
    ],
    columns: [
        { key: 'code', label: 'รหัส' },
        { key: 'name', label: 'ชื่อยี่ห้อ' },
        { key: 'is_active', label: 'สถานะ', render: (r) => r.is_active === 'true' || r.is_active === true ? '✅ ใช้งาน' : '❌ ไม่ใช้งาน' },
    ]
})
