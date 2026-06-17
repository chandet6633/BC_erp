function currentUserRole() {
    try {
        return (sessionStorage.getItem('bcauto_role') || JSON.parse(localStorage.getItem('bc_user') || '{}').role || '').toLowerCase();
    } catch (_) {
        return '';
    }
}

function canViewFinance() {
    return ['admin', 'owner', 'manager'].includes(currentUserRole());
}

function applyFinanceVisibility() {
    if (canViewFinance()) return;
    document.querySelectorAll('.finance-only, .kpi-card').forEach(el => el.remove());
}

/**
 * Financial Dashboard — BC Auto Xperience
 * ════════════════════════════════════════
 * Fetches ALL data upfront, then filters client-side.
 * No fragile date filters in API calls.
 */

const THAI_MONTHS = {1:'ม.ค.',2:'ก.พ.',3:'มี.ค.',4:'เม.ย.',5:'พ.ค.',6:'มิ.ย.',7:'ก.ค.',8:'ส.ค.',9:'ก.ย.',10:'ต.ค.',11:'พ.ย.',12:'ธ.ค.'};
const charts = {};
let timeframe = 'monthly';
let selectedDate = '', selectedWeek = '', selectedMonth, selectedYear, selectedQuarter = 1;
let selectedBranch = '';
let allJobs = [], allJobItems = [], allExpenses = [], allProducts = [], allBranches = [];

// ── Helpers ──
const fmt = v => '฿' + Number(v||0).toLocaleString('th-TH', {minimumFractionDigits: 0, maximumFractionDigits: 0});
const pct = (a,b) => b > 0 ? ((a/b)*100).toFixed(1) : '0.0';
const safeText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
const safeHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
const destroyChart = k => { if (charts[k]) { charts[k].destroy(); delete charts[k]; } };

// Get job date as YYYY-MM-DD string
function jobDate(j) {
    return (j.start_date || j.end_date || j.CreatedAtAt || '').slice(0, 10);
}
function jobMonth(j) {
    const d = jobDate(j);
    return d ? d.slice(0, 7) : ''; // YYYY-MM
}

// ── Init month/year selectors ──
function initSelectors() {
    const now = new Date();
    selectedDate = now.toISOString().slice(0, 10);
    
    // Weekly - ISO Week calculation
    const getISOWeekStr = (d) => {
        const date = new Date(d.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    };
    selectedWeek = getISOWeekStr(now);
    
    selectedMonth = now.getMonth() + 1;
    selectedYear = now.getFullYear();
    selectedQuarter = Math.floor(now.getMonth() / 3) + 1;

    // Timeframe selector
    const tfSel = document.getElementById('timeframeSelect');
    if (tfSel) {
        tfSel.addEventListener('change', () => {
            timeframe = tfSel.value;
            document.querySelectorAll('.tf-controls').forEach(el => el.style.display = 'none');
            const map = {
                'daily': 'controlsDaily', 'weekly': 'controlsWeekly',
                'monthly': 'controlsMonthly', 'quarterly': 'controlsQuarterly', 'yearly': 'controlsYearly'
            };
            const active = document.getElementById(map[timeframe]);
            if (active) {
                active.style.display = (timeframe === 'monthly' || timeframe === 'quarterly') ? 'flex' : 'block';
            }
            renderAll();
        });
    }

    // Daily
    const dInput = document.getElementById('dailyDate');
    if (dInput) { dInput.value = selectedDate; dInput.addEventListener('change', () => { selectedDate = dInput.value; renderAll(); }); }

    // Weekly
    const wInput = document.getElementById('weeklyWeek');
    if (wInput) { wInput.value = selectedWeek; wInput.addEventListener('change', () => { selectedWeek = wInput.value; renderAll(); }); }

    // Monthly
    const mSel = document.getElementById('monthSelect');
    const ySelM = document.getElementById('yearSelectMonthly');
    if (mSel && ySelM) {
        for (let m = 1; m <= 12; m++) {
            const opt = document.createElement('option'); opt.value = m; opt.textContent = THAI_MONTHS[m];
            if (m === selectedMonth) opt.selected = true;
            mSel.appendChild(opt);
        }
        for (let y = selectedYear - 2; y <= selectedYear + 1; y++) {
            const opt = document.createElement('option'); opt.value = y; opt.textContent = y + 543;
            if (y === selectedYear) opt.selected = true;
            ySelM.appendChild(opt);
        }
        mSel.addEventListener('change', () => { selectedMonth = +mSel.value; renderAll(); });
        ySelM.addEventListener('change', () => { selectedYear = +ySelM.value; fetchAndRender(); });
    }

    // Quarterly
    const qSel = document.getElementById('quarterSelect');
    const ySelQ = document.getElementById('yearSelectQuarterly');
    if (qSel && ySelQ) {
        qSel.value = selectedQuarter;
        for (let y = selectedYear - 2; y <= selectedYear + 1; y++) {
            const opt = document.createElement('option'); opt.value = y; opt.textContent = y + 543;
            if (y === selectedYear) opt.selected = true;
            ySelQ.appendChild(opt);
        }
        qSel.addEventListener('change', () => { selectedQuarter = +qSel.value; renderAll(); });
        ySelQ.addEventListener('change', () => { selectedYear = +ySelQ.value; fetchAndRender(); });
    }

    // Yearly
    const ySelY = document.getElementById('yearSelectYearly');
    if (ySelY) {
        for (let y = selectedYear - 2; y <= selectedYear + 1; y++) {
            const opt = document.createElement('option'); opt.value = y; opt.textContent = y + 543;
            if (y === selectedYear) opt.selected = true;
            ySelY.appendChild(opt);
        }
        ySelY.addEventListener('change', () => { selectedYear = +ySelY.value; fetchAndRender(); });
    }

    const branchSel = document.getElementById('branchSelect');
    if (branchSel) branchSel.addEventListener('change', () => { selectedBranch = branchSel.value; renderAll(); });

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => fetchAndRender());
}

// ── Data Fetching ──
async function fetchAndRender() {
    const loading = document.getElementById('loadingState');
    const errorEl = document.getElementById('errorState');
    const tabs = document.querySelectorAll('.tab-content');

    loading.style.display = 'block';
    errorEl.style.display = 'none';
    tabs.forEach(t => t.style.display = 'none');

    try {
        const yearStart = `${selectedYear}-01-01 00:00:00`;
        const yearEnd = `${selectedYear}-12-31 23:59:59`;
        
        const results = await Promise.allSettled([
            window.pb.collection('jobs').getFullList({ filter: `created >= '${yearStart}' && created <= '${yearEnd}'` }),
            window.pb.collection('job_items').getFullList({ filter: `created >= '${yearStart}' && created <= '${yearEnd}'` }),
            canViewFinance() ? window.pb.collection('financial_ledger').getFullList({ filter: `date >= '${yearStart}' && date <= '${yearEnd}'` }) : Promise.resolve([]),
            window.pb.collection('products').getFullList(),
            window.pb.collection('branches').getFullList()
        ]);

        allJobs = results[0].status === 'fulfilled' ? results[0].value : [];
        allJobItems = results[1].status === 'fulfilled' ? results[1].value : [];
        allExpenses = results[2].status === 'fulfilled' ? results[2].value : [];
        allProducts = results[3].status === 'fulfilled' ? results[3].value : [];
        allBranches = results[4].status === 'fulfilled' ? results[4].value : [];

        console.log(`[Dashboard] Jobs: ${allJobs.length}, Items: ${allJobItems.length}, Expenses: ${allExpenses.length}, Products: ${allProducts.length}, Branches: ${allBranches.length}`);

        // Populate branch selector
        populateBranchSelector();

        loading.style.display = 'none';

        // Show active tab
        const activeBtn = document.querySelector('.tab-btn.active');
        const activeTab = activeBtn?.dataset?.tab || 'overview';
        const activeEl = document.getElementById(activeTab);
        if (activeEl) activeEl.style.display = 'block';

        renderAll();
    } catch (err) {
        loading.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.innerHTML = `<span class="material-icons-outlined" style="font-size:36px;display:block;margin-bottom:8px;">error_outline</span>ไม่สามารถโหลดข้อมูลได้: ${err.message}`;
        console.error('[Dashboard] Fetch error:', err);
    }
}

// ── Populate branch dropdown ──
function populateBranchSelector() {
    const branchSel = document.getElementById('branchSelect');
    if (!branchSel) return;
    branchSel.innerHTML = '';

    // "All branches" option
    const allOpt = document.createElement('option');
    allOpt.value = ''; allOpt.textContent = 'ทุกสาขา';
    branchSel.appendChild(allOpt);

    // Dynamic branches from DB
    allBranches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.code || b.name;
        opt.textContent = b.name || b.code;
        branchSel.appendChild(opt);
    });

    // If no branches from DB, fall back to unique branch_ids from jobs
    if (allBranches.length === 0) {
        const uniq = [...new Set(allJobs.map(j => j.branch_id).filter(Boolean))];
        uniq.forEach(code => {
            const opt = document.createElement('option');
            opt.value = code; opt.textContent = code;
            branchSel.appendChild(opt);
        });
    }

    // Auto-lock for branch-scoped users (SA, mechanic)
    try {
        const user = JSON.parse(localStorage.getItem('bc_user') || '{}');
        const role = (user.role || '').toLowerCase();
        const userBranch = user.branch || '';
        if ((role === 'sa' || role === 'mechanic') && userBranch) {
            branchSel.value = userBranch;
            branchSel.disabled = true;
            selectedBranch = userBranch;
        }
    } catch(e) { /* ignore */ }

    // Restore previous selection
    if (selectedBranch) branchSel.value = selectedBranch;
}

// ── Filter helpers ──
function filterByBranch(items, branchField = 'branch_id') {
    if (!selectedBranch) return items;
    return items.filter(i => i[branchField] === selectedBranch);
}

const getISOWeekStr = (d) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

function filterByTimeframe(items, dateGetter) {
    return items.filter(i => {
        const dStr = dateGetter(i);
        if (!dStr) return false;
        
        if (timeframe === 'daily') {
            return dStr.slice(0, 10) === selectedDate;
        } else if (timeframe === 'weekly') {
            const itemWeek = getISOWeekStr(new Date(dStr));
            return itemWeek === selectedWeek;
        } else if (timeframe === 'monthly') {
            const expected = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
            return dStr.slice(0, 7) === expected;
        } else if (timeframe === 'quarterly') {
            const y = parseInt(dStr.slice(0, 4));
            const m = parseInt(dStr.slice(5, 7));
            const q = Math.floor((m - 1) / 3) + 1;
            return y === selectedYear && q === selectedQuarter;
        } else if (timeframe === 'yearly') {
            return parseInt(dStr.slice(0, 4)) === selectedYear;
        }
        return true;
    });
}

// ── Master Render ──
function renderAll() {
    applyFinanceVisibility();
    let periodStr = '';
    if (timeframe === 'daily') periodStr = new Date(selectedDate).toLocaleDateString('th-TH', {day:'numeric',month:'short',year:'numeric'});
    else if (timeframe === 'weekly') periodStr = `สัปดาห์ที่ ${selectedWeek.split('-W')[1]} ปี ${parseInt(selectedWeek.split('-W')[0]) + 543}`;
    else if (timeframe === 'monthly') periodStr = `${THAI_MONTHS[selectedMonth]} ${selectedYear + 543}`;
    else if (timeframe === 'quarterly') periodStr = `ไตรมาสที่ ${selectedQuarter} ${selectedYear + 543}`;
    else if (timeframe === 'yearly') periodStr = `ปี ${selectedYear + 543}`;

    const branchLabel = selectedBranch || 'ทุกสาขา';
    safeText('periodLabel', `${periodStr} • ${branchLabel}`);

    // Apply branch filter first
    const branchJobs = filterByBranch(allJobs);
    const branchExpenses = filterByBranch(allExpenses);

    // Apply timeframe filter
    const periodJobs = filterByTimeframe(branchJobs, j => j.start_date || j.end_date || j.CreatedAtAt);
    const periodExpenses = filterByTimeframe(branchExpenses, e => e.date || e.CreatedAtAt);

    const completedJobs = periodJobs.filter(j => j.status === 'completed' || j.status === 'invoiced');
    const opExpenses = periodExpenses.filter(e => e.entry_type === 'expense');
    const ownerExp = periodExpenses.filter(e => e.entry_type === 'owner_withdrawal');

    // Revenue from completed jobs
    const revenue = completedJobs.reduce((s, j) => s + Number(j.grand_total || 0), 0);

    // COGS from job items — coerce IDs to string for comparison
    const jobIds = new Set(completedJobs.map(j => String(j.id || j.Id)));
    const relevantItems = allJobItems.filter(i => jobIds.has(String(i.job_id)));
    // BUG 8 FIX: COGS must prioritize historical snapshot (i.cost) over current master catalog cost
    const productMap = {};
    allProducts.forEach(p => { productMap[p.name] = p; productMap[p.code] = p; productMap[String(p.id)] = p; });
    const cogs = relevantItems.reduce((s, i) => {
        let unitCost = Number(i.cost || 0);
        if (unitCost === 0) {
            const itemName = i.product_name || i.item_name || '';
            const prod = productMap[String(i.product_id)] || productMap[itemName];
            unitCost = prod ? Number(prod.cost || 0) : 0;
        }
        return s + unitCost * Number(i.qty || 1);
    }, 0);

    const gross = revenue - cogs;
    const totalExp = opExpenses.reduce((s, e) => s + Number(e.amount || 0), 0) + ownerExp.reduce((s, e) => s + Number(e.amount || 0), 0);
    const net = gross - totalExp;

    // KPIs
    safeText('kpiRevenue', fmt(revenue));
    safeText('kpiJobCount', `${completedJobs.length} ใบงาน`);
    safeText('kpiGrossProfit', fmt(gross));
    safeText('kpiGrossMargin', `${pct(gross, revenue)}% margin`);
    safeText('kpiExpense', fmt(totalExp));
    safeText('kpiExpRatio', `${pct(totalExp, revenue)}% ของรายรับ`);
    safeText('kpiNetProfit', fmt(net));
    safeText('kpiNetMargin', `${pct(net, revenue)}% net margin`);

    // Color net profit
    const netEl = document.getElementById('kpiNetProfit');
    if (netEl) netEl.style.color = net >= 0 ? '#16a34a' : '#dc2626';
    const netCard = netEl?.closest('.kpi-card');
    if (netCard) { netCard.classList.remove('kpi-green', 'kpi-red'); netCard.classList.add(net >= 0 ? 'kpi-green' : 'kpi-red'); }

    renderRevenueTrend(completedJobs);
    renderExpenseDonut(opExpenses);
    renderPnl(revenue, cogs, gross, totalExp, net);
    renderBreakEven(revenue, gross, totalExp);
    renderBranchComparison(completedJobs, opExpenses);
    renderHistoricalTrend();
    renderInsights(completedJobs);
    renderProducts(relevantItems);
    renderRecentJobs(periodJobs);
}

// ── Charts ──
function renderRevenueTrend(jobs) {
    const dataPoints = {};
    
    jobs.forEach(j => {
        const dStr = j.start_date || j.end_date || j.CreatedAtAt;
        if (!dStr) return;
        const d = new Date(dStr);
        let label = '';
        
        if (timeframe === 'daily') {
            label = `${String(d.getHours()).padStart(2, '0')}:00`;
        } else if (timeframe === 'weekly') {
            const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
            label = days[d.getDay()];
        } else if (timeframe === 'monthly') {
            label = `${d.getDate()} ${THAI_MONTHS[d.getMonth() + 1]}`;
        } else if (timeframe === 'quarterly' || timeframe === 'yearly') {
            label = THAI_MONTHS[d.getMonth() + 1];
        }
        
        dataPoints[label] = (dataPoints[label] || 0) + Number(j.grand_total || 0);
    });

    // Ensure ordering for weekly and others if needed
    let sortedKeys = Object.keys(dataPoints);
    if (timeframe === 'weekly') {
        const dayOrder = {'จ.':1, 'อ.':2, 'พ.':3, 'พฤ.':4, 'ศ.':5, 'ส.':6, 'อา.':7};
        sortedKeys = sortedKeys.sort((a,b) => dayOrder[a] - dayOrder[b]);
    } else if (timeframe === 'quarterly' || timeframe === 'yearly') {
        const mOrder = {'ม.ค.':1,'ก.พ.':2,'มี.ค.':3,'เม.ย.':4,'พ.ค.':5,'มิ.ย.':6,'ก.ค.':7,'ส.ค.':8,'ก.ย.':9,'ต.ค.':10,'พ.ย.':11,'ธ.ค.':12};
        sortedKeys = sortedKeys.sort((a,b) => mOrder[a] - mOrder[b]);
    } else {
        sortedKeys.sort(); // String sort is fine for HH:00 or DD Mon
    }

    destroyChart('revenue');
    const el = document.getElementById('revenueTrendChart'); if (!el) return;
    charts.revenue = new Chart(el, {
        type: 'line',
        data: { labels: sortedKeys, datasets: [{
            label: 'รายรับ', data: sortedKeys.map(k => dataPoints[k]),
            borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)',
            fill: true, tension: 0.4, pointRadius: 3
        }]},
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '฿' + v.toLocaleString() } } }
        }
    });
}

function renderExpenseDonut(expenses) {
    destroyChart('expense');
    const el = document.getElementById('expenseDonutChart'); 
    if (!el) return;

    if (!expenses || expenses.length === 0) {
        charts.expense = new Chart(el, {
            type: 'doughnut',
            data: { labels: ['ไม่มีค่าใช้จ่าย'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { tooltip: { enabled: false }, legend: { display: false } } }
        });
        return;
    }

    const cats = {};
    expenses.forEach(e => { const c = e.category || 'อื่นๆ'; cats[c] = (cats[c] || 0) + Number(e.amount || 0); });
    const colors = ['#3b82f6','#f59e0b','#10b981','#8b5cf6','#ef4444','#ec4899','#06b6d4','#84cc16'];
    charts.expense = new Chart(el, {
        type: 'doughnut',
        data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: colors.slice(0, Object.keys(cats).length), borderWidth: 2, borderColor: '#fff' }] },
        options: { 
            responsive: true, maintainAspectRatio: false, cutout: '55%', 
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const catName = Object.keys(cats)[idx];
                    const matched = expenses.filter(exp => (exp.category || 'อื่นๆ') === catName);
                    
                    const headers = ['วันที่', 'รายการ', 'สาขา', 'ยอดเงิน'];
                    const rows = matched.map(exp => {
                        const d = (exp.date || exp.CreatedAtAt) ? new Date(exp.date || exp.CreatedAtAt).toLocaleDateString('th-TH') : '-';
                        return `<tr>
                            <td>${d}</td>
                            <td>${window.escHtml(exp.description || exp.notes || '-')}</td>
                            <td>${window.escHtml(exp.branch_id || '-')}</td>
                            <td style="text-align:right; font-weight:600; color:#ef4444;">${fmt(exp.amount)}</td>
                        </tr>`;
                    }).join('');
                    
                    openDetailModal(`รายการค่าใช้จ่าย: ${catName}`, headers, rows);
                }
            }
        }
    });
}

function renderPnl(revenue, cogs, gross, totalExp, net) {
    const maxVal = Math.max(revenue, cogs, gross, totalExp, Math.abs(net), 1);
    const rows = [
        { label: '<span class="material-icons-outlined">payments</span> รายได้', val: revenue, color: '#3b82f6', cls: '' },
        { label: '<span class="material-icons-outlined">shopping_cart</span> ต้นทุน (COGS)', val: cogs, color: '#f59e0b', cls: '' },
        { label: '<span class="material-icons-outlined">trending_up</span> กำไรขั้นต้น', val: gross, color: '#10b981', cls: '' },
        { label: '<span class="material-icons-outlined">receipt</span> ค่าใช้จ่ายรวม', val: totalExp, color: '#ef4444', cls: '' },
        { label: '<span class="material-icons-outlined">savings</span> กำไรสุทธิ', val: net, color: net >= 0 ? '#10b981' : '#ef4444', cls: net >= 0 ? '' : 'negative' }
    ];
    safeHTML('pnlBreakdown', rows.map(r => `
        <div class="pnl-row">
            <div class="pnl-label">${r.label}</div>
            <div class="pnl-bar"><div class="pnl-bar-fill" style="width:${Math.abs(r.val)/maxVal*100}%;background:${r.color}"></div></div>
            <div class="pnl-val ${r.cls}">${fmt(r.val)}</div>
        </div>
    `).join('') + `<div style="margin-top:8px;font-size:0.78rem;color:#64748b;">Gross: ${pct(gross,revenue)}% &nbsp; Net: ${pct(net,revenue)}%</div>`);
}

function renderBreakEven(revenue, gross, totalExp) {
    const marginPct = revenue > 0 ? gross / revenue : 0;
    const bep = marginPct > 0 ? totalExp / marginPct : 0;
    const bepJobs = revenue > 0 && allJobs.length > 0 ? Math.ceil(bep / (revenue / Math.max(allJobs.length, 1))) : 0;
    const prog = bep > 0 ? Math.min((revenue / bep) * 100, 200) : 0;
    const above = revenue >= bep && bep > 0;
    safeHTML('breakEvenContent', `
    <div class="bep-card">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px;text-align:center">
            <div><div style="font-size:0.72rem;color:#475569">BEP Revenue</div><div style="font-size:1.1rem;font-weight:800">${fmt(bep)}</div></div>
            <div><div style="font-size:0.72rem;color:#475569">BEP Jobs</div><div style="font-size:1.1rem;font-weight:800">${bepJobs}</div></div>
            <div><div style="font-size:0.72rem;color:#475569">Gross Margin</div><div style="font-size:1.1rem;font-weight:800">${pct(gross,revenue)}%</div></div>
        </div>
        <div class="bep-bar"><div class="bep-bar-fill" style="width:${Math.min(prog,100)}%;background:${above?'linear-gradient(90deg,#22c55e,#16a34a)':'linear-gradient(90deg,#f59e0b,#d97706)'}"></div></div>
        <div style="text-align:center;font-size:0.82rem;margin-top:6px">${fmt(revenue)} / ${fmt(bep)} (${prog.toFixed(1)}%)</div>
        <div style="text-align:center;margin-top:8px;font-size:0.82rem;padding:8px;border-radius:8px;background:${above?'rgba(34,197,94,0.1)':'rgba(245,158,11,0.1)'}">
            ${above ? `✅ เกิน BEP แล้ว <strong style="color:#16a34a">${fmt(revenue-bep)}</strong>` : `⏳ ต้องการอีก <strong style="color:#d97706">${fmt(bep-revenue)}</strong>`}
        </div>
    </div>`);
}

function renderBranchComparison(jobs, expenses) {
    const branches = {};
    jobs.forEach(j => {
        const b = j.branch_id || 'ไม่ระบุ';
        if (!branches[b]) branches[b] = { rev: 0, jobs: 0, exp: 0 };
        branches[b].rev += Number(j.grand_total || 0);
        branches[b].jobs++;
    });
    expenses.forEach(e => {
        const b = e.branch_id || 'ไม่ระบุ';
        if (!branches[b]) branches[b] = { rev: 0, jobs: 0, exp: 0 };
        branches[b].exp += Number(e.amount || 0);
    });
    const labels = Object.keys(branches);
    destroyChart('branch');
    const el = document.getElementById('branchChart'); if (!el) return;
    charts.branch = new Chart(el, {
        type: 'bar',
        data: { labels, datasets: [
            { label: 'รายรับ', data: labels.map(b => branches[b].rev), backgroundColor: 'rgba(59,130,246,0.7)' },
            { label: 'ค่าใช้จ่าย', data: labels.map(b => branches[b].exp), backgroundColor: 'rgba(239,68,68,0.5)' }
        ]},
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => fmt(v) } } } }
    });
    const totalRev = Object.values(branches).reduce((s, b) => s + b.rev, 0);
    safeHTML('branchTable', `<table class="recent-table" style="margin-top:12px"><thead><tr><th>สาขา</th><th style="text-align:right">รายรับ</th><th style="text-align:right">งาน</th><th style="text-align:right">สัดส่วน</th></tr></thead><tbody>${labels.map(b => `<tr><td>${b}</td><td style="text-align:right">${fmt(branches[b].rev)}</td><td style="text-align:right">${branches[b].jobs}</td><td style="text-align:right">${pct(branches[b].rev,totalRev)}%</td></tr>`).join('')}</tbody></table>`);
}

function renderHistoricalTrend() {
    const periods = [];
    const bJobs = filterByBranch(allJobs);
    const bExp = filterByBranch(allExpenses);
    
    // Determine the historical buckets based on current timeframe
    if (timeframe === 'daily') {
        // Last 7 days
        const end = new Date(selectedDate);
        for (let i = 6; i >= 0; i--) {
            const d = new Date(end); d.setDate(end.getDate() - i);
            periods.push({
                key: d.toISOString().slice(0, 10),
                label: `${d.getDate()} ${THAI_MONTHS[d.getMonth()+1]}`,
                matchJob: j => jobDate(j) === d.toISOString().slice(0, 10),
                matchExp: e => (e.date || e.CreatedAtAt || '').slice(0, 10) === d.toISOString().slice(0, 10)
            });
        }
    } else if (timeframe === 'weekly') {
        // Last 6 weeks
        const [yStr, wStr] = selectedWeek.split('-W');
        let y = parseInt(yStr), w = parseInt(wStr);
        for (let i = 5; i >= 0; i--) {
            let cw = w - i, cy = y;
            while(cw <= 0) { cy--; cw += 52; } // approximate rollover
            const kw = `${cy}-W${String(cw).padStart(2,'0')}`;
            periods.push({
                key: kw, label: `W${cw} ${(cy+543).toString().slice(-2)}`,
                matchJob: j => { const d = jobDate(j); return d ? getISOWeekStr(new Date(d)) === kw : false; },
                matchExp: e => { const d = (e.date || e.CreatedAtAt || '').slice(0, 10); return d ? getISOWeekStr(new Date(d)) === kw : false; }
            });
        }
    } else if (timeframe === 'monthly') {
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(selectedYear, selectedMonth - 1 - i, 1);
            const mKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            periods.push({
                key: mKey, label: `${THAI_MONTHS[d.getMonth()+1]} ${(d.getFullYear()+543).toString().slice(-2)}`,
                matchJob: j => jobMonth(j) === mKey,
                matchExp: e => (e.date || e.CreatedAtAt || '').slice(0, 7) === mKey
            });
        }
    } else if (timeframe === 'quarterly') {
        // Last 4 quarters
        for (let i = 3; i >= 0; i--) {
            let cq = selectedQuarter - i, cy = selectedYear;
            while(cq <= 0) { cy--; cq += 4; }
            periods.push({
                key: `${cy}-Q${cq}`, label: `Q${cq} ${(cy+543).toString().slice(-2)}`,
                matchJob: j => { const dStr = jobDate(j); if(!dStr) return false; const d=new Date(dStr); return d.getFullYear()===cy && Math.floor(d.getMonth()/3)+1===cq; },
                matchExp: e => { const dStr = (e.date || e.CreatedAtAt || '').slice(0, 10); if(!dStr) return false; const d=new Date(dStr); return d.getFullYear()===cy && Math.floor(d.getMonth()/3)+1===cq; }
            });
        }
    } else if (timeframe === 'yearly') {
        // Last 3 years
        for (let i = 2; i >= 0; i--) {
            const cy = selectedYear - i;
            periods.push({
                key: `${cy}`, label: `ปี ${cy+543}`,
                matchJob: j => jobDate(j).startsWith(`${cy}`),
                matchExp: e => (e.date || e.CreatedAtAt || '').startsWith(`${cy}`)
            });
        }
    }

    const revData = [], expData = [], marginData = [];
    for (const p of periods) {
        const mJobs = bJobs.filter(j => p.matchJob(j) && (j.status === 'completed' || j.status === 'invoiced'));
        const mExp = bExp.filter(e => p.matchExp(e) && e.entry_type === 'expense');
        const rev = mJobs.reduce((a, j) => a + Number(j.grand_total || 0), 0);
        const exp = mExp.reduce((a, e) => a + Number(e.amount || 0), 0);
        revData.push(rev); expData.push(exp);
        marginData.push(rev > 0 ? ((rev - exp) / rev * 100) : 0);
    }

    destroyChart('monthly');
    const el = document.getElementById('monthlyTrendChart'); if (!el) return;
    charts.monthly = new Chart(el, {
        type: 'bar',
        data: { labels: periods.map(p => p.label), datasets: [
            { label: 'รายรับ', data: revData, backgroundColor: 'rgba(59,130,246,0.7)' },
            { label: 'ค่าใช้จ่าย', data: expData, backgroundColor: 'rgba(239,68,68,0.4)' }
        ]},
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => fmt(v) } } } }
    });

    destroyChart('margin');
    const el2 = document.getElementById('monthlyMarginChart'); if (!el2) return;
    charts.margin = new Chart(el2, {
        type: 'line',
        data: { labels: periods.map(p => p.label), datasets: [{ label: 'Margin %', data: marginData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#10b981' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => v.toFixed(0) + '%' } } } }
    });
}

function renderInsights(jobs) {
    const avg = jobs.length > 0 ? jobs.reduce((s, j) => s + Number(j.grand_total || 0), 0) / jobs.length : 0;
    safeText('kpiAvgRevenue', fmt(avg));

    const hours = new Array(24).fill(0), days = new Array(7).fill(0);
    jobs.forEach(j => {
        const ds = j.start_date || j.CreatedAtAt;
        if (!ds) return;
        const d = new Date(ds);
        if (!isNaN(d)) { hours[d.getHours()]++; days[d.getDay()]++; }
    });

    destroyChart('peak_hour'); destroyChart('peak_day');
    const maxH = Math.max(...hours, 1), maxD = Math.max(...days, 1);
    const el1 = document.getElementById('peakHourChart');
    if (el1) charts.peak_hour = new Chart(el1, { type: 'bar', data: { labels: Array.from({length:24},(_,i)=>`${i}:00`), datasets: [{ data: hours, backgroundColor: hours.map(h => h===maxH?'#3b82f6':'rgba(59,130,246,0.25)'), borderRadius: 3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });

    const dayNames = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
    const el2 = document.getElementById('peakDayChart');
    if (el2) charts.peak_day = new Chart(el2, { type: 'bar', data: { labels: dayNames, datasets: [{ data: days, backgroundColor: days.map(d => d===maxD?'#f59e0b':'rgba(245,158,11,0.25)'), borderRadius: 3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });

    // Top customers
    const custMap = {};
    jobs.forEach(j => {
        const c = j.customer_name || 'ไม่ระบุ';
        if (!custMap[c]) custMap[c] = { count: 0, rev: 0 };
        custMap[c].count++; custMap[c].rev += Number(j.grand_total || 0);
    });
    const top5 = Object.entries(custMap).sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);

    destroyChart('topCust');
    const el3 = document.getElementById('topCustomerChart');
    if (el3) charts.topCust = new Chart(el3, {
        type: 'bar',
        data: { labels: top5.map(c => c[0]), datasets: [{ data: top5.map(c => c[1].rev), backgroundColor: ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b'], borderRadius: 6 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: v => fmt(v) } } } }
    });

    const tbody = document.querySelector('#topCustomerTable tbody');
    if (tbody) tbody.innerHTML = top5.map(([name, d]) => `<tr><td>${name}</td><td style="text-align:right">${d.count}</td><td style="text-align:right">${fmt(d.rev)}</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:#94a3b8">ไม่มีข้อมูล</td></tr>';
}

function renderProducts(items) {
    const productRevenue = {};
    let labor = 0, parts = 0;
    items.forEach(i => {
        const name = i.product_name || i.item_name || 'ไม่ระบุ';
        const total = Number(i.total || 0) || (Number(i.price || i.unit_price || 0) * Number(i.qty || 1));
        productRevenue[name] = (productRevenue[name] || 0) + total;
        const itemType = i.type || i.item_type || '';
        if (itemType === 'Service') labor += total; else parts += total;
    });

    const sorted = Object.entries(productRevenue).sort((a, b) => b[1] - a[1]).slice(0, 8);
    destroyChart('star');
    const el = document.getElementById('starProductChart');
    if (el) charts.star = new Chart(el, {
        type: 'bar',
        data: { labels: sorted.map(s => s[0]), datasets: [{ data: sorted.map(s => s[1]), backgroundColor: '#3b82f6', borderRadius: 4 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: v => fmt(v) } } } }
    });

    const tbody = document.querySelector('#starTable tbody');
    if (tbody) tbody.innerHTML = sorted.map(([name, val]) => `<tr><td>${name}</td><td style="text-align:right">${fmt(val)}</td><td style="text-align:right">${items.filter(i => (i.product_name || i.item_name) === name).reduce((s, i) => s + Number(i.qty || 1), 0)}</td></tr>`).join('');

    destroyChart('laborParts');
    const el2 = document.getElementById('laborPartsChart');
    if (el2)    charts.laborParts = new Chart(el2, {
        type: 'doughnut',
        data: { labels: ['ค่าแรง','อะไหล่'], datasets: [{ data: [labor, parts], backgroundColor: ['#3b82f6','#f59e0b'], borderWidth: 2, borderColor: '#fff' }] },
        options: { 
            responsive: true, maintainAspectRatio: false, cutout: '55%', 
            plugins: { legend: { position: 'bottom' } },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const typeLabel = idx === 0 ? 'ค่าแรง' : 'อะไหล่';
                    const matched = items.filter(i => {
                        const t = i.type || i.item_type || '';
                        return idx === 0 ? (t === 'Service') : (t !== 'Service');
                    });
                    
                    const headers = ['รหัสใบงาน', 'รายการ', 'สาขา', 'จำนวน', 'รวม'];
                    const rows = matched.map(item => {
                        const t = Number(item.total || 0) || (Number(item.price || item.unit_price || 0) * Number(item.qty || 1));
                        return `<tr>
                            <td>${item.job_id || '-'}</td>
                            <td>${item.product_name || item.item_name || '-'}</td>
                            <td>${item.branch_id || '-'}</td>
                            <td style="text-align:right;">${item.qty || 1}</td>
                            <td style="text-align:right; font-weight:600; color:#3b82f6;">${fmt(t)}</td>
                        </tr>`;
                    }).join('');
                    
                    openDetailModal(`สัดส่วนรายได้: ${typeLabel}`, headers, rows);
                }
            }
        }
    });
}

function renderRecentJobs(jobs) {
    const tbody = document.querySelector('#recentJobsTable tbody');
    if (!tbody) return;
    const statusMap = {
        open: '<span class="status-badge status-open">เปิด</span>',
        in_progress: '<span class="status-badge" style="background:#dbeafe;color:#1e40af">กำลังซ่อม</span>',
        completed: '<span class="status-badge status-completed">เสร็จ</span>',
        invoiced: '<span class="status-badge status-invoiced">ออกบิล</span>',
        cancelled: '<span class="status-badge" style="background:#fee2e2;color:#991b1b">ยกเลิก</span>'
    };
    const sorted = [...jobs].sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '')).slice(0, 10);
    tbody.innerHTML = sorted.map(j => {
        const d = j.start_date ? new Date(j.start_date).toLocaleDateString('th-TH', {day:'numeric',month:'short'}) : '-';
        return `<tr>
            <td style="font-weight:600">${j.job_no || '-'}</td>
            <td>${j.customer_name || '-'}</td>
            <td>${j.plate || j.plate_number || '-'}</td>
            <td style="text-align:right;font-weight:700">${fmt(j.grand_total)}</td>
            <td>${statusMap[j.status] || j.status || '-'}</td>
            <td style="font-size:0.75rem;color:#64748b">${d}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;color:#94a3b8">ไม่มีใบงาน</td></tr>';
}

// ── Modal UI Logic ──
function openDetailModal(title, headers, rowsHTML) {
    const modal = document.getElementById('chartDetailModal');
    if (!modal) return;
    
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalThead').innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    document.getElementById('modalTbody').innerHTML = rowsHTML || `<tr><td colspan="${headers.length}" style="text-align:center;">ไม่มีข้อมูล</td></tr>`;
    
    modal.classList.add('active');
}

document.getElementById('modalCloseBtn')?.addEventListener('click', () => {
    document.getElementById('chartDetailModal').classList.remove('active');
});
document.getElementById('chartDetailModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('chartDetailModal')) e.target.classList.remove('active');
});

// ── Boot ──
initSelectors();
fetchAndRender();
