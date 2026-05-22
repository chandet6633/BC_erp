/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collections = [
        'users',
        'transactions',
        'service_items',
        'product_groups',
        'expenses',
        'revenue_verification',
        'owner_expenses',
        'receipts',
        'audit_logs',
        'system_roles',
        'system_settings'
    ];

    const managementRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'";

    for (const name of collections) {
        try {
            const collection = app.findCollectionByNameOrId(name);

            // Set rules to allow management roles to see everything
            collection.listRule = managementRule;
            collection.viewRule = managementRule;

            // For audit_logs, we also want Anyone to be able to create them (already in 1772000020, but ensuring)
            if (name === 'audit_logs') {
                collection.createRule = "";
            } else if (['expenses', 'revenue_verification', 'transactions', 'service_items'].includes(name)) {
                // Allow employees to create entries
                collection.createRule = "@request.auth.id != '' || @request.auth.role = 'employee'";
            }

            app.save(collection);
        } catch (e) {
            console.error("Failed to update rules for " + name, e);
        }
    }
}, (app) => {
    // No rollback needed for rules in this context
})
