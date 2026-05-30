/// <reference path="../pb_data/types.d.ts" />

// Mass-update all records with empty branch to 'main'
// This normalizes legacy data so branch filtering works consistently
migrate((app) => {
    const collections = [
        'transactions',
        'service_items',
        'product_groups',
        'expenses',
        'revenue_verification',
        'audit_logs'
    ];

    let totalUpdated = 0;

    for (const name of collections) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            // Find all records where branch is empty
            const records = app.findRecordsByFilter(
                collection,
                "branch = '' || branch = null",
                "",   // sort
                0,    // limit (0 = all)
                0     // offset
            );

            for (const record of records) {
                record.set("branch", "main");
                app.save(record);
                totalUpdated++;
            }
            console.log(`✅ ${name}: updated ${records.length} records to branch='main'`);
        } catch (e) {
            console.warn(`⚠️ ${name}: skipped (${e.message})`);
        }
    }

    console.log(`✅ Total records updated: ${totalUpdated}`);
}, (app) => {
    // No rollback needed - this is a data normalization
    console.log("ℹ️ Rollback: no action needed for branch normalization");
})
