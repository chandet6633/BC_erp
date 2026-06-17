import { createMasterPage } from './master-factory.js'
import { fetchFullList } from '../services/pb.js'

const THAI_PROVINCES = ['กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี']

export const initMasterVehiclePage = createMasterPage({
    title: 'ยานพาหนะ', icon: 'directions_car', collection: 'vehicles',
    fields: [
        { key: 'plate_number', label: 'ทะเบียนรถ', required: true },
        { key: 'province', label: 'จังหวัด', type: 'datalist', options: THAI_PROVINCES },
        { key: 'brand', label: 'ยี่ห้อ' },
        { key: 'model', label: 'รุ่น' },
        { key: 'year', label: 'ปี', type: 'number' },
        { key: 'color', label: 'สี' },
        { key: 'chassis', label: 'เลขตัวถัง' },
        { key: 'engine', label: 'เลขเครื่องยนต์' },
        { key: 'customer_id', label: 'เจ้าของ (ลูกค้า)', type: 'autocomplete', placeholder: 'ค้นหาลูกค้า...',
            fetchItems: async () => (await fetchFullList('customers')).map(c => ({ id: c.id, code: c.cust_code || '', label: c.name, secondary: c.phone || '' }))
        },
        { key: 'notes', label: 'หมายเหตุ', type: 'textarea' },
    ],
    columns: [
        { key: 'plate_number', label: 'ทะเบียน' },
        { key: 'brand', label: 'ยี่ห้อ' },
        { key: 'model', label: 'รุ่น' },
        { key: 'color', label: 'สี' },
        { key: '_customer_display', label: 'เจ้าของ' },
    ],
    onDataLoaded: async (items) => {
        const custIds = [...new Set(items.map(v => v.customer_id).filter(Boolean))]
        if (custIds.length === 0) return
        try {
            const filter = custIds.map(id => `id='${id}'`).join('||')
            const custs = await fetchFullList('customers', { filter, requestKey: null })
            const custMap = {}
            custs.forEach(c => { custMap[c.id] = c.cust_code ? `[${c.cust_code}] ${c.name}` : c.name })
            items.forEach(v => { v._customer_display = custMap[v.customer_id] || '-' })
        } catch { }
    }
})
