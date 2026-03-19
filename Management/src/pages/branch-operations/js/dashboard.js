// @ts-nocheck
// Imports removed for global variable usage

// Chart instances
window.revenueTrendChart = null;
window.expenseBreakdownChart = null;
window.profitByGroupChart = null;
window.peakHourChart = null;
window.peakDayChart = null;
window.starProductChart = null;
window.lossProductChart = null;
window.monthlyTrendChart = null;
window.monthlyMarginChart = null;
window.topCustomerChart = null;

// State
window.currentPeriod = 'month';
window.selectedYear = window.getCurrentYear();
window.selectedMonth = window.getCurrentMonth();
window.selectedQuarter = Math.ceil(window.getCurrentMonth() / 3);

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

// ==========================================
// INITIALIZATION
// ==========================================
// Set dynamic title based on branch
const branchNames = {
    'suphanburi': 'สุพรรณบุรี',
    'samchuk': 'สามชุก',
    'BC Auto Service': 'สำนักงานใหญ่'
};
const branchForTitle = window.AuthService?.getBranch();
const branchDisplay = branchNames[branchForTitle] || branchForTitle || 'BC Auto';
document.title = `แดชบอร์ดสรุป | ${branchDisplay}`;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireOwner()) return;

    Chart.defaults.color = getChartDefaults().color;
    Chart.defaults.borderColor = getChartDefaults().borderColor;
    Chart.defaults.font.family = getChartDefaults().font.family;

    setupTabs(document.querySelectorAll('.tab-btn'), document.querySelectorAll('.tab-content'));
    setupPeriodFilter();
    setupYearMonthSelectors();
    document.getElementById('refreshBtn').addEventListener('click', loadDashboard);
    loadDashboard();
});

// ==========================================
// PERIOD FILTER
// ==========================================
window.setupPeriodFilter = function () {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.currentPeriod = btn.dataset.period;

            const monthSel = document.getElementById('monthSelect');
            const quarterSel = document.getElementById('quarterSelect');
            monthSel.style.display = window.currentPeriod === 'month' ? '' : 'none';
            quarterSel.style.display = window.currentPeriod === 'quarter' ? '' : 'none';

            window.loadDashboard();
        });
    });
};

window.setupYearMonthSelectors = function () {
    const yearSel = document.getElementById('yearSelect');
    const monthSel = document.getElementById('monthSelect');
    const quarterSel = document.getElementById('quarterSelect');

    // Year options (current year ± 2)
    for (let y = window.getCurrentYear() + 1; y >= window.getCurrentYear() - 3; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y + 543; // Buddhist year
        if (y === window.selectedYear) opt.selected = true;
        yearSel.appendChild(opt);
    }

    // Month options
    for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = window.getMonthName(m);
        if (m === window.selectedMonth) opt.selected = true;
        monthSel.appendChild(opt);
    }

    // Quarter default
    quarterSel.value = window.selectedQuarter;

    yearSel.addEventListener('change', () => {
        window.selectedYear = parseInt(yearSel.value);
        window.loadDashboard();
    });
    monthSel.addEventListener('change', () => {
        window.selectedMonth = parseInt(monthSel.value);
        window.loadDashboard();
    });
    quarterSel.addEventListener('change', () => {
        window.selectedQuarter = parseInt(quarterSel.value);
        window.loadDashboard();
    });
};

window.getDateRange = function () {
    const { startDate, endDate, startDay, endDay } = window.RevenueService.getDateRange(window.currentPeriod, window.selectedYear, window.selectedMonth, window.selectedQuarter);
    return { startDate, endDate, startDay, endDay };
};

// ==========================================
// DATA LOADING
// ==========================================
window.loadDashboard = async function (forceRefresh = false) {
    window.showLoading();
    try {
        const { startDate, endDate, startDay, endDay } = window.getDateRange();
        const cacheKey = `bcauto_dash_${window.currentPeriod}_${window.selectedYear}_${window.selectedMonth}_${window.selectedQuarter}_${window.getBranch()}`;
        const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

        let transactions, expenses, ownerExpenses, productGroups, serviceItems, manualRevenues;

        // Try cache first
        if (!forceRefresh) {
            try {
                const cached = JSON.parse(localStorage.getItem(cacheKey));
                if (cached && Date.now() - cached.ts < CACHE_TTL) {
                    transactions = cached.tx;
                    expenses = cached.exp;
                    ownerExpenses = cached.ownerExp;
                    productGroups = cached.pg;
                    serviceItems = cached.si;
                    console.log('📦 Using cached dashboard data');
                }
            } catch (e) {
                /* ignore corrupt cache */
            }
        }

        // Fetch fresh if no cache
        if (!transactions) {
            const [txResult, expResult, ownerExpResult, pgResult, siResult, revResult] = await Promise.all([
                window.TransactionService.getFullTransactions({
                    filter: `open_date >= '${startDate}' && open_date <= '${endDate}' && ${window.getBranchFilter()}`,
                    sort: 'open_date'
                }),
                window.EntryService.getExpenses(1, 10000, {
                    filter: `date >= '${startDay} 00:00:00' && date <= '${endDay} 23:59:59' && ${window.getBranchFilter()}`
                }).then(r => r.items),
                window.EntryService.getOwnerExpenses(1, 10000, {
                    filter: `date >= '${startDay} 00:00:00' && date <= '${endDay} 23:59:59' && ${window.getBranchFilter()}`
                }).then(r => r.items),
                window.TransactionService.getFullProductGroups({
                    filter: `${window.getBranchFilter()}`
                }),
                window.TransactionService.getFullServiceItems({
                    filter: `open_date >= '${startDate}' && open_date <= '${endDate}' && ${window.getBranchFilter()}`
                }),
                window.EntryService.getRevenues(1, 10000, {
                    filter: `date >= '${startDay}' && date <= '${endDay}' && ${window.getBranchFilter()}`
                }).then(r => r.items)
            ]);

            transactions = txResult || [];
            expenses = expResult || [];
            ownerExpenses = ownerExpResult || [];
            productGroups = pgResult || [];
            serviceItems = siResult || [];
            manualRevenues = revResult || [];

            // Save to cache
            try {
                localStorage.setItem(
                    cacheKey,
                    JSON.stringify({
                        ts: Date.now(),
                        tx: transactions,
                        exp: expenses,
                        ownerExp: ownerExpenses,
                        pg: productGroups,
                        si: serviceItems,
                        manRev: manualRevenues
                    })
                );
            } catch (e) {
                /* storage full, ignore */
            }
        } else {
            const cached = JSON.parse(localStorage.getItem(cacheKey));
            manualRevenues = cached.manRev || [];
        }

        window.updateKPIs(transactions, expenses, ownerExpenses, serviceItems, manualRevenues);
        window.updatePNL(transactions, expenses, ownerExpenses, serviceItems, manualRevenues);
        window.updateRevenueTrend(transactions, manualRevenues);
        window.updateExpenseBreakdown(expenses);
        window.updateProfitByGroup(productGroups, serviceItems);
        window.updateInsights(transactions, manualRevenues);
        window.updateProducts(serviceItems, productGroups);
        window.updateMonthlyTrend();
        window.updateYoYComparison(transactions, expenses, ownerExpenses, manualRevenues);
        window.updateProductGrowth(serviceItems);

        window.showToast('ข้อมูลอัปเดตแล้ว', 'success');
    } catch (err) {
        console.error(err);
        window.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
    window.hideLoading();
};

// ==========================================
// KPIs
// ==========================================
window.updateKPIs = function (transactions, expenses, ownerExpenses, serviceItems, manualRevenues = []) {
    const kpis = window.RevenueService.calculateKPIs(transactions, expenses, ownerExpenses, manualRevenues);
    const { totalRevenue, grossProfit, totalAllExpense, netProfit, grossMargin, netMargin, expRatio, jobCount } = kpis;

    window.safeSetText('kpiRevenue', window.formatCurrency(totalRevenue));
    window.safeSetText('kpiGrossProfit', window.formatCurrency(grossProfit));
    window.safeSetText('kpiGrossMargin', `${grossMargin.toFixed(1)}% Margin`);
    window.safeSetText('kpiExpense', window.formatCurrency(totalAllExpense));

    const netVal = window.formatCurrency(netProfit);
    window.safeSetText('kpiNetProfit', netVal);
    window.safeSetClass('kpiNetProfit', `kpi-value ${netProfit >= 0 ? 'positive' : 'negative'}`);

    window.safeSetText('kpiNetMargin', `${netMargin.toFixed(1)}% Net Margin`);
    window.safeSetText('kpiNetRate', `${netMargin.toFixed(1)}%`);
    window.safeSetText('kpiJobCount', jobCount.toLocaleString());

    // Expense-to-Revenue Ratio
    const ratioVal = `${expRatio.toFixed(1)}%`;
    window.safeSetText('kpiExpRatio', ratioVal);

    const ratioEl = document.getElementById('kpiExpRatio');
    if (ratioEl) {
        if (expRatio < 50) {
            ratioEl.className = 'kpi-value positive';
            window.safeSetText('kpiExpRatioLabel', '✅ ดี');
        } else if (expRatio < 70) {
            ratioEl.className = 'kpi-value';
            ratioEl.style.color = '#f59e0b';
            window.safeSetText('kpiExpRatioLabel', '⚠️ ควรระวัง');
        } else {
            ratioEl.className = 'kpi-value negative';
            window.safeSetText('kpiExpRatioLabel', '🔴 สูงเกินไป');
        }
    }
};

// ==========================================
// CHARTS
// ==========================================
window.updateRevenueTrend = function (transactions, manualRevenues = []) {
    const dailyData = {};
    transactions.forEach(t => {
        const day = new Date(t.open_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        dailyData[day] = (dailyData[day] || 0) + Number(t.total_revenue || 0);
    });

    manualRevenues.filter(r => r.verified).forEach(r => {
        const day = new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        dailyData[day] = (dailyData[day] || 0) + Number(r.amount || 0);
    });

    const labels = Object.keys(dailyData);
    const data = Object.values(dailyData);

    if (window.revenueTrendChart) window.revenueTrendChart.destroy();
    const chartEl = document.getElementById('revenueTrendChart');
    if (!chartEl) return;
    revenueTrendChart = new Chart(chartEl, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'รายรับ (บาท)',
                    data,
                    borderColor: '#4f8cff',
                    backgroundColor: 'rgba(79,140,255,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#4f8cff'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => formatCurrency(v) } }
            }
        }
    });
};

window.updateExpenseBreakdown = function (expenses) {
    const catData = {};
    expenses
        .filter(e => !e.excluded)
        .forEach(e => {
            catData[e.category] = (catData[e.category] || 0) + Number(e.amount || 0);
        });

    const labels = Object.keys(catData);
    const data = Object.values(catData);
    const total = data.reduce((s, v) => s + v, 0);
    const colors = [
        '#4f8cff',
        '#22c55e',
        '#ef4444',
        '#f59e0b',
        '#a855f7',
        '#06b6d4',
        '#ec4899',
        '#84cc16',
        '#f97316',
        '#6366f1',
        '#14b8a6',
        '#e11d48',
        '#8b5cf6'
    ];

    // Store for drill-down
    window._expenseDrillData = expenses.filter(e => !e.excluded);

    if (window.expenseBreakdownChart) window.expenseBreakdownChart.destroy();
    window.expenseBreakdownChart = new Chart(document.getElementById('expenseBreakdownChart'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [
                {
                    data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.8)',
                    hoverBorderWidth: 3,
                    hoverOffset: 8
                }
            ]
        },
        options: {
            responsive: true,
            cutout: '55%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            const val = ctx.parsed;
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                            return ` ${ctx.label}: ${window.formatCurrency(val)} (${pct}%)`;
                        }
                    }
                }
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const category = labels[idx];
                    window.showExpenseDrillDown(category);
                }
            }
        },
        plugins: [
            {
                // Center text plugin — shows total
                id: 'centerText',
                afterDraw(chart) {
                    const {
                        ctx,
                        chartArea: { width, height, top, left }
                    } = chart;
                    ctx.save();
                    ctx.font = 'bold 14px system-ui';
                    ctx.fillStyle = '#64748b';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('รวม', left + width / 2, top + height / 2 - 10);
                    ctx.font = 'bold 16px system-ui';
                    ctx.fillStyle = '#1e293b';
                    ctx.fillText(window.formatCurrency(total), left + width / 2, top + height / 2 + 12);
                    ctx.restore();
                }
            }
        ]
    });
};

// Expense drill-down modal
window.showExpenseDrillDown = function (category) {
    const items = (window._expenseDrillData || []).filter(e => e.category === category);
    const total = items.reduce((s, e) => s + Number(e.amount || 0), 0);

    // Build or reuse modal
    let modal = document.getElementById('expenseDrillModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'expenseDrillModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:750px; max-height:80vh; overflow-y:auto;">
                <div class="d-flex justify-between align-center mb-2">
                    <h3 id="drillTitle"></h3>
                    <button class="btn btn-text" onclick="document.getElementById('expenseDrillModal').classList.remove('active')">✕</button>
                </div>
                <div id="drillSummary" class="mb-2" style="font-size:0.9rem;"></div>
                <div class="table-container"><table id="drillTable"><thead><tr>
                    <th>วันที่</th><th>หมวดหมู่</th><th class="text-right">จำนวนเงิน</th><th class="text-center">หลักฐาน</th><th>หมายเหตุ</th>
                </tr></thead><tbody></tbody></table></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('drillTitle').textContent = `📋 ${category}`;
    document.getElementById('drillSummary').innerHTML =
        `รวม <strong>${window.formatCurrency(total)}</strong> (${items.length} รายการ)`;

    const tbody = document.querySelector('#drillTable tbody');
    tbody.innerHTML =
        items
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .map(
                e => `
        <tr>
            <td data-label="วันที่">${window.formatDate(e.date)}</td>
            <td data-label="หมวดหมู่">${e.category || '-'}</td>
            <td class="text-right" data-label="จำนวนเงิน">${window.formatCurrency(Number(e.amount || 0))}</td>
            <td class="text-center" data-label="หลักฐาน">${e.receipt_url ? `<button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:0.75rem;" onclick="showImage('${e.receipt_url}')">📄 ดูรูป</button>` : '-'}</td>
            <td data-label="หมายเหตุ">${e.notes || '-'}</td>
        </tr>
    `
            )
            .join('') || '<tr><td colspan="5" class="text-center text-muted">ไม่มีข้อมูล</td></tr>';

    modal.classList.add('active');
};

window.updateProfitByGroup = function (productGroups, serviceItems) {
    // Aggregate from service items by product group
    const groupProfit = {};
    serviceItems.forEach(item => {
        const groupName = item.item_name || 'ไม่ระบุ';
        // Group by first part of item name or use product group
        groupProfit[groupName] = (groupProfit[groupName] || 0) + Number(item.total_profit || 0);
    });

    // If product groups have data, use them
    if (productGroups.length > 0) {
        const pgProfit = {};
        productGroups.forEach(pg => {
            pgProfit[pg.name] = (pgProfit[pg.name] || 0) + Number(pg.total_profit || 0);
        });
        if (Object.keys(pgProfit).length > 0) {
            Object.keys(groupProfit).forEach(k => delete groupProfit[k]);
            Object.assign(groupProfit, pgProfit);
        }
    }

    // Sort by profit desc and take top 10
    const sorted = Object.entries(groupProfit)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);

    if (window.profitByGroupChart) window.profitByGroupChart.destroy();
    window.profitByGroupChart = new Chart(document.getElementById('profitByGroupChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'กำไร (บาท)',
                    data,
                    backgroundColor: data.map(v => (v >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)')),
                    borderColor: data.map(v => (v >= 0 ? '#22c55e' : '#ef4444')),
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { callback: v => window.formatCurrency(v) } }
            }
        }
    });
};

window.updateInsights = function (transactions) {
    const { avgRevenuePerJob, avgRepairTime, hourCounts, dayCounts } = window.RevenueService.getInsights(transactions);

    document.getElementById('kpiAvgRevenue').textContent = window.formatCurrency(avgRevenuePerJob);
    document.getElementById('kpiAvgRepair').textContent = avgRepairTime > 0 ? avgRepairTime.toFixed(1) : '-';

    // Peak Hours Chart
    if (window.peakHourChart) window.peakHourChart.destroy();
    window.peakHourChart = new Chart(document.getElementById('peakHourChart'), {
        type: 'bar',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [
                {
                    label: 'จำนวนงาน',
                    data: hourCounts,
                    backgroundColor: hourCounts.map((v, i) => {
                        const max = Math.max(...hourCounts);
                        return v === max && v > 0 ? 'rgba(79,140,255,0.8)' : 'rgba(79,140,255,0.3)';
                    }),
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    // Peak Days Chart
    if (window.peakDayChart) window.peakDayChart.destroy();
    window.peakDayChart = new Chart(document.getElementById('peakDayChart'), {
        type: 'bar',
        data: {
            labels: [0, 1, 2, 3, 4, 5, 6].map(d => window.getDayName(d)),
            datasets: [
                {
                    label: 'จำนวนงาน',
                    data: dayCounts,
                    backgroundColor: dayCounts.map(v => {
                        const max = Math.max(...dayCounts);
                        return v === max && v > 0 ? 'rgba(168,85,247,0.8)' : 'rgba(168,85,247,0.3)';
                    }),
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
};

window.updateProducts = function (serviceItems, productGroups) {
    const { stars, losers } = window.RevenueService.getProductStats(serviceItems, productGroups);
    const starBody = document.querySelector('#starTable tbody');
    starBody.innerHTML =
        stars
            .map(
                s => `
        <tr>
            <td data-label="สินค้า">${s.name}</td>
            <td class="text-right" data-label="ยอดขาย">${window.formatCurrency(s.sales)}</td>
            <td class="text-right text-green" data-label="กำไร">${window.formatCurrency(s.profit)}</td>
            <td class="text-right" data-label="% กำไร">${s.sales > 0 ? ((s.profit / s.sales) * 100).toFixed(1) : 0}%</td>
        </tr>
    `
            )
            .join('') || '<tr><td colspan="4" class="text-center text-muted">ไม่มีข้อมูล</td></tr>';

    if (window.starProductChart) window.starProductChart.destroy();
    window.starProductChart = new Chart(document.getElementById('starProductChart'), {
        type: 'bar',
        data: {
            labels: stars.map(s => s.name),
            datasets: [
                {
                    label: 'กำไร (บาท)',
                    data: stars.map(s => s.profit),
                    backgroundColor: 'rgba(34,197,94,0.6)',
                    borderColor: '#22c55e',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { callback: v => formatCurrency(v) } } }
        }
    });

    // Losers (negative profit) already processed by getProductStats
    const lossBody = document.querySelector('#lossTable tbody');
    lossBody.innerHTML =
        losers
            .map(
                s => `
        <tr>
            <td data-label="สินค้า">${s.name}</td>
            <td class="text-right" data-label="ยอดขาย">${window.formatCurrency(s.sales)}</td>
            <td class="text-right text-red" data-label="กำไร">${window.formatCurrency(s.profit)}</td>
        </tr>
    `
            )
            .join('') || '<tr><td colspan="3" class="text-center text-muted">ไม่มีรายการขาดทุน 🎉</td></tr>';

    if (window.lossProductChart) window.lossProductChart.destroy();
    window.lossProductChart = new Chart(document.getElementById('lossProductChart'), {
        type: 'bar',
        data: {
            labels: losers.map(s => s.name),
            datasets: [
                {
                    label: 'ขาดทุน (บาท)',
                    data: losers.map(s => Math.abs(s.profit)),
                    backgroundColor: 'rgba(239,68,68,0.6)',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { callback: v => window.formatCurrency(v) } } }
        }
    });
};

// ==========================================
// P&L BREAKDOWN
// ==========================================
window.updatePNL = function (transactions, expenses, ownerExpenses, serviceItems, manualRevenues = []) {
    const { totalRevenue, grossProfit, netProfit, totalAllExpense, grossMargin, netMargin, expRatio, jobCount } = window.RevenueService.calculateKPIs(transactions, expenses, ownerExpenses, manualRevenues);
    // The following lines were part of the original manual calculation and are now redundant
    // as the values are provided by calculateKPIs.
    // const grossProfit = totalRevenue - cogs;
    // const opExpense = expenses.filter(e => !e.excluded).reduce((s, e) => s + Number(e.amount || 0), 0);
    // const ownerExp = ownerExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    // const totalOpEx = opExpense + ownerExp;
    // const netProfit = grossProfit - totalOpEx;

    // Re-calculating cogs and totalOpEx for display purposes, as they are not directly returned by calculateKPIs
    // but are needed for the P&L breakdown display.
    const cogs = transactions.reduce((s, t) => s + Number(t.total_cost || 0), 0);
    const opExpense = expenses.filter(e => !e.excluded).reduce((s, e) => s + Number(e.amount || 0), 0);
    const ownerExp = ownerExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalOpEx = opExpense + ownerExp;


    const maxVal = Math.max(totalRevenue, 1);
    const barPct = v => Math.max((Math.abs(v) / maxVal) * 100, 2).toFixed(1);
    const barColor = v => (v >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)');

    const rows = [
        { label: '💰 รายได้ (Revenue)', value: totalRevenue, color: 'rgba(59,130,246,0.7)' },
        { label: '📦 ต้นทุนสินค้า (COGS)', value: -cogs, color: 'rgba(239,68,68,0.5)' },
        { label: '📈 กำไรขั้นต้น (Gross Profit)', value: grossProfit, color: barColor(grossProfit) },
        { label: '🏢 ค่าใช้จ่ายดำเนินงาน (OpEx)', value: -totalOpEx, color: 'rgba(239,68,68,0.5)' },
        { label: '🎯 กำไรสุทธิ (Net Profit)', value: netProfit, color: barColor(netProfit) }
    ];

    const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';
    const netMarginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    const div = document.getElementById('pnlBreakdown');
    div.innerHTML =
        rows
            .map(
                r => `
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.6rem;">
            <div style="flex:0 0 220px; font-size:0.85rem; color:var(--text-secondary);">${r.label}</div>
            <div style="flex:1; background:var(--bg-primary); border-radius:4px; height:24px; position:relative; overflow:hidden;">
                <div style="width:${barPct(r.value)}%; height:100%; background:${r.color}; border-radius:4px; transition:width 0.5s;"></div>
            </div>
            <div style="flex:0 0 120px; text-align:right; font-weight:700; font-size:0.9rem; color:${r.value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">
                ${r.value < 0 ? '-' : ''}${window.formatCurrency(Math.abs(r.value))}
            </div>
        </div>
    `
            )
            .join('') +
        `
        <div style="display:flex; gap:1rem; margin-top:0.75rem; font-size:0.85rem; color:var(--text-muted);">
            <span>Gross Margin: <strong style="color:var(--text-primary);">${grossMarginPct}%</strong></span>
            <span>Net Margin: <strong style="color:${netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${netMarginPct}%</strong></span>
        </div>
    `;

    // ==========================================
    // BREAK-EVEN CALCULATION
    // ==========================================
    const beDiv = document.getElementById('breakEvenContent');
    const grossMarginRatio = totalRevenue > 0 ? grossProfit / totalRevenue : 0;
    const bepRevenue = grossMarginRatio > 0 ? totalOpEx / grossMarginRatio : 0;
    const avgRevenuePerJob = transactions.length > 0 ? totalRevenue / transactions.length : 0;
    const bepJobs = avgRevenuePerJob > 0 ? Math.ceil(bepRevenue / avgRevenuePerJob) : 0;
    const progressPct = bepRevenue > 0 ? Math.min((totalRevenue / bepRevenue) * 100, 100) : 0;
    const isAboveBEP = totalRevenue >= bepRevenue && bepRevenue > 0;

    if (grossMarginRatio <= 0) {
        beDiv.innerHTML = `
            <div style="padding:1.5rem; text-align:center; background:rgba(239,68,68,0.1); border-radius:8px;">
                <p style="font-size:1rem;">⚠️ ไม่สามารถคำนวณจุดคุ้มทุนได้</p>
                <p class="text-muted" style="font-size:0.85rem;">กำไรขั้นต้นเป็นลบ — ต้นทุนสินค้าสูงกว่ารายได้</p>
            </div>
        `;
        return;
    }

    beDiv.innerHTML = `
        <div class="kpi-grid" style="margin-bottom:1rem;">
            <div class="kpi-card" style="text-align:center;">
                <div class="kpi-label">💰 รายได้ที่ต้องทำ (BEP)</div>
                <div class="kpi-value" style="font-size:1.3rem;">${window.formatCurrency(bepRevenue)}</div>
                <div class="kpi-sub">Break-Even Revenue</div>
            </div>
            <div class="kpi-card" style="text-align:center;">
                <div class="kpi-label">🔧 จำนวนงานที่ต้องทำ</div>
                <div class="kpi-value" style="font-size:1.3rem;">${bepJobs.toLocaleString()}</div>
                <div class="kpi-sub">งาน (เฉลี่ย ${window.formatCurrency(avgRevenuePerJob)}/งาน)</div>
            </div>
            <div class="kpi-card" style="text-align:center;">
                <div class="kpi-label">📊 Gross Margin</div>
                <div class="kpi-value" style="font-size:1.3rem;">${grossMarginPct}%</div>
                <div class="kpi-sub">ใช้คำนวณจุดคุ้มทุน</div>
            </div>
        </div>

        <!-- Progress Bar -->
        <div style="margin-bottom:0.75rem;">
            <div class="d-flex justify-between" style="font-size:0.85rem; margin-bottom:0.3rem;">
                <span class="text-muted">ความคืบหน้าสู่จุดคุ้มทุน</span>
                <strong style="color:${isAboveBEP ? 'var(--accent-green)' : 'var(--accent-yellow)'};">${progressPct.toFixed(1)}%</strong>
            </div>
            <div style="background:var(--bg-primary); border-radius:8px; height:28px; overflow:hidden; position:relative;">
                <div style="width:${progressPct}%; height:100%; background:${isAboveBEP ? 'linear-gradient(90deg, rgba(34,197,94,0.6), rgba(34,197,94,0.9))' : 'linear-gradient(90deg, rgba(245,158,11,0.5), rgba(245,158,11,0.8))'}; border-radius:8px; transition:width 0.6s ease;">
                </div>
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:0.8rem; font-weight:600; color:var(--text-primary);">
                    ${formatCurrency(totalRevenue)} / ${formatCurrency(bepRevenue)}
                </div>
            </div>
        </div>

        <div style="font-size:0.85rem; padding:0.75rem; border-radius:8px; background:${isAboveBEP ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)'};">
            ${isAboveBEP
            ? `✅ <strong>เกินจุดคุ้มทุนแล้ว!</strong> รายได้เกิน BEP อยู่ <strong style="color:var(--accent-green);">${formatCurrency(totalRevenue - bepRevenue)}</strong>`
            : `⏳ <strong>ยังไม่ถึงจุดคุ้มทุน</strong> — ต้องการรายได้อีก <strong style="color:var(--accent-yellow);">${formatCurrency(bepRevenue - totalRevenue)}</strong> (${bepJobs - transactions.length > 0 ? bepJobs - transactions.length : 0} งาน)`
        }
        </div>

        <p class="text-muted mt-1" style="font-size:0.75rem;">
            สูตร: BEP Revenue = ค่าใช้จ่ายดำเนินงาน (${formatCurrency(totalOpEx)}) ÷ Gross Margin (${grossMarginPct}%)
        </p>
    `;
};

// ==========================================
// MONTHLY TREND (last 6 months)
// ==========================================
window.updateMonthlyTrend = async function () {
    try {
        const monthData = await window.RevenueService.getMonthlyTrendData(window.getBranchFilter());

        // Convert simplified service labels back to readable Thai months
        const formattedData = monthData.map(m => {
            const [y, mm] = m.key.split('-');
            return {
                ...m,
                label: window.getMonthName(parseInt(mm)) + ' ' + (parseInt(y) + 543).toString().slice(-2)
            };
        });

        // Trend chart
        if (window.monthlyTrendChart) window.monthlyTrendChart.destroy();
        window.monthlyTrendChart = new Chart(document.getElementById('monthlyTrendChart'), {
            type: 'bar',
            data: {
                labels: formattedData.map(m => m.label),
                datasets: [
                    {
                        label: 'รายได้',
                        data: formattedData.map(m => m.revenue),
                        backgroundColor: 'rgba(59,130,246,0.6)',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        label: 'กำไรขั้นต้น',
                        data: formattedData.map(m => m.grossProfit),
                        backgroundColor: 'rgba(34,197,94,0.6)',
                        borderColor: '#22c55e',
                        borderWidth: 1,
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        label: 'ค่าใช้จ่าย',
                        data: formattedData.map(m => m.opex),
                        backgroundColor: 'rgba(239,68,68,0.5)',
                        borderColor: '#ef4444',
                        borderWidth: 1,
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        label: 'กำไรสุทธิ',
                        type: 'line',
                        data: formattedData.map(m => m.netProfit),
                        borderColor: '#a855f7',
                        backgroundColor: 'rgba(168,85,247,0.1)',
                        borderWidth: 2,
                        pointRadius: 4,
                        fill: true,
                        tension: 0.3,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: { ticks: { callback: v => window.formatCurrency(v) } }
                }
            }
        });

        // Margin chart
        if (window.monthlyMarginChart) window.monthlyMarginChart.destroy();
        window.monthlyMarginChart = new Chart(document.getElementById('monthlyMarginChart'), {
            type: 'line',
            data: {
                labels: formattedData.map(m => m.label),
                datasets: [
                    {
                        label: 'Gross Margin %',
                        data: formattedData.map(m => m.grossMargin.toFixed(1)),
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34,197,94,0.1)',
                        borderWidth: 2,
                        pointRadius: 5,
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Net Margin %',
                        data: formattedData.map(m => m.netMargin.toFixed(1)),
                        borderColor: '#a855f7',
                        backgroundColor: 'rgba(168,85,247,0.1)',
                        borderWidth: 2,
                        pointRadius: 5,
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        ticks: { callback: v => v + '%' },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                }
            }
        });
    } catch (err) {
        console.error('Monthly trend error:', err);
    }
};

// ==========================================
// YEAR-OVER-YEAR COMPARISON
// ==========================================
window.updateYoYComparison = async function (currentTx, currentExp, currentOwnerExp, currentManualRev = []) {
    const div = document.getElementById('yoyContent');
    try {
        const { year: prevYear, revenue: lyRevenue, profit: lyProfit, opex: lyExpenseTotal, jobCount: lyJobs } =
            await window.RevenueService.getYoYComparison(window.currentPeriod, window.selectedYear, window.selectedMonth, window.selectedQuarter, window.getBranchFilter());

        const txRevenue = currentTx.reduce((s, t) => s + Number(t.total_revenue || 0), 0);
        const verifiedManualRev = currentManualRev.filter(r => r.verified).reduce((s, r) => s + Number(r.amount || 0), 0);
        const curRevenue = txRevenue + verifiedManualRev;

        const txProfit = currentTx.reduce((s, t) => s + Number(t.total_profit || 0), 0);
        const curProfit = txProfit + verifiedManualRev;

        const curExpense =
            currentExp.filter(e => !e.excluded).reduce((s, e) => s + Number(e.amount || 0), 0) +
            currentOwnerExp.reduce((s, e) => s + Number(e.amount || 0), 0);
        const curJobs = currentTx.length + currentManualRev.filter(r => r.verified).length;

        const pctChange = (cur, prev) =>
            prev > 0 ? (((cur - prev) / prev) * 100).toFixed(1) : cur > 0 ? '+100.0' : '0.0';
        const arrow = (cur, prev, inverse = false) => {
            const diff = cur - prev;
            const isGood = inverse ? diff < 0 : diff > 0;
            return diff === 0 ? '➡️' : isGood ? '📈' : '📉';
        };
        const changeColor = (cur, prev, inverse = false) => {
            const diff = cur - prev;
            const isGood = inverse ? diff < 0 : diff > 0;
            return diff === 0 ? 'var(--text-muted)' : isGood ? 'var(--accent-green)' : 'var(--accent-red)';
        };

        const items = [
            { label: '💰 รายได้', cur: curRevenue, prev: lyRevenue },
            { label: '📈 กำไร', cur: curProfit, prev: lyProfit },
            { label: '💸 ค่าใช้จ่าย', cur: curExpense, prev: lyExpenseTotal, inverse: true },
            { label: '🔧 จำนวนงาน', cur: curJobs, prev: lyJobs, isCount: true }
        ];

        if (lyRevenue === 0 && lyProfit === 0 && lyJobs === 0) {
            div.innerHTML = `<p class="text-muted" style="text-align:center;">ไม่มีข้อมูลปีก่อนสำหรับเปรียบเทียบ</p>`;
            return;
        }

        div.innerHTML = `
            <div class="kpi-grid">
                ${items
                .map(
                    i => `
                    <div class="kpi-card" style="text-align:center;">
                        <div class="kpi-label">${i.label}</div>
                        <div class="kpi-value" style="font-size:1.1rem;">${i.isCount ? i.cur.toLocaleString() : window.formatCurrency(i.cur)}</div>
                        <div style="font-size:0.8rem; color:${changeColor(i.cur, i.prev, i.inverse)}; font-weight:600;">
                            ${arrow(i.cur, i.prev, i.inverse)} ${pctChange(i.cur, i.prev)}%
                            <span style="font-weight:400; color:var(--text-muted);"> vs ปีก่อน (${i.isCount ? i.prev.toLocaleString() : window.formatCurrency(i.prev)})</span>
                        </div>
                    </div>
                `
                )
                .join('')}
            </div>
        `;
    } catch (err) {
        console.error('YoY comparison error:', err);
        div.innerHTML = `<p class="text-muted">ไม่สามารถโหลดข้อมูลเปรียบเทียบปีได้</p>`;
    }
};

// ==========================================
// TOP CUSTOMERS
// ==========================================
window.updateTopCustomers = function (transactions) {
    const customerMap = {};
    transactions.forEach(tx => {
        const name = (tx.customer_name || '').trim() || 'ไม่ระบุ';
        if (!customerMap[name]) customerMap[name] = { jobCount: 0, revenue: 0 };
        customerMap[name].jobCount++;
        customerMap[name].revenue += Number(tx.total_revenue || 0);
    });

    const sorted = Object.entries(customerMap)
        .map(([name, data]) => ({ name, ...data, avg: data.jobCount > 0 ? data.revenue / data.jobCount : 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    // Table
    const tbody = document.querySelector('#topCustomerTable tbody');
    if (tbody) {
        tbody.innerHTML =
            sorted
                .map(
                    c => `
            <tr>
                <td>${c.name}</td>
                <td class="text-center">${c.jobCount}</td>
                <td class="text-right">${window.formatCurrency(c.revenue)}</td>
                <td class="text-right">${window.formatCurrency(c.avg)}</td>
            </tr>
        `
                )
                .join('') || '<tr><td colspan="4" class="text-center text-muted">ไม่มีข้อมูล</td></tr>';
    }

    // Chart
    if (window.topCustomerChart) window.topCustomerChart.destroy();
    const chartEl = document.getElementById('topCustomerChart');
    if (chartEl) {
        window.topCustomerChart = new Chart(chartEl, {
            type: 'bar',
            data: {
                labels: sorted.map(c => (c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name)),
                datasets: [
                    {
                        label: 'รายได้ (บาท)',
                        data: sorted.map(c => c.revenue),
                        backgroundColor: 'rgba(59,130,246,0.6)',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { callback: v => window.formatCurrency(v) } } }
            }
        });
    }
};

// ==========================================
// PRODUCT GROWTH TRACKING
// ==========================================
window.updateProductGrowth = async function (currentServiceItems) {
    const div = document.getElementById('productGrowthContent');
    try {
        const growthData = await window.RevenueService.getProductGrowthData(window.currentPeriod, window.selectedYear, window.selectedMonth, window.selectedQuarter, window.getBranchFilter(), currentServiceItems);

        if (growthData.length === 0) {
            div.innerHTML = `<p class="text-muted text-center">ไม่มีข้อมูลเพียงพอสำหรับเปรียบเทียบ</p>`;
            return;
        }

        div.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr>
                        <th>กลุ่มสินค้า</th>
                        <th>งวดปัจจุบัน</th>
                        <th>งวดก่อนหน้า</th>
                        <th>การเปลี่ยนแปลง</th>
                    </tr></thead>
                    <tbody>
                        ${growthData
                .slice(0, 15)
                .map(g => {
                    const icon = g.pct > 5 ? '🟢 ↑' : g.pct < -5 ? '🔴 ↓' : '🟡 →';
                    const color =
                        g.pct > 5
                            ? 'var(--accent-green)'
                            : g.pct < -5
                                ? 'var(--accent-red)'
                                : 'var(--text-muted)';
                    return `<tr>
                                <td>${g.name}</td>
                                <td class="text-right">${window.formatCurrency(g.cur)}</td>
                                <td class="text-right">${window.formatCurrency(g.prev)}</td>
                                <td class="text-right" style="color:${color}; font-weight:600;">${icon} ${g.pct > 0 ? '+' : ''}${g.pct.toFixed(1)}%</td>
                            </tr>`;
                })
                .join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        console.error('Product growth error:', err);
        div.innerHTML = `<p class="text-muted">ไม่สามารถโหลดข้อมูลการเติบโตได้</p>`;
    }
};
