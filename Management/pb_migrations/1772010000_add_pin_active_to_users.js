/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const users = app.findCollectionByNameOrId("users");

    // Add 'pin' field for employee PIN login
    users.fields.add(new Field({
        "name": "pin",
        "type": "text",
        "required": false,
        "presentable": true,
        "system": false
    }));

    // Add 'active' field for employee active status
    users.fields.add(new Field({
        "name": "active",
        "type": "bool",
        "required": false,
        "presentable": false,
        "system": false
    }));

    app.save(users);
    console.log("✅ Migration: Added pin and active fields to users collection");
}, (app) => {
    try {
        const users = app.findCollectionByNameOrId("users");
        users.fields.removeByName("pin");
        users.fields.removeByName("active");
        app.save(users);
    } catch (e) {
        console.error("Rollback failed:", e);
    }
})
