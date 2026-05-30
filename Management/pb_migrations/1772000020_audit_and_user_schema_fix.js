/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Create audit_logs collection
    const auditLogs = new Collection({
        "name": "audit_logs",
        "type": "base",
        "system": false,
        "fields": [
            { "name": "user_id", "type": "text", "required": false, "presentable": false, "system": false },
            { "name": "user_name", "type": "text", "required": false, "presentable": true, "system": false },
            { "name": "role", "type": "text", "required": false, "presentable": false, "system": false },
            { "name": "action", "type": "text", "required": true, "presentable": true, "system": false },
            { "name": "details", "type": "text", "required": false, "presentable": false, "system": false },
            { "name": "module", "type": "text", "required": false, "presentable": false, "system": false },
            { "name": "timestamp", "type": "date", "required": true, "presentable": false, "system": false },
            { "name": "branch", "type": "text", "required": false, "presentable": false, "system": false }
        ],
        "listRule": "role = 'admin' || role = 'manager' || role = 'owner'",
        "viewRule": "role = 'admin' || role = 'manager' || role = 'owner'",
        "createRule": "", // Allow anyone to log actions
        "updateRule": null,
        "deleteRule": null,
        "indexes": [
            "CREATE INDEX `idx_audit_timestamp` ON `audit_logs` (`timestamp`)",
            "CREATE INDEX `idx_audit_action` ON `audit_logs` (`action`)"
        ]
    });
    app.save(auditLogs);

    // 2. Update users collection for compatibility
    try {
        const users = app.findCollectionByNameOrId("users");

        // Add display_name if missing
        try {
            users.fields.getByName("display_name");
        } catch (e) {
            users.fields.add(new Field({
                "name": "display_name",
                "type": "text",
                "required": false,
                "presentable": true
            }));
        }

        // Add role if missing
        try {
            users.fields.getByName("role");
        } catch (e) {
            users.fields.add(new Field({
                "name": "role",
                "type": "select",
                "required": false,
                "values": ["admin", "manager", "owner", "employee"]
            }));
        }

        // Add last_force_logout if missing
        try {
            users.fields.getByName("last_force_logout");
        } catch (e) {
            users.fields.add(new Field({
                "name": "last_force_logout",
                "type": "date",
                "required": false
            }));
        }

        app.save(users);
    } catch (e) {
        console.error("Failed to update users collection:", e);
    }

}, (app) => {
    try { app.delete(app.findCollectionByNameOrId("audit_logs")); } catch (e) { }
})
