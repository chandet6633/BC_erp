/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Create system_settings collection
    const settings = new Collection({
        "name": "system_settings",
        "type": "base",
        "system": false,
        "fields": [
            { "name": "key", "type": "text", "required": true, "presentable": true, "system": false },
            { "name": "value", "type": "json", "required": false, "presentable": false, "system": false },
            { "name": "description", "type": "text", "required": false, "presentable": false, "system": false }
        ],
        "listRule": "",
        "viewRule": "",
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "indexes": ["CREATE UNIQUE INDEX `idx_setting_key` ON `system_settings` (`key`)"]
    });
    app.save(settings);

    // 2. Create system_roles collection
    const roles = new Collection({
        "name": "system_roles",
        "type": "base",
        "system": false,
        "fields": [
            { "name": "role_name", "type": "text", "required": true, "presentable": true, "system": false },
            { "name": "allowed_tools", "type": "json", "required": false, "presentable": false, "system": false },
            { "name": "description", "type": "text", "required": false, "presentable": false, "system": false }
        ],
        "listRule": "",
        "viewRule": "",
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "indexes": ["CREATE UNIQUE INDEX `idx_role_name` ON `system_roles` (`role_name`)"]
    });
    app.save(roles);

    // 3. Seed initial roles
    const tools = [
        'bc_service_dashboard', 'bc_service_entry', 'bc_service_audit',
        'bc_suphan_dashboard', 'bc_suphan_entry', 'hr_dashboard',
        'admin_suite', 'audit_logs'
    ];

    const roleDefinitions = [
        { name: 'admin', tools: tools },
        { name: 'manager', tools: ['bc_service_dashboard', 'bc_service_entry', 'bc_service_audit', 'bc_suphan_dashboard', 'bc_suphan_entry', 'hr_dashboard'] },
        { name: 'employee', tools: ['bc_service_entry', 'bc_suphan_entry'] },
        { name: 'owner', tools: tools }
    ];

    roleDefinitions.forEach(r => {
        app.save(new Record(roles, {
            role_name: r.name,
            allowed_tools: r.tools,
            description: `Default permissions for ${r.name}`
        }));
    });

}, (app) => {
    try { app.delete(app.findCollectionByNameOrId("system_settings")); } catch (e) { }
    try { app.delete(app.findCollectionByNameOrId("system_roles")); } catch (e) { }
})
