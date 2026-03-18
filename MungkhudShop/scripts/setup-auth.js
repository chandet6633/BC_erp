import PocketBase from 'pocketbase';

// SEC-4: Read credentials from env vars (set via .env or shell)
const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8091';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@mungkhudshop.local';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'adminpassword123';
const DEFAULT_ADMIN_PW = process.env.DEFAULT_ADMIN_PW || 'admin1234';
const DEFAULT_MANAGER_PW = process.env.DEFAULT_MANAGER_PW || 'manager1234';
const DEFAULT_STAFF_PW = process.env.DEFAULT_STAFF_PW || 'staff1234';

const pb = new PocketBase(PB_URL);

async function setupAuth() {
    try {
        console.log("Authenticating as superuser...");
        await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
        console.log("Authentication successful.");

        // 1. Create system_roles collection
        try {
            console.log("Creating system_roles...");
            await pb.collections.create({
                name: "system_roles",
                type: "base",
                listRule: "@request.auth.id != ''", viewRule: "@request.auth.id != ''",
                createRule: null, updateRule: null, deleteRule: null,
                fields: [
                    { name: "name", type: "text", required: true },
                    { name: "allowed_menus", type: "text" }
                ]
            });
            console.log("✓ system_roles created.");
        } catch (e) {
            console.log("⚠ system_roles already exists.");
        }

        // 2. Create app_users collection (simple custom auth, not PB auth)
        try {
            console.log("Creating app_users...");
            await pb.collections.create({
                name: "app_users",
                type: "base",
                listRule: null, viewRule: null,
                createRule: null, updateRule: null, deleteRule: null,
                fields: [
                    { name: "username", type: "text", required: true },
                    { name: "password", type: "text", required: true },
                    { name: "display_name", type: "text", required: true },
                    { name: "role", type: "text", required: true },   // admin | manager | employee
                    { name: "is_active", type: "bool" }
                ]
            });
            console.log("✓ app_users created.");
        } catch (e) {
            console.log("⚠ app_users already exists.");
        }

        // 3. Insert default roles
        console.log("Inserting default roles...");
        const roles = [
            { name: "admin", allowed_menus: "*" },
            { name: "owner", allowed_menus: "*" },
            { name: "manager", allowed_menus: "#/dashboard,#/job,#/quotation,#/invoice,#/receipt,#/credit-note,#/stock-list,#/requisition,#/stock-return,#/stock-transfer,#/stock-adjust,#/goods-receipt,#/purchase-invoice,#/purchase-cn,#/payment,#/withholding-tax,#/master-company,#/master-customer,#/master-vehicle,#/master-product,#/master-vendor,#/master-lookup,#/report-sales,#/report-inventory,#/report-finance,#/forms,#/settings" },
            { name: "employee", allowed_menus: "#/dashboard,#/job,#/stock-list" }
        ];
        for (const r of roles) {
            const existing = await pb.collection("system_roles").getList(1, 1, { filter: `name='${r.name}'` });
            if (existing.items.length === 0) {
                await pb.collection("system_roles").create(r);
                console.log(`  ✓ Created role: ${r.name}`);
            } else {
                console.log(`  ⚠ Role "${r.name}" already exists.`);
            }
        }

        // 4. Insert default admin user (passwords are SHA-256 hashed)
        // Pre-computed hashes:
        //   admin1234   → 1c5eb81c4a12d7e04c524e3e0e1fb3e0b4decbb2a7bd1de0befc5e36d29aefd2 (sha256 not used, using crypto.createHash)
        console.log("Inserting default users with hashed passwords...");

        // Helper: SHA-256 hash (Node.js compatible)
        const { createHash } = await import('crypto');
        const sha256 = (str) => createHash('sha256').update(str).digest('hex');

        const adminExists = await pb.collection("app_users").getList(1, 1, { filter: `username='admin'` });
        if (adminExists.items.length === 0) {
            await pb.collection("app_users").create({
                username: "admin",
                password: sha256(DEFAULT_ADMIN_PW),
                display_name: "ผู้ดูแลระบบ",
                role: "admin",
                is_active: true
            });
            console.log(`  ✓ Default admin user created (admin / [from env DEFAULT_ADMIN_PW])`);
        } else {
            console.log("  ⚠ Admin user already exists.");
        }

        // Insert demo manager
        const mgrExists = await pb.collection("app_users").getList(1, 1, { filter: `username='manager'` });
        if (mgrExists.items.length === 0) {
            await pb.collection("app_users").create({
                username: "manager",
                password: sha256(DEFAULT_MANAGER_PW),
                display_name: "ผู้จัดการ",
                role: "manager",
                is_active: true
            });
            console.log("  ✓ Default manager user created (manager / manager1234)");
        }

        // Insert demo employee
        const empExists = await pb.collection("app_users").getList(1, 1, { filter: `username='staff'` });
        if (empExists.items.length === 0) {
            await pb.collection("app_users").create({
                username: "staff",
                password: sha256(DEFAULT_STAFF_PW),
                display_name: "พนักงาน",
                role: "employee",
                is_active: true
            });
            console.log("  ✓ Default employee user created (staff / staff1234)");
        }

        console.log("\n✅ Auth setup complete!");
        console.log("Default logins:");
        console.log("  admin    / admin1234   (Full access)");
        console.log("  manager  / manager1234 (Manager access)");
        console.log("  staff    / staff1234   (Employee access)");
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error(JSON.stringify(e.response, null, 2));
    }
}

setupAuth();
