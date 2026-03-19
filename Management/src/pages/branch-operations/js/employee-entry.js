// @ts-nocheck
import { AuthService } from '../../../services/authService.js';

// ==========================================
// STATE
// ==========================================
window.expSort = { col: 'date', asc: false };
window.expFilter = { category: '', dateFrom: '', dateTo: '' };
window.revSort = { col: 'date', asc: false };
window.revFilter = { dateFrom: '', dateTo: '' };
window.editingId = null;
window.editingTable = null;

// New Components
window.revDescAc = null;
window.expVatToggle = null;
window.revVatToggle = null;

// ==========================================
// HELPERS
// ==========================================
const user = AuthService.getUser();
const userRole = user?.role || sessionStorage.getItem('bcauto_role') || 'sa';
const storageBranch = localStorage.getItem('bcauto_branch');

// Managers/Admins/Owners can switch branches via localStorage priority
// Employees are locked to their profile branch if established
let currentBranch = 'BC Auto Service';
if (['admin', 'manager', 'owner'].includes(userRole)) {
    currentBranch = storageBranch || user?.branch || 'BC Auto Service';
} else {
    currentBranch = user?.branch || storageBranch || 'BC Auto Service';
}

if (currentBranch === 'suphan') {
    currentBranch = 'suphanburi';
}

const userName = user?.name || sessionStorage.getItem('bcauto_user_name') || 'พนักงาน';

// Poka-Yoke: Redirect to login if no identity
if (!user) {
    window.location.href = '../main/index.html';
}

// Filter categories: EXCLUDE Salary, Bonus, Commission
window.EMPLOYEE_CATEGORIES = window.EXPENSE_CATEGORIES.filter(c =>
    !window.OWNER_EXPENSE_CATEGORIES.includes(c)
);

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Identity text
    const idText = document.getElementById('employee-identity-text');
    let branchLabel = 'ทุกสาขา';
    if (currentBranch === 'suphanburi' || currentBranch === 'suphan') branchLabel = 'เมืองสุพรรณ';
    else if (currentBranch === 'samchuk') branchLabel = 'สามชุก';
    else if (currentBranch === 'BC Auto Service' || currentBranch === 'main') branchLabel = 'BC Auto Service';

    if (idText) idText.textContent = `พนักงาน: ${userName} | สาขา: ${branchLabel}`;

    setupTabs(document.querySelectorAll('.tab-btn'), document.querySelectorAll('.tab-content'));

    // Set default dates
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    document.getElementById('expDate').value = localDate;
    document.getElementById('revDate').value = localDate;

    window.populateCategories();

    // Setup forms
    document.getElementById('expenseForm').addEventListener('submit', window.handleExpenseSubmit);
    document.getElementById('revenueForm').addEventListener('submit', window.handleRevenueSubmit);

    // Filter bar listeners
    window.setupFilterListeners('exp', () => window.loadExpenseLog());
    window.setupFilterListeners('rev', () => window.loadRevenueLog());

    // Edit modal
    document.getElementById('saveEntryEditBtn')?.addEventListener('click', window.saveEntryEdit);
    document.getElementById('cancelEntryEditBtn')?.addEventListener('click', () => {
        document.getElementById('entryEditModal').classList.remove('active');
    });

    // Initialize New Components
    window.initNewComponents();

    // Load log tables (Isolated to this user's entries)
    window.loadExpenseLog();
    window.loadRevenueLog();

    // Init daily summary tab
    window.initDailySummary();
});

window.initNewComponents = function () {
    // 1. Revenue Description Autocomplete
    const revDescContainer = document.getElementById('revDescContainer');
    if (revDescContainer) {
        window.revDescAc = window.UIService.createAutocomplete({
            container: revDescContainer,
            placeholder: 'เช่น รายรับรวมประจำวัน, เงินคืนเงินประกัน...',
            id: 'revDesc',
            fetchItems: async () => {
                try {
                    // Fetch recent unique descriptions from financial_ledger (type=revenue)
                    const res = await window.pb.collection('financial_ledger').getList(1, 100, {
                        filter: 'entry_type = "revenue"',
                        sort: '-created'
                    });
                    const unique = [...new Set(res.items.map(i => i.description || i.category))];
                    return unique.map(label => ({ id: label, label: label }));
                } catch (e) {
                    return [];
                }
            }
        });
    }

    // 2. VAT Toggles
    const expVatContainer = document.getElementById('expVatContainer');
    if (expVatContainer) {
        window.expVatToggle = window.UIService.createVatToggle({
            container: expVatContainer,
            vatEnabled: false,
            onUpdate: () => { } // Optional: can trigger subtotal update if needed
        });
    }

    const revVatContainer = document.getElementById('revVatContainer');
    if (revVatContainer) {
        window.revVatToggle = window.UIService.createVatToggle({
            container: revVatContainer,
            vatEnabled: false,
            onUpdate: () => { }
        });
    }
};

window.populateCategories = function () {
    const expCat = document.getElementById('expCategory');
    if (!expCat) return;
    window.EMPLOYEE_CATEGORIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        expCat.appendChild(opt);
    });

    // Filter dropdown
    const expFilterCat = document.getElementById('expFilterCategory');
    if (expFilterCat) {
        window.EMPLOYEE_CATEGORIES.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            expFilterCat.appendChild(opt);
        });
    }
};

window.setupFilterListeners = function (prefix, loadFn) {
    document.getElementById(`${prefix}FilterCategory`)?.addEventListener('change', () => {
        window.updateFilter(prefix);
        loadFn();
    });
    document.getElementById(`${prefix}FilterFrom`)?.addEventListener('change', () => {
        window.updateFilter(prefix);
        loadFn();
    });
    document.getElementById(`${prefix}FilterTo`)?.addEventListener('change', () => {
        window.updateFilter(prefix);
        loadFn();
    });
    document.getElementById(`${prefix}ClearFilter`)?.addEventListener('click', () => {
        window.clearFilter(prefix);
        loadFn();
    });
};

window.updateFilter = function (prefix) {
    const filter = prefix === 'exp' ? window.expFilter : window.revFilter;
    const catEl = document.getElementById(`${prefix}FilterCategory`);
    if (catEl) filter.category = catEl.value;
    filter.dateFrom = document.getElementById(`${prefix}FilterFrom`)?.value || '';
    filter.dateTo = document.getElementById(`${prefix}FilterTo`)?.value || '';
};

window.clearFilter = function (prefix) {
    const filter = prefix === 'exp' ? window.expFilter : window.revFilter;
    filter.category = '';
    filter.dateFrom = '';
    filter.dateTo = '';
    const catEl = document.getElementById(`${prefix}FilterCategory`);
    if (catEl) catEl.value = '';
    const fromEl = document.getElementById(`${prefix}FilterFrom`);
    if (fromEl) fromEl.value = '';
    const toEl = document.getElementById(`${prefix}FilterTo`);
    if (toEl) toEl.value = '';
};

// ==========================================
// EXPENSE HANDLING
// ==========================================
window.handleExpenseSubmit = async function (e) {
    e.preventDefault();
    window.showLoading();

    const date = document.getElementById('expDate').value;
    const category = document.getElementById('expCategory').value;
    const amount = parseFloat(document.getElementById('expAmount').value);
    const notes = document.getElementById('expNote').value.trim();

    // VAT calculation
    const vatState = window.expVatToggle?.getState() || { vatEnabled: false, vatMode: 'customer_pays' };
    const { vat_amount, grand_total } = window.UIService.calcVat(amount, 0, vatState.vatEnabled, vatState.vatMode);

    if (isNaN(amount) || amount <= 0) {
        window.hideLoading();
        window.showToast('กรุณาระบุจำนวนเงินที่ถูกต้อง', 'error');
        return;
    }

    // File upload
    const fileInput = document.getElementById('expFile');
    let receiptUrl = null;
    if (fileInput.files.length > 0) {
        receiptUrl = await window.uploadReceipt(fileInput.files[0], 'expenses');
    }

    try {
        await window.EntryService.createExpense({
            date,
            category,
            amount: grand_total, // Use the final calculated amount
            vat_enabled: vatState.vatEnabled,
            vat_mode: vatState.vatMode,
            vat_amount: vat_amount,
            net_amount: amount,
            notes: `${notes} (โดย: ${userName})`.trim(),
            branch: currentBranch,
            created_by: user?.id || 'session-user',
            created_by_name: userName,
            receipt_url: receiptUrl
        });
        window.hideLoading();
        window.showToast('บันทึกรายจ่ายสำเร็จ', 'success');
        document.getElementById('expenseForm').reset();
        document.getElementById('expDate').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        window.loadExpenseLog();
    } catch (error) {
        window.hideLoading();
        window.showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
};

window.loadExpenseLog = async function () {
    // Filter by branch AND user, and ensure it's not confidential
    let filterExpr = [`branch = "${currentBranch}"`, `is_confidential = false`];
    if (user?.id && user.id !== 'session-user') {
        filterExpr.push(`created_by = "${user.id}"`);
    } else {
        filterExpr.push(`created_by_name = "${userName}"`);
    }

    if (window.expFilter.category) filterExpr.push(`category = "${window.expFilter.category}"`);
    if (window.expFilter.dateFrom) filterExpr.push(`date >= "${window.expFilter.dateFrom} 00:00:00"`);
    if (window.expFilter.dateTo) filterExpr.push(`date <= "${window.expFilter.dateTo} 23:59:59"`);

    try {
        const result = await window.EntryService.getExpenses(1, 100, {
            filter: filterExpr.join(' && '),
            sort: window.expSort.asc ? window.expSort.col : '-' + window.expSort.col
        });
        window.renderTable('expenseLogTable', result.items, 'exp');
    } catch (e) {
        console.error(e);
        window.showToast('โหลดข้อมูลรายจ่ายไม่สำเร็จ', 'error');
    }
};

// ==========================================
// REVENUE HANDLING
// ==========================================
window.handleRevenueSubmit = async function (e) {
    e.preventDefault();
    window.showLoading();

    const date = document.getElementById('revDate').value;
    const description = window.revDescAc ? window.revDescAc.input.value.trim() : document.getElementById('revDesc').value.trim();
    const amount = parseFloat(document.getElementById('revAmount').value);
    const payment_type = document.getElementById('revPaymentType').value;
    const notes = document.getElementById('revNote').value.trim();

    // VAT calculation
    const vatState = window.revVatToggle?.getState() || { vatEnabled: false, vatMode: 'customer_pays' };
    const { vat_amount, grand_total } = window.UIService.calcVat(amount, 0, vatState.vatEnabled, vatState.vatMode);

    if (isNaN(amount) || amount < 0) {
        window.hideLoading();
        window.showToast('กรุณาระบุจำนวนเงินที่ถูกต้อง', 'error');
        return;
    }

    const fileInput = document.getElementById('revFile');
    let receiptUrl = null;
    if (fileInput.files.length > 0) {
        receiptUrl = await window.uploadReceipt(fileInput.files[0], 'revenue');
    }

    try {
        await window.EntryService.createRevenue({
            date,
            description,
            amount: grand_total,
            vat_enabled: vatState.vatEnabled,
            vat_mode: vatState.vatMode,
            vat_amount: vat_amount,
            net_amount: amount,
            payment_type,
            notes: `${notes} (โดย: ${userName})`.trim(),
            branch: currentBranch,
            created_by: user?.id || 'session-user',
            created_by_name: userName,
            receipt_url: receiptUrl
        });
        window.hideLoading();
        window.showToast('บันทึกรายรับสำเร็จ', 'success');
        document.getElementById('revenueForm').reset();
        document.getElementById('revDate').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        window.loadRevenueLog();
    } catch (error) {
        window.hideLoading();
        window.showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
};

window.loadRevenueLog = async function () {
    let filterExpr = [`branch = "${currentBranch}"`, `is_confidential = false`];
    if (user?.id && user.id !== 'session-user') {
        filterExpr.push(`created_by = "${user.id}"`);
    } else {
        filterExpr.push(`created_by_name = "${userName}"`);
    }

    if (window.revFilter.dateFrom) filterExpr.push(`date >= "${window.revFilter.dateFrom} 00:00:00"`);
    if (window.revFilter.dateTo) filterExpr.push(`date <= "${window.revFilter.dateTo} 23:59:59"`);

    try {
        const result = await window.EntryService.getRevenues(1, 100, {
            filter: filterExpr.join(' && '),
            sort: window.revSort.asc ? window.revSort.col : '-' + window.revSort.col
        });
        window.renderTable('revenueLogTable', result.items, 'rev');
    } catch (e) {
        console.error(e);
        window.showToast('โหลดข้อมูลรายรับไม่สำเร็จ', 'error');
    }
};

// ==========================================
// RENDER HELPERS
// ==========================================
window.renderTable = function (tableId, data, type) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;

    if (type === 'exp') {
        tbody.innerHTML = data.map(row => `
            <tr onclick="editEntry('expenses','${row.id}')" style="cursor: pointer;">
                <td data-label="วันที่">${window.formatDate(row.date)}</td>
                <td data-label="หมวดหมู่">${row.category}</td>
                <td data-label="จำนวนเงิน" class="text-right">${window.formatCurrency(row.amount)}</td>
                <td data-label="หลักฐาน" class="text-center" onclick="event.stopPropagation()">${row.receipt_url ? `<button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.8rem;" onclick="showImage('${row.receipt_url}')">📄 ดูรูป</button>` : '-'}</td>
                <td data-label="หมายเหตุ">${row.notes || '-'}</td>
                <td data-label="จัดการ" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.8rem;" onclick="editEntry('expenses','${row.id}')">✏️ แจ้งแก้ไข</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="text-center text-muted">ยังไม่มีข้อมูล</td></tr>';
    } else {
        tbody.innerHTML = data.map(row => {
            const payBadge = window.getPaymentBadge(row.payment_type);
            const verifyBadge = row.verified ? '<span class="badge badge-success">✅ ยืนยันแล้ว</span>' : '<span class="badge badge-warning">⏳ รอยืนยัน</span>';
            return `
            <tr onclick="editEntry('revenue_verification','${row.id}')" style="cursor: pointer;">
                <td data-label="วันที่">${window.formatDate(row.date)}</td>
                <td data-label="รายละเอียด">${row.description || row.category || '-'}</td>
                <td data-label="จำนวนเงิน" class="text-right">${window.formatCurrency(row.amount)}</td>
                <td data-label="ประเภทชำระ" class="text-center">${payBadge}</td>
                <td data-label="สถานะ" class="text-center">${verifyBadge}</td>
                <td data-label="หลักฐาน" class="text-center" onclick="event.stopPropagation()">${row.receipt_url ? `<button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.8rem;" onclick="showImage('${row.receipt_url}')">📄 ดูรูป</button>` : '-'}</td>
                <td data-label="หมายเหตุ">${row.notes || '-'}</td>
                <td data-label="จัดการ" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.8rem;" onclick="editEntry('revenue_verification','${row.id}')">✏️ แจ้งแก้ไข</button>
                </td>
            </tr>
        `}).join('') || '<tr><td colspan="8" class="text-center text-muted">ยังไม่มีข้อมูล</td></tr>';
    }
};

window.getPaymentBadge = function (type) {
    switch (type) {
        case 'เงินสด': return '<span class="badge badge-info">💵 เงินสด</span>';
        case 'โอนจ่าย': return '<span class="badge badge-success">📱 โอนจ่าย</span>';
        case 'slip': return '<span class="badge" style="background:rgba(147,51,234,0.1); color:#9333ea; border-color:rgba(147,51,234,0.2);">💳 Slip</span>';
        default: return '<span class="badge">-</span>';
    }
};

// Simplified Edit Logic for Employees with 30-min rule
window.editEntry = async function (table, id) {
    showLoading();
    let data;
    try {
        if (table === 'expenses') {
            data = await window.EntryService.getExpenses(1, 1, { filter: `id="${id}"` }).then(r => r.items[0]);
        } else {
            data = await window.EntryService.getRevenue(1, 1, { filter: `id="${id}"` }).then(r => r.items[0]);
        }
    } catch (e) {
        hideLoading();
        showToast('ไม่พบข้อมูล', 'error');
        return;
    }
    hideLoading();

    // Check 30-minute rule
    const createdAt = new Date(data.created);
    const now = new Date();
    const diffMins = (now - createdAt) / (1000 * 60);

    if (diffMins > 30) {
        showToast('หมดเวลาแก้ไข (เกิน 30 นาที) กรุณาแจ้งหัวหน้า', 'error');
        return;
    }

    window.editingId = id;
    window.editingTable = table;

    const fields = document.getElementById('entryEditFields');
    const imageUrl = data.receipt_url ? window.pb.files.getUrl(data, data.receipt_url) : '';

    const imageSection = `
        <div class="form-group">
            <label>หลักฐาน (รูปภาพ)</label>
            <div id="edit_image_preview" style="margin-bottom: var(--space-2);">
                ${imageUrl ? `<img src="${imageUrl}" style="max-width: 100%; border-radius: var(--radius-md); cursor: pointer;" onclick="showImage('${imageUrl}')">` : '<p class="text-muted">ไม่มีรูปภาพ</p>'}
            </div>
            <input type="file" id="editReceipt" class="input" accept="image/*">
        </div>
    `;

    if (table === 'expenses') {
        fields.innerHTML = `
            <div class="form-group"><label>วันที่</label><input type="date" id="editDate" class="input" value="${data.date ? data.date.slice(0, 10) : ''}" disabled></div>
            <div class="form-group"><label>หมวดหมู่</label><select id="editCategory" class="input" disabled>${window.EMPLOYEE_CATEGORIES.map(c => `<option value="${c}" ${data.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <div class="form-group"><label>จำนวนเงิน</label><input type="number" id="editAmount" class="input" step="0.01" value="${data.amount || 0}"></div>
            <div class="form-group"><label>หมายเหตุ</label><input type="text" id="editNotes" class="input" value="${data.notes || ''}"></div>
            ${imageSection}
        `;
    } else if (table === 'revenue_verification') {
        fields.innerHTML = `
            <div class="form-group"><label>วันที่</label><input type="date" id="editDate" class="input" value="${data.date ? data.date.slice(0, 10) : ''}" disabled></div>
            <div class="form-group"><label>รายละเอียด</label><input type="text" id="editDescription" class="input" value="${data.description || data.category || ''}"></div>
            <div class="form-group"><label>จำนวนเงิน</label><input type="number" id="editAmount" class="input" step="0.01" value="${data.amount || 0}"></div>
            <div class="form-group"><label>ประเภทการชำระ</label><select id="editPaymentType" class="input">
                <option value="เงินสด" ${data.payment_type === 'เงินสด' ? 'selected' : ''}>💵 เงินสด</option>
                <option value="โอนจ่าย" ${data.payment_type === 'โอนจ่าย' ? 'selected' : ''}>📱 โอนจ่าย</option>
                <option value="slip" ${data.payment_type === 'slip' ? 'selected' : ''}>💳 Slip (Credit Card)</option>
            </select></div>
            <div class="form-group"><label>หมายเหตุ</label><input type="text" id="editNotes" class="input" value="${data.notes || ''}"></div>
            ${imageSection}
        `;
    }

    document.getElementById('entryEditModal').classList.add('active');
};

window.saveEntryEdit = async function () {
    const updates = {};
    const amountEl = document.getElementById('editAmount');
    const notesEl = document.getElementById('editNotes');
    const descEl = document.getElementById('editDescription');
    const payTypeEl = document.getElementById('editPaymentType');

    if (amountEl) updates.amount = parseFloat(amountEl.value) || 0;
    if (notesEl) updates.notes = notesEl.value.trim() || null;
    if (descEl) updates.description = descEl.value.trim() || null;
    if (payTypeEl) updates.payment_type = payTypeEl.value;

    const fileEl = document.getElementById('editReceipt');
    if (fileEl && fileEl.files && fileEl.files[0]) {
        const file = fileEl.files[0];
        const compressed = await window.utils?.compressImage ? await window.utils.compressImage(file) : file;
        updates.receipt_url = compressed;
    }

    window.showLoading();

    try {
        if (window.editingTable === 'expenses') {
            await window.EntryService.updateExpense(window.editingId, updates);
        } else {
            await window.EntryService.updateRevenue(window.editingId, updates);
        }
        window.hideLoading();
        window.showToast('บันทึกสำเร็จ', 'success');
        document.getElementById('entryEditModal').classList.remove('active');
        if (window.editingTable === 'expenses') window.loadExpenseLog();
        else if (window.editingTable === 'revenue_verification') window.loadRevenueLog();
    } catch (error) {
        window.hideLoading();
        window.showToast('บันทึกไม่สำเร็จ: ' + error.message, 'error');
    }
};

// ==========================================
// DAILY SUMMARY TAB
// ==========================================
window.initDailySummary = function () {
    const summaryDateEl = document.getElementById('summaryDate');
    if (!summaryDateEl) return;
    const now = new Date();
    summaryDateEl.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    summaryDateEl.addEventListener('change', window.loadDailySummary);
    window.loadDailySummary();
};

// Set dynamic title based on branch
const branchNames = {
    'suphanburi': 'BC Auto เมืองสุพรรณ',
    'samchuk': 'BC AUTO XPERIENCE (สามชุก)',
    'BC Auto Service': 'BC Auto Service (วิริยะเซอร์วิส)'
};
const branchForTitle = window.AuthService?.getBranch();
const branchDisplay = branchNames[branchForTitle] || branchForTitle || 'BC Auto';
document.title = `บันทึกรายการ (พนักงาน) | ${branchDisplay}`;

window.loadDailySummary = async function () {
    const date = document.getElementById('summaryDate')?.value;
    if (!date) return;

    const startOfDay = date + ' 00:00:00';
    const endOfDay = date + ' 23:59:59';

    let revData = [],
        expData = [];
    try {
        let baseFilter = `branch = "${currentBranch}" && is_confidential = false`;
        if (user?.id && user.id !== 'session-user') {
            baseFilter += ` && created_by = "${user.id}"`;
        } else {
            baseFilter += ` && created_by_name = "${userName}"`;
        }

        const [revResult, expResult] = await Promise.all([
            window.EntryService.getRevenues(1, 200, {
                filter: `date >= '${startOfDay}' && date <= '${endOfDay}' && ${baseFilter}`,
                sort: '-date'
            }),
            window.EntryService.getExpenses(1, 200, {
                filter: `date >= '${startOfDay}' && date <= '${endOfDay}' && ${baseFilter}`,
                sort: '-date'
            })
        ]);
        revData = revResult.items || [];
        expData = expResult.items || [];
    } catch (e) {
        console.error('Daily summary error:', e);
        window.showToast('โหลดข้อมูลสรุปรายวันไม่สำเร็จ', 'error');
        return;
    }

    // Calculate totals
    const totalRev = revData.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalExp = expData.reduce((s, r) => s + Number(r.amount || 0), 0);
    const net = totalRev - totalExp;
    const verifiedRev = revData.filter(r => r.verified).length;
    const verifiedExp = expData.filter(r => r.verified).length;
    const totalItems = revData.length + expData.length;
    const verifiedItems = verifiedRev + verifiedExp;

    // Update KPI
    document.getElementById('summaryTotalRev').textContent = '฿' + window.formatCurrency(totalRev);
    document.getElementById('summaryRevCount').textContent = `${revData.length} รายการ`;
    document.getElementById('summaryTotalExp').textContent = '฿' + window.formatCurrency(totalExp);
    document.getElementById('summaryExpCount').textContent = `${expData.length} รายการ`;

    const netEl = document.getElementById('summaryNet');
    netEl.textContent = '฿' + window.formatCurrency(Math.abs(net));
    netEl.className = `kpi-value ${net >= 0 ? 'text-success' : 'text-danger'}`;
    if (net < 0) netEl.textContent = '-฿' + window.formatCurrency(Math.abs(net));

    const statusEl = document.getElementById('summaryVerifyStatus');
    if (totalItems === 0) {
        statusEl.textContent = 'ไม่มีรายการ';
    } else if (verifiedItems === totalItems) {
        statusEl.innerHTML = '<span style="color:var(--success);">✅ ยืนยันครบแล้ว</span>';
    } else {
        statusEl.innerHTML = `<span style="color:var(--warning);">⏳ ${verifiedItems}/${totalItems} ยืนยันแล้ว</span>`;
    }

    // Payment type breakdown
    const cashTotal = revData.filter(r => r.payment_type === 'เงินสด').reduce((s, r) => s + Number(r.amount || 0), 0);
    const transferTotal = revData
        .filter(r => r.payment_type === 'โอนจ่าย')
        .reduce((s, r) => s + Number(r.amount || 0), 0);
    const slipTotal = revData.filter(r => r.payment_type === 'slip').reduce((s, r) => s + Number(r.amount || 0), 0);

    document.getElementById('summaryPayCash').textContent = '฿' + window.formatCurrency(cashTotal);
    document.getElementById('summaryPayTransfer').textContent = '฿' + window.formatCurrency(transferTotal);
    document.getElementById('summaryPaySlip').textContent = '฿' + window.formatCurrency(slipTotal);

    // Revenue table
    const revTbody = document.querySelector('#summaryRevTable tbody');
    revTbody.innerHTML =
        revData
            .map(row => {
                const payBadge = window.getPaymentBadge(row.payment_type);
                const verifyBadge = row.verified
                    ? '<span class="badge badge-success">✅ ยืนยันแล้ว</span>'
                    : '<span class="badge badge-warning">⏳ รอยืนยัน</span>';
                return `<tr style="${row.verified ? 'background:rgba(16,185,129,0.04);' : ''}">
            <td data-label="รายละเอียด">${row.description || row.category || '-'}</td>
            <td data-label="จำนวนเงิน" class="text-right">${window.formatCurrency(row.amount)}</td>
            <td data-label="ประเภทชำระ" class="text-center">${payBadge}</td>
            <td data-label="สถานะ" class="text-center">${verifyBadge}</td>
            <td data-label="หลักฐาน" class="text-center">${row.receipt_url ? `<button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.8rem;" onclick="showImage('${row.receipt_url}')">📄 ดูรูป</button>` : '-'}</td>
        </tr>`;
            })
            .join('') || '<tr><td colspan="5" class="text-center text-muted">ยังไม่มีรายรับวันนี้</td></tr>';

    // Expense table
    const expTbody = document.querySelector('#summaryExpTable tbody');
    expTbody.innerHTML =
        expData
            .map(row => {
                const verifyBadge = row.verified
                    ? '<span class="badge badge-success">✅ ยืนยันแล้ว</span>'
                    : '<span class="badge badge-warning">⏳ รอยืนยัน</span>';
                return `<tr style="${row.verified ? 'background:rgba(16,185,129,0.04);' : ''}">
            <td data-label="หมวดหมู่">${row.category || '-'}</td>
            <td data-label="จำนวนเงิน" class="text-right">${window.formatCurrency(row.amount)}</td>
            <td data-label="หมายเหตุ">${row.notes || '-'}</td>
            <td data-label="สถานะ" class="text-center">${verifyBadge}</td>
            <td data-label="หลักฐาน" class="text-center">${row.receipt_url ? `<button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.8rem;" onclick="showImage('${row.receipt_url}')">📄 ดูรูป</button>` : '-'}</td>
        </tr>`;
            })
            .join('') || '<tr><td colspan="5" class="text-center text-muted">ยังไม่มีรายจ่ายวันนี้</td></tr>';
};
