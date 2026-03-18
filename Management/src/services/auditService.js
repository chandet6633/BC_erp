import { pb } from './pocketbase.js';
import { TransactionService } from './transaction.js';
import { EntryService } from './entry.js';

/**
 * AuditService handles complex data reconciliation and anomaly detection.
 * Move calculation-heavy logic out of the UI controller for better performance and testability.
 */
export const AuditService = {
    /**
     * Compare Transactions vs Service Items
     */
    runOrderAudit(transactions, serviceItems) {
        const itemsByJob = {};
        serviceItems.forEach(item => {
            if (!itemsByJob[item.job_id]) itemsByJob[item.job_id] = [];
            itemsByJob[item.job_id].push(item);
        });

        const discrepancies = [];
        transactions.forEach(tx => {
            const items = itemsByJob[tx.job_id] || [];
            const itemsRevenue = items.reduce((s, i) => s + Number(i.total_price || 0), 0);
            const itemsProfit = items.reduce((s, i) => s + Number(i.total_profit || 0), 0);
            const diffRevenue = Number(tx.total_revenue || 0) - itemsRevenue;
            const diffProfit = Number(tx.total_profit || 0) - itemsProfit;

            if (Math.abs(diffRevenue) > 0.5 || Math.abs(diffProfit) > 0.5) {
                discrepancies.push({
                    ...tx,
                    itemsRevenue,
                    itemsProfit,
                    diffRevenue,
                    diffProfit,
                    items
                });
            }
        });
        return discrepancies;
    },

    /**
     * Compare Product Groups vs Service Items vs Transactions for a specific month
     */
    runGroupAudit(productGroups, serviceItems, transactions, selectedMonth) {
        const pgForMonth = productGroups.filter(pg => pg.report_month === selectedMonth);
        const siForMonth = serviceItems.filter(i => (i.open_date || i.created || '').startsWith(selectedMonth));
        const txForMonth = transactions.filter(tx => (tx.open_date || tx.created || '').startsWith(selectedMonth));

        const pgTotalSales = pgForMonth.reduce((s, pg) => s + Number(pg.total_sales || 0), 0);
        const pgTotalProfit = pgForMonth.reduce((s, pg) => s + Number(pg.total_profit || 0), 0);
        const siTotalSales = siForMonth.reduce((s, i) => s + Number(i.total_price || 0), 0);
        const siTotalProfit = siForMonth.reduce((s, i) => s + Number(i.total_profit || 0), 0);
        const txTotalRevenue = txForMonth.reduce((s, tx) => s + Number(tx.total_revenue || 0), 0);
        const txTotalProfit = txForMonth.reduce((s, tx) => s + Number(tx.total_profit || 0), 0);

        return {
            pgForMonth,
            totals: {
                pg: { sales: pgTotalSales, profit: pgTotalProfit },
                si: { sales: siTotalSales, profit: siTotalProfit },
                tx: { sales: txTotalRevenue, profit: txTotalProfit }
            },
            matches: {
                pgSiSales: Math.abs(pgTotalSales - siTotalSales) < 0.5,
                pgTxSales: Math.abs(pgTotalSales - txTotalRevenue) < 0.5,
                siTxSales: Math.abs(siTotalSales - txTotalRevenue) < 0.5,
                pgSiProfit: Math.abs(pgTotalProfit - siTotalProfit) < 0.5,
                pgTxProfit: Math.abs(pgTotalProfit - txTotalProfit) < 0.5,
                siTxProfit: Math.abs(siTotalProfit - txTotalProfit) < 0.5
            }
        };
    },

    /**
     * Detect anomalies based on revenue distribution (2 standard deviations)
     */
    detectAnomalies(transactions) {
        if (transactions.length < 5) return [];

        const revenues = transactions.map(t => Number(t.total_revenue || 0));
        const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length;
        const variance = revenues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / revenues.length;
        const stdDev = Math.sqrt(variance);

        const threshold = 2;
        return transactions
            .filter(t => {
                const rev = Number(t.total_revenue || 0);
                return Math.abs(rev - mean) > threshold * stdDev;
            })
            .map(t => ({
                ...t,
                deviation: (Number(t.total_revenue || 0) - mean) / stdDev,
                mean,
                stdDev
            }))
            .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
    },

    /**
     * COGS Cross-Check: System SI/TX Cost vs Actual Purchase Expenses
     */
    runCostVerification(serviceItems, transactions, expenses) {
        const siCogs = serviceItems.reduce((s, i) => s + Number(i.total_cost || 0), 0);
        const txCogs = transactions.reduce((s, t) => s + Number(t.total_cost || 0), 0);
        const purchaseExpenses = expenses.filter(e => e.excluded);
        const actualPurchase = purchaseExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

        const monthlyData = {};
        const process = (items, field, type) => {
            items.forEach(item => {
                const month = (item.open_date || item.date || '').slice(0, 7);
                if (!month) return;
                if (!monthlyData[month]) monthlyData[month] = { siCogs: 0, txCogs: 0, purchase: 0, expenses: [] };
                if (type === 'si') monthlyData[month].siCogs += Number(item.total_cost || 0);
                if (type === 'tx') monthlyData[month].txCogs += Number(item.total_cost || 0);
                if (type === 'exp') {
                    monthlyData[month].purchase += Number(item.amount || 0);
                    monthlyData[month].expenses.push(item);
                }
            });
        };

        process(serviceItems, 'total_cost', 'si');
        process(transactions, 'total_cost', 'tx');
        process(purchaseExpenses, 'amount', 'exp');

        return {
            totals: { siCogs, txCogs, actualPurchase },
            monthlyData,
            diffSi: siCogs - actualPurchase,
            diffTx: txCogs - actualPurchase
        };
    },

    /**
     * Revenue Cross-Check between verification records and system transactions
     */
    async runRevenueVerification(dateFrom, dateTo, branchFilter) {
        let revFilter = [branchFilter];
        if (dateFrom) revFilter.push(`date >= '${dateFrom} 00:00:00'`);
        if (dateTo) revFilter.push(`date <= '${dateTo} 23:59:59'`);
        revFilter.push(`entry_type = 'revenue'`);

        let txFilter = [branchFilter];
        if (dateFrom) txFilter.push(`open_date >= '${dateFrom}T00:00:00'`);
        if (dateTo) txFilter.push(`open_date <= '${dateTo}T23:59:59'`);

        const [revRecords, txRecords] = await Promise.all([
            pb.collection('financial_ledger').getFullList({ filter: revFilter.join(' && '), sort: '-date' }),
            pb.collection('transactions').getFullList({ filter: txFilter.join(' && '), fields: 'open_date,total_revenue' })
        ]);

        const revByDate = {};
        revRecords.forEach(r => {
            const d = (r.date || '').slice(0, 10);
            if (!d) return;
            if (!revByDate[d]) revByDate[d] = { total: 0, notes: [] };
            revByDate[d].total += Number(r.amount || 0);
            if (r.notes) revByDate[d].notes.push(r.notes);
        });

        const txByDate = {};
        txRecords.forEach(tx => {
            const d = (tx.open_date || '').slice(0, 10);
            if (!d) return;
            if (!txByDate[d]) txByDate[d] = 0;
            txByDate[d] += Number(tx.total_revenue || 0);
        });

        const allDates = [...new Set([...Object.keys(revByDate), ...Object.keys(txByDate)])].sort().reverse();

        return {
            allDates,
            revByDate,
            txByDate,
            summary: {
                totalRevEntry: Object.values(revByDate).reduce((s, v) => s + v.total, 0),
                totalRevTx: Object.values(txByDate).reduce((s, v) => s + v, 0)
            }
        };
    },

    /**
     * Get security/audit logs from PocketBase
     */
    async getLogs(filter = '', page = 1, perPage = 50) {
        return await pb.collection('audit_logs').getList(page, perPage, {
            filter,
            sort: '-timestamp'
        });
    },

    /**
     * Create a security/audit log entry
     */
    async log(action, details, module = 'system') {
        try {
            const user = window.AuthService?.getUser();
            const branch = localStorage.getItem('bcauto_branch') || user?.branch || '';
            return await pb.collection('audit_logs').create({
                timestamp: new Date().toISOString(),
                user_id: user?.id || 'system',
                user_name: user?.name || 'System',
                role: user?.role || 'system',
                action,
                details,
                module,
                branch
            });
        } catch (err) {
            console.error('Failed to create audit log:', err);
        }
    },

    /**
     * Reconcile a single Job ID by re-summing all its items and updating the parent transaction.
     * This ensures consistency between itemized costs and the transaction header.
     */
    async reconcileJob(jobId, branch) {
        try {
            console.log(`Reconciling Job ${jobId} (Branch: ${branch})...`);

            // 1. Fetch the exact transaction (filtered by branch for isolation)
            const tx = await pb.collection('transactions').getFirstListItem(`job_id="${jobId}" && branch="${branch}"`);
            if (!tx) throw new Error(`Transaction ${jobId} not found in branch ${branch}`);

            // 2. Fetch ALL service items for this job
            const items = await pb.collection('service_items').getFullList({
                filter: `job_id="${jobId}" && branch="${branch}"`
            });

            // 3. Re-calculate totals from scratch
            const totalRevenue = items.reduce((s, i) => s + Number(i.total_price || 0), 0);
            const totalCost = items.reduce((s, i) => s + Number(i.total_cost || 0), 0);
            const totalProfit = totalRevenue - totalCost;

            // 4. Update the parent transaction
            // Note: We use totalRevenue from items to ensure they match, but if the business rule 
            // says the transaction's revenue is the master, we could keep tx.total_revenue.
            // Based on business rules, they MUST match, so we update both for perfect consistency.
            const updatedTx = await pb.collection('transactions').update(tx.id, {
                total_revenue: totalRevenue,
                total_cost: totalCost,
                total_profit: totalProfit
            });

            console.log(`Reconciliation Complete for ${jobId}: Rev=${totalRevenue}, Cost=${totalCost}, Profit=${totalProfit}`);
            this.log('reconcile_job', `Reconciled ${jobId}: New Profit ${totalProfit}`, 'AuditService');

            return updatedTx;
        } catch (err) {
            console.error(`Reconciliation failed for ${jobId}:`, err);
            throw err;
        }
    }
};

window['AuditService'] = AuditService;
// @ts-ignore
window['AuditService'].getLogs = AuditService.getLogs;
// @ts-ignore
window['AuditService'].log = AuditService.log;
