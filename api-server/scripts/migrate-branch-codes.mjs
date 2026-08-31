import { init as initNocoDB, getAllRecords, updateRecord } from '../lib/nocodb.js';

const dryRun = !process.argv.includes('--apply');
const fields = ['branch', 'branch_id', 'source_branch_id', 'destination_branch_id'];
const tables = [
    'users',
    'customers',
    'vehicles',
    'jobs',
    'job_items',
    'documents',
    'document_items',
    'stock_ledgers',
    'hr_attendance',
    'hr_leaves',
    'financial_ledger',
    'transactions',
    'payments'
];

function metadata(branch) {
    if (!branch?.metadata_json) return {};
    if (typeof branch.metadata_json === 'object') return branch.metadata_json;
    try {
        return JSON.parse(branch.metadata_json);
    } catch {
        return {};
    }
}

function branchCode(branch) {
    return String(branch?.code || branch?.branch_id || branch?.id || branch?.Id || branch?.name || '').trim();
}

function buildAliasMap(branches) {
    const map = {};
    for (const branch of branches) {
        const code = branchCode(branch);
        if (!code || code === 'all') continue;
        const meta = metadata(branch);
        const aliases = [
            branch.id,
            branch.Id,
            branch.code,
            branch.branch_id,
            branch.name,
            branch.display_name,
            branch.legacy_code,
            meta.legacy_code,
            ...(Array.isArray(meta.aliases) ? meta.aliases : []),
            ...String(branch.aliases || '').split(',')
        ].map(v => String(v || '').trim()).filter(Boolean);
        for (const alias of aliases) {
            if (alias !== code) map[alias] = code;
        }
    }
    return map;
}

async function main() {
    await initNocoDB();
    const branches = await getAllRecords('branches', {});
    const map = buildAliasMap(branches);
    const summary = { dry_run: dryRun, updates: 0, updated_tables: {}, errors: [] };

    for (const table of tables) {
        let rows = [];
        try {
            rows = await getAllRecords(table, {});
        } catch (err) {
            if (err.status === 404 || /Table ".+" not found/i.test(String(err.message || ''))) continue;
            summary.errors.push({ table, error: err.message });
            continue;
        }

        for (const row of rows) {
            const patch = {};
            for (const field of fields) {
                const value = String(row[field] || '').trim();
                if (value && map[value]) patch[field] = map[value];
            }
            if (!Object.keys(patch).length) continue;

            summary.updates += 1;
            summary.updated_tables[table] = (summary.updated_tables[table] || 0) + 1;
            if (!dryRun) await updateRecord(table, row.id || row.Id, patch);
        }
    }

    console.log(JSON.stringify(summary, null, 2));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
