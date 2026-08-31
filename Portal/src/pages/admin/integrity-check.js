import { AuthService } from '../../services/authService.js';
import { getAuthToken } from '@shared/nocodb-adapter.js';

if (!AuthService.hasRole(['admin'])) {
    AuthService.requireRole(['admin']);
}

const runAllBtn = document.getElementById('runAllBtn');
const exportBtn = document.getElementById('exportBtn');
const repairBtn = document.getElementById('repairBtn');
const recalcBtn = document.getElementById('recalcBtn');
const notice = document.getElementById('notice');
const stockFindings = document.getElementById('stockFindings');
const docFindings = document.getElementById('docFindings');

let lastReport = null;

const STOCK_CATEGORIES = [
    ['negativeStock', 'Negative Stock', 'Product balance is below zero. Review stock ledgers and recent adjustments.'],
    ['orphanLedgers', 'Orphan Ledgers', 'Stock ledger references a missing document or unsafe reference.'],
    ['confirmedNoLedger', 'Confirmed Stock Docs Without Ledgers', 'Confirmed stock document has no stock ledger. Reconfirm or repair before relying on balance.'],
    ['invalidProductLedgers', 'Invalid Product Ledgers', 'Stock ledger points to a product that no longer exists.'],
    ['suspiciousCosts', 'Suspicious Cost Direction', 'Ledger value direction does not match quantity direction or has negative unit cost.'],
    ['duplicateProductCodes', 'Duplicate Product Codes', 'Multiple products share the same code. Merge or rename before production.']
];

const DOC_CATEGORIES = [
    ['duplicateDocNos', 'Duplicate Document Numbers', 'More than one document has the same document number.'],
    ['orphanItems', 'Orphan Document Items', 'Document item has no parent document.'],
    ['invalidProductItems', 'Invalid Product Items', 'Document item points to a product that no longer exists.'],
    ['confirmedNoLedger', 'Confirmed Stock Docs Without Ledgers', 'Confirmed stock document has no stock ledger.'],
    ['invalidBranchDocs', 'Documents Missing Branch', 'Document lacks branch_id and cannot be safely scoped.'],
    ['invalidStatusDocs', 'Invalid Document Status', 'Document status is outside the supported state machine.'],
    ['duplicateProductCodes', 'Duplicate Product Codes', 'Multiple products share the same product code.']
];

function authHeaders() {
    const token = getAuthToken()
        || localStorage.getItem('bcauto_jwt')
        || sessionStorage.getItem('bcauto_jwt')
        || '';
    if (token) return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    return {
        'Content-Type': 'application/json',
        'x-bcauto-dev-auth': localStorage.getItem('app.session.devAuth') === '1' ? '1' : '',
        'x-bcauto-dev-role': localStorage.getItem('app.session.role') || '',
        'x-bcauto-dev-user-id': localStorage.getItem('app.session.userId') || '',
        'x-bcauto-dev-user-name': encodeURIComponent(localStorage.getItem('app.session.userName') || ''),
        'x-bcauto-dev-branch': localStorage.getItem('app.session.branchId') || ''
    };
}

async function api(path, options = {}) {
    const res = await fetch(path, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

function setNotice(message, isError = false) {
    notice.textContent = message;
    notice.className = `notice active${isError ? ' error' : ''}`;
}

function totalFor(data, categories) {
    return categories.reduce((sum, [key]) => sum + ((data?.[key] || []).length), 0);
}

function setBadge(el, count) {
    el.textContent = count === 0 ? 'Clean' : `${count} finding${count === 1 ? '' : 's'}`;
    el.className = `badge ${count === 0 ? '' : count <= 5 ? 'warn' : 'bad'}`;
}

function sampleText(items) {
    if (!items?.length) return '';
    return JSON.stringify(items.slice(0, 3), null, 2);
}

function renderCategories(container, data, categories) {
    container.innerHTML = categories.map(([key, title, help]) => {
        const items = data?.[key] || [];
        const count = items.length;
        const badgeClass = count === 0 ? '' : count <= 5 ? 'warn' : 'bad';
        return `
            <section class="finding">
                <div class="finding-title">
                    <span>${title}</span>
                    <span class="badge ${badgeClass}">${count}</span>
                </div>
                <div class="finding-help">${help}</div>
                ${count ? `<pre class="sample">${escapeHtml(sampleText(items))}</pre>` : ''}
            </section>
        `;
    }).join('');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function runChecks() {
    runAllBtn.disabled = true;
    exportBtn.disabled = true;
    setNotice('Running integrity checks...');
    try {
        const [stock, documents] = await Promise.all([
            api('/api/data/custom/integrity/stock-check'),
            api('/api/data/custom/integrity/document-check')
        ]);

        const stockTotal = totalFor(stock, STOCK_CATEGORIES);
        const docTotal = totalFor(documents, DOC_CATEGORIES);
        const criticalTotal =
            (stock.negativeStock || []).length
            + (stock.invalidProductLedgers || []).length
            + (stock.suspiciousCosts || []).length
            + (documents.invalidProductItems || []).length
            + (documents.invalidBranchDocs || []).length
            + (documents.invalidStatusDocs || []).length;

        lastReport = {
            generated_at: new Date().toISOString(),
            stock,
            documents,
            summary: { stockTotal, docTotal, criticalTotal }
        };

        document.getElementById('stockTotal').textContent = stockTotal;
        document.getElementById('docTotal').textContent = docTotal;
        document.getElementById('criticalTotal').textContent = criticalTotal;
        document.getElementById('lastRun').textContent = new Date().toLocaleTimeString();
        setBadge(document.getElementById('stockBadge'), stockTotal);
        setBadge(document.getElementById('docBadge'), docTotal);
        renderCategories(stockFindings, stock, STOCK_CATEGORIES);
        renderCategories(docFindings, documents, DOC_CATEGORIES);

        exportBtn.disabled = false;
        setNotice(`Integrity checks complete. ${stockTotal + docTotal} total findings.`);
    } catch (err) {
        setNotice(err.message, true);
    } finally {
        runAllBtn.disabled = false;
    }
}

function exportReport() {
    if (!lastReport) return;
    const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bcauto-integrity-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function recalculateCosts() {
    if (!confirm('Recalculate weighted average product costs from stock ledger history?')) return;
    recalcBtn.disabled = true;
    setNotice('Recalculating product costs...');
    try {
        const result = await api('/api/data/custom/admin/recalculate-costs', { method: 'POST', body: '{}' });
        setNotice(`Cost recalculation complete. Products scanned: ${result.updated || 0}.`);
        await runChecks();
    } catch (err) {
        setNotice(err.message, true);
    } finally {
        recalcBtn.disabled = false;
    }
}

async function runSafeRepair() {
    const message = [
        'Run safe automatic integrity repair?',
        '',
        'This deletes only orphan document items and rebuilds missing stock ledgers only when the document number is unique and normal stock posting rules pass.',
        'Manual-review findings are left untouched.'
    ].join('\n');
    if (!confirm(message)) return;

    repairBtn.disabled = true;
    setNotice('Running safe integrity repair...');
    try {
        const result = await api('/api/data/custom/admin/integrity/repair', {
            method: 'POST',
            body: JSON.stringify({ mode: 'safe_auto', dry_run: false })
        });
        const repaired =
            (result.deleted_orphan_items || []).length
            + (result.rebuilt_ledgers || []).length;
        const skipped = (result.skipped_documents || []).length;
        const errors = (result.errors || []).length;
        setNotice(`Safe repair complete. Repaired: ${repaired}. Skipped for review: ${skipped}. Errors: ${errors}.`);
        await runChecks();
    } catch (err) {
        setNotice(err.message, true);
    } finally {
        repairBtn.disabled = false;
    }
}

runAllBtn.addEventListener('click', runChecks);
exportBtn.addEventListener('click', exportReport);
repairBtn.addEventListener('click', runSafeRepair);
recalcBtn.addEventListener('click', recalculateCosts);

runChecks().catch(() => {});
