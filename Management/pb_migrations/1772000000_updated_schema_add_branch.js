/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collections = ['users', 'transactions', 'service_items', 'product_groups', 'expenses', 'revenue_verification', 'owner_expenses', 'receipts'];

    for (const name of collections) {
        try {
            const collection = app.findCollectionByNameOrId(name);

            const field = new Field({
                id: "branch_" + name.substring(0, 3) + Math.floor(Math.random() * 100),
                name: "branch",
                type: "select",
                required: false,
                maxSelect: 1,
                values: ["viriyah", "bcauto"]
            });

            collection.fields.add(field);
            app.save(collection);
        } catch (e) {
            console.error("Migration upgrade error for " + name, e);
        }
    }
}, (app) => {
    const collections = ['users', 'transactions', 'service_items', 'product_groups', 'expenses', 'revenue_verification', 'owner_expenses', 'receipts'];

    for (const name of collections) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            const branchField = collection.fields.getByName("branch");
            if (branchField) {
                collection.fields.removeById(branchField.id);
                app.save(collection);
            }
        } catch (e) {
            console.error("Migration downgrade error for " + name, e);
        }
    }
})
