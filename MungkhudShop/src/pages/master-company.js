import { createMasterPage } from './master-factory.js'
export const initMasterCompanyPage = createMasterPage({
    title: 'บริษัท', icon: 'business', collection: 'companies',
    fields: [
        { key: 'name', label: 'ชื่อบริษัท', required: true },
        { key: 'tax_id', label: 'เลขประจำตัวผู้เสียภาษี' },
        { key: 'branch', label: 'สาขา' },
        { key: 'address', label: 'ที่อยู่', type: 'textarea' },
        { key: 'phone', label: 'เบอร์โทรศัพท์' },
        { key: 'email', label: 'อีเมล', type: 'email' },
        { key: 'website', label: 'เว็บไซต์' },
        { key: 'contact', label: 'ผู้ติดต่อ' },
    ],
    columns: [
        { key: 'name', label: 'ชื่อบริษัท' },
        { key: 'tax_id', label: 'เลขภาษี' },
        { key: 'branch', label: 'สาขา' },
        { key: 'phone', label: 'เบอร์โทร' },
        { key: 'contact', label: 'ผู้ติดต่อ' },
    ]
})
