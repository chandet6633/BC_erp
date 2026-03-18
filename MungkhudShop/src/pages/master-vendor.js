import { createMasterPage } from './master-factory.js'
export const initMasterVendorPage = createMasterPage({
    title: 'ผู้จำหน่าย', icon: 'store', collection: 'vendors',
    fields: [
        { key: 'name', label: 'ชื่อผู้จำหน่าย', required: true },
        { key: 'tax_id', label: 'เลขประจำตัวผู้เสียภาษี' },
        { key: 'contact', label: 'ผู้ติดต่อ' },
        { key: 'phone', label: 'เบอร์โทรศัพท์' },
        { key: 'email', label: 'อีเมล', type: 'email' },
        { key: 'address', label: 'ที่อยู่', type: 'textarea' },
        { key: 'payment_terms', label: 'เงื่อนไขการชำระ', type: 'select', options: ['เงินสด', '30 วัน', '60 วัน', '90 วัน'] },
        { key: 'bank', label: 'ธนาคาร' },
        { key: 'account', label: 'เลขบัญชี' },
        { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    columns: [
        { key: 'name', label: 'ชื่อ' },
        { key: 'contact', label: 'ผู้ติดต่อ' },
        { key: 'phone', label: 'เบอร์โทร' },
        { key: 'payment_terms', label: 'เงื่อนไข' },
    ]
})
