// @ts-nocheck
// Imports removed for global variable usage

// ==========================================
// AUTH CHECK
// ==========================================
if (!requireOwner()) {
    // Will redirect to index.html
}

// ==========================================
// STATE
// ==========================================
window.revData = [];
window.expData = [];

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

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    document.getElementById('verifyDate').value = localDate;

    document.getElementById('verifyDate').addEventListener('change', window.loadVerificationData);

    window.loadVerificationData();
});

// ==========================================
// DATE NAVIGATION
// ==========================================
window.changeDate = function (delta) {
    const dateInput = document.getElementById('verifyDate');
    const current = new Date(dateInput.value);
    current.setDate(current.getDate() + delta);
    dateInput.value = current.toISOString().slice(0, 10);
    window.loadVerificationData();
};

window.goToday = function () {
    const now = new Date();
    document.getElementById('verifyDate').value = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
    window.loadVerificationData();
};

// ==========================================
// LOAD DATA
// ==========================================
// Set dynamic title based on branch
const branchNames = {
    'suphanburi': 'สุพรรณบุรี',
    'samchuk': 'สามชุก',
    'BC Auto Service': 'สำนักงานใหญ่'
};
const branchForTitle = window.AuthService?.getBranch();
const branchDisplay = branchNames[branchForTitle] || branchForTitle || 'BC Auto';
document.title = `ตรวจสอบรายการ | ${branchDisplay}`;

window.loadVerificationData = async function () {
    const date = document.getElementById('verifyDate').value;
    if (!date) return;

    showLoading();

    const startOfDay = date + ' 00:00:00';
    const endOfDay = date + ' 23:59:59';

    try {
        const [revResult, expResult] = await Promise.all([
            window.EntryService.getRevenues(1, 500, {
                filter: `date >= '${startOfDay}' && date <= '${endOfDay}' && ${getBranchFilter()}`,
                sort: '-date'
            }),
            window.EntryService.getExpenses(1, 500, {
                filter: `date >= '${startOfDay}' && date <= '${endOfDay}' && ${getBranchFilter()}`,
                sort: '-date'
            })
        ]);
        revData = revResult.items || [];
        expData = expResult.items || [];
    } catch (e) {
        console.error('Load verification error:', e);
        hideLoading();
        showToast('โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error');
        return;
    }

    window.updateKPI();
    window.renderRevTable();
    window.renderExpTable();
    window.loadSystemDiscrepancy(date);

    window.hideLoading();
};

// ==========================================
// KPI UPDATE
// ==========================================
window.updateKPI = function () {
    const totalRev = revData.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalExp = expData.reduce((s, r) => s + Number(r.amount || 0), 0);
    const net = totalRev - totalExp;
    const verifiedRev = revData.filter(r => r.verified).length;
    const verifiedExp = expData.filter(r => r.verified).length;
    const totalItems = revData.length + expData.length;
    const verifiedItems = verifiedRev + verifiedExp;
    const progress = totalItems > 0 ? (verifiedItems / totalItems) * 100 : 0;

    // Main KPIs
    window.safeSetText('vTotalRev', '฿' + window.formatCurrency(totalRev));
    window.safeSetText('vRevCount', `${window.revData.length} รายการ`);
    window.safeSetText('vTotalExp', '฿' + window.formatCurrency(totalExp));
    window.safeSetText('vExpCount', `${window.expData.length} รายการ`);

    const netVal = (net < 0 ? '-' : '') + '฿' + window.formatCurrency(Math.abs(net));
    window.safeSetText('vNet', netVal);
    window.safeSetClass('vNet', `kpi-value ${net >= 0 ? 'positive' : 'negative'}`);
    window.safeSetText('vNetLabel', net >= 0 ? 'กำไร' : 'ขาดทุน');

    // Progress
    window.safeSetText('vVerifyProgress', progress.toFixed(0) + '%');
    const progressClass = `kpi-value ${progress === 100 ? 'positive' : progress >= 50 ? '' : 'negative'}`;
    window.safeSetClass('vVerifyProgress', progressClass);
    window.safeSetText('vVerifyLabel', `${verifiedItems}/${totalItems} รายการ`);
    window.safeSetStyle('vProgressBar', 'width', progress + '%');

    // Section badges
    window.safeSetText('revVerifyBadge', `${verifiedRev}/${window.revData.length} ยืนยัน`);
    const revBadgeClass = `badge ${verifiedRev === window.revData.length && window.revData.length > 0 ? 'badge-success' : 'badge-warning'}`;
    window.safeSetClass('revVerifyBadge', revBadgeClass);

    window.safeSetText('expVerifyBadge', `${verifiedExp}/${window.expData.length} ยืนยัน`);
    const expBadgeClass = `badge ${verifiedExp === window.expData.length && window.expData.length > 0 ? 'badge-success' : 'badge-warning'}`;
    window.safeSetClass('expVerifyBadge', expBadgeClass);

    // Payment type breakdown
    const payTypes = ['เงินสด', 'โอนจ่าย', 'slip'];
    const payIds = ['vPayCash', 'vPayTransfer', 'vPaySlip'];
    const payCountIds = ['vPayCashCount', 'vPayTransferCount', 'vPaySlipCount'];
    payTypes.forEach((type, i) => {
        const items = window.revData.filter(r => r.payment_type === type);
        const total = items.reduce((s, r) => s + Number(r.amount || 0), 0);
        window.safeSetText(payIds[i], '฿' + window.formatCurrency(total));
        window.safeSetText(payCountIds[i], `${items.length} รายการ`);
    });
};

// ==========================================
// PAYMENT BADGE
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
// TABLES
// ==========================================
window.renderRevTable = function () {
    const tbody = document.querySelector('#vRevTable tbody');
    tbody.innerHTML =
        window.revData
            .map(row => {
                const payBadge = window.getPaymentBadge(row.payment_type);
                const verifyBtn = row.verified
                    ? `<button class="verify-btn verified">✅ ยืนยันแล้ว</button><button class="unverify-btn" onclick="unverifyItem('revenue_verification','${row.id}')">↩</button>`
                    : `<button class="verify-btn" onclick="verifyItem('revenue_verification','${row.id}')">☐ ยืนยัน</button>`;
                const vatBadge = row.vat_enabled ? `<span class="badge" style="background:rgba(59,130,246,0.1); color:var(--primary-600); font-size:0.7rem; border:1px solid rgba(59,130,246,0.2);">VAT (${row.vat_mode === 'customer_pays' ? 'รวม' : 'แยก'})</span>` : '';
                return `<tr class="${row.verified ? 'row-verified' : 'row-pending'}">
            <td data-label="รายละเอียด">${row.description || row.category || '-'} ${vatBadge}</td>
            <td data-label="จำนวนเงิน" class="text-right">
                ${window.formatCurrency(row.amount)}
                ${row.vat_enabled ? `<div style="font-size:0.7rem; color:var(--surface-500);">สุทธิ: ${window.formatCurrency(row.net_amount)}</div>` : ''}
            </td>
            <td data-label="ประเภทชำระ" class="text-center">${payBadge}</td>
            <td data-label="หลักฐาน" class="text-center">${row.receipt_url ? `<button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.8rem;" onclick="showImage('${row.receipt_url}')">📄 ดูรูป</button>` : '-'}</td>
            <td data-label="หมายเหตุ">${row.notes || '-'}</td>
            <td data-label="ยืนยัน" class="text-center">${verifyBtn}</td>
        </tr>`;
            })
            .join('') || '<tr><td colspan="6" class="text-center text-muted">ไม่มีรายรับในวันนี้</td></tr>';
};

window.renderExpTable = function () {
    const tbody = document.querySelector('#vExpTable tbody');
    tbody.innerHTML =
        window.expData
            .map(row => {
                const verifyBtn = row.verified
                    ? `<button class="verify-btn verified">✅ ยืนยันแล้ว</button><button class="unverify-btn" onclick="unverifyItem('expenses','${row.id}')">↩</button>`
                    : `<button class="verify-btn" onclick="verifyItem('expenses','${row.id}')">☐ ยืนยัน</button>`;
                const vatBadge = row.vat_enabled ? `<span class="badge" style="background:rgba(59,130,246,0.1); color:var(--primary-600); font-size:0.7rem; border:1px solid rgba(59,130,246,0.2);">VAT (${row.vat_mode === 'customer_pays' ? 'รวม' : 'แยก'})</span>` : '';
                return `<tr class="${row.verified ? 'row-verified' : 'row-pending'}">
            <td data-label="หมวดหมู่">${row.category || '-'}${row.excluded ? ' <span class="badge badge-warning">ไม่นับ</span>' : ''} ${vatBadge}</td>
            <td data-label="จำนวนเงิน" class="text-right">
                ${window.formatCurrency(row.amount)}
                ${row.vat_enabled ? `<div style="font-size:0.7rem; color:var(--surface-500);">สุทธิ: ${window.formatCurrency(row.net_amount)}</div>` : ''}
            </td>
            <td data-label="หลักฐาน" class="text-center">${row.receipt_url ? `<button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.8rem;" onclick="showImage('${row.receipt_url}')">📄 ดูรูป</button>` : '-'}</td>
            <td data-label="หมายเหตุ">${row.notes || '-'}</td>
            <td data-label="ยืนยัน" class="text-center">${verifyBtn}</td>
        </tr>`;
            })
            .join('') || '<tr><td colspan="5" class="text-center text-muted">ไม่มีรายจ่ายในวันนี้</td></tr>';
};

// ==========================================
// VERIFY / UNVERIFY ACTIONS
// ==========================================
window.verifyItem = async function (collection, id) {
    try {
        if (collection === 'revenue_verification') {
            await window.EntryService.updateRevenue(id, {
                verified: true,
                verified_at: new Date().toISOString(),
                verified_by: 'ผู้จัดการ'
            });
        } else {
            await window.EntryService.updateExpense(id, {
                verified: true,
                verified_at: new Date().toISOString(),
                verified_by: 'ผู้จัดการ'
            });
        }
        showToast('✅ ยืนยันรายการสำเร็จ', 'success');
        await loadVerificationData();
    } catch (e) {
        showToast('ยืนยันไม่สำเร็จ: ' + e.message, 'error');
    }
};

window.unverifyItem = async function (collection, id) {
    try {
        if (collection === 'revenue_verification') {
            await window.EntryService.updateRevenue(id, { verified: false, verified_at: null, verified_by: null });
        } else {
            await window.EntryService.updateExpense(id, { verified: false, verified_at: null, verified_by: null });
        }
        showToast('↩ ยกเลิกยืนยันแล้ว', 'info');
        await loadVerificationData();
    } catch (e) {
        showToast('ยกเลิกไม่สำเร็จ: ' + e.message, 'error');
    }
};

window.verifyAll = async function () {
    const unverifiedRev = revData.filter(r => !r.verified);
    const unverifiedExp = expData.filter(r => !r.verified);
    const total = unverifiedRev.length + unverifiedExp.length;

    if (total === 0) {
        showToast('ยืนยันครบทุกรายการแล้ว', 'info');
        return;
    }

    if (!confirm(`ต้องการยืนยันทั้งหมด ${total} รายการ?`)) return;

    showLoading();
    try {
        if (unverifiedRev.length > 0) {
            await window.EntryService.verifyBatch('revenue_verification', unverifiedRev.map(r => r.id));
        }
        if (unverifiedExp.length > 0) {
            await window.EntryService.verifyBatch('expenses', unverifiedExp.map(r => r.id));
        }

        hideLoading();
        showToast(`✅ ยืนยัน ${total} รายการสำเร็จ`, 'success');
        await loadVerificationData();
    } catch (e) {
        hideLoading();
        showToast('ยืนยันไม่สำเร็จ: ' + e.message, 'error');
    }
};

window.unverifyAll = async function () {
    const verifiedRev = revData.filter(r => r.verified);
    const verifiedExp = expData.filter(r => r.verified);
    const total = verifiedRev.length + verifiedExp.length;

    if (total === 0) {
        showToast('ไม่มีรายการที่ยืนยันแล้ว', 'info');
        return;
    }

    if (!confirm(`ต้องการยกเลิกยืนยัน ${total} รายการ?`)) return;

    showLoading();
    try {
        if (verifiedRev.length > 0) {
            await window.EntryService.unverifyBatch('revenue_verification', verifiedRev.map(r => r.id));
        }
        if (verifiedExp.length > 0) {
            await window.EntryService.unverifyBatch('expenses', verifiedExp.map(r => r.id));
        }

        hideLoading();
        showToast(`↩ ยกเลิกยืนยัน ${total} รายการแล้ว`, 'info');
        await loadVerificationData();
    } catch (e) {
        hideLoading();
        showToast('ยกเลิกไม่สำเร็จ: ' + e.message, 'error');
    }
};

// ==========================================
// SYSTEM DISCREPANCY CHECK
// ==========================================
window.loadSystemDiscrepancy = async function (date) {
    const contentEl = document.getElementById('discrepancyContent');
    const sectionEl = document.getElementById('discrepancySection');

    try {
        const manualTotal = revData.reduce((s, r) => s + Number(r.amount || 0), 0);
        const { systemTotal, diff, isMatch, txCount } = await window.EntryService.getSystemDiscrepancy(date, window.getBranch(), manualTotal);

        if (txCount === 0) {
            contentEl.innerHTML = '<p class="text-muted">ไม่มี Transaction ในระบบสำหรับวันนี้</p>';
            sectionEl.classList.remove('discrepancy-card', 'match');
            return;
        }

        if (isMatch) {
            sectionEl.className = 'card mb-3 discrepancy-card match';
            contentEl.innerHTML = `
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-size:1.5rem;">✅</span>
                    <div>
                        <p style="font-weight:600; color:var(--accent-green);">ข้อมูลตรงกัน</p>
                        <p class="text-muted" style="font-size:0.85rem;">ระบบ: ฿${formatCurrency(systemTotal)} | บันทึกมือ: ฿${formatCurrency(manualTotal)} (${txCount} ใบงาน)</p>
                    </div>
                </div>
            `;
        } else {
            sectionEl.className = 'card mb-3 discrepancy-card';
            contentEl.innerHTML = `
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-size:1.5rem;">⚠️</span>
                    <div>
                        <p style="font-weight:600; color:var(--accent-yellow);">พบความคลาดเคลื่อน ฿${formatCurrency(diff)}</p>
                        <p class="text-muted" style="font-size:0.85rem;">รายรับจากระบบ: ฿${formatCurrency(systemTotal)} (${txCount} ใบงาน) | รายรับที่บันทึกมือ: ฿${formatCurrency(manualTotal)} (${revData.length} รายการ)</p>
                        <p class="text-muted" style="font-size:0.85rem; margin-top:0.25rem;">ส่วนต่าง: ${systemTotal > manualTotal ? 'ระบบมากกว่า' : 'บันทึกมือมากกว่า'} ฿${formatCurrency(diff)}</p>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        contentEl.innerHTML = '<p class="text-muted">ไม่สามารถโหลดข้อมูล Transactions ได้</p>';
    }
};

// Image modal logic is now handled globally in src/components/ui.js
