import { createMasterPage } from './master-factory.js'
import { fetchFullList } from '../services/pb.js'

export const initMasterVehiclePage = createMasterPage({
    title: 'ยานพาหนะ', icon: 'directions_car', collection: 'vehicles',
    fields: [
        { key: 'plate_number', label: 'ทะเบียนรถ', required: true },
        { key: 'province', label: 'จังหวัด' },
        { key: 'brand', label: 'ยี่ห้อ' },
        { key: 'model', label: 'รุ่น' },
        { key: 'year', label: 'ปี', type: 'number' },
        { key: 'color', label: 'สี' },
        { key: 'chassis', label: 'เลขตัวถัง' },
        { key: 'engine', label: 'เลขเครื่องยนต์' },
        // FK to customers — uses async_select to populate from customers table
        {
            key: 'customer_id',
            label: 'เจ้าของ (ลูกค้า)',
            type: 'async_select',
            placeholder: '-- เลือกลูกค้า --',
            fetchOptions: async () => {
                const custs = await fetchFullList('customers')
                return custs.map(c => ({
                    value: c.id,
                    label: c.cust_code ? `[${c.cust_code}] ${c.name}` : c.name
                }))
            }
        },
        { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    columns: [
        { key: 'plate_number', label: 'ทะเบียน' },
        { key: 'brand', label: 'ยี่ห้อ' },
        { key: 'model', label: 'รุ่น' },
        { key: 'color', label: 'สี' },
        // Render cust_code (resolved via onDataLoaded hook)
        { key: '_customer_display', label: 'เจ้าของ' },
    ],
    // Resolve customer_id to display name for the grid
    onDataLoaded: async (items) => {
        const custIds = [...new Set(items.map(v => v.customer_id).filter(Boolean))]
        if (custIds.length === 0) return
        try {
            const filter = custIds.map(id => `id='${id}'`).join('||')
            const custs = await fetchFullList('customers', { filter, requestKey: null })
            const custMap = {}
            custs.forEach(c => { custMap[c.id] = c.cust_code ? `[${c.cust_code}]` : c.name })
            items.forEach(v => {
                v._customer_display = custMap[v.customer_id] || '-'
            })
        } catch { /* best effort */ }
    }
})
