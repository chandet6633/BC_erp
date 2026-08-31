import { createMasterPage } from './master-factory.js'
import { fetchFullList } from '../services/pb.js'
import { UOM_OPTIONS, TRACKING_TYPE_OPTIONS, formatTrackingType, getProductTrackingType, parseMetadata } from '../utils/inventory-domain.js'

const UNIT_OPTIONS = ['ชิ้น', 'ลิตร', 'กล่อง', 'ชุด', 'งาน', 'ครั้ง', 'อัน', 'คู่', 'ม้วน', 'อื่นๆ']

let _brandRecords = null
let _groupRecords = null

function slug(value, fallback = 'ITEM') {
    const ascii = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '').toUpperCase()
    return (ascii || fallback).slice(0, 4)
}

async function getBrands() {
    if (!_brandRecords) _brandRecords = await fetchFullList('product_brands').catch(() => [])
    return _brandRecords
}

async function getGroups() {
    if (!_groupRecords) _groupRecords = await fetchFullList('product_groups').catch(() => [])
    return _groupRecords
}

async function nextProductCode(data) {
    const [brands, groups, products] = await Promise.all([getBrands(), getGroups(), fetchFullList('products', { requestKey: null }).catch(() => [])])
    const brand = brands.find(b => b.id === data.brand_id)
    const group = groups.find(g => g.id === data.group_id)
    const prefix = [slug(group?.code || group?.name, 'GEN'), slug(brand?.code || brand?.name, 'BRD'), slug(data.name, 'SRV')].join('-')
    const next = products
        .map(p => String(p.code || ''))
        .filter(code => code.startsWith(prefix + '-'))
        .reduce((max, code) => Math.max(max, Number(code.split('-').pop()) || 0), 0) + 1
    return `${prefix}-${String(next).padStart(3, '0')}`
}

const baseMasterPage = createMasterPage({
    title: 'สินค้า / บริการ', icon: 'category', collection: 'products',
    fields: [
        { key: 'code', label: 'รหัสสินค้า', placeholder: 'รหัสสินค้า (หรือปล่อยว่างเพื่อสร้างอัตโนมัติ)' },
        { key: 'name', label: 'ชื่อสินค้า / บริการ', required: true },
        { key: 'type', label: 'ประเภท', type: 'select', options: [
            { value: 'part', label: 'อะไหล่' },
            { value: 'service', label: 'บริการ' },
            { value: 'fluid', label: 'น้ำมัน/สารหล่อลื่น' },
            { value: 'accessory', label: 'อุปกรณ์เสริม' },
            { value: 'labor', label: 'ค่าแรง' },
            { value: 'other', label: 'อื่นๆ' }
        ] },
        { key: 'is_track_stock', label: 'ตัดสต็อก', type: 'select', options: [
            { value: 'true', label: 'ตัดสต็อก' },
            { value: 'false', label: 'ไม่ตัดสต็อก (บริการ/ค่าแรง)' }
        ] },
        { key: 'brand_id', label: 'ยี่ห้อ', type: 'async_select', placeholder: '-- เลือกยี่ห้อ --',
            inlineCreate: {
                label: 'สร้างยี่ห้อ', collection: 'product_brands', prompt: 'ชื่อยี่ห้อสินค้า',
                buildPayload: async (name) => ({ name, code: slug(name), is_active: true }),
                optionLabel: (b) => `${b.code ? b.code + ' - ' : ''}${b.name}`,
                success: 'สร้างยี่ห้อสินค้าเรียบร้อย'
            },
            fetchOptions: async () => (await getBrands()).filter(b => b.is_active !== false && b.is_active !== 'false').map(b => ({ value: b.id, label: `${b.code ? b.code + ' - ' : ''}${b.name}` }))
        },
        { key: 'group_id', label: 'กลุ่มสินค้า', type: 'async_select', placeholder: '-- เลือกกลุ่ม --',
            inlineCreate: {
                label: 'สร้างกลุ่ม', collection: 'product_groups', prompt: 'ชื่อกลุ่มสินค้า/บริการ',
                buildPayload: async (name) => ({ name, code: slug(name), is_active: true }),
                optionLabel: (g) => `${g.code ? g.code + ' - ' : ''}${g.name}`,
                success: 'สร้างกลุ่มสินค้าเรียบร้อย'
            },
            fetchOptions: async () => (await getGroups()).filter(g => g.is_active !== false && g.is_active !== 'false').map(g => ({ value: g.id, label: `${g.code ? g.code + ' - ' : ''}${g.name}` }))
        },
        { key: 'unit', label: 'หน่วยนับ', type: 'select', options: UNIT_OPTIONS },
        { key: 'base_uom', label: 'Base UOM', type: 'select', options: UOM_OPTIONS },
        { key: 'purchase_uom', label: 'Purchase UOM', type: 'select', options: UOM_OPTIONS },
        { key: 'sales_uom', label: 'Sales UOM', type: 'select', options: UOM_OPTIONS },
        { key: 'uom_conversion_factor', label: 'Purchase to Base Factor', type: 'number', placeholder: 'e.g. barrel to liter = 200' },
        { key: 'tracking_type', label: 'Stock Tracking', type: 'select', options: TRACKING_TYPE_OPTIONS, getValue: item => getProductTrackingType(item) },
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
        { key: 'type', label: 'ประเภท', render: r => {
            const types = {
                part: { label: 'อะไหล่', color: '#17a2b8' },
                service: { label: 'บริการ', color: '#28a745' },
                fluid: { label: 'น้ำมัน/หล่อลื่น', color: '#ffc107' },
                accessory: { label: 'อุปกรณ์เสริม', color: '#007bff' },
                labor: { label: 'ค่าแรง', color: '#28a745' },
                other: { label: 'อื่นๆ', color: '#6c757d' }
            }
            const t = types[r.type] || { label: r.type || '-', color: '#6c757d' }
            return `<span class="badge" style="background:${t.color}; color:${t.color === '#ffc107' ? '#000' : '#fff'}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">${t.label}</span>`
        } },
        { key: 'is_track_stock', label: 'สต็อก', render: r => String(r.is_track_stock) === 'false' || r.is_track_stock === false ? 'ไม่ตัด' : 'ตัด' },
        { key: 'brand_id', label: 'ยี่ห้อ', render: r => r._brandName || r.brand_id || '-' },
        { key: 'group_id', label: 'กลุ่ม', render: r => r._groupName || r.group_id || '-' },
        { key: 'unit', label: 'หน่วย' },
        { key: 'base_uom', label: 'Base UOM', render: r => r.base_uom || r.unit || '-' },
        { key: 'tracking_type', label: 'Tracking', render: r => formatTrackingType(getProductTrackingType(r)) },
        { key: 'cost', label: 'ราคาทุน' },
        { key: 'price', label: 'ราคาขาย' },
        { key: 'min_qty', label: 'Min', render: r => r.min_qty ?? r.min_stock ?? 0 },
        { key: 'max_qty', label: 'Max', render: r => r.max_qty ?? '-' },
    ],
    beforeSave: async (data, editingId, currentItem) => {
        if (!editingId && (!data.code || data.code.trim() === '')) {
            data.code = await nextProductCode(data)
        }
        if (String(data.type || '').toLowerCase() === 'service' || String(data.type || '').toLowerCase() === 'labor') {
            data.is_track_stock = 'false'
        }
        if (data.is_track_stock === undefined || data.is_track_stock === null) {
            data.is_track_stock = 'true'
        }
        data.base_uom = data.base_uom || data.unit || 'piece'
        data.purchase_uom = data.purchase_uom || data.base_uom
        data.sales_uom = data.sales_uom || data.base_uom
        data.tracking_type = data.is_track_stock === 'false' ? 'NONE' : (data.tracking_type || 'NONE')
        const metadata = { ...parseMetadata(currentItem), tracking_type: data.tracking_type }
        data.metadata_json = JSON.stringify(metadata)
        if (!data.uom_conversion_factor) data.uom_conversion_factor = 1
        if (data.min_qty == null) data.min_qty = 0
        return data
    },
    onDataLoaded: async (items) => {
        const [brands, groups] = await Promise.all([getBrands(), getGroups()])
        const brandMap = Object.fromEntries(brands.map(b => [b.id, b.name]))
        const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]))
        items.forEach(item => {
            item._brandName = brandMap[item.brand_id] || ''
            item._groupName = groupMap[item.group_id] || ''
        })
    }
})

export function initMasterProductPage(container) {
    baseMasterPage(container)

    const fieldType = container.querySelector('#field_type')
    const fieldTrack = container.querySelector('#field_is_track_stock')
    const fieldTrackingType = container.querySelector('#field_tracking_type')
    
    if (fieldType && fieldTrack) {
        // Create service info note
        const infoNote = document.createElement('div')
        infoNote.id = 'service-info-note'
        infoNote.style.color = '#28a745'
        infoNote.style.fontSize = '0.85rem'
        infoNote.style.marginTop = '4px'
        infoNote.style.display = 'none'
        infoNote.textContent = '💡 บริการ/ค่าแรง จะไม่นับสต็อกโดยอัตโนมัติ'
        fieldTrack.parentNode.appendChild(infoNote)

        const updateTrackingTypeState = () => {
            if (!fieldTrackingType) return
            const trackStock = String(fieldTrack.value) !== 'false'
            fieldTrackingType.disabled = !trackStock
            if (!trackStock) fieldTrackingType.value = 'NONE'
            if (trackStock && !fieldTrackingType.value) fieldTrackingType.value = 'NONE'
        }

        const updateTrackStock = ({ resetForNew = false } = {}) => {
            const val = fieldType.value
            const isService = ['service', 'labor', 'labour'].includes(val)
            if (isService) {
                fieldTrack.value = 'false'
                fieldTrack.disabled = true
                infoNote.style.display = 'block'
            } else {
                if (fieldTrack.disabled || resetForNew || !fieldTrack.value) fieldTrack.value = 'true'
                fieldTrack.disabled = false
                infoNote.style.display = 'none'
            }
            updateTrackingTypeState()
        }

        fieldType.addEventListener('change', () => updateTrackStock())
        fieldTrack.addEventListener('change', updateTrackingTypeState)

        // Event delegation for edit buttons to update the disabled state
        container.addEventListener('click', (e) => {
            if (e.target.closest('.btn-edit')) {
                setTimeout(() => {
                    updateTrackStock()
                }, 50)
            }
            if (e.target.closest('#btnClearMaster')) {
                setTimeout(() => {
                    updateTrackStock({ resetForNew: true })
                }, 50)
            }
        })

        // Run initially
        updateTrackStock({ resetForNew: true })
    }
}
