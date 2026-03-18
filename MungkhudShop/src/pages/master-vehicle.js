import { createMasterPage } from './master-factory.js'
export const initMasterVehiclePage = createMasterPage({
    title: 'ยานพาหนะ', icon: 'directions_car', collection: 'vehicles',
    fields: [
        { key: 'plate', label: 'ทะเบียนรถ', required: true },
        { key: 'province', label: 'จังหวัด' },
        { key: 'brand', label: 'ยี่ห้อ' },
        { key: 'model', label: 'รุ่น' },
        { key: 'year', label: 'ปี', type: 'number' },
        { key: 'color', label: 'สี' },
        { key: 'chassis', label: 'เลขตัวถัง' },
        { key: 'engine', label: 'เลขเครื่องยนต์' },
        { key: 'customer', label: 'เจ้าของ (ลูกค้า)' },
        { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    columns: [
        { key: 'plate', label: 'ทะเบียน' },
        { key: 'brand', label: 'ยี่ห้อ' },
        { key: 'model', label: 'รุ่น' },
        { key: 'color', label: 'สี' },
        { key: 'customer', label: 'เจ้าของ' },
    ]
})
