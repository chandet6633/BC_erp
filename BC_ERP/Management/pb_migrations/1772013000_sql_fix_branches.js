/// <reference path="../pb_data/types.d.ts" />

// Use raw SQL to mass-update ALL branch values that are not 'main' or 'suphan'
// This catches every edge case: empty, null, 'viriyah', 'bcauto', 'suphanburi', etc.
migrate((app) => {
    const collections = [
        'transactions',
        'service_items',
        'product_groups',
        'expenses',
        'revenue_verification',
        'audit_logs',
        'owner_expenses',
        'receipts'
    ];

    for (const name of collections) {
        try {
            // Set empty/null/viriyah/bcauto → 'main'
            app.db().newQuery(
                `UPDATE ${name} SET branch = 'main' WHERE branch IS NULL OR branch = '' OR branch = 'viriyah' OR branch = 'bcauto'`
            ).execute();

            // Set suphanburi → 'suphan'
            app.db().newQuery(
                `UPDATE ${name} SET branch = 'suphan' WHERE branch = 'suphanburi'`
            ).execute();

            console.log(`✅ ${name}: branch values normalized`);
        } catch (e) {
            console.warn(`⚠️ ${name}: skipped (${e.message})`);
        }
    }

    console.log("✅ All branch values normalized via SQL");
}, (app) => {
    console.log("ℹ️ No rollback for branch normalization");
})
