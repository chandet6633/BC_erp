import { createMasterPage } from './master-factory.js'
export const initMasterCustomerPage = createMasterPage({
    title: 'ลูกค้า', icon: 'people', collection: 'customers',
    fields: [
        { key: 'prefix', label: 'คำนำหน้า', type: 'select', options: ['นาย', 'นาง', 'นางสาว', 'บริษัท', 'ห้างหุ้นส่วน'] },
        { key: 'name', label: 'ชื่อ-นามสกุล', required: true },
        { key: 'tax_id', label: 'เลขประจำตัวผู้เสียภาษี' },
        { key: 'phone', label: 'เบอร์โทรศัพท์' },
        { key: 'email', label: 'อีเมล', type: 'email' },
        { key: 'address', label: 'ที่อยู่', type: 'textarea' },
        { key: 'credit_limit', label: 'วงเงินเครดิต', type: 'number' },
        { key: 'points', label: 'แต้มสะสม', type: 'number' },
        { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    columns: [
        { key: 'name', label: 'ชื่อ' },
        { key: 'phone', label: 'เบอร์โทร' },
        { key: 'email', label: 'อีเมล' },
        { key: 'credit_limit', label: 'วงเงิน' },
        { key: 'points', label: 'แต้ม' },
    ]
})
