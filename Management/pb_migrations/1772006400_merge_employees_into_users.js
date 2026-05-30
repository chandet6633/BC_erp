/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const users = app.findCollectionByNameOrId("users");

    // Add 'pin' field
    users.fields.add(new Field({
        "name": "pin",
        "type": "text",
        "required": false,
        "presentable": true,
        "system": false
    }));

    // Add 'branch' field
    users.fields.add(new Field({
        "name": "branch",
        "type": "text",
        "required": false,
        "presentable": false,
        "system": false
    }));

    // Add 'active' field
    users.fields.add(new Field({
        "name": "active",
        "type": "bool",
        "required": false,
        "presentable": false,
        "system": false
    }));

    app.save(users);
}, (app) => {
    // Rollback: remove the added fields
    try {
        const users = app.findCollectionByNameOrId("users");
        users.fields.removeByName("pin");
        users.fields.removeByName("branch");
        users.fields.removeByName("active");
        app.save(users);
    } catch (e) {
        console.error("Rollback failed:", e);
    }
})
