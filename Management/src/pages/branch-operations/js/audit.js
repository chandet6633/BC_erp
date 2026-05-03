// @ts-nocheck
// Imports removed for global variable usage

// ==========================================
// STATE
// ==========================================
window.transactions = [];
window.serviceItems = [];
window.productGroups = [];
window.orderDiscrepancies = [];
window.expenses = [];
window.quickAddJobData = null;
window.selectedBatch = new Set();
window.dateFilterActive = false;

// ==========================================
// HELPERS
// ==========================================
window.safeSetText = function (id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};
// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // alert('Debugging: Audit JS Loaded'); // verified working

    // Global delegation for robustness
    document.body.addEventListener('click', e => {
        if (e.target && e.target.id === 'btnAddMissingItem') {
            console.log('Delegated Click: Calling startQuickAddProcess');
            if (typeof window.startQuickAddProcess === 'function') {
                window.startQuickAddProcess();
            } else {
                alert('FATAL: window.startQuickAddProcess is NOT a function');
                console.error('window.startQuickAddProcess is missing', window);
            }
        }
        if (e.target && e.target.id === 'btnAutoSuggestFix') {
            console.log('Delegated Click: Calling autoSuggestFix');
            if (typeof window.autoSuggestFix === 'function') {
                window.autoSuggestFix();
            }
        }
    });

    if (!requireOwner()) return;

    setupTabs(document.querySelectorAll('.tab-btn'), document.querySelectorAll('.tab-content'));

    document.getElementById('runAuditBtn').addEventListener('click', runFullAudit);
    document.getElementById('cancelQuickAddBtn').addEventListener('click', () => {
        document.getElementById('quickAddModal').classList.remove('show');
    });
    document.getElementById('saveQuickAddBtn').addEventListener('click', saveQuickAdd);
    document.getElementById('closeDetailBtn').addEventListener('click', () => {
        document.getElementById('orderDetailModal').classList.remove('show');
    });

    // Date filter
    document.getElementById('applyDateFilter').addEventListener('click', () => {
        dateFilterActive = true;
        renderOrderAudit();
    });
    document.getElementById('clearDateFilter').addEventListener('click', () => {
        document.getElementById('auditDateFrom').value = '';
        document.getElementById('auditDateTo').value = '';
        dateFilterActive = false;
        renderOrderAudit();
    });

    // Batch controls (Select only, no bulk add)
    document.getElementById('selectAllCheck').addEventListener('change', e => {
        const checked = e.target.checked;
        document.querySelectorAll('.batch-check').forEach(cb => {
            cb.checked = checked;
        });
        selectedBatch.clear();
        if (checked) orderDiscrepancies.forEach(d => selectedBatch.add(d.job_id));
        updateBatchBar();
    });
    document.getElementById('selectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.batch-check').forEach(cb => {
            cb.checked = true;
        });
        orderDiscrepancies.forEach(d => selectedBatch.add(d.job_id));
        updateBatchBar();
    });
    document.getElementById('deselectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.batch-check').forEach(cb => {
            cb.checked = false;
        });
        selectedBatch.clear();
        updateBatchBar();
    });

    // Export logic remains...
    document.getElementById('exportAuditBtn').addEventListener('click', exportAuditCSV);

    // Default date range...
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('auditDateFrom').value = `${y}-${m}-01`;
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    document.getElementById('auditDateTo').value = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

    // Revenue audit date defaults
    document.getElementById('revAuditDateFrom').value = `${y}-${m}-01`;
    document.getElementById('revAuditDateTo').value = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

    // Revenue audit filter buttons
    document.getElementById('applyRevAuditFilter').addEventListener('click', () => runRevenueVerification());
    document.getElementById('clearRevAuditFilter').addEventListener('click', () => {
        document.getElementById('revAuditDateFrom').value = `${y}-${m}-01`;
        document.getElementById('revAuditDateTo').value = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
        runRevenueVerification();
    });

    runFullAudit();
});

// ... (Rest of code until openQuickAddFromDetail)

// Open Quick Add from detail modal
window.autoSuggestFix = function () {
    if (!quickAddJobData) return;

    const diffRev = quickAddJobData.diffRevenue || 0;
    const diffProf = quickAddJobData.diffProfit || 0;

    if (diffRev > 0 || (diffRev === 0 && diffProf > 0)) {
        // Start quick add process
        window.startQuickAddProcess();

        // Wait for modal transition and then pre-fill calculated differences
        setTimeout(() => {
            if (diffRev > 0) {
                document.getElementById('qaPrice').value = diffRev;
                const estCost = diffRev - diffProf;
                document.getElementById('qaCost').value = estCost > 0 ? estCost : 0;
            } else {
                // Revenue is 0 difference but profit is missing -> suggest cost adjustment
                window.showToast?.('รายได้ตรงกันแล้ว แต่กำไรไม่ตรง กรุณาใช้ปุ่ม ✏️ เพื่อแก้ไขต้นทุน', 'warning');
            }
        }, 300);
    } else {
        window.showToast?.('ยอดรวมใบต่ำกว่ารายการสินค้า ไม่สามารถเพิ่มอัตโนมัติได้ กรุณาตรวจสอบและแก้ไขหรือลบรายการ', 'warning');
    }
};

window.toggleInlineEdit = function (cardType, isEditing) {
    const displayEl = document.getElementById(`detailTx${cardType}`);
    const inputEl = document.getElementById(`inputTx${cardType}`);
    if (!displayEl || !inputEl) return;

    if (isEditing) {
        displayEl.style.display = 'none';
        inputEl.style.display = 'block';
        inputEl.focus();
        // Set initial value (numeric only)
        const currentVal = (quickAddJobData && cardType === 'Revenue') ? quickAddJobData.total_revenue : (quickAddJobData && quickAddJobData.total_profit);
        inputEl.value = Number(currentVal || 0);
    } else {
        displayEl.style.display = 'block';
        inputEl.style.display = 'none';
    }
};

window.saveInlineEdit = async function (cardType) {
    if (!quickAddJobData) return;
    const inputEl = document.getElementById(`inputTx${cardType}`);
    if (!inputEl) return;

    const newValue = Number(inputEl.value);
    const field = cardType === 'Revenue' ? 'total_revenue' : 'total_profit';

    // Find actual transaction ID
    const txRecord = transactions.find(t => t.job_id === quickAddJobData.job_id);
    if (!txRecord) {
        window.showToast?.('ไม่พบรายการในระบบ', 'error');
        window.toggleInlineEdit(cardType, false);
        return;
    }

    try {
        window.showLoading?.();
        await window.pb.collection('transactions').update(txRecord.id, { [field]: newValue });

        // Success feedback
        const card = document.getElementById(`cardDetailTx${cardType}`);
        if (card) {
            const originalBg = card.style.background;
            card.style.background = 'rgba(34,197,94,0.1)';
            setTimeout(() => card.style.background = originalBg, 1000);
        }

        // Close and refresh
        window.toggleInlineEdit(cardType, false);

        // Re-run audit to refresh discrepancies
        await runFullAudit();

        // Update local quickAddJobData and UI
        const updatedDisc = orderDiscrepancies.find(d => d.job_id === quickAddJobData.job_id);
        if (updatedDisc) {
            quickAddJobData = updatedDisc;
            // Update labels
            safeSetText(`detailTx${cardType}`, updatedDisc[field === 'total_revenue' ? 'total_revenue' : 'total_profit']);

            // Re-render the counts in the detail modal
            safeSetText('detailTxRevenue', formatCurrency(updatedDisc.total_revenue));
            safeSetText('detailDiffRevenue', formatCurrency(updatedDisc.diffRevenue));
            safeSetText('detailTxProfit', formatCurrency(updatedDisc.total_profit));
            safeSetText('detailDiffProfit', formatCurrency(updatedDisc.diffProfit));

            // Update discrepant count KPI if total_revenue matches total_price
            // This is handled by runFullAudit -> renderOrderAudit
        }
    } catch (err) {
        console.error('Inline save failed', err);
        window.showToast?.(err.message || 'บันทึกไม่สำเร็จ', 'error');
        window.toggleInlineEdit(cardType, false);
    } finally {
        window.hideLoading?.();
    }
};
window.startQuickAddProcess = async function () {
    // alert('DEBUG: startQuickAddProcess ENTERED'); // Force visible proof
    console.log('Debugging: startQuickAddProcess START');

    // 1. Check Context
    if (!quickAddJobData) {
        console.error('CRITICAL: quickAddJobData is Missing!');
        showToast('Error: No Job Selected. Please close and re-open the order detail.', 'error');
        return;
    }
    console.log('Context OK:', quickAddJobData.job_id);

    document.getElementById('orderDetailModal').classList.remove('show');

    try {
        // 2. Set UI values
        document.getElementById('qaJobId').textContent = quickAddJobData.job_id;
        document.getElementById('qaCustomer').textContent = quickAddJobData.customer_name || '-';
        document.getElementById('qaPlate').textContent =
            quickAddJobData.car_registration || quickAddJobData.red_plate || '-';

        document.getElementById('qaItemCode').value = '';
        document.getElementById('qaItemName').value = '';
        document.getElementById('qaQuantity').value = '1';
        document.getElementById('qaCost').value = '0';
        document.getElementById('qaPrice').value = '';

        // 3. Force Fetch Product Groups to ensure data
        const pgSelect = document.getElementById('qaProductGroup');
        pgSelect.innerHTML = '<option value="">Loading...</option>';

        console.log('Fetching Product Groups...');
        try {
            // Remove sort to avoid potentially invalid field errors
            productGroups = await window.TransactionService.getFullProductGroups();
            console.log(`Fetched ${productGroups.length} groups from DB`);
        } catch (dbErr) {
            console.error('DB Fetch Error Details:', dbErr.response || dbErr);
            showToast('Database Error: ' + (dbErr.message || 'Cannot fetch product groups'), 'error');
        }

        // 4. Build Dropdown
        pgSelect.innerHTML = '<option value="">-- ไม่ระบุ (ไม่ปรับยอดกลุ่ม) --</option>';

        const uniqueGroups = new Map();
        productGroups.forEach(pg => {
            if (pg.name) uniqueGroups.set(pg.name, pg);
        });

        const sortedGroups = Array.from(uniqueGroups.values()).sort((a, b) => a.name.localeCompare(b.name));

        console.log(`Unique Groups to render: ${sortedGroups.length}`);
        // alert(`Debug: Rendering ${sortedGroups.length} groups`); // Visible proof

        if (sortedGroups.length > 0) {
            sortedGroups.forEach(pg => {
                const opt = document.createElement('option');
                opt.value = pg.name;
                opt.textContent = `${pg.name} (${pg.code || '-'})`;
                pgSelect.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.textContent = 'ไม่พบข้อมูลกลุ่มสินค้า';
            pgSelect.appendChild(opt);
        }

        // 5. Pre-fill price
        const diff = quickAddJobData.diffRevenue;
        if (diff > 0) document.getElementById('qaPrice').value = diff.toFixed(2);

        document.getElementById('quickAddModal').classList.add('show');
    } catch (err) {
        console.error('Fatal Error inside openQuickAddFromDetail:', err);
        alert('Fatal Error: ' + err.message);
    }
};

// QUICK ADD (for missing service items)
// ==========================================
window.saveQuickAdd = async function () {
    const itemName = document.getElementById('qaItemName').value.trim();
    if (!itemName) {
        window.showToast('กรุณาใส่ชื่อสินค้า', 'error');
        return;
    }

    const itemCode = document.getElementById('qaItemCode').value.trim() || 'UNASSIGNED';
    const quantity = parseFloat(document.getElementById('qaQuantity').value) || 1;
    const totalCost = parseFloat(document.getElementById('qaCost').value) || 0;
    const totalPrice = parseFloat(document.getElementById('qaPrice').value) || 0;
    const totalProfit = totalPrice - totalCost;

    // Get selected Product Group Name
    const pgName = document.getElementById('qaProductGroup').value;

    const newItem = {
        job_id: quickAddJobData.job_id,
        open_date: quickAddJobData.open_date,
        close_date: quickAddJobData.close_date,
        customer_name: quickAddJobData.customer_name,
        item_code: itemCode,
        item_name: itemName,
        quantity,
        total_cost: totalCost,
        total_price: totalPrice,
        total_profit: totalProfit,
        avg_cost: quantity > 0 ? totalCost / quantity : 0,
        avg_price: quantity > 0 ? totalPrice / quantity : 0,
        avg_profit: quantity > 0 ? totalProfit / quantity : 0,
        car_registration: quickAddJobData.car_registration,
        red_plate: quickAddJobData.red_plate,
        product_group: pgName, // Store group name if needed for reference
        branch: getBranch()
    };

    showLoading();

    // 1. Insert Service Item
    try {
        await window.TransactionService.createServiceItem(newItem);
    } catch (insertError) {
        hideLoading();
        showToast('บันทึกรายการไม่สำเร็จ: ' + insertError.message, 'error');
        return;
    }

    // 2. Update or Insert Product Group Record
    if (pgName) {
        const jobMonth = (quickAddJobData.open_date || '').slice(0, 7); // YYYY-MM

        // Find existing record for this Month + Name
        const existingGroup = productGroups.find(g => g.name === pgName && g.report_month === jobMonth);

        // Find reference code (from any record with this name)
        const refGroup = productGroups.find(g => g.name === pgName);
        const refCode = refGroup ? refGroup.code : 'UNKNOWN';

        if (existingGroup) {
            // UPDATE
            const newSales = Number(existingGroup.total_sales || 0) + totalPrice;
            const newProfit = Number(existingGroup.total_profit || 0) + totalProfit;
            const newCost = Number(existingGroup.total_cost || 0) + totalCost;
            const newQty = Number(existingGroup.quantity || 0) + quantity;

            try {
                await window.TransactionService.updateProductGroup(existingGroup.id, {
                    total_sales: newSales,
                    total_profit: newProfit,
                    total_cost: newCost,
                    quantity: newQty
                });
            } catch (updateError) {
                console.error('Update PG Error:', updateError);
            }
        } else {
            // INSERT NEW (First time for this month)
            const newGroup = {
                report_month: jobMonth,
                code: refCode,
                name: pgName,
                quantity: quantity,
                total_sales: totalPrice,
                total_cost: totalCost,
                total_profit: totalProfit,
                margin: totalPrice > 0 ? (totalProfit / totalPrice) * 100 : 0,
                branch: getBranch()
            };

            try {
                await window.TransactionService.createProductGroup(newGroup);
            } catch (createError) {
                console.error('Create PG Error:', createError);
            }
        }
    }

    // 3. Update Parent Transaction (Centralized Reconciliation)
    try {
        const branch = getBranch();
        await window.AuditService.reconcileJob(quickAddJobData.job_id, branch);
        console.log(`Successfully reconciled parent transaction for ${quickAddJobData.job_id}`);
    } catch (txError) {
        console.error('Failed to reconcile parent transaction:', txError);
        showToast('แจ้งเตือน: บันทึกสินค้าสำเร็จ แต่การปรับยอดใบบันทึกหลักขัดข้อง', 'warning');
    }

    hideLoading();
    showToast('บันทึกรายการสำเร็จ', 'success');
    document.getElementById('quickAddModal').classList.remove('show');
    runFullAudit();
};

// ==========================================
// BATCH RECONCILIATION
// ==========================================
window.toggleBatch = function (jobId, checked) {
    if (checked) selectedBatch.add(jobId);
    else selectedBatch.delete(jobId);
    updateBatchBar();
};

window.updateBatchBar = function () {
    const bar = document.getElementById('batchBar');
    const count = window.selectedBatch.size;
    document.getElementById('batchCount').textContent = count;
    bar.style.display = count > 0 ? 'block' : 'none';
};

// batchQuickAdd Removed per request

// ==========================================
// FULL AUDIT
// ==========================================
// Set dynamic title based on branch
const branchNames = {
    'suphanburi': 'BC Auto เมืองสุพรรณ',
    'samchuk': 'BC AUTO XPERIENCE (สามชุก)',
    'BC Auto Service': 'BC Auto Service (วิริยะเซอร์วิส)'
};
const branchForTitle = window.AuthService?.getBranch();
const branchDisplay = branchNames[branchForTitle] || branchForTitle || 'BC Auto';
document.title = `ตรวจสอบข้อมูล | ${branchDisplay}`;

window.runFullAudit = async function () {
    window.showLoading();

    const branchFilter = `${window.getBranchFilter()}`;
    const [txRes, siRes, pgRes, expRes] = await Promise.all([
        window.TransactionService.getFullTransactions({ filter: branchFilter }),
        window.TransactionService.getFullServiceItems({ filter: branchFilter }),
        window.TransactionService.getFullProductGroups({ filter: branchFilter }),
        window.EntryService.getExpenses(1, 100000, { filter: branchFilter }).then(r => r.items)
    ]);

    transactions = txRes || [];
    serviceItems = siRes || [];
    productGroups = pgRes || [];
    expenses = expRes || [];

    runOrderAudit();
    runGroupAudit();
    detectAnomalies();
    runCostVerification();
    runRevenueVerification();
    updateSummary();

    hideLoading();
};

// ==========================================
// 1. SERVICE ORDER AUDIT
// ==========================================
window.runOrderAudit = function () {
    orderDiscrepancies = window.AuditService.runOrderAudit(transactions, serviceItems);
    renderOrderAudit();
};

window.renderOrderAudit = function () {
    const tbody = document.querySelector('#orderAuditTable tbody');

    // Apply date filter
    let filtered = orderDiscrepancies;
    if (dateFilterActive) {
        const from = document.getElementById('auditDateFrom').value;
        const to = document.getElementById('auditDateTo').value;
        if (from) filtered = filtered.filter(d => (d.open_date || '').slice(0, 10) >= from);
        if (to) filtered = filtered.filter(d => (d.open_date || '').slice(0, 10) <= to);
    }

    // Update KPI Dashboard
    const totalJobs = filtered.length;
    let sumDiffRev = 0;
    let sumDiffProf = 0;
    filtered.forEach(d => {
        sumDiffRev += d.diffRevenue;
        sumDiffProf += d.diffProfit;
    });

    const elTriageJobs = document.getElementById('triageDiscrepantJobs');
    const elTriageRev = document.getElementById('triageDiffRevenue');
    const elTriageProf = document.getElementById('triageDiffProfit');

    if (elTriageJobs) elTriageJobs.textContent = totalJobs;
    if (elTriageRev) elTriageRev.textContent = formatCurrency(sumDiffRev);
    if (elTriageProf) elTriageProf.textContent = formatCurrency(sumDiffProf);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding:2rem;">✅ ไม่พบความคลาดเคลื่อน — ข้อมูลใบบันทึกบริการตรงกันทั้งหมด</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered
        .map(d => {
            const maxDiff = Math.max(Math.abs(d.diffRevenue), Math.abs(d.diffProfit));
            let rowBg = '';
            // Severe > 1000 THB -> Red highlight
            if (maxDiff > 1000) rowBg = 'background: rgba(239, 68, 68, 0.08);';
            // Minor > 0 THB -> Yellow/Orange highlight
            else if (maxDiff > 0) rowBg = 'background: rgba(245, 158, 11, 0.08);';

            return `
        <tr class="discrepancy" style="cursor:pointer; ${rowBg}">
            <td onclick="event.stopPropagation()" data-label="เลือก"><input type="checkbox" class="batch-check" data-job="${d.job_id}" ${selectedBatch.has(d.job_id) ? 'checked' : ''} onchange="toggleBatch('${d.job_id}', this.checked)"></td>
            <td onclick="showOrderDetail('${d.job_id}')" data-label="Job ID"><strong>${d.job_id}</strong></td>
            <td onclick="showOrderDetail('${d.job_id}')" data-label="ลูกค้า">${d.customer_name || '-'}</td>
            <td onclick="showOrderDetail('${d.job_id}')" data-label="วันที่">${d.open_date ? formatDate(d.open_date) : '-'}</td>
            <td class="text-right" data-label="รายได้(ใบ)">${formatCurrency(d.total_revenue)}</td>
            <td class="text-right" data-label="รายได้(สินค้า)">${formatCurrency(d.itemsRevenue)}</td>
            <td class="text-right ${d.diffRevenue !== 0 ? 'text-red' : ''}" data-label="ส่วนต่างรายได้">${formatCurrency(d.diffRevenue)}</td>
            <td class="text-right" data-label="กำไร(ใบ)">${formatCurrency(d.total_profit)}</td>
            <td class="text-right" data-label="กำไร(สินค้า)">${formatCurrency(d.itemsProfit)}</td>
            <td class="text-right ${d.diffProfit !== 0 ? 'text-red' : ''}" data-label="ส่วนต่างกำไร">${formatCurrency(d.diffProfit)}</td>
        </tr>
    `;
        })
        .join('');
};

// ==========================================
// ORDER DETAIL POPUP (show all items)
// ==========================================
window.showOrderDetail = function (jobId) {
    const disc = orderDiscrepancies.find(d => d.job_id === jobId);
    if (!disc) return;

    // Header info
    safeSetText('detailJobId', disc.job_id);
    safeSetText('detailCustomer', disc.customer_name || '-');
    document.getElementById('detailPlate').textContent = disc.car_registration || disc.red_plate || '-';
    safeSetText('detailDate', disc.open_date ? formatDate(disc.open_date) : '-');

    // Summary comparison
    safeSetText('detailTxRevenue', formatCurrency(disc.total_revenue));
    safeSetText('detailSiRevenue', formatCurrency(disc.itemsRevenue));
    safeSetText('detailDiffRevenue', formatCurrency(disc.diffRevenue));

    safeSetText('detailTxProfit', formatCurrency(disc.total_profit));
    safeSetText('detailSiProfit', formatCurrency(disc.itemsProfit));
    safeSetText('detailDiffProfit', formatCurrency(disc.diffProfit));

    // Parent Transaction Edit Button & Cards
    const btnEditTx = document.getElementById('btnEditTransaction');
    const cardRev = document.getElementById('cardDetailTxRevenue');
    const cardProf = document.getElementById('cardDetailTxProfit');

    // Find the actual transaction ID from the global transactions list
    const txRecord = transactions.find(t => t.job_id === disc.job_id);

    if (txRecord) {
        if (btnEditTx) {
            btnEditTx.style.display = 'none';
        }

        // Card Click Events for Inline Edit
        if (cardRev) cardRev.onclick = () => window.toggleInlineEdit('Revenue', true);
        if (cardProf) cardProf.onclick = () => window.toggleInlineEdit('Profit', true);

        // Input Event Listeners
        const inputRev = document.getElementById('inputTxRevenue');
        const inputProf = document.getElementById('inputTxProfit');

        if (inputRev && !inputRev.dataset.listenersAdded) {
            inputRev.onkeydown = (e) => {
                if (e.key === 'Enter') window.saveInlineEdit('Revenue');
                if (e.key === 'Escape') window.toggleInlineEdit('Revenue', false);
            };
            inputRev.onblur = () => window.toggleInlineEdit('Revenue', false);
            inputRev.dataset.listenersAdded = 'true';
        }

        if (inputProf && !inputProf.dataset.listenersAdded) {
            inputProf.onkeydown = (e) => {
                if (e.key === 'Enter') window.saveInlineEdit('Profit');
                if (e.key === 'Escape') window.toggleInlineEdit('Profit', false);
            };
            inputProf.onblur = () => window.toggleInlineEdit('Profit', false);
            inputProf.dataset.listenersAdded = 'true';
        }

    } else {
        if (btnEditTx) btnEditTx.style.display = 'none';
        if (cardRev) cardRev.onclick = null;
        if (cardProf) cardProf.onclick = null;
    }

    // Items table
    const tbody = document.getElementById('detailItemsBody');
    if (disc.items.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="7" class="text-center text-muted">ไม่พบรายการสินค้าสำหรับใบบันทึกบริการนี้</td></tr>';
    } else {
        tbody.innerHTML = disc.items
            .map(
                item => `
            <tr>
                <td data-label="รหัสสินค้า">${item.item_code || '-'}</td>
                <td data-label="ชื่อสินค้า">${item.item_name || '-'}</td>
                <td class="text-right" data-label="จำนวน">${Number(item.quantity || 0)}</td>
                <td class="text-right" data-label="ทุนรวม">${formatCurrency(item.total_cost)}</td>
                <td class="text-right" data-label="ขายรวม">${formatCurrency(item.total_price)}</td>
                <td class="text-right ${Number(item.total_profit || 0) >= 0 ? 'text-green' : 'text-red'}" data-label="กำไร">${formatCurrency(item.total_profit)}</td>
                <td class="text-center" data-label="จัดการ">-</td>
            </tr>
        `
            )
            .join('');
    }

    // Store for Quick Add
    quickAddJobData = disc;

    document.getElementById('orderDetailModal').classList.add('show');
};

// Open Quick Add from detail modal

// ==========================================
// 2. PRODUCT GROUP AUDIT (Grand Total Comparison)
// ==========================================
window.runGroupAudit = function () {
    const months = [...new Set(window.productGroups.map(pg => pg.report_month).filter(Boolean))].sort().reverse();
    const monthFilter = document.getElementById('auditMonthFilter');
    const currentMonth = monthFilter.value || months[0] || '';
    monthFilter.innerHTML = months
        .map(m => `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${m}</option>`)
        .join('');
    monthFilter.onchange = () => renderGroupAudit();

    renderGroupAudit();
};

window.renderGroupAudit = function () {
    const selectedMonth = document.getElementById('auditMonthFilter').value;
    const { pgForMonth, totals, matches } = window.AuditService.runGroupAudit(productGroups, serviceItems, transactions, selectedMonth);

    const { pg: pgTotals, si: siTotals, tx: txTotals } = totals;
    const { pgSiSales, pgTxSales, siTxSales, pgSiProfit, pgTxProfit, siTxProfit } = matches;

    const allMatchSales = pgSiSales && pgTxSales;
    const allMatchProfit = pgSiProfit && pgTxProfit;
    const hasDiscrepancy = !allMatchSales || !allMatchProfit;

    const diffSales = pgTotals.sales - txTotals.sales;
    const diffProfit = pgTotals.profit - txTotals.profit;

    const statusIcon = match => (match ? '✅' : '❌');
    const statusColor = match => (match ? 'var(--accent-green)' : 'var(--accent-red)');
    const cardBg = match => (match ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)');

    // Render 3-way comparison
    const summaryDiv = document.getElementById('groupGrandTotal');
    summaryDiv.innerHTML = `
        <div class="table-container mb-2">
            <table style="font-size:0.9rem;">
                <thead>
                    <tr>
                        <th>แหล่งข้อมูล</th>
                        <th class="text-right">ยอดขาย/รายได้</th>
                        <th class="text-right">กำไร</th>
                        <th>คำอธิบาย</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td data-label="แหล่งข้อมูล"><strong>📦 Product Groups</strong></td>
                        <td class="text-right" style="font-weight:700;" data-label="ยอดขาย/รายได้">${formatCurrency(pgTotals.sales)}</td>
                        <td class="text-right" style="font-weight:700;" data-label="กำไร">${formatCurrency(pgTotals.profit)}</td>
                        <td class="text-muted" style="font-size:0.8rem;" data-label="คำอธิบาย">สรุปยอดขายตามกลุ่มสินค้า</td>
                    </tr>
                    <tr>
                        <td data-label="แหล่งข้อมูล"><strong>🔧 Service Items</strong></td>
                        <td class="text-right" style="font-weight:700;" data-label="ยอดขาย/รายได้">${formatCurrency(siTotals.sales)}</td>
                        <td class="text-right" style="font-weight:700;" data-label="กำไร">${formatCurrency(siTotals.profit)}</td>
                        <td class="text-muted" style="font-size:0.8rem;" data-label="คำอธิบาย">รวมรายการสินค้าทุกใบบันทึก</td>
                    </tr>
                    <tr>
                        <td data-label="แหล่งข้อมูล"><strong>💰 Transactions</strong></td>
                        <td class="text-right" style="font-weight:700;" data-label="ยอดขาย/รายได้">${formatCurrency(txTotals.sales)}</td>
                        <td class="text-right" style="font-weight:700;" data-label="กำไร">${formatCurrency(txTotals.profit)}</td>
                        <td class="text-muted" style="font-size:0.8rem;" data-label="คำอธิบาย">ยอดรับจริงจากลูกค้า</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="d-flex gap-2 flex-wrap mb-2" style="font-size:0.85rem;">
            <div style="flex:1; min-width:180px; padding:0.6rem 0.8rem; border-radius:8px; background:${cardBg(pgSiSales && pgSiProfit)};">
                <span style="color:${statusColor(pgSiSales && pgSiProfit)};">${statusIcon(pgSiSales && pgSiProfit)}</span>
                <strong>PG ↔ SI:</strong>
                ขาย ${pgSiSales ? 'ตรง' : formatCurrency(pgTotals.sales - siTotals.sales)}
                | กำไร ${pgSiProfit ? 'ตรง' : formatCurrency(pgTotals.profit - siTotals.profit)}
            </div>
            <div style="flex:1; min-width:180px; padding:0.6rem 0.8rem; border-radius:8px; background:${cardBg(pgTxSales && pgTxProfit)};">
                <span style="color:${statusColor(pgTxSales && pgTxProfit)};">${statusIcon(pgTxSales && pgTxProfit)}</span>
                <strong>PG ↔ TX:</strong>
                ขาย ${pgTxSales ? 'ตรง' : formatCurrency(pgTotals.sales - txTotals.sales)}
                | กำไร ${pgTxProfit ? 'ตรง' : formatCurrency(pgTotals.profit - txTotals.profit)}
            </div>
            <div style="flex:1; min-width:180px; padding:0.6rem 0.8rem; border-radius:8px; background:${cardBg(siTxSales && siTxProfit)};">
                <span style="color:${statusColor(siTxSales && siTxProfit)};">${statusIcon(siTxSales && siTxProfit)}</span>
                <strong>SI ↔ TX:</strong>
                ขาย ${siTxSales ? 'ตรง' : formatCurrency(siTotals.sales - txTotals.sales)}
                | กำไร ${siTxProfit ? 'ตรง' : formatCurrency(siTotals.profit - txTotals.profit)}
            </div>
        </div>
    `;

    // Build product group rows (PG data only, no per-group SI comparison)
    // When there IS a grand total discrepancy, guess which groups might cause it
    const absDiffSales = Math.abs(diffSales);
    const absDiffProfit = Math.abs(diffProfit);

    const groupRows = pgForMonth.map(pg => {
        const sales = Number(pg.total_sales || 0);
        const profit = Number(pg.total_profit || 0);
        // Suspect scoring: check if this group's value is close to the discrepancy amount
        let suspectScore = 0;
        if (hasDiscrepancy) {
            // Check if sales value is close to the sales discrepancy (within 20%)
            if (absDiffSales > 0.5 && sales > 0) {
                const ratio = Math.min(sales, absDiffSales) / Math.max(sales, absDiffSales);
                if (ratio > 0.8)
                    suspectScore += 3; // Very close match
                else if (ratio > 0.5)
                    suspectScore += 2; // Moderate match
                else if (sales >= absDiffSales * 0.9) suspectScore += 1; // Could contribute
            }
            if (absDiffProfit > 0.5 && Math.abs(profit) > 0) {
                const ratio = Math.min(Math.abs(profit), absDiffProfit) / Math.max(Math.abs(profit), absDiffProfit);
                if (ratio > 0.8) suspectScore += 3;
                else if (ratio > 0.5) suspectScore += 2;
            }
        }
        return { code: pg.code, name: pg.name, quantity: Number(pg.quantity || 0), sales, profit, suspectScore };
    });

    // Sort: suspects first (if any), then by sales descending
    groupRows.sort((a, b) => {
        if (a.suspectScore !== b.suspectScore) return b.suspectScore - a.suspectScore;
        return b.sales - a.sales;
    });

    const tbody = document.querySelector('#groupAuditTable tbody');

    if (pgForMonth.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="5" class="text-center text-muted" style="padding:2rem;">ไม่พบข้อมูลกลุ่มสินค้าสำหรับเดือนนี้</td></tr>';
    } else {
        tbody.innerHTML = groupRows
            .map(d => {
                const isSuspect = d.suspectScore >= 2;
                return `
            <tr class="${isSuspect ? 'discrepancy' : ''}">
                <td data-label="รหัสกลุ่ม"><strong>${d.code}</strong></td>
                <td data-label="ชื่อกลุ่ม">${d.name} ${isSuspect ? '<span class="badge badge-warning">🔍 ต้องสงสัย</span>' : ''}</td>
                <td class="text-right" data-label="จำนวน">${d.quantity.toLocaleString()}</td>
                <td class="text-right" data-label="ยอดขาย">${formatCurrency(d.sales)}</td>
                <td class="text-right ${d.profit >= 0 ? 'text-green' : 'text-red'}" data-label="กำไร">${formatCurrency(d.profit)}</td>
            </tr>
            `;
            })
            .join('');
    }

    // Show "all good" message if grand totals match
    if (!hasDiscrepancy && pgForMonth.length > 0) {
        tbody.innerHTML =
            `<tr><td colspan="5" class="text-center" style="padding:1rem; color:var(--accent-green);">✅ ยอดรวมตรงกัน — ไม่พบความคลาดเคลื่อน</td></tr>` +
            tbody.innerHTML;
    }

    // Update KPIs
    document.getElementById('totalGroups').textContent = pgForMonth.length;
    const suspectCount = groupRows.filter(g => g.suspectScore >= 2).length;
    document.getElementById('groupDiscrepancies').textContent = hasDiscrepancy ? suspectCount || '⚠️' : '0';
};

// ==========================================
// SUMMARY KPIs
// ==========================================
window.updateSummary = function () {
    window.safeSetText('totalOrders', window.transactions.length);
    window.safeSetText('orderDiscrepancies', window.orderDiscrepancies.length);

    // Data Completeness Score
    const itemsByJob = {};
    serviceItems.forEach(item => {
        itemsByJob[item.job_id] = true;
    });
    const txWithItems = transactions.filter(tx => itemsByJob[tx.job_id]).length;
    const completeness = transactions.length > 0 ? ((txWithItems / transactions.length) * 100).toFixed(1) : 100;

    safeSetText('completenessScore', `${completeness}%`);
    const complEl = document.getElementById('completenessScore');
    if (complEl) {
        if (completeness >= 95) {
            complEl.className = 'kpi-value positive';
            safeSetText('completenessLabel', `${txWithItems}/${transactions.length} ใบ`);
        } else if (completeness >= 80) {
            complEl.className = 'kpi-value';
            complEl.style.color = '#f59e0b';
            safeSetText('completenessLabel', `${txWithItems}/${transactions.length} ใบ`);
        } else {
            complEl.className = 'kpi-value negative';
            safeSetText('completenessLabel', `${txWithItems}/${transactions.length} ใบ`);
        }
    }
};

// ==========================================
// EXPORT AUDIT TO CSV
// ==========================================
window.exportAuditCSV = function () {
    if (window.orderDiscrepancies.length === 0) {
        window.showToast('ไม่มีข้อมูลให้ส่งออก', 'error');
        return;
    }

    const headers = [
        'Job ID',
        'ลูกค้า',
        'วันที่เปิด',
        'รายได้(ใบ)',
        'รายได้(สินค้า)',
        'ส่วนต่างรายได้',
        'กำไร(ใบ)',
        'กำไร(สินค้า)',
        'ส่วนต่างกำไร'
    ];
    const rows = orderDiscrepancies.map(d => [
        d.job_id,
        d.customer_name || '',
        d.open_date || '',
        d.total_revenue,
        d.itemsRevenue,
        d.diffRevenue,
        d.total_profit,
        d.itemsProfit,
        d.diffProfit
    ]);

    // BOM for Excel UTF-8
    let csv = '\uFEFF' + headers.join(',') + '\n';
    rows.forEach(r => {
        csv += r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ส่งออก CSV สำเร็จ', 'success');
};

// ==========================================
// ANOMALY DETECTION
// ==========================================
window.detectAnomalies = function () {
    const section = document.getElementById('anomalySection');
    const anomalies = window.AuditService.detectAnomalies(transactions);

    if (transactions.length < 5) {
        section.innerHTML = '<p class="text-muted">ข้อมูลไม่เพียงพอ (ต้องมีอย่างน้อย 5 ใบงาน)</p>';
        return;
    }

    if (anomalies.length === 0) {
        section.innerHTML = '<p style="color:var(--accent-green);">✅ ไม่พบรายการผิดปกติ</p>';
        return;
    }

    const { mean, stdDev } = anomalies[0];
    const threshold = 2;

    section.innerHTML = `
        <p class="text-muted mb-1" style="font-size:0.8rem;">ค่าเฉลี่ย: ${formatCurrency(mean)} | Std Dev: ${formatCurrency(stdDev)} | Threshold: >${formatCurrency(mean + threshold * stdDev)} หรือ <${formatCurrency(Math.max(0, mean - threshold * stdDev))}</p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Job ID</th>
                        <th>ลูกค้า</th>
                        <th>วันที่</th>
                        <th>รายได้</th>
                        <th>สถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    ${anomalies
            .map(t => {
                const rev = Number(t.total_revenue || 0);
                const isHigh = rev > mean + threshold * stdDev;
                return `
                        <tr>
                            <td data-label="Job ID"><strong>${t.job_id}</strong></td>
                            <td data-label="ลูกค้า">${t.customer_name || '-'}</td>
                            <td data-label="วันที่">${t.open_date ? formatDate(t.open_date) : '-'}</td>
                            <td class="text-right" data-label="รายได้">${formatCurrency(rev)}</td>
                            <td data-label="สถานะ"><span class="badge ${isHigh ? 'badge-warning' : 'badge-danger'}">${isHigh ? '⬆ สูงผิดปกติ' : '⬇ ต่ำผิดปกติ'}</span></td>
                        </tr>`;
            })
            .join('')}
                </tbody>
            </table>
        </div>
        <p class="text-muted mt-1" style="font-size:0.8rem;">พบ ${anomalies.length} รายการผิดปกติจาก ${transactions.length} รายการทั้งหมด</p>
    `;
};

// ==========================================
// COST VERIFICATION (COGS Cross-Check)
// ==========================================
window.runCostVerification = function () {
    const section = document.getElementById('costVerifySection');
    const { totals, monthlyData, diffSi, diffTx } = window.AuditService.runCostVerification(window.serviceItems, transactions, expenses);

    const { siCogs, txCogs, actualPurchase } = totals;
    const purchaseExpenses = expenses.filter(e => e.excluded);
    const hasPurchaseData = purchaseExpenses.length > 0;

    const sortedMonths = Object.keys(monthlyData).sort().reverse();

    section.innerHTML = `
        <!-- Summary cards -->
        <div class="d-flex gap-2 flex-wrap mb-3" style="font-size:0.9rem;">
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.8rem;">ต้นทุนระบบ (SI)</div>
                <div style="font-size:1.2rem; font-weight:700;">${formatCurrency(siCogs)}</div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.8rem;">ต้นทุนระบบ (TX)</div>
                <div style="font-size:1.2rem; font-weight:700;">${formatCurrency(txCogs)}</div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.8rem;">รายจ่ายสินค้า (จริง)</div>
                <div style="font-size:1.2rem; font-weight:700;">${hasPurchaseData ? formatCurrency(actualPurchase) : '<span class="text-muted">ยังไม่มีข้อมูล</span>'}</div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:${hasPurchaseData && Math.abs(diffSi) > 0.5 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)'};">
                <div class="text-muted" style="font-size:0.8rem;">ส่วนต่าง (SI vs จริง)</div>
                <div style="font-size:1.2rem; font-weight:700; color:${hasPurchaseData && Math.abs(diffSi) > 0.5 ? 'var(--accent-red)' : 'var(--accent-green)'};">
                    ${hasPurchaseData ? formatCurrency(diffSi) : '-'}
                </div>
            </div>
            <div class="card" style="flex:1; min-width:180px; padding:1rem; background:${hasPurchaseData && Math.abs(diffTx) > 0.5 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)'};">
                <div class="text-muted" style="font-size:0.8rem;">ส่วนต่าง (TX vs จริง)</div>
                <div style="font-size:1.2rem; font-weight:700; color:${hasPurchaseData && Math.abs(diffTx) > 0.5 ? 'var(--accent-red)' : 'var(--accent-green)'};">
                    ${hasPurchaseData ? formatCurrency(diffTx) : '-'}
                </div>
            </div>
        </div>

        ${!hasPurchaseData
            ? `
            <div style="padding:1.5rem; text-align:center; background:rgba(245,158,11,0.1); border-radius:8px;">
                <p style="font-size:0.95rem; margin-bottom:0.5rem;">⚠️ ยังไม่พบข้อมูลรายจ่ายสินค้า (ค่าสินค้า)</p>
                <p class="text-muted" style="font-size:0.85rem;">เพิ่มรายจ่ายหมวด "ค่าสินค้า" ในหน้าบันทึกข้อมูล เพื่อเปรียบเทียบต้นทุนจริงกับระบบ</p>
            </div>
        `
            : `
            <h4 class="mb-2">📅 รายเดือน</h4>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>เดือน</th>
                            <th>ต้นทุน SI</th>
                            <th>ต้นทุน TX</th>
                            <th>รายจ่ายสินค้าจริง</th>
                            <th>หลักฐาน</th>
                            <th>ส่วนต่าง</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedMonths
                .map(m => {
                    const d = monthlyData[m];
                    const diff = d.siCogs - d.purchase;
                    const hasDiff = Math.abs(diff) > 0.5;
                    // Find expenses in this month with receipts
                    const monthExpenses = purchaseExpenses.filter(
                        e => (e.date || '').startsWith(m) && e.receipt_url
                    );
                    const receiptCount = monthExpenses.length;

                    return `
                            <tr class="${hasDiff ? 'discrepancy' : ''}">
                                <td data-label="เดือน"><strong>${m}</strong></td>
                                <td class="text-right" data-label="ต้นทุน SI">${formatCurrency(d.siCogs)}</td>
                                <td class="text-right" data-label="ต้นทุน TX">${formatCurrency(d.txCogs)}</td>
                                <td class="text-right" data-label="รายจ่ายจริง">${formatCurrency(d.purchase)}</td>
                                <td class="text-center" data-label="หลักฐาน">
                                    ${receiptCount > 0 ? `<span class="badge badge-info" title="มี ${receiptCount} หลักฐาน">${receiptCount} 📄</span>` : '-'}
                                </td>
                                <td class="text-right ${hasDiff ? 'text-red' : 'text-green'}" data-label="ส่วนต่าง">${formatCurrency(diff)}</td>
                            </tr>`;
                })
                .join('')}
                    </tbody>
                </table>
            </div>
        `
        }
    `;
};

// ==========================================
// REVENUE VERIFICATION CROSS-CHECK
// ==========================================
window.runRevenueVerification = async function () {
    const dateFrom = document.getElementById('revAuditDateFrom').value;
    const dateTo = document.getElementById('revAuditDateTo').value;

    const { allDates, revByDate, txByDate, summary } = await window.AuditService.runRevenueVerification(dateFrom, dateTo, getBranchFilter());

    const tbody = document.querySelector('#revAuditTable tbody');
    let matchCount = 0;
    let mismatchCount = 0;

    tbody.innerHTML =
        allDates
            .map(date => {
                const revTotal = revByDate[date] ? revByDate[date].total : 0;
                const txTotal = txByDate[date] || 0;
                const diff = revTotal - txTotal;
                const isMatch = Math.abs(diff) < 1;
                const notes = revByDate[date] ? revByDate[date].notes.join(', ') : '';

                if (isMatch) matchCount++;
                else mismatchCount++;

                const noEntry = !revByDate[date];
                const noTx = !txByDate[date];

                let statusBadge;
                if (isMatch) {
                    statusBadge = '<span class="badge badge-success">✅ ตรง</span>';
                } else if (noEntry) {
                    statusBadge = '<span class="badge badge-warning">⚠️ ไม่มีบันทึก</span>';
                } else if (noTx) {
                    statusBadge = '<span class="badge badge-warning">⚠️ ไม่มีใบงาน</span>';
                } else {
                    statusBadge = '<span class="badge badge-danger">❌ ไม่ตรง</span>';
                }

                return `
            <tr style="${!isMatch ? 'background:rgba(239,68,68,0.05);' : ''}">
                <td data-label="วันที่">${formatDate(date)}</td>
                <td class="text-right" data-label="รวมบันทึก">${noEntry ? '<span class="text-muted">-</span>' : formatCurrency(revTotal)}</td>
                <td class="text-right" data-label="รวมระบบ">${noTx ? '<span class="text-muted">-</span>' : formatCurrency(txTotal)}</td>
                <td class="text-right" style="${!isMatch ? 'color:var(--accent-red); font-weight:700;' : ''}" data-label="ส่วนต่าง">${isMatch ? '-' : formatCurrency(diff)}</td>
                <td class="text-center" data-label="สถานะ">${statusBadge}</td>
                <td style="font-size:0.8rem; max-width:200px; overflow:hidden; text-overflow:ellipsis;" data-label="หมายเหตุ">${notes || '-'}</td>
            </tr>
        `;
            })
            .join('') || '<tr><td colspan="6" class="text-center text-muted">ยังไม่มีข้อมูล</td></tr>';

    // Summary
    const summaryDiv = document.getElementById('revAuditSummary');
    const { totalRevEntry, totalRevTx } = summary;
    summaryDiv.innerHTML = `
        <div class="d-flex gap-2 flex-wrap">
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:rgba(34,197,94,0.08);">
                <div class="text-muted" style="font-size:0.75rem;">วันที่ตรง</div>
                <div style="font-weight:700; color:var(--accent-green);">${matchCount} วัน</div>
            </div>
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:rgba(239,68,68,0.08);">
                <div class="text-muted" style="font-size:0.75rem;">วันที่ไม่ตรง</div>
                <div style="font-weight:700; color:var(--accent-red);">${mismatchCount} วัน</div>
            </div>
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.75rem;">รวมบันทึก</div>
                <div style="font-weight:700;">${formatCurrency(totalRevEntry)}</div>
            </div>
            <div style="flex:1; min-width:150px; padding:0.5rem 0.75rem; border-radius:8px; background:var(--bg-primary);">
                <div class="text-muted" style="font-size:0.75rem;">รวมระบบ</div>
                <div style="font-weight:700;">${formatCurrency(totalRevTx)}</div>
            </div>
        </div>
    `;
};
