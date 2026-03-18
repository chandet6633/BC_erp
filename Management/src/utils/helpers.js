// @ts-nocheck
/**
 * Shared utility functions for formatting and data parsing.
 */

export const formatCurrency = (num) => {
    if (num == null || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const excelDateToJS = (serial) => {
    if (serial instanceof Date) return serial;
    if (typeof serial === 'string') {
        const d = new Date(serial);
        if (!isNaN(d.getTime())) return d;
    }
    if (typeof serial === 'number') {
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        return new Date(utc_value * 1000);
    }
    return null;
};

export const parseNumber = (val) => {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    const str = String(val).replace(/,/g, '').trim();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

// Global Exposure for Legacy Support
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.excelDateToJS = excelDateToJS;
window.parseNumber = parseNumber;

export const setupTabs = (tabBtns, tabContents) => {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const el = document.getElementById(target);
            if (el) el.classList.add('active');
        });
    });
};
window.setupTabs = setupTabs;

export const getTodayThailand = () => {
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    return thailandTime.toISOString().slice(0, 10);
};
window.getTodayThailand = getTodayThailand;

export const getMonthName = (month) => {
    const months = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return months[month] || '';
};
window.getMonthName = getMonthName;

export const getDayName = (day) => {
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    return days[day] || '';
};

export const getCurrentYear = () => new Date().getFullYear();
export const getCurrentMonth = () => new Date().getMonth() + 1;

window.getDayName = getDayName;
window.getCurrentYear = getCurrentYear;
window.getCurrentMonth = getCurrentMonth;

export const getChartDefaults = () => ({
    color: '#8b8fa3',
    borderColor: 'rgba(255,255,255,0.08)',
    font: { family: "'Prompt', 'Inter', sans-serif" }
});
window.getChartDefaults = getChartDefaults;

export const EXPENSE_CATEGORIES = [
    'ค่าเช่า', 'ค่าสินค้า', 'เป้ารายวันพนักงาน', 'ค่าไฟฟ้า', 'ค่าน้ำ', 'ค่าวัสดุสิ้นเปลือง',
    'ค่าอินเตอร์เน็ต', 'ค่าขนส่ง', 'ค่าบำรุงรักษา', 'ค่าการตลาด', 'ค่าใช้บริการ', 'ค่าอุปกรณ์', 'ค่าอื่นๆ'
];
window.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;

export const OWNER_EXPENSE_CATEGORIES = ['เงินเดือน', 'โบนัส', 'ค่าคอมมิชชั่น', 'ค่าใช้จ่าย'];
window.OWNER_EXPENSE_CATEGORIES = OWNER_EXPENSE_CATEGORIES;

export const compressImage = async (file, maxWidth = 1200, quality = 0.7) => {
    if (!file.type.startsWith('image/')) return file;
    return new Promise(resolve => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = e => {
            if (typeof e.target.result !== 'string') return;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => {
                    if (blob && blob.size < file.size) {
                        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};
window.compressImage = compressImage;

export const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};
window.debounce = debounce;

export const uploadReceipt = async (file, folder = 'general') => {
    if (!file) return null;
    try {
        const formData = new FormData();

        // Compress image before upload if it's large
        const compressedFile = await compressImage(file, 1200, 0.7);
        formData.append('file', compressedFile);
        formData.append('tool_reference', folder);

        // Upload to the new generic image_storage collection
        const record = await window.pb.collection('image_storage').create(formData);
        return window.pb.files.getUrl(record, record.file);
    } catch (e) {
        console.error('File upload failed:', e);
        window.showToast?.('อัปโหลดไฟล์ไม่สำเร็จ', 'danger');
        return null;
    }
};
window.uploadReceipt = uploadReceipt;

