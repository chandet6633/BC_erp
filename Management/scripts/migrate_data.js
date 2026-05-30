
import { createClient } from '@supabase/supabase-js';
import PocketBase from 'pocketbase';

// Supabase (Source)
const SUPABASE_URL = 'https://dlubmhzchtsldlxnyuzy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdWJtaHpjaHRzbGRseG55dXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDkwODIsImV4cCI6MjA4NjEyNTA4Mn0.KmmV2SywSgIfQYKNtKbb3FXRWoA1JbtC7hCNr_c8_9Q';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// PocketBase (Target)
const pb = new PocketBase('http://127.0.0.1:8090');

async function migrate() {
    try {
        await pb.admins.authWithPassword('admin@bcauto.local', '1234567890');
        console.log('Authenticated with PocketBase.');

        const tables = [
            'product_groups',
            'transactions',
            'service_items',
            'expenses',
            'owner_expenses',
            'revenue_verification'
        ];

        for (const table of tables) {
            console.log(`Migrating ${table}...`);
            await migrateTable(table);
        }

        console.log('Done!');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

async function migrateTable(table) {
    // 1. Fetch from Supabase
    // Fetch all rows (limit 10000 just in case)
    const { data, error } = await supabase.from(table).select('*').limit(10000);
    if (error) {
        // If table doesn't exist in Supabase (e.g. revenue_verification might be new?), skip
        console.error(`Error fetching ${table} from Supabase:`, error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log(`No data in ${table}.`);
        return;
    }

    console.log(`Fetched ${data.length} rows from ${table}. Inserting to PB...`);

    // 2. Insert into PocketBase
    let inserted = 0;
    let failed = 0;

    // Use loop to insert one by one (safer) or look for batch optimization
    // PB has no batch insert API in JS SDK yet (except transaction in go).
    // Parallelize? 
    const chunkSize = 20;
    for (let i = 0; i < data.length; i += chunkSize) {
        const batch = data.slice(i, i + chunkSize);
        await Promise.all(batch.map(async (row) => {
            try {
                // Clean row: remove 'id' (let PB generate new ID? OR keep old ID?)
                // If we keep old ID, we must ensure it's 15 chars string. Supabase use UUID (36 chars).
                // PB IDs are 15 chars. UUIDs are 36 chars.
                // WE CANNOT KEEP SUPABASE UUIDs as PB IDs (unless we changed PB config, but default is 15 chars).
                // Actually PB accepts custom IDs but they must match regex `^[a-z0-9]+$`. UUIDs have dashes.
                // So we MUST generate NEW IDs.
                // BUT references (job_id in service_items -> transactions)???
                // Wait. `job_id` in `service_items` is the JOB NUMBER (e.g. "JOB-2023-001"), NOT the table ID (UUID).
                // The relationship is logical, not foreign key ID based in the data logic I saw.
                // `database.js` uses `job_id` field (string) to link.
                // So generating new IDs is SAFE.

                const { id, created_at, ...record } = row;

                // Fix date formats? Supabase ISO string -> PB Date string (YYYY-MM-DD HH:mm:ss.Z)
                // Both are ISO compatible usually.

                await pb.collection(table).create(record);
                inserted++;
            } catch (e) {
                // console.error(`Failed to insert row in ${table}:`, e.response?.message || e.message);
                failed++;
            }
        }));
        if ((i + chunkSize) % 100 === 0) process.stdout.write('.');
    }
    console.log(`\n${table}: Inserted ${inserted}, Failed ${failed}`);
}

migrate();
