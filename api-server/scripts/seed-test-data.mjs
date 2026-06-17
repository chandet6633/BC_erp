import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { init as initNocoDB, getAllRecords, createRecord, updateRecord } from '../lib/nocodb.js';

// Load .env from workspace root
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
                    if (key && !process.env[key]) {
                        process.env[key] = val;
                    }
                }
            });
            console.log('✅ Loaded .env file');
        } else {
            console.warn('⚠️ .env file not found at', envPath);
        }
    } catch (e) {
        console.warn('Failed to load .env file:', e.message);
    }
}

// SHA-256 helper
function sha256(input) {
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

async function seed() {
    loadEnv();
    
    console.log('Initializing NocoDB client...');
    await initNocoDB();
    console.log('NocoDB client initialized.');

    let seededCount = {
        branches: 0,
        users: 0,
        products: 0,
        customers: 0,
        vendors: 0
    };
    
    let skippedCount = {
        branches: 0,
        users: 0,
        products: 0,
        customers: 0,
        vendors: 0
    };

    // 1. Seed Branches
    const branches = [
        { code: 'main', name: 'BC Auto Main', address: 'Bangkok', phone: '021111111', is_active: true },
        { code: 'suphanburi', name: 'สุพรรณบุรี', address: 'Suphanburi', phone: '035111111', is_active: true }
    ];

    console.log('Seeding branches...');
    for (const b of branches) {
        const existing = await getAllRecords('branches', { where: `(code,eq,${b.code})` });
        if (existing.length > 0) {
            skippedCount.branches++;
        } else {
            await createRecord('branches', b);
            seededCount.branches++;
            console.log(`+ Created branch: ${b.code}`);
        }
    }

    // 2. Seed Users
    const users = [
        { username: 'admin', display_name: 'Admin', name: 'Admin', role: 'admin', branch: 'all', active: 1, email: 'admin@bcauto.work', password_hash: sha256('admin123'), password: sha256('admin123') },
        { username: 'owner', display_name: 'Owner', name: 'Owner', role: 'owner', branch: 'all', active: 1, email: 'owner@bcauto.work', password_hash: sha256('owner123'), password: sha256('owner123') },
        { username: 'manager', display_name: 'Manager', name: 'Manager', role: 'manager', branch: 'main', active: 1, email: 'mgr@bcauto.work', password_hash: sha256('mgr123'), password: sha256('mgr123'), pin: sha256('1111') },
        { username: 'sa_main', display_name: 'SA Main', name: 'SA Main', role: 'sa', branch: 'main', active: 1, email: 'sa@bcauto.work', password_hash: sha256('sa123'), password: sha256('sa123'), pin: sha256('2222') },
        { username: 'mechanic', display_name: 'Mechanic', name: 'Mechanic', role: 'mechanic', branch: 'main', active: 1, email: 'mech@bcauto.work', password_hash: sha256('mech123'), password: sha256('mech123'), pin: sha256('3333') }
    ];

    console.log('Seeding users...');
    for (const u of users) {
        const existing = await getAllRecords('users', { where: `(username,eq,${u.username})` });
        if (existing.length > 0) {
            skippedCount.users++;
        } else {
            await createRecord('users', u);
            seededCount.users++;
            console.log(`+ Created user: ${u.username}`);
        }
    }

    // 3. Seed Products
    const products = [
        { code: 'P001', name: 'น้ำมันเครื่อง 10W-40', type: 'fluid', price: 350, cost: 200, is_track_stock: true, unit: 'กระป๋อง' },
        { code: 'P002', name: 'กรองน้ำมัน', type: 'part', price: 120, cost: 60, is_track_stock: true, unit: 'ชิ้น' },
        { code: 'P003', name: 'ผ้าเบรกหน้า', type: 'part', price: 800, cost: 400, is_track_stock: true, unit: 'ชุด' },
        { code: 'SVC01', name: 'ค่าแรงเปลี่ยนถ่ายน้ำมัน', type: 'service', price: 200, cost: 0, is_track_stock: false, unit: 'ครั้ง' },
        { code: 'SVC02', name: 'ค่าตรวจเช็คสภาพ', type: 'service', price: 150, cost: 0, is_track_stock: false, unit: 'ครั้ง' }
    ];

    console.log('Seeding products...');
    for (const p of products) {
        const existing = await getAllRecords('products', { where: `(code,eq,${p.code})` });
        if (existing.length > 0) {
            skippedCount.products++;
        } else {
            await createRecord('products', p);
            seededCount.products++;
            console.log(`+ Created product: ${p.code}`);
        }
    }

    // 4. Seed Customers
    const customers = [
        { code: 'C001', name: 'สมชาย วงศ์ดี', phone: '0812345678', address: '123/45 ถนนหลัก', branch_id: 'main' },
        { code: 'C002', name: 'สมหญิง แสงสุข', phone: '0898765432', address: '789 ถนนรอง', branch_id: 'main' }
    ];

    console.log('Seeding customers...');
    for (const c of customers) {
        const existing = await getAllRecords('customers', { where: `(code,eq,${c.code})` });
        if (existing.length > 0) {
            skippedCount.customers++;
        } else {
            await createRecord('customers', c);
            seededCount.customers++;
            console.log(`+ Created customer: ${c.code}`);
        }
    }

    // 5. Seed Vendors
    const vendors = [
        { code: 'V001', name: 'บริษัท ออโต้พาร์ท จำกัด', contact_person: 'คุณสมศักดิ์', phone: '021112222', address: '456 ซอยสุขุมวิท' }
    ];

    console.log('Seeding vendors...');
    for (const v of vendors) {
        const existing = await getAllRecords('vendors', { where: `(code,eq,${v.code})` });
        if (existing.length > 0) {
            skippedCount.vendors++;
        } else {
            await createRecord('vendors', v);
            seededCount.vendors++;
            console.log(`+ Created vendor: ${v.code}`);
        }
    }

    const totalSeeded = seededCount.branches + seededCount.users + seededCount.products + seededCount.customers + seededCount.vendors;
    if (totalSeeded > 0) {
        console.log(`✅ Seed complete: ${seededCount.branches} branches, ${seededCount.users} users, ${seededCount.products} products, ${seededCount.customers} customers, ${seededCount.vendors} vendors`);
    } else {
        console.log(`ℹ️ All records already exist, nothing to seed`);
    }
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
});
