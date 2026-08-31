import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { init as initNocoDB, getAllRecords, createRecord } from '../lib/nocodb.js';

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) {
            console.warn('Warning: .env file not found at', envPath);
            return;
        }

        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
            const parts = line.split('=');
            if (parts.length < 2) continue;
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
            if (key && !process.env[key]) process.env[key] = val;
        }
        console.log('Loaded .env file');
    } catch (e) {
        console.warn('Failed to load .env file:', e.message);
    }
}

function sha256(input) {
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

async function createIfMissing(table, lookupField, record, counters) {
    const lookupValue = record[lookupField];
    const existing = await getAllRecords(table, { where: `(${lookupField},eq,${lookupValue})` });
    if (existing.length > 0) {
        counters.skipped++;
        return false;
    }

    await createRecord(table, record);
    counters.seeded++;
    console.log(`+ Created ${table}: ${lookupValue}`);
    return true;
}

async function seed() {
    loadEnv();

    console.log('Initializing NocoDB client...');
    await initNocoDB();
    console.log('NocoDB client initialized.');

    const totals = {
        branches: { seeded: 0, skipped: 0 },
        users: { seeded: 0, skipped: 0 },
        products: { seeded: 0, skipped: 0 },
        customers: { seeded: 0, skipped: 0 },
        vendors: { seeded: 0, skipped: 0 }
    };

    const branches = [
        {
            code: 'bc-auto-service',
            name: 'BC Auto Service',
            address: 'BC Auto Service',
            phone: '021111111',
            is_active: true,
            metadata_json: JSON.stringify({
                display_name: 'BC Auto Service',
                display_name_en: 'BC Auto Service',
                aliases: ['BC Auto Service'],
                sort_order: 10
            })
        },
        {
            code: 'bc-auto-samchuk',
            name: 'BC Auto Samchuk',
            address: 'Samchuk',
            phone: '035222222',
            is_active: true,
            metadata_json: JSON.stringify({
                display_name: 'BC Auto Samchuk',
                display_name_en: 'BC Auto Samchuk',
                aliases: ['BC Auto Samchuk'],
                sort_order: 20
            })
        },
        {
            code: 'bc-auto-mueng-suphan',
            name: 'BC Auto Mueng Suphan',
            address: 'Mueng Suphan',
            phone: '035111111',
            is_active: true,
            metadata_json: JSON.stringify({
                display_name: 'BC Auto Mueng Suphan',
                display_name_en: 'BC Auto Mueng Suphan',
                aliases: ['BC Auto Mueng Suphan'],
                sort_order: 30
            })
        }
    ];

    const users = [
        { username: 'admin', display_name: 'Admin', name: 'Admin', role: 'admin', branch: 'bc-auto-service', active: 1, email: 'admin@bcauto.work', password_hash: sha256('admin123'), password: sha256('admin123') },
        { username: 'owner', display_name: 'Owner', name: 'Owner', role: 'owner', branch: 'bc-auto-service', active: 1, email: 'owner@bcauto.work', password_hash: sha256('owner123'), password: sha256('owner123') },
        { username: 'manager', display_name: 'Manager', name: 'Manager', role: 'manager', branch: 'bc-auto-service', active: 1, email: 'mgr@bcauto.work', password_hash: sha256('mgr123'), password: sha256('mgr123'), pin: sha256('1111') },
        { username: 'sa_service', display_name: 'SA Service', name: 'SA Service', role: 'sa', branch: 'bc-auto-service', active: 1, email: 'sa@bcauto.work', password_hash: sha256('sa123'), password: sha256('sa123'), pin: sha256('2222') },
        { username: 'mechanic', display_name: 'Mechanic', name: 'Mechanic', role: 'mechanic', branch: 'bc-auto-service', active: 1, email: 'mech@bcauto.work', password_hash: sha256('mech123'), password: sha256('mech123'), pin: sha256('3333') },
        { username: 'manager1', display_name: 'Manager', name: 'Manager', role: 'manager', branch: 'bc-auto-service', active: 1, email: 'mgr1@bcauto.work', password_hash: sha256('owner123'), password: sha256('owner123'), pin: sha256('1111') },
        { username: 'somchai', display_name: 'Somchai', name: 'Somchai', role: 'mechanic', branch: 'bc-auto-samchuk', active: 1, email: 'somchai@bcauto.work', password_hash: sha256('somchai123'), password: sha256('somchai123'), pin: sha256('3333') },
        { username: 'sa1', display_name: 'Service Advisor', name: 'Service Advisor', role: 'sa', branch: 'bc-auto-samchuk', active: 1, email: 'sa1@bcauto.work', password_hash: sha256('sa123'), password: sha256('sa123'), pin: sha256('2222') }
    ];

    const products = [
        { code: 'P001', name: 'Engine Oil 10W-40', type: 'fluid', price: 350, cost: 200, is_track_stock: true, unit: 'bottle' },
        { code: 'P002', name: 'Oil Filter', type: 'part', price: 120, cost: 60, is_track_stock: true, unit: 'piece' },
        { code: 'P003', name: 'Front Brake Pad', type: 'part', price: 800, cost: 400, is_track_stock: true, unit: 'set' },
        { code: 'SVC01', name: 'Oil Change Labor', type: 'service', price: 200, cost: 0, is_track_stock: false, unit: 'job' },
        { code: 'SVC02', name: 'Vehicle Inspection', type: 'service', price: 150, cost: 0, is_track_stock: false, unit: 'job' }
    ];

    const customers = [
        { code: 'C001', name: 'Somchai Wongdee', phone: '0812345678', address: '123/45 Main Road', branch_id: 'bc-auto-service' },
        { code: 'C002', name: 'Somying Saengsuk', phone: '0898765432', address: '789 Secondary Road', branch_id: 'bc-auto-service' }
    ];

    const vendors = [
        { code: 'V001', name: 'Auto Parts Co., Ltd.', contact_person: 'Somsak', phone: '021112222', address: '456 Sukhumvit' }
    ];

    console.log('Seeding branches...');
    for (const branch of branches) await createIfMissing('branches', 'code', branch, totals.branches);

    console.log('Seeding users...');
    for (const user of users) await createIfMissing('users', 'username', user, totals.users);

    console.log('Seeding products...');
    for (const product of products) await createIfMissing('products', 'code', product, totals.products);

    console.log('Seeding customers...');
    for (const customer of customers) await createIfMissing('customers', 'code', customer, totals.customers);

    console.log('Seeding vendors...');
    for (const vendor of vendors) await createIfMissing('vendors', 'code', vendor, totals.vendors);

    console.log('\nSeed complete!');
    for (const [table, counter] of Object.entries(totals)) {
        console.log(`  ${table}: ${counter.seeded} created, ${counter.skipped} skipped`);
    }
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
