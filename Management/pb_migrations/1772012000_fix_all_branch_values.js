/// <reference path="../pb_data/types.d.ts" />

// Comprehensive branch normalization:
// - Empty/null → 'main'
// - 'viriyah' → 'main'  
// - 'bcauto' → 'main'
// - 'suphanburi' → 'suphan'
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

    const renameMap = {
        '': 'main',
        'viriyah': 'main',
        'bcauto': 'main',
        'suphanburi': 'suphan'
    };

    let totalUpdated = 0;

    for (const name of collections) {
        try {
            const collection = app.findCollectionByNameOrId(name);

            for (const [oldVal, newVal] of Object.entries(renameMap)) {
                let filter;
                if (oldVal === '') {
                    filter = "branch = '' || branch = null";
                } else {
                    filter = `branch = '${oldVal}'`;
                }

                try {
                    const records = app.findRecordsByFilter(
                        collection,
                        filter,
                        "",  // sort
                        0,   // limit (0 = all)
                        0    // offset
                    );

                    for (const record of records) {
                        record.set("branch", newVal);
                        app.save(record);
                        totalUpdated++;
                    }

                    if (records.length > 0) {
                        console.log(`  ${name}: '${oldVal || '(empty)'}' → '${newVal}' (${records.length} records)`);
                    }
                } catch (filterErr) {
                    // No records found with this filter, skip
                }
            }
        } catch (e) {
            console.warn(`⚠️ ${name}: skipped (${e.message})`);
        }
    }

    console.log(`✅ Branch normalization complete: ${totalUpdated} records updated`);
}, (app) => {
    console.log("ℹ️ No rollback for branch normalization");
})
