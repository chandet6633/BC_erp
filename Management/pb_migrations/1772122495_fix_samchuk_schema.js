/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const schemaCollections = [
        "transactions", "service_items", "product_groups",
        "financial_ledger", "users", "audit_logs"
    ];

    for (const name of schemaCollections) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            const branchField = collection.fields.getByName("branch");
            if (branchField && branchField.type === "select") {
                // Must create a new JS array to overwrite the Go slice properties properly
                let currentValues = Array.from(branchField.values || []);

                if (!currentValues.includes("samchuk")) {
                    currentValues.push("samchuk");
                    // Reassign exactly as a new array
                    branchField.values = currentValues;
                    app.save(collection);
                    console.log(`✅ ${name}: branch schema fixed to include 'samchuk'`);
                }
            }
        } catch (e) {
            console.warn(`⚠️ ${name} schema fix skipped: ${e.message}`);
        }
    }
}, (app) => {
    // Empty down migration for a patch
})
