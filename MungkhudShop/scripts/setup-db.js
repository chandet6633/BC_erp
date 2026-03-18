import PocketBase from 'pocketbase';

// SEC-4: Read credentials from env vars
const port = process.argv[2] || '8091';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@mungkhudshop.local';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'adminpassword123';
const pb = new PocketBase(`http://127.0.0.1:${port}`);
console.log(`Targeting PocketBase at http://127.0.0.1:${port}`);

// SEC-1: Default API rules — require authentication for data access
const AUTH_RULES = { listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "" }
const ADMIN_ONLY = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null }

async function createCollections() {
    try {
        console.log("Authenticating as superuser...");
        await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
        console.log("Authentication successful.");
    } catch (e) {
        console.error("Superuser auth failed. Make sure you ran: pocketbase superuser upsert...", e);
        return;
    }

    const collections = [
        {
            name: "lookups",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "type", type: "text", required: true }, // e.g., 'province', 'bank', 'prefix'
                { name: "label", type: "text", required: true },
                { name: "value", type: "text" },
                { name: "is_active", type: "bool" }
            ]
        },
        {
            name: "branches",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "code", type: "text", required: true },
                { name: "name", type: "text", required: true },
                { name: "address", type: "text" },
                { name: "phone", type: "text" },
                { name: "is_active", type: "bool" }
            ]
        },
        {
            name: "companies",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "code", type: "text", required: true },
                { name: "name", type: "text", required: true },
                { name: "tax_id", type: "text" },
                { name: "branch", type: "text" },
                { name: "address", type: "text" },
                { name: "phone", type: "text" },
                { name: "status", type: "text" }
            ]
        },
        {
            name: "customers",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "code", type: "text", required: true },
                { name: "name", type: "text", required: true },
                { name: "phone", type: "text" },
                { name: "email", type: "text" },
                { name: "credit_limit", type: "number" },
                { name: "points", type: "number" },
                { name: "address", type: "text" },
                // ── New fields ──
                { name: "tax_id", type: "text" },
                { name: "credit_days", type: "number" },
                { name: "group", type: "text" }
            ]
        },
        {
            name: "vehicles",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "plate_number", type: "text", required: true },
                { name: "province", type: "text" },
                { name: "brand", type: "text" },
                { name: "model", type: "text" },
                { name: "year", type: "number" },
                { name: "color", type: "text" },
                { name: "mileage", type: "number" },
                { name: "customer_id", type: "text" },
                // ── New fields ──
                { name: "chassis_number", type: "text" },
                { name: "engine_type", type: "text" },
                { name: "size", type: "text" } // e.g. S, M, L, XL
            ]
        },
        {
            name: "product_brands",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "code", type: "text", required: true },
                { name: "name", type: "text", required: true },
                { name: "is_active", type: "bool" }
            ]
        },
        {
            name: "product_groups",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "code", type: "text", required: true },
                { name: "name", type: "text", required: true },
                { name: "is_active", type: "bool" }
            ]
        },
        {
            name: "products",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "code", type: "text", required: true },
                { name: "name", type: "text", required: true },
                { name: "type", type: "text" }, // Service, Part, Fluid
                { name: "price", type: "number" },
                { name: "cost", type: "number" },
                { name: "barcode", type: "text" },
                { name: "unit", type: "text" },
                { name: "vendor_id", type: "text" },
                // ── New fields ──
                { name: "factory_code", type: "text" },
                { name: "brand_id", type: "text" },
                { name: "group_id", type: "text" },
                { name: "min_stock", type: "number" },
                { name: "location", type: "text" },
                { name: "is_track_stock", type: "bool" }
            ]
        },
        {
            name: "vendors",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "code", type: "text", required: true },
                { name: "name", type: "text", required: true },
                { name: "contact_person", type: "text" },
                { name: "phone", type: "text" },
                { name: "email", type: "text" },
                { name: "tax_id", type: "text" },
                { name: "address", type: "text" }
            ]
        },
        {
            name: "jobs",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "job_no", type: "text", required: true },
                { name: "status", type: "text" },
                { name: "start_date", type: "date" },
                { name: "end_date", type: "date" },
                { name: "plate", type: "text", required: true },
                { name: "is_red_plate", type: "bool" },
                { name: "model", type: "text" },
                { name: "mileage", type: "number" },
                { name: "chassis", type: "text" },
                { name: "customer_name", type: "text", required: true },
                { name: "customer_phone", type: "text" },
                { name: "subtotal", type: "number" },
                { name: "discount_pct", type: "number" },
                { name: "discount_amount", type: "number" },
                { name: "vat_amount", type: "number" },
                { name: "grand_total", type: "number" },
                { name: "payment_type", type: "text" },
                { name: "notes", type: "text" },
                // ── New fields ──
                { name: "branch_id", type: "text" },
                { name: "technician", type: "text" },
                { name: "repair_details", type: "text" },
                { name: "vat_enabled", type: "bool" },
                { name: "vat_mode", type: "text" } // customer_pays | shop_absorbs
            ]
        },
        {
            name: "job_items",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "job_id", type: "text", required: true },
                { name: "product_id", type: "text", required: true },
                { name: "qty", type: "number" },
                { name: "unit_price", type: "number" },
                { name: "discount", type: "number" },
                { name: "total", type: "number" },
                // ── New fields ──
                { name: "product_name", type: "text" },
                { name: "unit", type: "text" }
            ]
        },
        {
            name: "documents",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "doc_no", type: "text", required: true },
                { name: "doc_type", type: "text", required: true }, // IV, QT, RC, CN, RR, etc.
                { name: "ref_no", type: "text" }, // Original job or doc ref
                { name: "entity_id", type: "text" }, // Customer or Vendor ID
                { name: "status", type: "text" }, // pending, completed, void
                { name: "issue_date", type: "date" },
                { name: "due_date", type: "date" },
                { name: "subtotal", type: "number" },
                { name: "vat_amount", type: "number" },
                { name: "grand_total", type: "number" },
                { name: "notes", type: "text" },
                // ── New fields ──
                { name: "branch_id", type: "text" },
                { name: "discount_amount", type: "number" },
                { name: "payment_type", type: "text" },
                { name: "vat_enabled", type: "bool" },
                { name: "vat_mode", type: "text" }
            ]
        },
        {
            name: "document_items",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "document_id", type: "text", required: true },
                { name: "product_id", type: "text", required: true },
                { name: "qty", type: "number" },
                { name: "unit_price", type: "number" },
                { name: "total", type: "number" },
                // ── New fields ──
                { name: "discount", type: "number" },
                { name: "product_name", type: "text" }
            ]
        },
        {
            name: "stock_ledgers",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "transaction_no", type: "text" },
                { name: "transaction_type", type: "text" }, // IN, OUT, ADJ
                { name: "product_id", type: "text", required: true },
                { name: "warehouse_location", type: "text" },
                { name: "qty", type: "number" },
                { name: "unit_cost", type: "number" },
                { name: "total_value", type: "number" },
                { name: "reference_doc", type: "text" } // e.g. Job No, or RR No.
            ]
        },
        {
            name: "settings",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "shop_name", type: "text" },
                { name: "address", type: "text" },
                { name: "phone", type: "text" },
                { name: "email", type: "text" },
                { name: "tax_id", type: "text" },
                { name: "prefix_job", type: "text" },
                { name: "prefix_qt", type: "text" },
                { name: "prefix_iv", type: "text" },
                { name: "prefix_rc", type: "text" },
                { name: "vat_rate", type: "number" },
                // ── New fields ──
                { name: "default_vat_enabled", type: "bool" },
                { name: "default_vat_mode", type: "text" }
            ]
        },
        // ── NEW collections ──
        {
            name: "app_settings",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "key", type: "text", required: true },
                { name: "value", type: "text" }
            ]
        },
        {
            name: "favorite_products",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "branch_id", type: "text" },
                { name: "group_name", type: "text", required: true },
                { name: "product_id", type: "text", required: true },
                { name: "sort_order", type: "number" }
            ]
        },
        {
            name: "job_evaluations",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "job_id", type: "text", required: true },
                { name: "rating", type: "number" }, // 1-5
                { name: "comment", type: "text" },
                { name: "evaluated_by", type: "text" },
                { name: "evaluated_at", type: "date" }
            ]
        },
        {
            name: "job_payments",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "job_id", type: "text", required: true },
                { name: "method", type: "text", required: true }, // cash, transfer, credit, check
                { name: "amount", type: "number" },
                { name: "ref_no", type: "text" },
                { name: "bank_name", type: "text" }
            ]
        },
        {
            name: "audit_logs",
            type: "base",
            ...AUTH_RULES,
            fields: [
                { name: "action", type: "text", required: true },       // create, update, delete
                { name: "collection_name", type: "text" },
                { name: "user_name", type: "text" },
                { name: "details", type: "text" },
                { name: "timestamp", type: "date" }
            ]
        },
        // ── Auth-related collections (also in setup-auth.js) ──
        {
            name: "system_roles",
            type: "base",
            listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
            fields: [
                { name: "name", type: "text", required: true },
                { name: "allowed_menus", type: "text" }
            ]
        },
        {
            name: "app_users",
            type: "base",
            ...ADMIN_ONLY,
            fields: [
                { name: "username", type: "text", required: true },
                { name: "password", type: "text", required: true },
                { name: "display_name", type: "text", required: true },
                { name: "role", type: "text", required: true },
                { name: "is_active", type: "bool" }
            ]
        }
    ];

    for (let schema of collections) {
        try {
            console.log(`Creating collection: ${schema.name}...`);
            await pb.collections.create(schema);
            console.log(`✓ ${schema.name} created.`);
        } catch (e) {
            console.log(`⚠ ${schema.name} could not be created or already exists.`);
            // console.error(e);
        }
    }

    console.log("Database Schema Setup Complete!");
}

createCollections();
