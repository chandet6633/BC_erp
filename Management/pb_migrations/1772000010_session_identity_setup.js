/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = new Collection({
        "name": "employees",
        "type": "base",
        "system": false,
        "fields": [
            {
                "name": "name",
                "type": "text",
                "required": true,
                "presentable": true,
                "system": false
            },
            {
                "name": "branch",
                "type": "text",
                "required": true,
                "presentable": false,
                "system": false
            },
            {
                "name": "pin",
                "type": "text",
                "required": true,
                "presentable": false,
                "system": false
            },
            {
                "name": "active",
                "type": "bool",
                "required": false,
                "presentable": false,
                "system": false
            }
        ],
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": null,
        "deleteRule": null,
        "indexes": [
            "CREATE INDEX `idx_emp_branch` ON `employees` (`branch`)",
            "CREATE INDEX `idx_emp_active` ON `employees` (`active`)"
        ]
    });

    app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("employees");
    app.delete(collection);
})
