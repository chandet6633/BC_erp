import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090'); // Local server URL

// Collection Definitions
const COLLECTIONS = [
    {
        name: "hr_employees",
        type: "base",
        schema: [
            { name: "emp_id", type: "text", required: true, options: { pattern: "" } },
            { name: "name", type: "text", required: true, options: { pattern: "" } },
            { name: "department", type: "text", required: false, options: { pattern: "" } },
            { name: "sex", type: "text", required: false, options: { pattern: "" } }
        ],
        indexes: [
            "CREATE UNIQUE INDEX `idx_emp_id` ON `hr_employees` (`emp_id`)"
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: null
    },
    {
        name: "hr_attendance",
        type: "base",
        schema: [
            { name: "employee_id", type: "text", required: true, options: { pattern: "" } },
            { name: "date", type: "date", required: true, options: { min: "", max: "" } },
            { name: "status", type: "text", required: false, options: { pattern: "" } },
            { name: "department", type: "text", required: false, options: { pattern: "" } },
            { name: "store", type: "text", required: false, options: { pattern: "" } },
            { name: "source_row", type: "number", required: false, options: { min: null, max: null, noDecimal: false } },
            { name: "name", type: "text", required: false, options: { pattern: "" } }
        ],
        indexes: [
            "CREATE UNIQUE INDEX `idx_attendance_uniq` ON `hr_attendance` (`employee_id`, `date`)"
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: null
    },
    {
        name: "hr_leaves",
        type: "base",
        schema: [
            { name: "employee_id", type: "text", required: true, options: { pattern: "" } },
            { name: "name", type: "text", required: false, options: { pattern: "" } },
            { name: "department", type: "text", required: false, options: { pattern: "" } },
            { name: "start_date", type: "date", required: true, options: { min: "", max: "" } },
            { name: "end_date", type: "date", required: true, options: { min: "", max: "" } },
            { name: "reason", type: "text", required: false, options: { pattern: "" } },
            { name: "type", type: "text", required: false, options: { pattern: "" } }
        ],
        indexes: [
            "CREATE INDEX `idx_leaves_date` ON `hr_leaves` (`start_date`, `end_date`)",
            "CREATE INDEX `idx_leaves_emp` ON `hr_leaves` (`employee_id`)"
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: null
    }
];

async function main() {
    // Authenticate as Admin first
    // Since we don't know the admin password, we might need manual intervention OR assume standard dev env.
    // However, if we can run this locally, we can perhaps use the CLI?
    // Wait, the user said they are getting errors on the frontend.
    // If we run `pocketbase migrate ...` we can do it via Go migrations.
    // But if we want to run script, we NEED admin auth.

    // Try default or ask user?
    // Actually, migration is safer. But migration failed.
    // The migration failed likely because the user didn't restart.
    // I can't restart the server for them.
    // But if I create this script, I need credentials to run it against the API.

    // ALTERNATIVE: Use the JS SDK but run in browser console.
    // But verify: does the user have admin access? Usually yes in dev.

    // Let's assume the user has set up an admin.
    // I cannot guess the password.

    // Wait, if I use `pb_migrations` folder, it applies AUTOMATICALLY on restart.
    // There is no way to apply migration without restart unless I use the Admin UI or API.
    // Both require Authentication.

    // Strategy:
    // 1. Ask user to restart again.
    // 2. Or providing a script they can run in the browser console while logged in as Admin.

    // The previous migration file I created: `1770974000_restore_hr_collections.js`.
    // Maybe the filename `1770974000` is problematic?
    // Maybe it needs to be `timestamp_string_name.js`.
    // `1770974000` is a valid timestamp.

    // Let's try to verify if the file is actually there.
    // The file was created.

    console.log("Checking collections...");
    try {
        // Attempt to authenticate with a known dev credential? No.
        // We will just try to list collections. If it fails, we know auth is needed.
        const collections = await pb.collections.getFullList();
        console.log("Existing collections:", collections.map(c => c.name));
    } catch (e) {
        console.error("Auth required or error:", e.message);
        console.log("Please authenticate as admin to run this script.");
    }
}

// Ensure execution
main();
