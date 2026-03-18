/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. hr_employees
    const employees = new Collection({
        "name": "hr_employees",
        "type": "base",
        "system": false,
        "fields": [
            { "name": "emp_id", "type": "text", "required": true, "presentable": false, "system": false },
            { "name": "name", "type": "text", "required": true, "presentable": true, "system": false },
            { "name": "department", "type": "text", "required": false, "presentable": false, "system": false },
            { "name": "sex", "type": "text", "required": false, "presentable": false, "system": false }
        ],
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": "",
        "deleteRule": null,
        "indexes": [
            "CREATE UNIQUE INDEX `idx_emp_id` ON `hr_employees` (`emp_id`)"
        ]
    });
    app.save(employees);

    // 2. hr_attendance
    const attendance = new Collection({
        "name": "hr_attendance",
        "type": "base",
        "system": false,
        "fields": [
            { "name": "employee_id", "type": "text", "required": true, "presentable": false, "system": false },
            { "name": "date", "type": "date", "required": true, "presentable": false, "system": false },
            { "name": "status", "type": "text", "required": false, "presentable": false, "system": false },
            { "name": "department", "type": "text", "required": false, "presentable": false, "system": false },
            { "name": "store", "type": "text", "required": false, "presentable": false, "system": false },
            { "name": "source_row", "type": "number", "required": false, "presentable": false, "system": false },
            { "name": "name", "type": "text", "required": false, "presentable": false, "system": false }
        ],
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": "",
        "deleteRule": null,
        "indexes": [
            "CREATE UNIQUE INDEX `idx_attendance_uniq` ON `hr_attendance` (`employee_id`, `date`)"
        ]
    });
    app.save(attendance);

    // 3. hr_leaves
    const leaves = new Collection({
        "name": "hr_leaves",
        "type": "base",
        "system": false,
        "fields": [
            { "name": "employee_id", "type": "text", "required": true, "presentable": false, "system": false },
            { "name": "name", "type": "text", "required": false, "presentable": false, "system": false },
            { "name": "department", "type": "text", "required": false, "presentable": false, "system": false },
            { "name": "start_date", "type": "date", "required": true, "presentable": false, "system": false },
            { "name": "end_date", "type": "date", "required": true, "presentable": false, "system": false },
            { "name": "reason", "type": "text", "required": false, "presentable": false, "system": false },
            { "name": "type", "type": "text", "required": false, "presentable": false, "system": false }
        ],
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": "",
        "deleteRule": null,
        "indexes": [
            "CREATE INDEX `idx_leaves_date` ON `hr_leaves` (`start_date`, `end_date`)",
            "CREATE INDEX `idx_leaves_emp` ON `hr_leaves` (`employee_id`)"
        ]
    });
    app.save(leaves);

}, (app) => {
    // Revert
    try { app.delete(app.findCollectionByNameOrId("hr_employees")); } catch (e) { }
    try { app.delete(app.findCollectionByNameOrId("hr_attendance")); } catch (e) { }
    try { app.delete(app.findCollectionByNameOrId("hr_leaves")); } catch (e) { }
})
