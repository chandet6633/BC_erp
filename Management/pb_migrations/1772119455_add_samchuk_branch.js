/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Update Schema Collections to include "samchuk"
    const schemaCollections = [
        "transactions", "service_items", "product_groups",
        "financial_ledger", "users", "audit_logs"
    ];

    for (const name of schemaCollections) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            const branchField = collection.fields.getByName("branch");
            if (branchField && branchField.type === "select") {
                // Only add if it doesn't exist
                if (!branchField.values.includes("samchuk")) {
                    branchField.values.push("samchuk");
                    app.save(collection);
                    console.log(`✅ ${name}: branch schema updated to include 'samchuk'`);
                }
            } else if (branchField && branchField.type === "text") {
                // Only update validation pattern if present, but typically select fields are used.
                // Just logging it if we encounter text fields for branch.
                console.log(`ℹ️ ${name}: branch is a text field, no select values to update. (Expected for some older structures)`);
            }
        } catch (e) {
            console.warn(`⚠️ ${name} schema update skipped: ${e.message}`);
        }
    }

    // 2. Duplicate employee_suphanburi role for employee_samchuk
    try {
        const rolesCollection = app.findCollectionByNameOrId("system_roles");

        // Find existing suphanburi role manually via query
        const existingRole = app.db().newQuery("SELECT * FROM system_roles WHERE role = 'employee_suphanburi'").one();

        if (existingRole) {
            // Check if samchuk role already exists
            const samchukExists = app.db().newQuery("SELECT id FROM system_roles WHERE role = 'employee_samchuk'").one();

            if (!samchukExists) {
                const record = new Record(rolesCollection);
                record.set("role", "employee_samchuk");
                record.set("description", "พนักงานสาขาสามชุก");
                // The allowed_tools is currently stored as a JSON string array of IDs in PB.
                record.set("allowed_tools", JSON.parse(existingRole.allowed_tools || "[]"));

                app.save(record);
                console.log(`✅ Created 'employee_samchuk' role with identical permissions to 'employee_suphanburi'`);
            } else {
                console.log(`ℹ️ 'employee_samchuk' role already exists.`);
            }
        }
    } catch (e) {
        console.warn(`⚠️ Role duplicate failed: ${e.message}`);
    }

}, (app) => {
    // Revert schema
    const schemaCollections = [
        "transactions", "service_items", "product_groups",
        "financial_ledger", "users", "audit_logs"
    ];

    for (const name of schemaCollections) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            const branchField = collection.fields.getByName("branch");
            if (branchField && branchField.type === "select") {
                branchField.values = branchField.values.filter(v => v !== "samchuk");
                app.save(collection);
            }
        } catch (e) { }
    }

    // Revert Role
    try {
        app.db().newQuery("DELETE FROM system_roles WHERE role = 'employee_samchuk'").execute();
    } catch (e) { }
})
