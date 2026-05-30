import { pb } from './pocketbase.js';
import { TransactionService } from './transaction.js';
import { EntryService } from './entry.js';

export const RevenueService = {
    /**
     * Generate date range for dashboard filtering
     */
    getDateRange(period, year, month, quarter) {
        let start, end;
        if (period === 'month') {
            start = new Date(year, month - 1, 1);
            end = new Date(year, month, 0, 23, 59, 59, 999);
        } else if (period === 'quarter') {
            const qStart = (quarter - 1) * 3;
            start = new Date(year, qStart, 1);
            end = new Date(year, qStart + 3, 0, 23, 59, 59, 999);
        } else {
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31, 23, 59, 59, 999);
        }

        const toLocalYMD = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            startDay: toLocalYMD(start),
            endDay: toLocalYMD(end)
        };
    },

    /**
     * Calculate core KPIs
     */
    calculateKPIs(transactions, expenses, ownerExpenses, manualRevenues = []) {
        const txRevenue = transactions.reduce((s, t) => s + Number(t.total_revenue || 0), 0);
        const verifiedRevenue = manualRevenues.filter(r => r.verified).reduce((s, r) => s + Number(r.amount || 0), 0);
        const totalRevenue = txRevenue + verifiedRevenue;

        const grossProfit = transactions.reduce((s, t) => s + Number(t.total_profit || 0), 0) + verifiedRevenue; // Assume 100% profit for manual entries for now
        const opex = expenses.filter(e => !e.excluded).reduce((s, e) => s + Number(e.amount || 0), 0);
        const ownerExp = ownerExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        const totalAllExpense = opex + ownerExp;
        const netProfit = grossProfit - totalAllExpense;

        return {
            totalRevenue,
            grossProfit,
            totalAllExpense,
            netProfit,
            grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
            netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
            expRatio: totalRevenue > 0 ? (totalAllExpense / totalRevenue) * 100 : 0,
            jobCount: transactions.length + manualRevenues.length
        };
    },

    /**
     * Get aggregate statistics for charts and insights
     */
    getInsights(transactions, manualRevenues = []) {
        const txRev = transactions.reduce((s, t) => s + Number(t.total_revenue || 0), 0);
        const verifiedRev = manualRevenues.filter(r => r.verified).reduce((s, r) => s + Number(r.amount || 0), 0);
        const totalRev = txRev + verifiedRev;
        const totalCount = transactions.length + manualRevenues.length;
        const avgRev = totalCount > 0 ? totalRev / totalCount : 0;

        const repairTimes = transactions
            .filter(t => t.open_date && t.close_date)
            .map(t => (new Date(t.close_date).getTime() - new Date(t.open_date).getTime()) / (1000 * 60 * 60))
            .filter(h => h >= 0 && h < 720);

        const avgRepair = repairTimes.length > 0 ? repairTimes.reduce((s, h) => s + h, 0) / repairTimes.length : 0;

        const hourCounts = new Array(24).fill(0);
        const dayCounts = new Array(7).fill(0);

        transactions.forEach(t => {
            if (t.open_date) {
                const date = new Date(t.open_date);
                hourCounts[date.getHours()]++;
                dayCounts[date.getDay()]++;
            }
        });

        manualRevenues.forEach(r => {
            if (r.date) {
                const date = new Date(r.date);
                hourCounts[date.getHours()]++;
                dayCounts[date.getDay()]++;
            }
        });

        return { avgRevenuePerJob: avgRev, avgRepairTime: avgRepair, hourCounts, dayCounts };
    },

    /**
     * Extract product-level profit/loss data
     */
    getProductStats(serviceItems, productGroups) {
        let groups;
        if (productGroups && productGroups.length > 0) {
            groups = productGroups.map(pg => ({
                name: pg.name,
                sales: Number(pg.total_sales || 0),
                profit: Number(pg.total_profit || 0),
                cost: Number(pg.total_cost || 0)
            }));
        } else {
            const itemMap = {};
            serviceItems.forEach(item => {
                const name = item.item_name || 'ไม่ระบุ';
                if (!itemMap[name]) itemMap[name] = { name, sales: 0, profit: 0, cost: 0 };
                itemMap[name].sales += Number(item.total_price || 0);
                itemMap[name].profit += Number(item.total_profit || 0);
                itemMap[name].cost += Number(item.total_cost || 0);
            });
            groups = Object.values(itemMap);
        }

        const stars = groups.filter(g => g.profit > 0).sort((a, b) => b.profit - a.profit).slice(0, 10);
        const losers = groups.filter(g => g.profit < 0).sort((a, b) => a.profit - b.profit).slice(0, 10);

        return { stars, losers, allGroups: groups };
    },

    /**
     * Get Year-Over-Year comparison data
     */
    async getYoYComparison(period, year, month, quarter, branchFilter) {
        const lyYear = year - 1;
        let lyStart, lyEnd;

        if (period === 'month') {
            lyStart = `${lyYear}-${String(month).padStart(2, '0')}-01`;
            lyEnd = new Date(lyYear, month, 0).toISOString().slice(0, 10);
        } else if (period === 'quarter') {
            const qStart = (quarter - 1) * 3;
            lyStart = `${lyYear}-${String(qStart + 1).padStart(2, '0')}-01`;
            lyEnd = new Date(lyYear, qStart + 3, 0).toISOString().slice(0, 10);
        } else {
            lyStart = `${lyYear}-01-01`;
            lyEnd = `${lyYear}-12-31`;
        }

        const [tx, exp, ownerExp, manualRev] = await Promise.all([
            TransactionService.getFullTransactions({
                filter: `open_date >= '${lyStart}T00:00:00' && open_date <= '${lyEnd}T23:59:59' && ${branchFilter}`,
                fields: 'total_revenue,total_profit'
            }),
            EntryService.getExpenses(1, 10000, {
                filter: `date >= '${lyStart} 00:00:00' && date <= '${lyEnd} 23:59:59' && ${branchFilter}`,
                fields: 'amount,excluded'
            }).then(r => r.items),
            EntryService.getOwnerExpenses(1, 10000, {
                filter: `date >= '${lyStart} 00:00:00' && date <= '${lyEnd} 23:59:59' && ${branchFilter}`,
                fields: 'amount'
            }).then(r => r.items),
            EntryService.getRevenues(1, 10000, {
                filter: `date >= '${lyStart}' && date <= '${lyEnd}' && ${branchFilter}`,
                fields: 'amount,verified'
            }).then(r => r.items)
        ]);

        const txRevenue = tx.reduce((s, t) => s + Number(t.total_revenue || 0), 0);
        const verifiedManualRev = manualRev.filter(r => r.verified).reduce((s, r) => s + Number(r.amount || 0), 0);
        const revenue = txRevenue + verifiedManualRev;

        const txProfit = tx.reduce((s, t) => s + Number(t.total_profit || 0), 0);
        const profit = txProfit + verifiedManualRev; // Assume 100% profit for manual entries
        const opex = exp.filter(e => !e.excluded).reduce((s, e) => s + Number(e.amount || 0), 0) + ownerExp.reduce((s, e) => s + Number(e.amount || 0), 0);

        return { year: lyYear, revenue, profit, opex, jobCount: tx.length };
    },

    /**
     * Get monthly trend data for last 6 months
     */
    async getMonthlyTrendData(branchFilter) {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, // Simplified label for service
                start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
                end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
            });
        }

        const rangeStart = months[0].start;
        const rangeEnd = months[months.length - 1].end;

        const [txAll, expAll, ownerExpAll, revAll] = await Promise.all([
            TransactionService.getFullTransactions({
                filter: `open_date >= '${rangeStart}T00:00:00' && open_date <= '${rangeEnd}T23:59:59' && ${branchFilter}`,
                fields: 'open_date,total_revenue,total_profit,total_cost'
            }),
            EntryService.getExpenses(1, 10000, {
                filter: `date >= '${rangeStart} 00:00:00' && date <= '${rangeEnd} 23:59:59' && ${branchFilter}`,
                fields: 'date,amount,excluded'
            }).then(r => r.items),
            EntryService.getOwnerExpenses(1, 10000, {
                filter: `date >= '${rangeStart} 00:00:00' && date <= '${rangeEnd} 23:59:59' && ${branchFilter}`,
                fields: 'date,amount'
            }).then(r => r.items),
            EntryService.getRevenues(1, 10000, {
                filter: `date >= '${rangeStart}' && date <= '${rangeEnd}' && ${branchFilter}`,
                fields: 'date,amount,verified'
            }).then(r => r.items)
        ]);

        return months.map(m => {
            const txMonth = txAll.filter(tx => (tx.open_date || '').slice(0, 7) === m.key);
            const expMonth = expAll.filter(e => (e.date || '').slice(0, 7) === m.key && !e.excluded);
            const ownerMonth = ownerExpAll.filter(e => (e.date || '').slice(0, 7) === m.key);
            const revMonth = revAll.filter(r => (r.date || '').slice(0, 7) === m.key && r.verified);

            const txRevenue = txMonth.reduce((s, t) => s + Number(t.total_revenue || 0), 0);
            const verifiedManualRev = revMonth.reduce((s, r) => s + Number(r.amount || 0), 0);
            const revenue = txRevenue + verifiedManualRev;

            const txGrossProfit = txMonth.reduce((s, t) => s + Number(t.total_profit || 0), 0);
            const grossProfit = txGrossProfit + verifiedManualRev;
            const opex = expMonth.reduce((s, e) => s + Number(e.amount || 0), 0) + ownerMonth.reduce((s, e) => s + Number(e.amount || 0), 0);

            return {
                key: m.key,
                revenue,
                grossProfit,
                opex,
                netProfit: grossProfit - opex,
                grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
                netMargin: revenue > 0 ? ((grossProfit - opex) / revenue) * 100 : 0
            };
        });
    },

    /**
     * Get product growth data vs previous period
     */
    async getProductGrowthData(period, year, month, quarter, branchFilter, currentServiceItems) {
        const curGroups = {};
        currentServiceItems.forEach(item => {
            const name = item.item_name || 'ไม่ระบุ';
            curGroups[name] = (curGroups[name] || 0) + Number(item.total_price || 0);
        });

        const prevMonth = period === 'month' ? month - 1 : month;
        let prevStart, prevEnd;

        if (period === 'month') {
            const pm = prevMonth <= 0 ? 12 : prevMonth;
            const py = prevMonth <= 0 ? year - 1 : year;
            prevStart = `${py}-${String(pm).padStart(2, '0')}-01`;
            prevEnd = new Date(py, pm, 0).toISOString().slice(0, 10);
        } else if (period === 'quarter') {
            const prevQ = quarter - 1;
            const py = prevQ <= 0 ? year - 1 : year;
            const pq = prevQ <= 0 ? 4 : prevQ;
            const qStart = (pq - 1) * 3;
            prevStart = `${py}-${String(qStart + 1).padStart(2, '0')}-01`;
            prevEnd = new Date(py, qStart + 3, 0).toISOString().slice(0, 10);
        } else {
            prevStart = `${year - 1}-01-01`;
            prevEnd = `${year - 1}-12-31`;
        }

        const prevSI = await TransactionService.getFullServiceItems({
            filter: `open_date >= '${prevStart}T00:00:00' && open_date <= '${prevEnd}T23:59:59' && ${branchFilter}`,
            fields: 'item_name,total_price'
        });

        const prevGroups = {};
        prevSI.forEach(item => {
            const name = item.item_name || 'ไม่ระบุ';
            prevGroups[name] = (prevGroups[name] || 0) + Number(item.total_price || 0);
        });

        const allNames = [...new Set([...Object.keys(curGroups), ...Object.keys(prevGroups)])];
        return allNames
            .map(name => {
                const cur = curGroups[name] || 0;
                const prev = prevGroups[name] || 0;
                const pct = prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;
                return { name, cur, prev, pct };
            })
            .filter(g => g.cur > 0 || g.prev > 0)
            .sort((a, b) => b.pct - a.pct);
    }
};

// @ts-ignore
window.RevenueService = RevenueService;
// @ts-ignore
window.RevenueService.getDateRange = RevenueService.getDateRange;
// @ts-ignore
window.RevenueService.getInsights = RevenueService.getInsights;
