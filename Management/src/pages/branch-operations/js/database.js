// @ts-nocheck
import * as XLSX from 'xlsx';

// ==========================================
// STATE
// ==========================================
window.currentTable = 'transactions';
window.parsedData = null;
window.parsedHeaders = null;
window.PAGE_SIZE = 50;
window.currentPages = { transactions: 1, service_items: 1, product_groups: 1, expenses: 1 };
window.searchTerm = '';
window.filterDateFrom = '';
window.filterDateTo = '';

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

window.safeGetVal = function (id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
};

window.getBranchLabel = function (branch) {
    if (!branch || branch === 'BC Auto Service' || branch === 'main') return 'BC Auto Service';
    if (branch === 'suphan' || branch === 'suphanburi') return 'สุพรรณฯ';
    return branch;
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (!requireOwner()) return;

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');

            // Map tab to table name
            const map = {
                'tab-transactions': 'transactions',
                'tab-service-items': 'service_items',
                'tab-product-groups': 'product_groups',
                'tab-expenses': 'expenses',
                'tab-revenue': 'revenue_verification'
            };
            currentTable = map[target] || 'transactions';
            loadTableData(currentTable);
        });
    });

    // File upload
    setupFileUpload();

    // Sheet selector change
    const sheetSelector = document.getElementById('sheetSelector');
    if (sheetSelector) {
        sheetSelector.addEventListener('change', e => {
            const rg = document.getElementById('reportMonthGroup');
            if (rg) rg.style.display = e.target.value === 'product_groups' ? 'block' : 'none';
        });
    }

    // Buttons
    const importBtn = document.getElementById('importBtn');
    if (importBtn) importBtn.addEventListener('click', () => handleImport());
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelUpload);

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', handleExport);
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', handleExport);

    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) verifyBtn.addEventListener('click', handleVerify);

    const clearTableBtn = document.getElementById('clearTableBtn');
    if (clearTableBtn) clearTableBtn.addEventListener('click', handleClearTable);

    // Specific Clear Modal Events
    const cancelClearBtn = document.getElementById('cancelClearBtn');
    if (cancelClearBtn) cancelClearBtn.addEventListener('click', () => {
        document.getElementById('clearDataModal').classList.remove('show');
    });

    const confirmClearBtn = document.getElementById('confirmClearBtn');
    if (confirmClearBtn) confirmClearBtn.addEventListener('click', confirmClearData);

    const clearScopeRadios = document.querySelectorAll('input[name="clearScope"]');
    clearScopeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            document.getElementById('clearMonthGroup').style.display = val === 'month' ? 'block' : 'none';
            document.getElementById('clearRangeGroup').style.display = val === 'range' ? 'block' : 'none';
        });
    });

    // Filter Buttons
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn) applyFilterBtn.addEventListener('click', applyFilters);

    const clearFilterBtn = document.getElementById('clearFilterBtn');
    if (clearFilterBtn) clearFilterBtn.addEventListener('click', clearFilters);

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener(
            'input',
            debounce(() => {
                applyFilters();
            }, 400)
        );
    }

    // Add product group
    const addGroupBtn = document.getElementById('addGroupBtn');
    if (addGroupBtn) addGroupBtn.addEventListener('click', () => {
        const modal = document.getElementById('addGroupModal');
        if (modal) {
            modal.classList.add('show');
            // Set default month from filter if available
            const filterMonth = document.getElementById('filterMonth')?.value;
            const newGroupMonth = document.getElementById('newGroupMonth');
            if (newGroupMonth) {
                newGroupMonth.value = filterMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            }
        }
    });

    const cancelGroupBtn = document.getElementById('cancelGroupBtn');
    if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', () => {
        const modal = document.getElementById('addGroupModal');
        if (modal) modal.classList.remove('show');
    });

    const saveGroupBtn = document.getElementById('saveGroupBtn');
    if (saveGroupBtn) saveGroupBtn.addEventListener('click', handleAddGroup);

    // Set default report month
    const now = new Date();
    const reportMonthEl = document.getElementById('reportMonth');
    if (reportMonthEl) {
        reportMonthEl.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Load initial data
    if (window.currentTable) loadTableData(window.currentTable);
});

// ==========================================
// FILE UPLOAD
// ==========================================
window.setupFileUpload = function () {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('importFile') || document.getElementById('fileInput');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', e => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', e => {
            if (e.target.files[0]) processFile(e.target.files[0]);
        });
    }
};

window.processFile = function (file) {
    if (!file.name.match(/\.xlsx?$/i) && !file.name.match(/\.json$/i)) {
        showToast('กรุณาเลือกไฟล์ Excel (.xlsx)', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
            const sheetName = wb.SheetNames[0];
            const sheet = wb.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (data.length < 2) {
                showToast('ไฟล์ไม่มีข้อมูล', 'warning');
                return;
            }

            window.parsedHeaders = data[0];
            window.parsedData = data.slice(1).filter(r => r.some(c => c != null && c !== ''));

            // Auto-detect sheet type
            const detected = detectSheetType(window.parsedHeaders);

            const sheetEl = document.getElementById('sheetSelector');
            if (sheetEl) sheetEl.value = detected;

            const monthGrp = document.getElementById('reportMonthGroup');
            if (monthGrp) monthGrp.style.display = detected === 'product_groups' ? 'block' : 'none';

            const fileInfo = document.getElementById('fileInfo');
            if (fileInfo) fileInfo.textContent = `📄 ${file.name} — ${window.parsedData.length} แถว (ตรวจพบ: ${getSheetLabel(detected)})`;

            const upCtrl = document.getElementById('uploadControls');
            if (upCtrl) {
                upCtrl.style.display = 'block';
                showUploadPreview(detected);
            } else {
                // No upload controls, means new UI. Auto-ask to import.
                if (confirm(`พบข้อมูล ${window.parsedData.length} แถว (ประเภท: ${getSheetLabel(detected)}).\nต้องการนำเข้าข้อมูลนี้ทันทีหรือไม่?`)) {
                    handleImport(detected);
                }
            }

            showToast(`อ่านไฟล์สำเร็จ: ${window.parsedData.length} แถว`, 'info');
        } catch (err) {
            console.error(err);
            showToast('ไม่สามารถอ่านไฟล์ได้', 'error');
        } finally {
            const input = document.getElementById('importFile');
            if (input) input.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
};

window.detectSheetType = function (headers) {
    const h = headers.map(String).join(' ');
    if (h.includes('รหัสกลุ่มสินค้า') || h.includes('ชื่อกลุ่มสินค้า')) return 'product_groups';
    if (h.includes('รหัสสินค้า') || h.includes('ชื่อสินค้า')) return 'service_items';
    if (h.includes('ใบบันทึกบริการ')) return 'transactions';
    return 'auto';
};

window.getSheetLabel = function (type) {
    const labels = {
        transactions: 'ใบบันทึกบริการ',
        service_items: 'รายการสินค้า',
        product_groups: 'กลุ่มสินค้า',
        auto: 'ตรวจจับอัตโนมัติ'
    };
    return labels[type] || type;
};

window.cancelUpload = function () {
    window.parsedHeaders = [];
    window.parsedData = [];
    const upCtrl = document.getElementById('uploadControls');
    if (upCtrl) upCtrl.style.display = 'none';
    const preview = document.getElementById('uploadPreview');
    if (preview) preview.style.display = 'none';
    const input = document.getElementById('importFile') || document.getElementById('fileInput');
    if (input) input.value = '';
};

// ==========================================
// UPLOAD PREVIEW WITH DUPLICATE DETECTION
// ==========================================
window.showUploadPreview = async function (sheetType) {
    const previewDiv = document.getElementById('uploadPreview');
    const thead = document.getElementById('previewHead');
    const tbody = document.getElementById('previewBody');
    const stats = document.getElementById('previewStats');

    previewDiv.style.display = 'block';

    // Show limited headers (first 6 columns max for readability)
    const displayHeaders = parsedHeaders.slice(0, 6);
    thead.innerHTML = `<tr>${displayHeaders.map(h => `<th>${h || '-'}</th>`).join('')}<th>สถานะ</th></tr>`;

    // Detect duplicates
    let existingIds = new Set();
    try {
        if (sheetType === 'transactions') {
            const data = await window.TransactionService.getFullTransactions({
                fields: 'job_id',
                filter: getBranchFilter()
            });
            existingIds = new Set((data || []).map(e => String(e.job_id)));
        } else if (sheetType === 'service_items') {
            const data = await window.TransactionService.getFullServiceItems({
                fields: 'job_id,item_name',
                filter: getBranchFilter()
            });
            existingIds = new Set((data || []).map(e => `${e.job_id}|${e.item_name}`));
        } else if (sheetType === 'product_groups') {
            const data = await window.TransactionService.getFullProductGroups({
                fields: 'code,report_month',
                filter: `${getBranchFilter()}`
            });
            existingIds = new Set((data || []).map(e => `${e.code}|${e.report_month}`));
        }
    } catch (err) {
        console.error('Preview duplicate check error:', err);
    }

    // Check each row for duplicates
    let dupCount = 0;
    let newCount = 0;
    const previewRows = parsedData.slice(0, 20); // Show max 20 rows

    tbody.innerHTML = previewRows
        .map(row => {
            let isDuplicate = false;
            const id = String(row[0] || '').trim();

            if (sheetType === 'transactions') {
                isDuplicate = existingIds.has(id);
            } else if (sheetType === 'service_items') {
                const itemName = String(row[4] || '').trim(); // Row 4 (column E) should be Name/Description
                isDuplicate = existingIds.has(`${id}|${itemName}`);
            } else if (sheetType === 'product_groups') {
                const reportMonth = document.getElementById('reportMonth').value || '';
                isDuplicate = existingIds.has(`${id}|${reportMonth}`);
            }

            if (isDuplicate) dupCount++;
            else newCount++;

            const displayCells = row.slice(0, 6);
            return `
            <tr style="${isDuplicate ? 'background:rgba(239,68,68,0.08);' : ''}">
                ${displayCells.map((c, i) => `<td data-label="${displayHeaders[i] || '-'}">${c != null ? c : ''}</td>`).join('')}
                <td data-label="สถานะ">${isDuplicate ? '<span class="badge badge-danger">🔁 ซ้ำ</span>' : '<span class="badge badge-success">✅ ใหม่</span>'}</td>
            </tr>
        `;
        })
        .join('');

    // Extrapolate duplicate count for full dataset
    const totalDups =
        parsedData.length > 20 ? Math.round((dupCount / previewRows.length) * parsedData.length) : dupCount;
    const totalNew = parsedData.length - totalDups;

    stats.innerHTML = `
        แสดง ${Math.min(20, parsedData.length)}/${parsedData.length} แถว |
        <span style="color:var(--accent-green);">✅ ใหม่: ~${totalNew}</span> |
        <span style="color:var(--accent-red);">🔁 ซ้ำ: ~${totalDups}</span>
    `;
};

// ==========================================
// IMPORT LOGIC
// ==========================================
window.handleImport = async function (typeOverride = null) {
    if (!window.parsedData || window.parsedData.length === 0) {
        showToast('ไม่มีข้อมูลให้นำเข้า', 'warning');
        return;
    }

    let sheetType = typeOverride;
    if (!sheetType) {
        const sel = document.getElementById('sheetSelector');
        sheetType = sel ? sel.value : detectSheetType(window.parsedHeaders);
    }

    if (sheetType === 'auto') {
        sheetType = detectSheetType(window.parsedHeaders);
        if (sheetType === 'auto') {
            showToast('ไม่สามารถตรวจจับประเภทไฟล์ได้ กรุณาเลือกด้วยตนเอง', 'error');
            return;
        }
    }

    showLoading();

    try {
        let result;
        if (sheetType === 'transactions') {
            result = await importTransactions(parsedData);
        } else if (sheetType === 'service_items') {
            result = await importServiceItems(parsedData);
        } else if (sheetType === 'product_groups') {
            result = await importProductGroups(parsedData);
        }

        hideLoading();
        if (result) {
            showToast(
                `นำเข้าสำเร็จ: ${result.inserted} รายการ, ข้าม ${result.skipped} รายการ (ซ้ำ)`,
                result.skipped > 0 ? 'warning' : 'success'
            );
            window.AuditService?.log('import_data', `Imported ${result.inserted} ${sheetType} records (skipped ${result.skipped})`, 'branch-operations');
        }
        cancelUpload();
        loadTableData(sheetType);
    } catch (err) {
        hideLoading();
        console.error(err);
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
};

window.importTransactions = async function (rows) {
    let existingIds = new Set();
    const branch = getBranch();
    try {
        const existing = await window.TransactionService.getFullTransactions({
            fields: 'job_id',
            filter: `branch = "${branch}"`
        });
        existingIds = new Set((existing || []).map(e => e.job_id));
    } catch (e) {
        console.error('Error fetching existing IDs', e);
    }

    return await window.TransactionService.importTransactions(rows, branch, existingIds);
};

window.importServiceItems = async function (rows) {
    return await window.TransactionService.importServiceItems(rows, getBranch());
};

window.importProductGroups = async function (rows) {
    const monthEl = document.getElementById('reportMonth');
    const reportMonth = monthEl ? monthEl.value : null;
    return await window.TransactionService.importProductGroups(rows, getBranch(), reportMonth);
};

// ==========================================
// TABLE DATA LOADING
// ==========================================
// Set dynamic title based on branch
const branchNames = {
    'suphanburi': 'สุพรรณบุรี',
    'samchuk': 'สามชุก',
    'BC Auto Service': 'สำนักงานใหญ่'
};
const branchForTitle = window.AuthService?.getBranch();
const branchDisplay = branchNames[branchForTitle] || branchForTitle || 'BC Auto';
document.title = `จัดการฐานข้อมูล | ${branchDisplay}`;

window.loadTableData = async function (table = window.currentTable) {
    window.showLoading();
    const page = window.currentPages[table] || 1;
    const from = (page - 1) * window.PAGE_SIZE;
    const to = from + window.PAGE_SIZE - 1;

    // Inject Skeleton Loaders immediately
    if (window.UIService) {
        const tbodyMap = {
            transactions: '#txTable tbody',
            service_items: '#siTable tbody',
            product_groups: '#pgTable tbody',
            expenses: '#expTable tbody',
            revenue_verification: '#revTable tbody'
        };
        const tbody = document.querySelector(tbodyMap[table]);
        if (tbody) {
            const tableEl = tbody.closest('table');
            if (tableEl && tableEl.querySelector('th')) {
                const cols = tableEl.querySelectorAll('th').length;
                tbody.innerHTML = window.UIService.generateTableSkeleton(cols, 4);
            }
        }
    }

    try {
        let filterExpr = [];

        // Build branch filter based on standard 'getBranchFilter' logic
        const branchFilter = window.getBranchFilter ? window.getBranchFilter() : '';
        if (branchFilter && branchFilter !== 'id!=""') {
            filterExpr.push(branchFilter);
        } else if (branchFilter === 'id!=""') {
            // For 'all branches' mode, we don't need a restrictive condition,
            // but if we are not appending anything, we don't push it.
            // We only pushed branchFilter string specifically if it's restrictive.
        }

        // Apply date filters (skip for product_groups as it has no date field)
        if (table !== 'product_groups') {
            if (filterDateFrom) {
                const dateCol = (table === 'expenses' || table === 'revenue_verification') ? 'date' : 'open_date';
                // PocketBase date format is "YYYY-MM-DD HH:mm:ss"
                filterExpr.push(`${dateCol} >= '${filterDateFrom} 00:00:00'`);
            }
            if (filterDateTo) {
                const dateCol = (table === 'expenses' || table === 'revenue_verification') ? 'date' : 'open_date';
                filterExpr.push(`${dateCol} <= '${filterDateTo} 23:59:59'`);
            }
        }

        // Apply search
        if (searchTerm) {
            if (table === 'transactions') {
                filterExpr.push(
                    `(job_id ~ '${searchTerm}' || customer_name ~ '${searchTerm}' || car_registration ~ '${searchTerm}')`
                );
            } else if (table === 'service_items') {
                filterExpr.push(
                    `(job_id ~ '${searchTerm}' || item_name ~ '${searchTerm}' || customer_name ~ '${searchTerm}')`
                );
            } else if (table === 'product_groups') {
                filterExpr.push(`(code ~ '${searchTerm}' || name ~ '${searchTerm}')`);
            } else if (table === 'expenses' || table === 'revenue_verification') {
                filterExpr.push(`(category ~ '${searchTerm}' || notes ~ '${searchTerm}')`);
            }
        }

        // Apply month filter for product groups (even if search is empty)
        if (table === 'product_groups') {
            const month = document.getElementById('filterMonth')?.value;
            if (month) {
                filterExpr.push(`report_month = '${month}'`);
            }
        }

        // Order and paginate
        const orderCol = (table === 'expenses' || table === 'revenue_verification') ? '-date' : table === 'product_groups' ? 'code' : '-open_date';

        let res;
        if (table === 'transactions') {
            res = await window.TransactionService.getTransactions(page, PAGE_SIZE, {
                filter: filterExpr.join(' && '),
                sort: orderCol
            });
        } else if (table === 'service_items') {
            res = await window.TransactionService.getServiceItems(page, PAGE_SIZE, {
                filter: filterExpr.join(' && '),
                sort: orderCol
            });
        } else if (table === 'product_groups') {
            res = await window.TransactionService.getProductGroups(page, PAGE_SIZE, {
                filter: filterExpr.join(' && '),
                sort: orderCol
            });
        } else if (table === 'expenses') {
            res = await window.EntryService.getExpenses(page, PAGE_SIZE, {
                filter: filterExpr.join(' && '),
                sort: orderCol
            });
        } else if (table === 'revenue_verification') {
            res = await window.EntryService.getRevenues(page, PAGE_SIZE, {
                filter: filterExpr.join(' && '),
                sort: orderCol
            });
        } else {
            res = { items: [], totalItems: 0 };
        }

        renderTable(table, res.items || []);
        renderPagination(table, res.totalItems || 0);
    } catch (err) {
        console.error(err);
        showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
    }
    hideLoading();
};

window.renderTable = function (table, data) {
    const tbodyMap = {
        transactions: '#txTable tbody',
        service_items: '#siTable tbody',
        product_groups: '#pgTable tbody',
        expenses: '#expTable tbody',
        revenue_verification: '#revTable tbody'
    };
    const tbody = document.querySelector(tbodyMap[table]);
    if (!tbody) return;

    if (data.length === 0) {
        const colCount = tbody.closest('table').querySelectorAll('th').length;
        if (window.UIService) {
            tbody.innerHTML = window.UIService.generateEmptyStateRow(colCount, "ไม่พบข้อมูล", "ผลการค้นหาว่างเปล่า หรืออาจติดตัวกรองสาขา/วันที่");
        } else {
            tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
        }
        return;
    }

    if (table === 'transactions') {
        tbody.innerHTML = data
            .map(
                r => `
            <tr data-id="${r.id}" onclick="editRow('transactions', '${r.id}')" style="cursor: pointer;">
                <td data-label="Job ID">${r.job_id}</td>
                <td data-label="วันเปิด">${formatDateTime(r.open_date)}</td>
                <td data-label="วันปิด">${formatDateTime(r.close_date)}</td>
                <td data-label="ลูกค้า">${r.customer_name || '-'}</td>
                <td class="text-right" data-label="รายได้">${formatCurrency(r.total_revenue)}</td>
                <td class="text-right" data-label="VAT">${formatCurrency(r.vat_amount)}</td>
                <td class="text-right" data-label="สุทธิ">${formatCurrency(r.net_revenue)}</td>
                <td class="text-right" data-label="ทุน">${formatCurrency(r.total_cost)}</td>
                <td class="text-right ${Number(r.total_profit) >= 0 ? 'text-green' : 'text-red'}" data-label="กำไร">${formatCurrency(r.total_profit)}</td>
                <td data-label="ทะเบียน" onclick="event.stopPropagation()">${r.car_registration ? `<a href="#" onclick="window.UIService.openTimeline('${r.car_registration}'); return false;" class="text-primary" style="text-decoration:underline; font-weight:500;">${r.car_registration}</a>` : '-'}</td>
                <td data-label="สาขา">${getBranchLabel(r.branch)}</td>
                <td data-label="จัดการ" style="position:relative;" onclick="event.stopPropagation()">${window.UIService.generateActionMenu('transactions', r.id)}</td>
            </tr>
        `
            )
            .join('');
    } else if (table === 'service_items') {
        tbody.innerHTML = data
            .map(
                r => `
            <tr data-id="${r.id}" onclick="editRow('service_items', '${r.id}')" style="cursor: pointer;">
                <td data-label="Job ID">${r.job_id}</td>
                <td data-label="วันที่">${formatDateTime(r.open_date)}</td>
                <td data-label="ลูกค้า">${r.customer_name || '-'}</td>
                <td data-label="รหัส">${r.item_code || '-'}</td>
                <td data-label="ชื่อสินค้า">${r.item_name}</td>
                <td class="text-right" data-label="จำนวน">${r.quantity}</td>
                <td class="text-right" data-label="ทุน">${formatCurrency(r.total_cost)}</td>
                <td class="text-right" data-label="ขาย">${formatCurrency(r.total_price)}</td>
                <td class="text-right ${Number(r.total_profit) >= 0 ? 'text-green' : 'text-red'}" data-label="กำไร">${formatCurrency(r.total_profit)}</td>
                <td data-label="สาขา">${getBranchLabel(r.branch)}</td>
                <td data-label="จัดการ" style="position:relative;" onclick="event.stopPropagation()">${window.UIService.generateActionMenu('service_items', r.id)}</td>
            </tr>
        `
            )
            .join('');
    } else if (table === 'product_groups') {
        tbody.innerHTML = data
            .map(
                r => `
            <tr data-id="${r.id}" onclick="editRow('product_groups', '${r.id}')" style="cursor: pointer;">
                <td data-label="รหัส">${r.code}</td>
                <td data-label="ชื่อกลุ่ม">${r.name}</td>
                <td class="text-right" data-label="จำนวน">${r.quantity}</td>
                <td class="text-right" data-label="ทุน">${formatCurrency(r.total_cost)}</td>
                <td class="text-right" data-label="ขาย">${formatCurrency(r.total_sales)}</td>
                <td class="text-right ${Number(r.total_profit) >= 0 ? 'text-green' : 'text-red'}" data-label="กำไร">${formatCurrency(r.total_profit)}</td>
                <td data-label="เดือน">${r.report_month || '-'}</td>
                <td data-label="สาขา">${getBranchLabel(r.branch)}</td>
                <td data-label="จัดการ" style="position:relative;" onclick="event.stopPropagation()">${window.UIService.generateActionMenu('product_groups', r.id)}</td>
            </tr>
        `
            )
            .join('');
    } else if (table === 'expenses') {
        tbody.innerHTML = data
            .map(
                r => `
            <tr data-id="${r.id}" onclick="editRow('expenses', '${r.id}')" style="cursor: pointer;">
                <td data-label="วันที่">${formatDate(r.date)}</td>
                <td data-label="หมวดหมู่">${r.category}</td>
                <td class="text-right" data-label="จำนวนเงิน">${formatCurrency(r.amount)}</td>
                <td data-label="หมายเหตุ">${r.notes || '-'}</td>
                <td data-label="ไม่นับ">${r.excluded ? '<span class="badge badge-warning">ใช่</span>' : '-'}</td>
                <td data-label="สาขา">${getBranchLabel(r.branch)}</td>
                <td data-label="จัดการ" style="position:relative;" onclick="event.stopPropagation()">${window.UIService.generateActionMenu('expenses', r.id)}</td>
            </tr>
        `
            )
            .join('');
    } else if (table === 'revenue_verification') {
        tbody.innerHTML = data
            .map(
                r => `
            <tr data-id="${r.id}" onclick="editRow('revenue_verification', '${r.id}')" style="cursor: pointer;">
                <td data-label="วันที่">${formatDate(r.date)}</td>
                <td data-label="หมวดหมู่">${r.category || '-'}</td>
                <td class="text-right" data-label="จำนวนเงิน">${formatCurrency(r.amount)}</td>
                <td data-label="หมายเหตุ">${r.notes || '-'}</td>
                <td data-label="จัดการ" style="position:relative;" onclick="event.stopPropagation()">${window.UIService.generateActionMenu('revenue_verification', r.id)}</td>
            </tr>
        `
            )
            .join('');
    }
};

window.renderPagination = function (table, totalCount) {
    const paginationMap = {
        transactions: '#txPagination',
        service_items: '#siPagination',
        product_groups: '#pgPagination',
        expenses: '#expPagination',
        revenue_verification: '#revPagination'
    };
    const container = document.querySelector(paginationMap[table]);
    if (!container) return;

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const currentPage = currentPages[table] || 1;

    if (totalPages <= 1) {
        container.innerHTML = `<span class="text-muted" style="font-size:0.8rem;">ทั้งหมด ${totalCount} รายการ</span>`;
        return;
    }

    let html = `<span class="text-muted" style="font-size:0.8rem; margin-right:0.5rem;">ทั้งหมด ${totalCount} รายการ</span>`;
    html += `<button class="page-btn" onclick="goToPage('${table}', ${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>`;

    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2) {
            html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goToPage('${table}', ${p})">${p}</button>`;
        } else if (Math.abs(p - currentPage) === 3) {
            html += '<span class="text-muted">…</span>';
        }
    }

    html += `<button class="page-btn" onclick="goToPage('${table}', ${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>`;
    container.innerHTML = html;
};

window.goToPage = function (table, page) {
    currentPages[table] = page;
    loadTableData(table);
};

// ==========================================
// DELETE
// ==========================================
window.deleteRow = async function (table, id) {
    if (!confirm('ต้องการลบรายการนี้?')) return;
    showLoading();

    let result;
    try {
        if (table === 'expenses') await window.EntryService.deleteExpense(id); else if (table === 'revenue_verification') await window.EntryService.deleteRevenue(id);
        else if (table === 'transactions') await window.TransactionService.deleteTransaction(id);
        else if (table === 'service_items') await window.TransactionService.deleteServiceItem(id);
        else if (table === 'product_groups') await window.TransactionService.deleteProductGroup(id);
        else {
            await pb.collection(table).delete(id);
            window.AuditService?.log('delete_record', `Deleted ${table} record: ${id}`, 'database');
        }
        result = { error: null };
    } catch (e) {
        result = { error: e };
    }

    hideLoading();
    const { error } = result;
    if (error) {
        showToast('ลบไม่สำเร็จ: ' + error.message, 'error');
    } else {
        showToast('ลบรายการสำเร็จ', 'success');
        window.AuditService?.log('delete_record', `Deleted ${table} record: ${id}`, 'branch-operations');
        loadTableData(table);
    }
};

// ==========================================
// CLEAR TABLE
// ==========================================
window.handleClearTable = function () {
    const modal = document.getElementById('clearDataModal');
    if (!modal) return;

    const tableName = window.currentTable;
    const label = getSheetLabel(tableName);

    // Reset modal state
    document.querySelectorAll('input[name="clearScope"]').forEach(r => r.checked = r.value === 'all');
    document.getElementById('clearMonthGroup').style.display = 'none';
    document.getElementById('clearRangeGroup').style.display = 'none';

    // Set default month/date from global filters if available
    const filterMonth = document.getElementById('filterMonth')?.value;
    if (filterMonth) {
        document.getElementById('clearTargetMonth').value = filterMonth;
        document.getElementById('clearDateFrom').value = `${filterMonth}-01`;
        const [y, m] = filterMonth.split('-');
        const lastDay = new Date(y, m, 0).getDate();
        document.getElementById('clearDateTo').value = `${filterMonth}-${String(lastDay).padStart(2, '0')}`;
    }

    modal.classList.add('show');
};

window.confirmClearData = async function () {
    const tableName = window.currentTable;
    const label = getSheetLabel(tableName);
    const scope = document.querySelector('input[name="clearScope"]:checked').value;

    let filterExpr = [getBranchFilter()];
    let scopeLabel = "ทั้งหมด";

    if (scope === 'month') {
        const month = document.getElementById('clearTargetMonth').value;
        if (!month) {
            showToast('กรุณาเลือกเดือนที่ต้องการลบ', 'warning');
            return;
        }
        const [year, mon] = month.split('-');
        const lastDay = new Date(year, mon, 0).getDate();
        const dateCol = (tableName === 'expenses' || tableName === 'revenue_verification') ? 'date' : 'open_date';
        filterExpr.push(`${dateCol} >= '${year}-${mon}-01 00:00:00'`);
        filterExpr.push(`${dateCol} <= '${year}-${mon}-${String(lastDay).padStart(2, '0')} 23:59:59'`);
        scopeLabel = `เดือน ${month}`;
    } else if (scope === 'range') {
        const from = document.getElementById('clearDateFrom').value;
        const to = document.getElementById('clearDateTo').value;
        if (!from || !to) {
            showToast('กรุณาเลือกช่วงวันที่ให้ครบถ้วน', 'warning');
            return;
        }
        const dateCol = (tableName === 'expenses' || tableName === 'revenue_verification') ? 'date' : 'open_date';
        filterExpr.push(`${dateCol} >= '${from} 00:00:00'`);
        filterExpr.push(`${dateCol} <= '${to} 23:59:59'`);
        scopeLabel = `ระหว่าง ${from} ถึง ${to}`;
    }

    if (!confirm(`⚠️ ยืนยันการลบข้อมูล "${label}"\nขอบเขต: ${scopeLabel}\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้!`)) return;

    showLoading();
    try {
        const fullFilter = filterExpr.join(' && ');
        let deletedCount = 0;

        // Use appropriate service to clear
        if (tableName === 'expenses' || tableName === 'revenue_verification' || tableName === 'owner_expenses') {
            deletedCount = await window.EntryService.clearTable(tableName, fullFilter);
        } else {
            deletedCount = await window.TransactionService.clearTable(tableName, fullFilter);
        }

        hideLoading();
        showToast(`ล้างข้อมูล "${label}" สำเร็จ (${deletedCount} รายการ)`, 'success');
        window.AuditService?.log('clear_table', `Cleared ${label} (${scopeLabel}): ${deletedCount} records deleted`, 'branch-operations');
        document.getElementById('clearDataModal').classList.remove('show');
        loadTableData(tableName);
    } catch (e) {
        hideLoading();
        showToast('ล้างข้อมูลไม่สำเร็จ: ' + e.message, 'error');
    }
};

// ==========================================
// EXPORT
// ==========================================
window.handleExport = async function () {
    window.showLoading();
    try {
        let data;
        if (currentTable === 'transactions') {
            data = await window.TransactionService.getFullTransactions({
                filter: `${getBranchFilter()}`,
                sort: '-created'
            });
        } else if (currentTable === 'service_items') {
            data = await window.TransactionService.getFullServiceItems({
                filter: `${getBranchFilter()}`,
                sort: '-created'
            });
        } else if (currentTable === 'product_groups') {
            data = await window.TransactionService.getFullProductGroups({
                filter: `${getBranchFilter()}`,
                sort: '-created'
            });
        } else if (currentTable === 'expenses') {
            // Workaround for getFullList without pagination on expenses
            // Assuming we use pagination in service and we can fetch many if needed, but lets just use raw for this generic export if we have to, or write a workaround.
            data = await window.EntryService.getExpenses(1, 10000, {
                filter: `${getBranchFilter()}`,
                sort: '-created'
            }).then(res => res.items);
        } else if (currentTable === 'revenue_verification') {
            data = await window.EntryService.getRevenues(1, 10000, {
                filter: `${getBranchFilter()}`,
                sort: '-created'
            }).then(res => res.items);
        }

        if (!data || data.length === 0) {
            showToast('ไม่มีข้อมูลให้ส่งออก', 'warning');
            hideLoading();
            return;
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, currentTable);
        XLSX.writeFile(wb, `bcauto_${currentTable}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('ส่งออกสำเร็จ', 'success');
    } catch (err) {
        console.error(err);
        showToast('ส่งออกไม่สำเร็จ', 'error');
    }
    hideLoading();
};

// ==========================================
// VERIFICATION (Quick Summary + Link to Audit)
// ==========================================
window.handleVerify = async function () {
    window.showLoading();
    try {
        const branchFilter = `${getBranchFilter()}`;
        const [txRes, siRes, pgRes] = await Promise.all([
            window.TransactionService.getFullTransactions({ filter: branchFilter }),
            window.TransactionService.getFullServiceItems({ filter: branchFilter }),
            window.TransactionService.getFullProductGroups({ filter: branchFilter })
        ]);

        const transactions = txRes || [];
        const serviceItems = siRes || [];
        const productGroups = pgRes || [];

        // Quick order discrepancy count (transactions vs service_items by job_id)
        const itemsByJob = {};
        serviceItems.forEach(item => {
            if (!itemsByJob[item.job_id]) itemsByJob[item.job_id] = [];
            itemsByJob[item.job_id].push(item);
        });

        let orderDiscCount = 0;
        transactions.forEach(tx => {
            const items = itemsByJob[tx.job_id] || [];
            const itemsRevenue = items.reduce((s, i) => s + Number(i.total_price || 0), 0);
            const itemsProfit = items.reduce((s, i) => s + Number(i.total_profit || 0), 0);
            const diffRevenue = Number(tx.total_revenue || 0) - itemsRevenue;
            const diffProfit = Number(tx.total_profit || 0) - itemsProfit;
            if (Math.abs(diffRevenue) > 0.5 || Math.abs(diffProfit) > 0.5) orderDiscCount++;
        });

        // Quick product group discrepancy (PG vs aggregated service_items)
        const siAgg = {};
        serviceItems.forEach(item => {
            const code = item.item_code || 'UNKNOWN';
            if (!siAgg[code]) siAgg[code] = { totalSales: 0, totalProfit: 0 };
            siAgg[code].totalSales += Number(item.total_price || 0);
            siAgg[code].totalProfit += Number(item.total_profit || 0);
        });

        const months = [...new Set(productGroups.map(pg => pg.report_month).filter(Boolean))].sort().reverse();
        const latestMonth = months[0] || '';
        const pgForMonth = productGroups.filter(pg => pg.report_month === latestMonth);

        const pgTotalSales = pgForMonth.reduce((s, pg) => s + Number(pg.total_sales || 0), 0);
        const siTotalSales = Object.values(siAgg).reduce((s, v) => s + v.totalSales, 0);
        const pgDiff = Math.abs(pgTotalSales - siTotalSales);

        let groupSuspectCount = 0;
        pgForMonth.forEach(pg => {
            const si = siAgg[pg.code] || { totalSales: 0, totalProfit: 0 };
            const d =
                Math.abs(Number(pg.total_sales || 0) - si.totalSales) +
                Math.abs(Number(pg.total_profit || 0) - si.totalProfit);
            if (d > 0.5) groupSuspectCount++;
        });

        const resultDiv = document.getElementById('verifyResults');
        const contentDiv = document.getElementById('verifyContent');
        resultDiv.style.display = 'block';

        const orderOk = orderDiscCount === 0;
        const groupOk = pgDiff < 0.5 && groupSuspectCount === 0;

        contentDiv.innerHTML = `
            <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1.5rem;">
                <div class="card" style="flex:1; min-width:200px; padding:1rem; background:${orderOk ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'};">
                    <div class="text-muted" style="font-size:0.8rem;">📋 ใบบันทึกบริการ</div>
                    <div style="font-size:1.4rem; font-weight:700; color:${orderOk ? 'var(--accent-green)' : 'var(--accent-red)'};">
                        ${orderOk ? '✅ ตรงกัน' : `⚠️ พบ ${orderDiscCount} รายการ`}
                    </div>
                    <div class="text-muted" style="font-size:0.8rem;">จาก ${transactions.length} ใบ</div>
                </div>
                <div class="card" style="flex:1; min-width:200px; padding:1rem; background:${groupOk ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'};">
                    <div class="text-muted" style="font-size:0.8rem;">📦 กลุ่มสินค้า (${latestMonth || '-'})</div>
                    <div style="font-size:1.4rem; font-weight:700; color:${groupOk ? 'var(--accent-green)' : 'var(--accent-red)'};">
                        ${groupOk ? '✅ ตรงกัน' : `⚠️ ${groupSuspectCount} กลุ่มต้องสงสัย`}
                    </div>
                    <div class="text-muted" style="font-size:0.8rem;">PG: ${formatCurrency(pgTotalSales)} | SI: ${formatCurrency(siTotalSales)}</div>
                </div>
            </div>
            <a href="audit.html" class="btn btn-primary">🔍 ดูรายละเอียดเพิ่มเติมที่หน้าตรวจสอบข้อมูล</a>
        `;
    } catch (err) {
        console.error(err);
        showToast('ตรวจสอบไม่สำเร็จ', 'error');
    }
    hideLoading();
};

// ==========================================
// ADD PRODUCT GROUP
// ==========================================
window.handleAddGroup = async function () {
    const code = document.getElementById('newGroupCode').value.trim();
    const name = document.getElementById('newGroupName').value.trim();
    const month = document.getElementById('newGroupMonth').value;

    if (!code || !name || !month) {
        showToast('กรุณากรอกรหัส ชื่อ และเลือกเดือน', 'warning');
        return;
    }

    showLoading();
    try {
        await pb.collection('product_groups').create({
            code,
            name,
            quantity: 0,
            total_cost: 0,
            total_sales: 0,
            total_profit: 0,
            report_month: month,
            branch: getBranch()
        });
        hideLoading();
        showToast('เพิ่มกลุ่มสินค้าสำเร็จ', 'success');
        window.AuditService?.log('create_record', `Added product group: ${code} - ${name}`, 'bcauto-service');
        document.getElementById('addGroupModal').classList.remove('show');
        document.getElementById('newGroupCode').value = '';
        document.getElementById('newGroupName').value = '';
        loadTableData('product_groups');
    } catch (error) {
        hideLoading();
        showToast('เพิ่มไม่สำเร็จ: ' + error.message, 'error');
    }
};

// ==========================================
// FILTER / SEARCH
// ==========================================
window.applyFilters = function () {
    window.searchTerm = (document.getElementById('searchInput')?.value || '').trim();
    const month = document.getElementById('filterMonth')?.value || '';

    // If month is selected (YYYY-MM), set date range
    if (month) {
        const [year, mon] = month.split('-');
        window.filterDateFrom = `${year}-${mon}-01`;
        const lastDay = new Date(year, mon, 0).getDate();
        window.filterDateTo = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`;
    } else {
        window.filterDateFrom = '';
        window.filterDateTo = '';
    }

    window.currentPages[window.currentTable] = 1;
    window.loadTableData(window.currentTable);
};

window.clearFilters = function () {
    safeSetVal('searchInput', '');
    safeSetVal('filterMonth', '');
    window.searchTerm = '';
    window.filterDateFrom = '';
    window.filterDateTo = '';
    window.currentPages[window.currentTable] = 1;
    window.loadTableData(window.currentTable);
};

// ==========================================
// EDIT ROW
// ==========================================
window.editRow = async function (table, id) {
    showLoading();
    let data, error;
    try {
        data = await pb.collection(table).getOne(id);
    } catch (e) {
        error = e;
    }

    hideLoading();
    if (error || !data) {
        showToast('ไม่พบข้อมูล', 'error');
        return;
    }
    openEditModal(table, data);
};

window.openEditModal = async function (table, record) {
    const modal = document.getElementById('editModal');
    const container = document.getElementById('editFields');
    document.getElementById('editModalTitle').textContent = `✏️ แก้ไขข้อมูล`;

    const fields = getEditableFields(table);
    let fieldsHtml = fields
        .map(f => {
            let val = record[f.key] ?? '';

            // Format dates correctly for HTML5 input fields
            if (val) {
                if (f.type === 'datetime-local') {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                        const offset = d.getTimezoneOffset() * 60000;
                        val = (new Date(d - offset)).toISOString().slice(0, 16);
                    }
                } else if (f.type === 'date') {
                    val = String(val).substring(0, 10);
                }
            }

            if (f.type === 'select') {
                return `<div class="form-group"><label>${f.label}</label><select id="edit_${f.key}" class="input" ${f.readonly ? 'disabled' : ''}>${f.options.map(o => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
            }
            if (f.type === 'image') {
                const url = record[f.key] ? window.pb.files.getUrl(record, record[f.key]) : '';
                return `
                    <div class="form-group">
                        <label>${f.label}</label>
                        <div id="image_preview_container" style="margin-bottom: var(--space-2);">
                            ${url ? `<img src="${url}" style="max-width: 100%; border-radius: var(--radius-md); cursor: pointer;" onclick="window.showImage('${url}')">` : '<p class="text-muted">ไม่มีรูปภาพ</p>'}
                        </div>
                        <input type="file" id="edit_${f.key}" class="input" accept="image/*" ${f.readonly ? 'disabled' : ''}>
                    </div>
                `;
            }
            if (f.type === 'autocomplete') {
                return `<div class="form-group" id="edit_${f.key}_container"></div>`;
            }
            return `<div class="form-group"><label>${f.label}</label><input type="${f.type || 'text'}" id="edit_${f.key}" class="input" value="${val}" ${f.readonly ? 'readonly' : ''} style="${f.readonly ? 'background: var(--surface-100); cursor: not-allowed;' : ''}"></div>`;
        })
        .join('');

    container.innerHTML = fieldsHtml;

    // Initialize Autocompletes
    fields.forEach(f => {
        if (f.type === 'autocomplete') {
            const fieldContainer = document.getElementById(`edit_${f.key}_container`);
            if (fieldContainer) {
                // Clear the label and input as createAutocomplete builds its own
                fieldContainer.innerHTML = `<label>${f.label}</label>`;
                const ac = window.UIService.createAutocomplete({
                    container: fieldContainer,
                    placeholder: `ค้นหา ${f.label}...`,
                    id: `edit_${f.key}`,
                    initialValue: record[f.key] ?? '',
                    fetchItems: f.fetchItems
                });
                // Attach to record for saving
                fieldContainer._ac = ac;
            }
        }
    });

    // Store current edit info
    modal.dataset.table = table;
    modal.dataset.id = record.id;
    modal.classList.add('show');
};

window.getEditableFields = function (table) {
    if (table === 'transactions')
        return [
            { key: 'job_id', label: 'ใบบันทึกบริการ', readonly: true },
            { key: 'open_date', label: 'วันเปิดงาน', type: 'datetime-local', readonly: true },
            { key: 'close_date', label: 'วันปิดงาน', type: 'datetime-local', readonly: true },
            { key: 'customer_name', label: 'ลูกค้า', readonly: true },
            { key: 'car_registration', label: 'ทะเบียนรถ', readonly: true },
            { key: 'total_revenue', label: 'ราคารวม', type: 'number' },
            { key: 'vat_amount', label: 'VAT', type: 'number' },
            { key: 'net_revenue', label: 'ราคาสุทธิ', type: 'number' },
            { key: 'total_cost', label: 'ราคาทุน', type: 'number' },
            { key: 'total_profit', label: 'กำไร', type: 'number' }
        ];
    if (table === 'service_items')
        return [
            { key: 'job_id', label: 'ใบบันทึกบริการ', readonly: true },
            { key: 'open_date', label: 'วันเปิดงาน', type: 'datetime-local', readonly: true },
            { key: 'customer_name', label: 'ลูกค้า', readonly: true },
            {
                key: 'item_code',
                label: 'รหัสสินค้า',
                type: 'autocomplete',
                fetchItems: async () => {
                    const res = await pb.collection('product_groups').getFullList({ fields: 'code,name' });
                    return res.map(i => ({ id: i.code, label: `${i.code} - ${i.name}` }));
                }
            },
            {
                key: 'item_name',
                label: 'ชื่อสินค้า',
                type: 'autocomplete',
                fetchItems: async (q) => {
                    const res = await pb.collection('service_items').getList(1, 20, {
                        filter: `item_name ~ "${q}"`,
                        fields: 'item_name'
                    });
                    const unique = [...new Set(res.items.map(i => i.item_name))];
                    return unique.map(name => ({ id: name, label: name }));
                }
            },
            { key: 'quantity', label: 'จำนวน', type: 'number' },
            { key: 'total_cost', label: 'ราคาทุนรวม', type: 'number' },
            { key: 'total_price', label: 'ราคาขายรวม', type: 'number' },
            { key: 'total_profit', label: 'กำไรรวม', type: 'number' }
        ];
    if (table === 'product_groups')
        return [
            { key: 'code', label: 'รหัส' },
            { key: 'name', label: 'ชื่อ' },
            { key: 'quantity', label: 'จำนวน', type: 'number' },
            { key: 'total_cost', label: 'ราคาทุน', type: 'number' },
            { key: 'total_sales', label: 'ราคาขาย', type: 'number' },
            { key: 'total_profit', label: 'กำไร', type: 'number' },
            { key: 'report_month', label: 'เดือน (YYYY-MM)' }
        ];
    if (table === 'expenses')
        return [
            { key: 'date', label: 'วันที่', type: 'date' },
            {
                key: 'category',
                label: 'หมวดหมู่',
                type: 'autocomplete',
                fetchItems: async () => {
                    return window.EXPENSE_CATEGORIES.map(c => ({ id: c, label: c }));
                }
            },
            { key: 'amount', label: 'จำนวนเงิน', type: 'number' },
            { key: 'notes', label: 'หมายเหตุ' },
            { key: 'receipt_url', label: 'หลักฐาน', type: 'image' }
        ];
    if (table === 'revenue_verification')
        return [
            { key: 'date', label: 'วันที่', type: 'date' },
            {
                key: 'category',
                label: 'หมวดหมู่',
                type: 'autocomplete',
                fetchItems: async () => {
                    // Fetch unique descriptions/categories from financial_ledger revenue
                    const res = await pb.collection('financial_ledger').getList(1, 100, {
                        filter: 'entry_type = "revenue"',
                        sort: '-created'
                    });
                    const unique = [...new Set(res.items.map(i => i.description || i.category))];
                    return unique.map(label => ({ id: label, label: label }));
                }
            },
            { key: 'amount', label: 'จำนวนเงิน', type: 'number' },
            { key: 'notes', label: 'หมายเหตุ' },
            { key: 'receipt_url', label: 'หลักฐาน', type: 'image' }
        ];
    return [];
};

window.saveEdit = async function () {
    const modal = document.getElementById('editModal');
    const table = modal.dataset.table;
    const id = modal.dataset.id;
    const fields = getEditableFields(table);

    const updates = {};
    for (const f of fields) {
        const el = document.getElementById(`edit_${f.key}`);
        if (!el) continue;

        if (f.type === 'image') {
            if (el.files && el.files[0]) {
                const compressed = await window.utils?.compressImage ? await window.utils.compressImage(el.files[0]) : el.files[0];
                updates[f.key] = compressed;
            }
        } else {
            let val = el.value ?? '';
            if (f.type === 'number') val = parseFloat(val) || 0;
            if (f.type === 'datetime-local' && val) val = new Date(val).toISOString();
            updates[f.key] = val || null;
        }
    }

    showLoading();
    let error;
    try {
        if (table === 'expenses') {
            await window.EntryService.updateExpense(id, updates);
        } else if (table === 'revenue_verification') {
            await window.EntryService.updateRevenue(id, updates);
        } else {
            await pb.collection(table).update(id, updates);
            window.AuditService?.log('update_record', `Updated ${table} record: ${id}`, 'database');
        }
    } catch (e) {
        error = e;
    }
    hideLoading();

    if (error) {
        showToast('บันทึกไม่สำเร็จ: ' + error.message, 'error');
    } else {
        showToast('บันทึกสำเร็จ', 'success');
        modal.classList.remove('show');
        loadTableData(table);
    }
};

// ==========================================
// ADD NEW ROW MANUALLY
// ==========================================
window.addNewRow = function (table) {
    const modal = document.getElementById('editModal');
    const container = document.getElementById('editFields');
    document.getElementById('editModalTitle').textContent = `➕ เพิ่มข้อมูลใหม่`;

    const fields = getEditableFields(table);
    container.innerHTML = fields
        .map(f => {
            if (f.type === 'select') {
                return `<div class="form-group"><label>${f.label}</label><select id="edit_${f.key}" class="form-control">${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select></div>`;
            }
            return `<div class="form-group"><label>${f.label}</label><input type="${f.type || 'text'}" id="edit_${f.key}" class="form-control" value=""></div>`;
        })
        .join('');

    modal.dataset.table = table;
    modal.dataset.id = '__new__';
    modal.classList.add('show');
};

window.handleEditSave = async function () {
    const modal = document.getElementById('editModal');
    const id = modal.dataset.id;
    if (id === '__new__') {
        await saveNewRow();
    } else {
        await saveEdit();
    }
};

window.saveNewRow = async function () {
    const modal = document.getElementById('editModal');
    const table = modal.dataset.table;
    const fields = getEditableFields(table);

    const record = {};
    fields.forEach(f => {
        let val = document.getElementById(`edit_${f.key}`)?.value ?? '';
        if (f.type === 'number') val = parseFloat(val) || 0;
        if (f.type === 'datetime-local' && val) val = new Date(val).toISOString();
        record[f.key] = val || null;
    });

    showLoading();
    let error;
    try {
        if (table === 'expenses') {
            await window.EntryService.createExpense(record);
        } else if (table === 'revenue_verification') {
            await window.EntryService.createRevenue(record);
        } else {
            const newRecord = await pb.collection(table).create(record);
            window.AuditService?.log('create_record', `Created ${table} record: ${newRecord.id}`, 'database');
        }
    } catch (e) {
        error = e;
    }
    hideLoading();

    if (error) {
        showToast('เพิ่มไม่สำเร็จ: ' + error.message, 'error');
    } else {
        showToast('เพิ่มข้อมูลสำเร็จ', 'success');
        modal.classList.remove('show');
        loadTableData(table);
    }
};

// Setup edit modal buttons
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('saveEditBtn')?.addEventListener('click', handleEditSave);
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
        document.getElementById('editModal').classList.remove('show');
    });
});

// ==========================================
// UTILITIES
// ==========================================
window.debounce = function (fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

// ==========================================
// FULL BACKUP / EXPORT ALL COLLECTIONS
// ==========================================
window.exportFullBackup = async function () {
    showLoading();
    try {
        const collections = ['transactions', 'service_items', 'product_groups', 'expenses', 'revenue_verification', 'owner_expenses'];
        const wb = XLSX.utils.book_new();

        for (const col of collections) {
            try {
                let data;
                if (col === 'transactions')
                    data = await window.TransactionService.getFullTransactions({ sort: '-created' });
                else if (col === 'service_items')
                    data = await window.TransactionService.getFullServiceItems({ sort: '-created' });
                else if (col === 'product_groups')
                    data = await window.TransactionService.getFullProductGroups({ sort: '-created' });
                else if (col === 'expenses')
                    data = await window.EntryService.getExpenses(1, 10000, { sort: '-created' }).then(r => r.items);
                else if (col === 'revenue_verification')
                    data = await window.EntryService.getRevenues(1, 10000, { sort: '-created' }).then(r => r.items);
                else data = await window.pb.collection(col).getFullList({ sort: '-created' }); // Fallback

                if (data && data.length > 0) {
                    const ws = XLSX.utils.json_to_sheet(data);
                    XLSX.utils.book_append_sheet(wb, ws, col);
                }
            } catch (e) {
                console.warn(`Skipping ${col}:`, e.message);
            }
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `bcauto_full_backup_${dateStr}.xlsx`);
        showToast(`สำรองข้อมูลสำเร็จ (${collections.length} คอลเลกชัน)`, 'success');
    } catch (err) {
        console.error(err);
        showToast('สำรองข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    }
    hideLoading();
};

// ==========================================
// DUPLICATE DETECTION
// ==========================================
window.runDuplicateCheck = async function () {
    showLoading();
    try {
        const { txDups, siDups } = await window.TransactionService.getDuplicates();

        // Build result modal
        let modal = document.getElementById('dupCheckModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dupCheckModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `<div class="modal-content" style="max-width:700px; max-height:80vh; overflow-y:auto;">
                <div class="d-flex justify-between align-center mb-2">
                    <h3>🔍 ตรวจสอบข้อมูลซ้ำ</h3>
                    <button class="btn btn-text" onclick="document.getElementById('dupCheckModal').classList.remove('show')">✕</button>
                </div>
                <div id="dupCheckContent"></div>
            </div>`;
            document.body.appendChild(modal);
        }

        const content = document.getElementById('dupCheckContent');
        content.innerHTML = `
            <div class="mb-2" style="padding:1rem; background:${txDups.length === 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; border-radius:8px;">
                <h4>📋 Transactions (job_id ซ้ำ)</h4>
                <p>${txDups.length === 0 ? '✅ ไม่พบข้อมูลซ้ำ' : `⚠️ พบ ${txDups.length} กลุ่มซ้ำ`}</p>
                ${txDups.length > 0
                ? `<div class="table-container"><table>
                    <thead><tr><th>Job ID</th><th>จำนวน</th><th>ลูกค้า</th><th>ดำเนินการ</th></tr></thead>
                    <tbody>${txDups
                    .map(
                        ([jobId, arr]) => `<tr>
                        <td>${jobId}</td><td>${arr.length}</td><td>${arr[0].customer_name || '-'}</td>
                        <td><button class="btn btn-sm btn-danger" onclick="deleteDuplicates('transactions', ${JSON.stringify(arr.slice(1).map(a => a.id)).replace(/"/g, '&quot;')})">ลบซ้ำ (เก็บ 1)</button></td>
                    </tr>`
                    )
                    .join('')}</tbody>
                </table></div>`
                : ''
            }
            </div>

            <div style="padding:1rem; background:${siDups.length === 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; border-radius:8px;">
                <h4>📦 Service Items (job_id + item_code + price ซ้ำ)</h4>
                <p>${siDups.length === 0 ? '✅ ไม่พบข้อมูลซ้ำ' : `⚠️ พบ ${siDups.length} กลุ่มซ้ำ`}</p>
                ${siDups.length > 0
                ? `<div class="table-container"><table>
                    <thead><tr><th>Job ID</th><th>Item</th><th>จำนวน</th><th>ดำเนินการ</th></tr></thead>
                    <tbody>${siDups
                    .slice(0, 50)
                    .map(([key, arr]) => {
                        const parts = key.split('|');
                        return `<tr>
                            <td>${parts[0]}</td><td>${arr[0].item_name || parts[1]}</td><td>${arr.length}</td>
                            <td><button class="btn btn-sm btn-danger" onclick="deleteDuplicates('service_items', ${JSON.stringify(arr.slice(1).map(a => a.id)).replace(/"/g, '&quot;')})">ลบซ้ำ (เก็บ 1)</button></td>
                        </tr>`;
                    })
                    .join('')}</tbody>
                </table></div>`
                : ''
            }
            </div>
        `;

        modal.classList.add('show');
    } catch (err) {
        console.error(err);
        showToast('ตรวจสอบซ้ำไม่สำเร็จ: ' + err.message, 'error');
    }
    hideLoading();
};

window.deleteDuplicates = async function (collection, ids) {
    if (!confirm(`ต้องการลบ ${ids.length} รายการซ้ำ?`)) return;
    showLoading();
    try {
        await window.TransactionService.deleteBatch(collection, ids);
        showToast(`ลบ ${ids.length} รายการซ้ำสำเร็จ`, 'success');
        // Re-run check
        window.runDuplicateCheck();
    } catch (err) {
        showToast('ลบไม่สำเร็จ: ' + err.message, 'error');
    }
    hideLoading();
};

// ==========================================
// DATA RETENTION / ARCHIVE OLD DATA
// ==========================================
window.archiveOldData = async function () {
    const years = parseInt(prompt('ต้องการเก็บข้อมูลกี่ปีล่าสุด? (ข้อมูลเก่ากว่านี้จะถูก export แล้วลบ)', '2'));
    if (isNaN(years) || years < 1) {
        showToast('กรุณาใส่จำนวนปีที่ถูกต้อง', 'warning');
        return;
    }

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years);
    const cutoff = cutoffDate.toISOString().slice(0, 10);

    if (!confirm(`⚠️ ข้อมูลก่อนวันที่ ${cutoff} จะถูก export เป็น Excel แล้วลบออก\n\nดำเนินการต่อ?`)) return;

    showLoading();
    try {
        const collections = [
            { name: 'transactions', dateField: 'open_date' },
            { name: 'service_items', dateField: 'open_date' },
            { name: 'expenses', dateField: 'date' },
            { name: 'revenue_verification', dateField: 'date' },
            { name: 'owner_expenses', dateField: 'date' }
        ];

        const { archived, totalCount } = await window.TransactionService.archiveData(cutoff, collections);

        if (totalCount === 0) {
            hideLoading();
            showToast(`ไม่พบข้อมูลเก่ากว่า ${years} ปี`, 'info');
            return;
        }

        // Export to workbook
        const wb = XLSX.utils.book_new();
        Object.entries(archived).forEach(([name, data]) => {
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, `${name}_archived`);
        });

        // Save backup first
        XLSX.writeFile(wb, `bcauto_archive_before_${cutoff}.xlsx`);

        if (!confirm(`📥 Backup ถูกดาวน์โหลดแล้ว (${totalCount} รายการ)\n\nยืนยันลบข้อมูลเก่าออกจากฐานข้อมูล?`)) {
            hideLoading();
            showToast('ยกเลิกการลบ — backup ถูกดาวน์โหลดแล้ว', 'info');
            return;
        }

        // Delete old records
        let deleted = 0;
        for (const [name, data] of Object.entries(archived)) {
            const ids = data.map(r => r.id);
            deleted += await window.TransactionService.deleteBatch(name, ids);
        }

        showToast(`Archive สำเร็จ: ลบ ${deleted} รายการเก่า`, 'success');
        loadTableData(currentTable);
    } catch (err) {
        console.error(err);
        showToast('Archive ไม่สำเร็จ: ' + err.message, 'error');
    }
    hideLoading();
};


// ==========================================
// RENDER REVENUE
// ==========================================
window.renderRevenue = function (data) {
    const tbody = document.getElementById('tbody-revenue');
    if (!tbody) return;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">ไม่มีข้อมูลรายรับ</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(r => {
        return `<tr>
            <td data-label="วันที่">${r.date ? r.date.substring(0, 10) : '-'}</td>
            <td data-label="หมวดหมู่">${r.category || '-'}</td>
            <td data-label="จำนวนเงิน" class="text-right">${window.formatCurrency ? window.formatCurrency(r.amount) : Number(r.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td data-label="หมายเหตุ">${r.notes || '-'}</td>
            <td data-label="จัดการ" style="position:relative;">
                ${window.UIService ? window.UIService.generateActionMenu('revenue_verification', r.id) : `<button class="edit-btn" onclick="editRow('revenue_verification','${r.id}')">✏️</button>`}
            </td>
        </tr>`;
    }).join('');
};
