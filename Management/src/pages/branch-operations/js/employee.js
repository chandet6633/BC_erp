// @ts-nocheck
// Imports removed for global variable usage

window.peakHourChart = null;
window.peakDayChart = null;
window.selectedMonth = window.getCurrentMonth();
window.selectedYear = window.getCurrentYear();

// Set dynamic title based on branch
const branchNames = {
    'suphanburi': 'สุพรรณบุรี',
    'samchuk': 'สามชุก',
    'BC Auto Service': 'สำนักงานใหญ่'
};
const branchForTitle = window.AuthService?.getBranch();
const branchDisplay = branchNames[branchForTitle] || branchForTitle || 'BC Auto';
document.title = `แดชบอร์ดพนักงาน | ${branchDisplay}`;

document.addEventListener('DOMContentLoaded', () => {
    Chart.defaults.color = window.getChartDefaults().color;
    Chart.defaults.borderColor = window.getChartDefaults().borderColor;
    Chart.defaults.font.family = window.getChartDefaults().font.family;

    window.setupSelectors();
    document.getElementById('refreshBtn').addEventListener('click', window.loadData);
    window.loadData();
});

window.setupSelectors = function () {
    const yearSel = document.getElementById('yearSelect');
    const monthSel = document.getElementById('monthSelect');

    for (let y = window.getCurrentYear() + 1; y >= window.getCurrentYear() - 3; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y + 543;
        if (y === window.selectedYear) opt.selected = true;
        yearSel.appendChild(opt);
    }

    for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = window.getMonthName(m);
        if (m === window.selectedMonth) opt.selected = true;
        monthSel.appendChild(opt);
    }

    yearSel.addEventListener('change', () => {
        window.selectedYear = parseInt(yearSel.value);
        window.loadData();
    });
    monthSel.addEventListener('change', () => {
        window.selectedMonth = parseInt(monthSel.value);
        window.loadData();
    });
};

window.loadData = async function () {
    window.showLoading();
    try {
        const { startDate, endDate, startDay, endDay } = window.RevenueService.getDateRange('month', window.selectedYear, window.selectedMonth);

        const [txRes, revRes] = await Promise.all([
            window.TransactionService.getFullTransactions({
                filter: `open_date >= '${startDate}' && open_date <= '${endDate}' && ${window.getBranchFilter()}`
            }),
            window.EntryService.getRevenues(1, 10000, {
                filter: `date >= '${startDay}' && date <= '${endDay}' && ${window.getBranchFilter()}`
            }).then(r => r.items)
        ]);

        const transactions = txRes || [];
        const manualRevenues = revRes || [];

        // Job count
        document.getElementById('empJobCount').textContent = transactions.length.toLocaleString();

        // Revenue
        const txRev = transactions.reduce((s, t) => s + Number(t.total_revenue || 0), 0);
        const verifiedRev = manualRevenues.filter(r => r.verified).reduce((s, r) => s + Number(r.amount || 0), 0);
        const totalRev = txRev + verifiedRev;
        document.getElementById('empRevenue').textContent = window.formatCurrency(totalRev);

        // Insights (Charts)
        const { avgRepairTime, hourCounts, dayCounts } = window.RevenueService.getInsights(transactions, manualRevenues);

        document.getElementById('empAvgRepair').textContent = avgRepairTime > 0 ? avgRepairTime.toFixed(1) : '-';

        if (window.peakHourChart) window.peakHourChart.destroy();
        window.peakHourChart = new Chart(document.getElementById('empPeakHourChart'), {
            type: 'bar',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                datasets: [
                    {
                        label: 'จำนวนงาน',
                        data: hourCounts,
                        backgroundColor: hourCounts.map(v => {
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

        // Peak Days
        if (window.peakDayChart) window.peakDayChart.destroy();
        window.peakDayChart = new Chart(document.getElementById('empPeakDayChart'), {
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

        // Top Services (Manual revenues)
        const itemMap = {};
        manualRevenues.forEach(item => {
            const name = item.description || 'ไม่ระบุ';
            if (!itemMap[name]) itemMap[name] = { name, qty: 0, sales: 0 };
            itemMap[name].qty += 1;
            itemMap[name].sales += Number(item.amount || 0);
        });
        const topItems = Object.values(itemMap)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 15);

        const tbody = document.querySelector('#topServicesTable tbody');
        tbody.innerHTML =
            topItems
                .map(
                    (item, i) => `
            <tr>
                <td data-label="อันดับ">${i + 1}</td>
                <td data-label="บริการ/สินค้า">${item.name}</td>
                <td class="text-right" data-label="จำนวนครั้ง">${item.qty.toLocaleString()}</td>
                <td class="text-right" data-label="ยอดขายรวม">${window.formatCurrency(item.sales)}</td>
            </tr>
        `
                )
                .join('') || '<tr><td colspan="4" class="text-center text-muted">ยังไม่มีข้อมูล</td></tr>';

        window.showToast('ข้อมูลอัปเดตแล้ว', 'success');
    } catch (err) {
        console.error(err);
        window.showToast('เกิดข้อผิดพลาด', 'error');
    }
    window.hideLoading();
};
