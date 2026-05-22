// @ts-nocheck
/**
 * Expense Entry Logic — NocoDB Direct
 * ════════════════════════════════════
 * Writes to 'financial_ledger' table via pb.collection()
 *
 * Features:
 * - Branch-scoped: SA auto-locked, admin/owner can select branch
 * - Multi-file image attachments for transaction proofs
 * - NocoDB storage via shared attachmentService
 */

import { uploadFiles, renderAttachments, renderUploadZone, setupDropZone } from '@shared/attachmentService.js'

const CATEGORIES = [
    'ค่าแรงช่าง', 'ค่าไฟ', 'ค่าน้ำ', 'ค่าเช่า', 'ค่าอุปกรณ์',
    'ค่าขนส่ง', 'ค่าอาหาร', 'ค่าซ่อมบำรุง', 'ค่าประกัน',
    'ค่าโฆษณา', 'เงินเดือน', 'เจ้าของเบิก', 'อื่นๆ'
];

let allExpenses = [];
let editingId = null;

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Default date to today
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('expDate').value = today;

    // Populate filter category
    const filterCat = document.getElementById('filterCategory');
    CATEGORIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        filterCat.appendChild(opt);
    });

    // Render upload zone
    document.getElementById('uploadZone').innerHTML = renderUploadZone('expFiles');
    setupDropZone('expFiles');

    // Branch selector for admin/owner
    await initBranchSelector();

    // Event handlers
    document.getElementById('expenseForm').addEventListener('submit', handleSubmit);
    document.getElementById('refreshBtn').addEventListener('click', loadExpenses);
    document.getElementById('clearFilter').addEventListener('click', clearFilters);
    document.getElementById('filterCategory').addEventListener('change', renderExpenses);
    document.getElementById('filterFrom').addEventListener('change', renderExpenses);
    document.getElementById('filterTo').addEventListener('change', renderExpenses);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);

    loadExpenses();
});

// ==========================================
// BRANCH SELECTOR
// ==========================================
async function initBranchSelector() {
    const user = window.AuthService?.getUser?.();
    if (!user) return;

    if (['admin', 'owner'].includes(user.role)) {
        try {
            const branches = await window.pb.collection('branches').getFullList();
            const dropdown = document.getElementById('branchDropdown');
            branches.forEach(b => {
                const name = b.name || b.branch_name || '';
                if (!name) return;
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                dropdown.appendChild(opt);
            });

            // Pre-select current branch if set
            const current = localStorage.getItem('bcauto_branch');
            if (current && current !== 'all') {
                dropdown.value = current;
            }

            document.getElementById('branchSelector').style.display = 'block';

            // Reload on branch change
            dropdown.addEventListener('change', () => loadExpenses());
        } catch (err) {
            console.warn('Could not load branches:', err);
        }
    }
}

function getSelectedBranch() {
    const user = window.AuthService?.getUser?.();
    if (!user) return '';

    if (['admin', 'owner'].includes(user.role)) {
        const dropdown = document.getElementById('branchDropdown');
        return dropdown?.value || '';
    }

    // SA/manager: use their assigned branch
    return user.branch || localStorage.getItem('bcauto_branch') || '';
}

// ==========================================
// DATA
// ==========================================
async function loadExpenses() {
    try {
        const branch = getSelectedBranch();
        let filter = `entry_type = 'expense' || entry_type = 'owner_withdrawal'`;
        if (branch) filter += ` && branch_id = '${branch}'`;

        const result = await window.pb.collection('financial_ledger').getFullList({
            filter,
            sort: '-date,-CreatedAt'
        });
        allExpenses = result || [];
        renderExpenses();
    } catch (err) {
        console.error('Failed to load expenses:', err);
        window.showToast?.('ไม่สามารถโหลดข้อมูล', 'error');
    }
}

// ==========================================
// SUBMIT
// ==========================================
async function handleSubmit(e) {
    e.preventDefault();
    const category = document.getElementById('expCategory').value;
    const amount = parseFloat(document.getElementById('expAmount').value);
    const date = document.getElementById('expDate').value;
    const notes = document.getElementById('expNote').value.trim();
    const paymentType = document.getElementById('expPayment').value;

    if (!category || !amount || !date) {
        window.showToast?.('กรุณากรอกข้อมูลให้ครบ', 'error');
        return;
    }

    const btn = document.getElementById('submitBtn');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-outlined" style="font-size:1rem;animation:spin 1s linear infinite;vertical-align:text-bottom">refresh</span> กำลังบันทึก...';

    const entryType = category === 'เจ้าของเบิก' ? 'owner_withdrawal' : 'expense';
    const user = window.AuthService?.getUser?.();
    const branch = getSelectedBranch();

    try {
        // Upload attachments if any
        let attachments = '';
        const fileInput = document.getElementById('expFiles');
        if (fileInput?.files?.length > 0) {
            try {
                const uploaded = await uploadFiles(fileInput.files);
                attachments = JSON.stringify(uploaded);
            } catch (uploadErr) {
                console.warn('Attachment upload failed:', uploadErr);
                window.showToast?.('อัปโหลดไฟล์ไม่สำเร็จ แต่จะบันทึกรายการ', 'error');
            }
        }

        await window.pb.collection('financial_ledger').create({
            entry_type: entryType,
            date,
            category,
            amount,
            notes,
            payment_type: paymentType,
            branch_id: branch,
            created_by: user?.display_name || user?.name || user?.username || 'unknown',
            verified: false,
            is_confidential: entryType === 'owner_withdrawal',
            attachments
        });

        btn.style.background = 'var(--success-600)';
        btn.innerHTML = '<span class="material-icons-outlined" style="font-size:1.1rem;vertical-align:text-bottom">check</span> บันทึกสำเร็จ';
        setTimeout(() => {
            btn.style.background = '';
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }, 2000);

        e.target.reset();
        document.getElementById('expDate').value = new Date().toISOString().slice(0, 10);
        // Clear upload preview
        const preview = document.getElementById('expFiles_preview');
        if (preview) preview.innerHTML = '';
        await loadExpenses();
    } catch (err) {
        console.error('Create failed:', err);
        window.showToast?.('บันทึกไม่สำเร็จ: ' + err.message, 'error');
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

// ==========================================
// RENDER
// ==========================================
function renderExpenses() {
    const filterCat = document.getElementById('filterCategory').value;
    const filterFrom = document.getElementById('filterFrom').value;
    const filterTo = document.getElementById('filterTo').value;

    let filtered = [...allExpenses];

    if (filterCat) filtered = filtered.filter(e => e.category === filterCat);
    if (filterFrom) filtered = filtered.filter(e => e.date >= filterFrom);
    if (filterTo) filtered = filtered.filter(e => e.date <= filterTo);

    const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    document.getElementById('totalExpense').textContent = `฿${total.toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;

    const list = document.getElementById('expenseList');

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="icon"><span class="material-icons-outlined" style="font-size:2.5rem">inbox</span></div>
                <p>ยังไม่มีรายจ่าย</p>
            </div>`;
        return;
    }

    list.innerHTML = filtered.map(e => {
        const attHTML = renderAttachments(e.attachments);
        return `
        <div class="expense-row">
            <div style="color: var(--surface-500); font-size: var(--text-xs);">
                ${formatThaiDate(e.date)}
            </div>
            <div>
                <span class="cat-badge">${e.category || '-'}</span>
                ${e.notes ? `<span style="color: var(--surface-400); font-size: var(--text-xs); margin-left: 6px;">${e.notes}</span>` : ''}
                ${e.entry_type === 'owner_withdrawal' ? '<span style="font-size: 0.7rem; background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 99px; margin-left: 4px;">เจ้าของ</span>' : ''}
            </div>
            <div class="att-thumbs">${attHTML}</div>
            <div class="amount">-฿${Number(e.amount || 0).toLocaleString()}</div>
            <div class="actions">
                <button class="btn-icon edit" onclick="window._editExpense('${e.id}')" title="แก้ไข">
                    <span class="material-icons-outlined" style="font-size:0.9rem">edit</span>
                </button>
                <button class="btn-icon delete" onclick="window._deleteExpense('${e.id}')" title="ลบ">
                    <span class="material-icons-outlined" style="font-size:0.9rem">delete</span>
                </button>
            </div>
        </div>
    `}).join('');
}

function formatThaiDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    } catch { return dateStr; }
}

function clearFilters() {
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterFrom').value = '';
    document.getElementById('filterTo').value = '';
    renderExpenses();
}

// ==========================================
// EDIT
// ==========================================
window._editExpense = function (id) {
    const expense = allExpenses.find(e => e.id === id);
    if (!expense) return;
    editingId = id;

    const fields = document.getElementById('editFields');
    fields.innerHTML = `
        <div class="form-group" style="margin-bottom: var(--space-3);">
            <label style="display:block; margin-bottom:4px; font-size:var(--text-sm); font-weight:600;">วันที่</label>
            <input type="date" id="editDate" class="input" value="${expense.date || ''}" />
        </div>
        <div class="form-group" style="margin-bottom: var(--space-3);">
            <label style="display:block; margin-bottom:4px; font-size:var(--text-sm); font-weight:600;">หมวดหมู่</label>
            <select id="editCategory" class="input">
                ${CATEGORIES.map(c => `<option value="${c}" ${c === expense.category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
        </div>
        <div class="form-group" style="margin-bottom: var(--space-3);">
            <label style="display:block; margin-bottom:4px; font-size:var(--text-sm); font-weight:600;">จำนวนเงิน</label>
            <input type="number" id="editAmount" class="input" step="0.01" value="${expense.amount || 0}" />
        </div>
        <div class="form-group" style="margin-bottom: var(--space-3);">
            <label style="display:block; margin-bottom:4px; font-size:var(--text-sm); font-weight:600;">หมายเหตุ</label>
            <input type="text" id="editNote" class="input" value="${expense.notes || ''}" />
        </div>
        <div class="form-group" style="margin-bottom: var(--space-3);">
            <label style="display:block; margin-bottom:4px; font-size:var(--text-sm); font-weight:600;">แนบหลักฐานเพิ่ม</label>
            <input type="file" id="editFiles" accept="image/*" multiple class="input" style="padding:6px" />
            <div id="existingAttachments" style="margin-top:8px">${renderAttachments(expense.attachments)}</div>
        </div>
    `;

    document.getElementById('editModal').classList.add('active');
};

async function saveEdit() {
    if (!editingId) return;
    const category = document.getElementById('editCategory').value;
    const btn = document.getElementById('saveEditBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';

    try {
        const expense = allExpenses.find(e => e.id === editingId);
        let existingAtts = [];
        try { existingAtts = JSON.parse(expense?.attachments || '[]'); } catch {
            existingAtts = [];
        }

        // Upload new files if any
        const editFileInput = document.getElementById('editFiles');
        if (editFileInput?.files?.length > 0) {
            try {
                const newAtts = await uploadFiles(editFileInput.files);
                existingAtts = existingAtts.concat(newAtts);
            } catch (err) {
                console.warn('Edit attachment upload failed:', err);
            }
        }

        await window.pb.collection('financial_ledger').update(editingId, {
            date: document.getElementById('editDate').value,
            category,
            amount: parseFloat(document.getElementById('editAmount').value),
            notes: document.getElementById('editNote').value.trim(),
            entry_type: category === 'เจ้าของเบิก' ? 'owner_withdrawal' : 'expense',
            attachments: JSON.stringify(existingAtts)
        });
        window.showToast?.('แก้ไขสำเร็จ ✅', 'success');
        closeEditModal();
        await loadExpenses();
    } catch (err) {
        console.error('Update failed:', err);
        window.showToast?.('แก้ไขไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    editingId = null;
}

// ==========================================
// DELETE
// ==========================================
window._deleteExpense = async function (id) {
    if (!confirm('ต้องการลบรายการนี้?')) return;
    try {
        await window.pb.collection('financial_ledger').delete(id);
        window.showToast?.('ลบสำเร็จ', 'success');
        await loadExpenses();
    } catch (err) {
        console.error('Delete failed:', err);
        window.showToast?.('ลบไม่สำเร็จ', 'error');
    }
};
