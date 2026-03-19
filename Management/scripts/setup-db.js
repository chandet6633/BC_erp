import PocketBase from 'pocketbase';

// Accept port as CLI argument: node setup-db.js 9092
const port = process.argv[2] || '8092';
const pb = new PocketBase(`http://127.0.0.1:${port}`);
console.log(`Targeting PocketBase at http://127.0.0.1:${port}`);

async function createCollections() {
    try {
        console.log("Authenticating as superuser...");
        await pb.collection('_superusers').authWithPassword('admin@management.local', 'adminpassword123');
        console.log("Authentication successful.");
    } catch (e) {
        console.error("Superuser auth failed. Make sure you ran: pocketbase superuser upsert...", e.message);
        return;
    }

    const collections = [
        {
            name: "users",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "email", type: "text" },
                { name: "name", type: "text", required: true },
                { name: "password", type: "text" },
                { name: "pin", type: "text" },
                { name: "role", type: "text" },       // owner, admin, manager, employee
                { name: "branch_id", type: "text" },
                { name: "department", type: "text" },
                { name: "is_active", type: "bool" },
                { name: "display_name", type: "text" },
                { name: "username", type: "text" }
            ]
        },
        {
            name: "transactions",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "job_id", type: "text" },
                { name: "branch", type: "text" },
                { name: "open_date", type: "date" },
                { name: "close_date", type: "date" },
                { name: "status", type: "text" },
                { name: "total_revenue", type: "number" },
                { name: "total_cost", type: "number" },
                { name: "plate_number", type: "text" },
                { name: "customer_name", type: "text" },
                { name: "technician", type: "text" },
                { name: "notes", type: "text" }
            ]
        },
        {
            name: "service_items",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "transaction_id", type: "text" },
                { name: "name", type: "text", required: true },
                { name: "type", type: "text" },
                { name: "qty", type: "number" },
                { name: "unit_price", type: "number" },
                { name: "cost", type: "number" },
                { name: "total", type: "number" },
                { name: "group_id", type: "text" }
            ]
        },
        {
            name: "product_groups",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "code", type: "text" },
                { name: "name", type: "text", required: true },
                { name: "category", type: "text" },
                { name: "is_active", type: "bool" }
            ]
        },
        {
            name: "financial_ledger",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "type", type: "text" },        // revenue, expense, adjustment
                { name: "category", type: "text" },
                { name: "description", type: "text" },
                { name: "amount", type: "number" },
                { name: "date", type: "date" },
                { name: "branch", type: "text" },
                { name: "reference", type: "text" },
                { name: "created_by", type: "text" }
            ]
        },
        {
            name: "expenses",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "category", type: "text" },
                { name: "description", type: "text" },
                { name: "amount", type: "number" },
                { name: "date", type: "date" },
                { name: "branch", type: "text" },
                { name: "vendor", type: "text" },
                { name: "receipt_no", type: "text" }
            ]
        },
        {
            name: "audit_logs",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "action", type: "text", required: true },
                { name: "collection_name", type: "text" },
                { name: "user_name", type: "text" },
                { name: "details", type: "text" },
                { name: "timestamp", type: "date" }
            ]
        },
        {
            name: "system_settings",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "key", type: "text", required: true },
                { name: "value", type: "text" },
                { name: "category", type: "text" }
            ]
        },
        {
            name: "system_roles",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "name", type: "text", required: true },
                { name: "permissions", type: "json" },
                { name: "description", type: "text" }
            ]
        },
        {
            name: "image_storage",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "file", type: "file", options: { maxSelect: 1, maxSize: 5242880 } },
                { name: "category", type: "text" },
                { name: "reference_id", type: "text" }
            ]
        },
        // ── HR Collections ──
        {
            name: "hr_employees",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "emp_id", type: "text" },
                { name: "name", type: "text", required: true },
                { name: "department", type: "text" },
                { name: "sex", type: "text" },
                { name: "is_active", type: "bool" }
            ]
        },
        {
            name: "hr_attendance",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "employee_id", type: "text" },
                { name: "name", type: "text" },
                { name: "department", type: "text" },
                { name: "status", type: "text" },      // IN, OUT
                { name: "date", type: "date" },
                { name: "store", type: "text" }
            ]
        },
        {
            name: "hr_leaves",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "employee_name", type: "text" },
                { name: "department", type: "text" },
                { name: "leave_type", type: "text" },
                { name: "start_date", type: "date" },
                { name: "end_date", type: "date" },
                { name: "status", type: "text" },       // pending, approved, rejected
                { name: "reason", type: "text" }
            ]
        }
    ];

    for (let schema of collections) {
        try {
            console.log(`Creating collection: ${schema.name}...`);
            await pb.collections.create(schema);
            console.log(`  OK - ${schema.name} created.`);
        } catch (e) {
            if (e.status === 400) {
                console.log(`  SKIP - ${schema.name} already exists.`);
            } else {
                console.log(`  WARN - ${schema.name}: ${e.message}`);
            }
        }
    }

    console.log("Management Database Schema Setup Complete.");
}

createCollections();
