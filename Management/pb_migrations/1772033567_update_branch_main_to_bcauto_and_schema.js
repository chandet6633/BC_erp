/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collections = [
        "transactions", "service_items", "product_groups",
        "expenses", "revenue_verification", "users", "audit_logs"
    ];

    // 1. Update existing data to BC Auto Service
    for (const name of collections) {
        try {
            app.db().newQuery(
                `UPDATE ${name} SET branch = 'BC Auto Service' WHERE branch = 'main'`
            ).execute();
            console.log(`✅ ${name}: 'main' -> 'BC Auto Service'`);
        } catch (e) {
            console.warn(`⚠️ ${name} data update skipped: ${e.message}`);
        }
    }

    // 2. Change schema to select for the requested collections
    // The user requested to change the branch field in product_group, service_items, and transactions collections to a dropdown (select) filter.
    const schemaCollections = ["transactions", "service_items", "product_groups"];
    for (const name of schemaCollections) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            const branchField = collection.fields.getByName("branch");
            if (branchField) {
                branchField.type = "select";
                branchField.maxSelect = 1;
                branchField.values = ["BC Auto Service", "suphanburi", ""];
                app.save(collection);
                console.log(`✅ ${name}: branch schema updated to select`);
            }
        } catch (e) {
            console.warn(`⚠️ ${name} schema update skipped: ${e.message}`);
        }
    }
}, (app) => {
    const collections = [
        "transactions", "service_items", "product_groups",
        "expenses", "revenue_verification", "users", "audit_logs"
    ];

    // Revert schema
    const schemaCollections = ["transactions", "service_items", "product_groups"];
    for (const name of schemaCollections) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            const branchField = collection.fields.getByName("branch");
            if (branchField) {
                branchField.type = "text";
                branchField.maxSelect = null;
                branchField.values = null;
                app.save(collection);
            }
        } catch (e) { }
    }

    // Revert data
    for (const name of collections) {
        try {
            app.db().newQuery(
                `UPDATE ${name} SET branch = 'main' WHERE branch = 'BC Auto Service'`
            ).execute();
        } catch (e) { }
    }
})
