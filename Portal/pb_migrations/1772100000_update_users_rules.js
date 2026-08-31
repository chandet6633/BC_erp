/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const users = app.findCollectionByNameOrId("users");

    if (users) {
        // Allow Admins, Managers, and Owners to manage users
        const portalRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.role = 'owner'";

        users.updateRule = portalRule;
        users.createRule = portalRule;
        users.deleteRule = portalRule;

        app.save(users);
        console.log("✅ Migration: Opened users collection update/create/delete rules for portal roles.");
    }
}, (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (users) {
        users.updateRule = null;
        users.createRule = null;
        users.deleteRule = null;
        app.save(users);
    }
})
