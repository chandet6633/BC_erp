// @ts-nocheck
// Imports removed for global variable usage

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
window.safeSetText = function (id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

window.safeSetClass = function (id, className) {
    const el = document.getElementById(id);
    if (el) el.className = className;
};

window.safeSetStyle = function (id, prop, value) {
    const el = document.getElementById(id);
    if (el) el.style[prop] = value;
};

window.safeSetVal = function (id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
};

// Merge all categories into one list (employee + owner)
window.ALL_CATEGORIES = [...window.EXPENSE_CATEGORIES];
if (window.isOwner()) {
    window.OWNER_EXPENSE_CATEGORIES.forEach(c => {
        if (!window.ALL_CATEGORIES.includes(c)) window.ALL_CATEGORIES.push(c);
    });
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setupTabs(document.querySelectorAll('.tab-btn'), document.querySelectorAll('.tab-content'));

    // Set default dates to today (Local Time)
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    document.getElementById('expDate').value = localDate;
    document.getElementById('revDate').value = localDate;

    // Populate category dropdowns
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

    // Load log tables
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
            onUpdate: () => { }
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
    window.ALL_CATEGORIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        expCat.appendChild(opt);
    });

    // Filter dropdown
    const expFilterCat = document.getElementById('expFilterCategory');
    if (expFilterCat) {
        window.ALL_CATEGORIES.forEach(c => {
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

window.setupSortListeners = function () {
    document.querySelectorAll('#expenseLogTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            window.sortBy(th.dataset.sort, true);
        });
    });
    document.querySelectorAll('#revenueLogTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            window.sortBy(th.dataset.sort, false);
        });
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
// SORT HELPERS
// ==========================================
window.sortBy = function (col, isExp) {
    const sortObj = isExp ? window.expSort : window.revSort;
    if (sortObj.col === col) {
        sortObj.asc = !sortObj.asc;
    } else {
        sortObj.col = col;
        sortObj.asc = true;
    }

    // Update headers UI
    const tableId = isExp ? 'expenseLogTable' : 'revenueLogTable';
    document.querySelectorAll(`#${tableId} th.sortable`).forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.dataset.sort === col) {
            th.classList.add(sortObj.asc ? 'asc' : 'desc');
        }
    });

    if (isExp) window.loadExpenseLog();
    else window.loadRevenueLog();
};

// Image modal logic is now handled globally in src/components/ui.js

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
    const excluded = category === 'ค่าสินค้า';

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
            amount: grand_total,
            vat_enabled: vatState.vatEnabled,
            vat_mode: vatState.vatMode,
            vat_amount: vat_amount,
            net_amount: amount,
            notes: `${notes} (โดย: ${window.AuthService.getUser()?.name || 'พนักงาน'})`.trim(),
            branch: window.AuthService.getBranch(),
            receipt_url: receiptUrl
        });
        window.hideLoading();
        window.showToast('บันทึกรายจ่ายสำเร็จ', 'success');
        document.getElementById('expenseForm').reset();
        const now = new Date();
        const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        document.getElementById('expDate').value = localDate;
        window.loadExpenseLog();
    } catch (error) {
        window.hideLoading();
        window.showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
};

// Set dynamic title based on branch
const branchNames = {
    'suphanburi': 'สุพรรณบุรี',
    'samchuk': 'สามชุก',
    'BC Auto Service': 'สำนักงานใหญ่'
};
const branchForTitle = window.AuthService?.getBranch();
const branchDisplay = branchNames[branchForTitle] || branchForTitle || 'BC Auto';
document.title = `บันทึกรายการ | ${branchDisplay}`;

window.loadExpenseLog = async function () {
    let filterExpr = [`${window.getBranchFilter()}`];
    if (window.expFilter.category) filterExpr.push(`category = '${window.expFilter.category}'`);
    if (window.expFilter.dateFrom) filterExpr.push(`date >= '${window.expFilter.dateFrom} 00:00:00'`);
    if (window.expFilter.dateTo) filterExpr.push(`date <= '${window.expFilter.dateTo} 23:59:59'`);

    let data;
    try {
        const result = await window.EntryService.getExpenses(1, 100, {
            filter: filterExpr.join(' && '),
            sort: window.expSort.asc ? window.expSort.col : '-' + window.expSort.col
        });
        data = result.items;
    } catch (e) {
        console.error(e);
        window.hideLoading();
        window.showToast('โหลดข้อมูลรายจ่ายไม่สำเร็จ: ' + e.message, 'error');
        return;
    }

    const tbody = document.querySelector('#expenseLogTable tbody');
    tbody.innerHTML =
        (data || [])
            .map(
                row => `
        <tr>
            <td data-label="วันที่">${window.formatDate(row.date)}</td>
            <td data-label="หมวดหมู่">${row.category}${row.excluded ? ' <span class="badge badge-warning">ไม่นับ</span>' : ''}</td>
            <td data-label="จำนวนเงิน" class="text-right">${window.formatCurrency(row.amount)}</td>
            <td data-label="หลักฐาน" class="text-center">${row.receipt_url ? `<button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.8rem;" onclick="showImage('${row.receipt_url}')">📄 ดูรูป</button>` : '-'}</td>
            <td data-label="หมายเหตุ">${row.notes || '-'}</td>
            <td data-label="จัดการ" style="position:relative;">
                ${window.UIService ? window.UIService.generateActionMenu('expenses', row.id, 'editEntry', 'deleteExpense') : `<button class="edit-btn" onclick="editEntry('expenses','${row.id}')">✏️</button>`}
            </td>
        </tr>
    `
            )
            .join('') || '<tr><td colspan="6" class="text-center text-muted">ยังไม่มีข้อมูล</td></tr>';
};

window.deleteExpense = async function (id) {
    if (!confirm('ต้องการลบรายการนี้?')) return;
    showLoading();
    try {
        await window.EntryService.deleteExpense(id);
        hideLoading();
        showToast('ลบรายการสำเร็จ', 'success');
        loadExpenseLog();
    } catch (error) {
        hideLoading();
        showToast('ลบไม่สำเร็จ: ' + error.message, 'error');
    }
};

// ==========================================
// REVENUE VERIFICATION
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

    if (!payment_type) {
        window.hideLoading();
        window.showToast('กรุณาเลือกประเภทการชำระ', 'error');
        return;
    }

    // File upload
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
            notes: `${notes} (โดย: ${window.AuthService.getUser()?.name || 'พนักงาน'})`.trim(),
            branch: window.AuthService.getBranch(),
            receipt_url: receiptUrl
        });
        window.hideLoading();
        window.showToast('บันทึกรายรับสำเร็จ', 'success');
        document.getElementById('revenueForm').reset();
        const now2 = new Date();
        document.getElementById('revDate').value = new Date(now2.getTime() - now2.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 10);
        window.loadRevenueLog();
        window.checkDiscrepancy(date, amount);
    } catch (error) {
        window.hideLoading();
        window.showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
};

window.loadRevenueLog = async function () {
    let filterExpr = [`${window.getBranchFilter()}`];
    if (window.revFilter.dateFrom) filterExpr.push(`date >= '${window.revFilter.dateFrom} 00:00:00'`);
    if (window.revFilter.dateTo) filterExpr.push(`date <= '${window.revFilter.dateTo} 23:59:59'`);

    let data;
    try {
        const result = await window.EntryService.getRevenues(1, 100, {
            filter: filterExpr.join(' && '),
            sort: window.revSort.asc ? window.revSort.col : '-' + window.revSort.col
        });
        data = result.items;
    } catch (e) {
        console.error(e);
        window.hideLoading();
        window.showToast('โหลดข้อมูลรายรับไม่สำเร็จ: ' + e.message, 'error');
        return;
    }

    const tbody = document.querySelector('#revenueLogTable tbody');
    tbody.innerHTML =
        (data || [])
            .map(row => {
                const payBadge = window.getPaymentBadge(row.payment_type);
                const verifyBadge = row.verified
                    ? '<span class="badge badge-success">✅ ยืนยันแล้ว</span>'
                    : '<span class="badge badge-warning">⏳ รอยืนยัน</span>';
                return `
        <tr style="${row.verified ? 'background: rgba(16,185,129,0.04);' : ''}">
            <td data-label="วันที่">${window.formatDate(row.date)}</td>
            <td data-label="รายละเอียด">${row.description || row.category || '-'}</td>
            <td data-label="จำนวนเงิน" class="text-right">${window.formatCurrency(row.amount)}</td>
            <td data-label="ประเภทชำระ" class="text-center">${payBadge}</td>
            <td data-label="สถานะ" class="text-center">${verifyBadge}</td>
            <td data-label="หลักฐาน" class="text-center">${row.receipt_url ? `<button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.8rem;" onclick="showImage('${row.receipt_url}')">📄 ดูรูป</button>` : '-'}</td>
            <td data-label="หมายเหตุ">${row.notes || '-'}</td>
            <td data-label="จัดการ" style="position:relative;">
                ${window.UIService ? window.UIService.generateActionMenu('revenue_verification', row.id, 'editEntry', 'deleteRevenue') : `<button class="edit-btn" onclick="editEntry('revenue_verification','${row.id}')">✏️</button>`}
            </td>
        </tr>
    `;
            })
            .join('') || '<tr><td colspan="8" class="text-center text-muted">ยังไม่มีข้อมูล</td></tr>';
};

window.deleteRevenue = async function (id) {
    if (!confirm('ต้องการลบรายการนี้?')) return;
    showLoading();
    try {
        await window.EntryService.deleteRevenue(id);
        hideLoading();
        showToast('ลบรายการสำเร็จ', 'success');
        loadRevenueLog();
    } catch (error) {
        hideLoading();
        showToast('ลบไม่สำเร็จ: ' + error.message, 'error');
    }
};

window.checkDiscrepancy = async function (date, manualAmount) {
    const startOfDay = date + 'T00:00:00';
    const endOfDay = date + 'T23:59:59';

    let data;
    try {
        data = await window.TransactionService.getFullTransactions({
            filter: `open_date >= '${startOfDay}' && open_date <= '${endOfDay}' && ${window.getBranchFilter()}`,
            fields: 'total_revenue'
        });
    } catch (e) {
        return;
    }

    if (!data || data.length === 0) return;

    const systemTotal = data.reduce((s, t) => s + Number(t.total_revenue || 0), 0);
    const diff = Math.abs(systemTotal - manualAmount);

    const alertEl = document.getElementById('discrepancyAlert');
    const contentEl = document.getElementById('discrepancyContent');

    if (diff > 1) {
        alertEl.style.display = 'block';
        contentEl.innerHTML = `
            <p>วันที่ <strong>${window.formatDate(date)}</strong></p>
            <p>รายรับจากระบบ: <strong>${window.formatCurrency(systemTotal)}</strong> บาท</p>
            <p>รายรับที่บันทึก: <strong>${window.formatCurrency(manualAmount)}</strong> บาท</p>
            <p style="color: var(--accent-red);">ส่วนต่าง: <strong>${window.formatCurrency(diff)}</strong> บาท</p>
        `;
    } else {
        alertEl.style.display = 'block';
        contentEl.innerHTML = `<p style="color: var(--accent-green);">✅ ข้อมูลตรงกัน (${window.formatDate(date)}): ${window.formatCurrency(systemTotal)} บาท</p>`;
        setTimeout(() => {
            alertEl.style.display = 'none';
        }, 5000);
    }
};

// ==========================================
// INLINE EDIT MODAL
// ==========================================
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

    editingId = id;
    editingTable = table;

    const fields = document.getElementById('entryEditFields');

    if (table === 'expenses') {
        fields.innerHTML = `
            <div class="form-group"><label>วันที่</label><input type="date" id="editDate" class="form-control" value="${data.date || ''}"></div>
            <div class="form-group"><label>หมวดหมู่</label><select id="editCategory" class="form-control">${ALL_CATEGORIES.map(c => `<option value="${c}" ${data.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <div class="form-group"><label>จำนวนเงิน</label><input type="number" id="editAmount" class="form-control" step="0.01" value="${data.amount || 0}"></div>
            <div class="form-group"><label>หมายเหตุ</label><input type="text" id="editNotes" class="form-control" value="${data.notes || ''}"></div>
        `;
    } else if (table === 'revenue_verification') {
        fields.innerHTML = `
            <div class="form-group"><label>วันที่</label><input type="date" id="editDate" class="form-control" value="${data.date || ''}"></div>
            <div class="form-group"><label>รายละเอียด</label><input type="text" id="editDescription" class="form-control" value="${data.description || data.category || ''}"></div>
            <div class="form-group"><label>จำนวนเงิน</label><input type="number" id="editAmount" class="form-control" step="0.01" value="${data.amount || 0}"></div>
            <div class="form-group"><label>ประเภทการชำระ</label><select id="editPaymentType" class="form-control">
                <option value="เงินสด" ${data.payment_type === 'เงินสด' ? 'selected' : ''}>💵 เงินสด</option>
                <option value="โอนจ่าย" ${data.payment_type === 'โอนจ่าย' ? 'selected' : ''}>📱 โอนจ่าย</option>
                <option value="slip" ${data.payment_type === 'slip' ? 'selected' : ''}>💳 Slip (Credit Card)</option>
            </select></div>
            <div class="form-group"><label>หมายเหตุ</label><input type="text" id="editNotes" class="form-control" value="${data.notes || ''}"></div>
        `;
    }

    document.getElementById('entryEditModal').classList.add('active');
};

window.saveEntryEdit = async function () {
    const updates = {};
    const dateEl = document.getElementById('editDate');
    const amountEl = document.getElementById('editAmount');
    const notesEl = document.getElementById('editNotes');
    const catEl = document.getElementById('editCategory');
    const descEl = document.getElementById('editDescription');
    const payTypeEl = document.getElementById('editPaymentType');

    if (dateEl) updates.date = dateEl.value;
    if (amountEl) updates.amount = parseFloat(amountEl.value) || 0;
    if (notesEl) updates.notes = notesEl.value.trim() || null;
    if (catEl) updates.category = catEl.value;
    if (descEl) updates.description = descEl.value.trim() || null;
    if (payTypeEl) updates.payment_type = payTypeEl.value;

    if (window.editingTable === 'expenses') {
        updates.excluded = updates.category === 'ค่าสินค้า';
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
// PAYMENT TYPE BADGE HELPER
// ==========================================
window.getPaymentBadge = function (type) {
    switch (type) {
        case 'เงินสด':
            return '<span class="badge badge-info">💵 เงินสด</span>';
        case 'โอนจ่าย':
            return '<span class="badge badge-success">📱 โอนจ่าย</span>';
        case 'slip':
            return '<span class="badge" style="background:rgba(147,51,234,0.1); color:#9333ea; border-color:rgba(147,51,234,0.2);">💳 Slip</span>';
        default:
            return '<span class="badge">-</span>';
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

window.loadDailySummary = async function () {
    const date = document.getElementById('summaryDate')?.value;
    if (!date) return;

    const startOfDay = date + ' 00:00:00';
    const endOfDay = date + ' 23:59:59';

    let revData = [],
        expData = [];
    try {
        const branchFilterStr = window.getBranchFilter();
        const [revResult, expResult] = await Promise.all([
            window.EntryService.getRevenue(1, 200, {
                filter: `date >= '${startOfDay}' && date <= '${endOfDay}' && ${branchFilterStr}`,
                sort: '-date'
            }),
            window.EntryService.getExpenses(1, 200, {
                filter: `date >= '${startOfDay}' && date <= '${endOfDay}' && ${branchFilterStr}`,
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
    netEl.className = `kpi-value ${net >= 0 ? 'positive' : 'negative'}`;
    if (net < 0) netEl.textContent = '-฿' + window.formatCurrency(Math.abs(net));

    const statusEl = document.getElementById('summaryVerifyStatus');
    if (totalItems === 0) {
        statusEl.textContent = 'ไม่มีรายการ';
    } else if (verifiedItems === totalItems) {
        statusEl.innerHTML = '<span style="color:var(--accent-green);">✅ ยืนยันครบแล้ว</span>';
    } else {
        statusEl.innerHTML = `<span style="color:var(--accent-yellow);">⏳ ${verifiedItems}/${totalItems} ยืนยันแล้ว</span>`;
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
