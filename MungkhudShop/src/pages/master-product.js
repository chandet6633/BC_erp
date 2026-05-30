import { createMasterPage } from './master-factory.js'
import { fetchFullList } from '../services/pb.js'

// U2: Cache for brand/group name resolution
let _brandMap = null, _groupMap = null
async function getBrandMap() {
    if (_brandMap) return _brandMap
    try {
        const brands = await fetchFullList('product_brands')
        _brandMap = {}
        brands.forEach(b => { _brandMap[b.id] = b.name })
    } catch (_) { _brandMap = {} }
    return _brandMap
}
async function getGroupMap() {
    if (_groupMap) return _groupMap
    try {
        const groups = await fetchFullList('product_groups')
        _groupMap = {}
        groups.forEach(g => { _groupMap[g.id] = g.name })
    } catch (_) { _groupMap = {} }
    return _groupMap
}

export const initMasterProductPage = createMasterPage({
    title: 'สินค้า / บริการ', icon: 'category', collection: 'products',
    fields: [
        { key: 'code', label: 'รหัสสินค้า', required: true },
        { key: 'name', label: 'ชื่อสินค้า / บริการ', required: true },
        {
            key: 'type', label: 'ประเภท', type: 'select', options: [
                { value: 'part', label: 'อะไหล่' },
                { value: 'service', label: 'บริการ' },
                { value: 'fluid', label: 'น้ำมัน/สารหล่อลื่น' },
                { value: 'accessory', label: 'อุปกรณ์เสริม' },
                { value: 'other', label: 'อื่นๆ' }
            ]
        },
        {
            key: 'is_track_stock', label: 'ตัดสต็อก', type: 'select', options: [
                { value: 'true', label: 'ตัดสต็อก' },
                { value: 'false', label: 'ไม่ตัดสต็อก (บริการ/ค่าแรง)' }
            ]
        },
        {
            key: 'brand_id', label: 'ยี่ห้อ', type: 'async_select',
            placeholder: '-- เลือกยี่ห้อ --',
            fetchOptions: async () => {
                const brands = await fetchFullList('product_brands')
                return brands
                    .filter(b => b.is_active !== false && b.is_active !== 'false')
                    .map(b => ({ value: b.id, label: `${b.code ? b.code + ' - ' : ''}${b.name}` }))
            }
        },
        {
            key: 'group_id', label: 'กลุ่มสินค้า', type: 'async_select',
            placeholder: '-- เลือกกลุ่ม --',
            fetchOptions: async () => {
                const groups = await fetchFullList('product_groups')
                return groups
                    .filter(g => g.is_active !== false && g.is_active !== 'false')
                    .map(g => ({ value: g.id, label: `${g.code ? g.code + ' - ' : ''}${g.name}` }))
            }
        },
        { key: 'unit', label: 'หน่วยนับ', type: 'select', options: ['ชิ้น', 'ลิตร', 'กล่อง', 'ชุด', 'งาน', 'ครั้ง', 'อัน', 'คู่', 'ม้วน'] },
        { key: 'cost', label: 'ราคาทุน', type: 'number' },
        { key: 'price', label: 'ราคาขาย', type: 'number' },
        { key: 'min_qty', label: 'จุดสั่งซื้อ (Min)', type: 'number' },
        { key: 'max_qty', label: 'จุดสูงสุด (Max)', type: 'number' },
        { key: 'vendor', label: 'ผู้จำหน่ายหลัก' },
        { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    columns: [
        { key: 'code', label: 'รหัส' },
        { key: 'name', label: 'ชื่อ' },
        { key: 'type', label: 'ประเภท' },
        { key: 'is_track_stock', label: 'สต็อก', render: r => String(r.is_track_stock) === 'false' || r.is_track_stock === false ? 'ไม่ตัด' : 'ตัด' },
        { key: 'brand_id', label: 'ยี่ห้อ', render: r => r._brandName || r.brand_id || '-' },
        { key: 'group_id', label: 'กลุ่ม', render: r => r._groupName || r.group_id || '-' },
        { key: 'unit', label: 'หน่วย' },
        { key: 'cost', label: 'ราคาทุน' },
        { key: 'price', label: 'ราคาขาย' },
        { key: 'min_qty', label: 'Min', render: r => r.min_qty ?? r.min_stock ?? 0 },
        { key: 'max_qty', label: 'Max', render: r => r.max_qty ?? '-' },
    ],
    beforeSave: async (data) => {
        if (String(data.type || '').toLowerCase() === 'service') data.is_track_stock = 'false'
        if (!data.is_track_stock) data.is_track_stock = 'true'
        if (data.min_qty === '' || data.min_qty == null) data.min_qty = 0
        if (data.max_qty === '') data.max_qty = null
        return data
    },
    // U2: Post-process items to resolve brand/group names
    onDataLoaded: async (items) => {
        const [brandMap, groupMap] = await Promise.all([getBrandMap(), getGroupMap()])
        items.forEach(item => {
            item._brandName = brandMap[item.brand_id] || ''
            item._groupName = groupMap[item.group_id] || ''
        })
    }
})
