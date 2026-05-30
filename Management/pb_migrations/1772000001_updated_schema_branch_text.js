/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collections = ['users', 'transactions', 'service_items', 'product_groups', 'expenses', 'revenue_verification', 'owner_expenses', 'receipts'];

    for (const name of collections) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            const branchField = collection.fields.getByName("branch");
            if (branchField) {
                // Change from select to text
                branchField.type = "text";
                branchField.max = 50;
                app.save(collection);
            }
        } catch (e) {
            console.error("Migration upgrade error for " + name, e);
        }
    }
}, (app) => {
    // rollback
})
