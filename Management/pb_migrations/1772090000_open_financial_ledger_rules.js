/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("financial_ledger");

    if (collection) {
        collection.listRule = "";
        collection.viewRule = "";
        collection.createRule = "";
        collection.updateRule = "";
        collection.deleteRule = "";

        app.save(collection);
    }
}, (app) => {
    const collection = app.findCollectionByNameOrId("financial_ledger");
    if (collection) {
        collection.listRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'";
        collection.viewRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'";
        collection.createRule = null;
        collection.updateRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'";
        collection.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'";
        app.save(collection);
    }
})
