/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("pbc_1974748810");

    collection.fields.add(new Field({
        "hidden": false,
        "id": "text_created_by",
        "name": "created_by",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "text"
    }));

    collection.fields.add(new Field({
        "hidden": false,
        "id": "text_created_by_name",
        "name": "created_by_name",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "text"
    }));

    // Update rules to allow manager management
    const rules = "is_confidential = false || @request.auth.role = 'admin' || @request.auth.role = 'owner' || @request.auth.role = 'manager'";
    collection.listRule = rules;
    collection.viewRule = rules;
    collection.updateRule = rules;
    collection.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'owner' || @request.auth.role = 'manager'";

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1974748810");

    collection.fields.removeById("text_created_by");
    collection.fields.removeById("text_created_by_name");

    // Revert rules
    const rules = "is_confidential = false || @request.auth.role = 'admin' || @request.auth.role = 'owner'";
    collection.listRule = rules;
    collection.viewRule = rules;
    collection.updateRule = rules;
    collection.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'owner'";

    return app.save(collection);
})
