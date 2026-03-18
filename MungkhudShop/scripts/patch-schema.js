import PocketBase from 'pocketbase';

/**
 * Patch existing collections with fields that were added in setup-db.js
 * but never applied because the collection already existed.
 * 
 * This script is IDEMPOTENT — safe to run multiple times.
 * It reads the current schema, merges missing fields, and updates.
 */

const port = process.argv[2] || '8091';
const pb = new PocketBase(`http://127.0.0.1:${port}`);
console.log(`Targeting PocketBase at http://127.0.0.1:${port}`);

async function patchCollections() {
    try {
        console.log("Authenticating as superuser...");
        await pb.collection('_superusers').authWithPassword('admin@mungkhudshop.local', 'adminpassword123');
        console.log("Authentication successful.\n");
    } catch (e) {
        console.error("Superuser auth failed:", e.message);
        return;
    }

    // Define ALL fields that should exist, grouped by collection
    const patches = {
        customers: [
            { name: "tax_id", type: "text" },
            { name: "credit_days", type: "number" },
            { name: "group", type: "text" }
        ],
        vehicles: [
            { name: "chassis_number", type: "text" },
            { name: "engine_type", type: "text" },
            { name: "size", type: "text" }
        ],
        products: [
            { name: "factory_code", type: "text" },
            { name: "brand_id", type: "text" },
            { name: "group_id", type: "text" },
            { name: "min_stock", type: "number" },
            { name: "location", type: "text" },
            { name: "is_track_stock", type: "bool" }
        ],
        jobs: [
            { name: "branch_id", type: "text" },
            { name: "technician", type: "text" },
            { name: "repair_details", type: "text" },
            { name: "vat_enabled", type: "bool" },
            { name: "vat_mode", type: "text" }
        ],
        job_items: [
            { name: "product_name", type: "text" },
            { name: "unit", type: "text" }
        ],
        documents: [
            { name: "branch_id", type: "text" },
            { name: "discount_amount", type: "number" },
            { name: "payment_type", type: "text" },
            { name: "vat_enabled", type: "bool" },
            { name: "vat_mode", type: "text" }
        ],
        document_items: [
            { name: "discount", type: "number" },
            { name: "product_name", type: "text" }
        ],
        settings: [
            { name: "default_vat_enabled", type: "bool" },
            { name: "default_vat_mode", type: "text" }
        ]
    };

    for (const [collectionName, newFields] of Object.entries(patches)) {
        try {
            // Get current collection schema
            const collection = await pb.collections.getOne(collectionName);
            const existingFieldNames = new Set(collection.fields.map(f => f.name));

            // Find missing fields
            const fieldsToAdd = newFields.filter(f => !existingFieldNames.has(f.name));

            if (fieldsToAdd.length === 0) {
                console.log(`✓ ${collectionName} — all fields present`);
                continue;
            }

            // Merge existing + new fields
            const updatedFields = [...collection.fields, ...fieldsToAdd];
            await pb.collections.update(collectionName, { fields: updatedFields });
            console.log(`✓ ${collectionName} — added ${fieldsToAdd.length} fields: ${fieldsToAdd.map(f => f.name).join(', ')}`);

        } catch (e) {
            console.error(`✗ ${collectionName} — error: ${e.message}`);
        }
    }

    console.log("\n✅ Schema patch complete!");
}

patchCollections();
