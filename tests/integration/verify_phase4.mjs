import jwt from 'jsonwebtoken';

const JWT_SECRET = 'bcauto_jwt_secret_2026_change_in_production';
const API_URL = 'http://localhost:9093/api';

// Create two tokens: one admin, one standard SA
const adminToken = jwt.sign(
    { id: '1', name: 'Admin User', role: 'admin', branch: 'bc-auto-service' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

const saToken = jwt.sign(
    { id: '2', name: 'Standard SA', role: 'sa', branch: 'bkk' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

async function verifyPhase4() {
    console.log('--- Phase 4 Verification Start ---');
    
    const adminHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
    };

    const saHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${saToken}`
    };

    // 1. Test "กำลังสร้าง..." Job Generation Bug
    console.log('\n[1] Testing "กำลังสร้าง..." Bug Fix...');
    const jobRes = await fetch(`${API_URL}/data/jobs`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
            job_no: 'กำลังสร้าง...', // Malicious/stuck placeholder
            status: 'pending'
        })
    });
    
    if (jobRes.ok) {
        const job = await jobRes.json();
        if (job.job_no !== 'กำลังสร้าง...' && job.job_no.startsWith('JOB-')) {
            console.log(`✅ SUCCESS: Placeholder intercepted! Server generated real job_no: ${job.job_no}`);
        } else {
            console.log(`❌ FAIL: Server saved invalid job_no: ${job.job_no}`);
        }
        await fetch(`${API_URL}/data/jobs/${job.id}`, { method: 'DELETE', headers: adminHeaders });
    } else {
        console.error('❌ FAIL: Request failed', await jobRes.text());
    }

    // 2. Test Credit Limit Cap
    console.log('\n[2] Testing Credit Limit Cap (Requesting 9,999,999 THB)...');
    const custRes = await fetch(`${API_URL}/data/customers`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
            name: 'Test Credit Limit Customer',
            credit_limit: 9999999
        })
    });
    
    if (custRes.ok) {
        const cust = await custRes.json();
        if (cust.credit_limit === 50000) {
            console.log(`✅ SUCCESS: Credit limit successfully clamped to ${cust.credit_limit}`);
        } else {
            console.log(`❌ FAIL: Server saved credit limit as: ${cust.credit_limit}`);
        }
        // Cleanup (using PATCH to mark inactive since actual DELETE may be blocked if scoped)
        await fetch(`${API_URL}/data/customers/${cust.id}`, { method: 'DELETE', headers: adminHeaders });
    } else {
        console.error('❌ FAIL: Request failed', await custRes.text());
    }

    // 3. Test Backdate Protection (SA User)
    console.log('\n[3] Testing Backdate Protection for Standard User (Attempting 2010-01-01)...');
    const bdRes = await fetch(`${API_URL}/data/jobs`, {
        method: 'POST',
        headers: saHeaders,
        body: JSON.stringify({
            job_no: 'JOB-TEST-BD',
            status: 'pending',
            start_date: '2010-01-01'
        })
    });
    
    if (bdRes.ok) {
        const bdJob = await bdRes.json();
        const today = new Date().toISOString().slice(0, 10);
        if (bdJob.start_date === today || bdJob.start_date.includes(today)) {
            console.log(`✅ SUCCESS: Backdate rejected! Server forced date to: ${bdJob.start_date}`);
        } else {
            console.log(`❌ FAIL: Server allowed backdate: ${bdJob.start_date}`);
        }
        await fetch(`${API_URL}/data/jobs/${bdJob.id}`, { method: 'DELETE', headers: adminHeaders });
    } else {
        console.error('❌ FAIL: Request failed', await bdRes.text());
    }

    console.log('\n--- Phase 4 Verification Complete ---');
}

verifyPhase4();
