import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:9093'; // bctest-api
const JWT_SECRET = 'bcauto_jwt_secret_2026_change_in_production';

function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function testApi() {
    console.log('--- STARTING EMPIRICAL VALIDATION ---');

    const adminToken = createToken({ id: 'admin1', username: 'admin', name: 'Admin', role: 'admin', branch: 'bc-auto-service' });
    const saToken = createToken({ id: 'sa1', username: 'test_sa', name: 'Test SA', role: 'sa', branch: 'BranchA' });

    console.log('Admin creating Job A (BranchA) and Job B (BranchB)...');
    const jobARes = await fetch(`${BASE_URL}/api/data/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ job_no: 'JOB-A', branch_id: 'BranchA' })
    });
    const jobA = await jobARes.json();

    const jobBRes = await fetch(`${BASE_URL}/api/data/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ job_no: 'JOB-B', branch_id: 'BranchB' })
    });
    const jobB = await jobBRes.json();

    // ---------------------------------------------------------
    // BUG 11: NocoDB Filter Injection
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 11: NocoDB Filter Injection');
    const listRes = await fetch(`${BASE_URL}/api/data/jobs?where=(1,eq,1)~or(id,gt,0)`, {
        headers: { 'Authorization': `Bearer ${saToken}` }
    });
    const listData = await listRes.json();
    if (listData.error) {
        console.log(`- API Error: ${listData.error}`);
    } else {
        const seesJobB = (listData.items || []).some(j => j.branch_id === 'BranchB');
        console.log(`- SA sees Job B? ${seesJobB ? 'YES (VULNERABLE)' : 'NO (SECURE)'}`);
    }

    // ---------------------------------------------------------
    // BUG 12: IDOR on GET
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 12: IDOR on GET');
    const getRes = await fetch(`${BASE_URL}/api/data/jobs/${jobB.id}`, {
        headers: { 'Authorization': `Bearer ${saToken}` }
    });
    console.log(`- SA fetching Job B: Status ${getRes.status} (Expected 403)`);

    // ---------------------------------------------------------
    // BUG 13: IDOR on PATCH
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 13: IDOR on PATCH');
    const patchRes = await fetch(`${BASE_URL}/api/data/jobs/${jobB.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
        body: JSON.stringify({ notes: 'Hacked!' })
    });
    console.log(`- SA editing Job B: Status ${patchRes.status} (Expected 403)`);

    // ---------------------------------------------------------
    // BUG 14: Cross-Branch Deletion
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 14: Cross-Branch Deletion');
    const delRes = await fetch(`${BASE_URL}/api/data/jobs/${jobB.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${saToken}` }
    });
    console.log(`- SA deleting Job B: Status ${delRes.status} (Expected 403)`);

    // ---------------------------------------------------------
    // BUG 15: Branch Spoofing
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 15: Branch Spoofing');
    const spoofRes = await fetch(`${BASE_URL}/api/data/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
        body: JSON.stringify({ job_no: 'JOB-SPOOF', branch_id: 'BranchZ' })
    });
    const spoofData = await spoofRes.json();
    console.log(`- SA spoofing branch: created with branch_id = ${spoofData.branch_id} (Expected BranchA)`);

    // ---------------------------------------------------------
    // BUG 16: OOM Upload Limit
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 16: Upload Limit');
    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${saToken}`,
            'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
            'Content-Length': '20000000' // 20MB
        },
        body: 'a'
    });
    console.log(`- SA 20MB upload: Status ${uploadRes.status} (Expected 413)`);

    // ---------------------------------------------------------
    // BUG 17: SA Ledger POST
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 17: Financial Ledger SA access');
    const ledgerPostRes = await fetch(`${BASE_URL}/api/data/financial_ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
        body: JSON.stringify({ amount: 100, transaction_no: 'JOB-A' })
    });
    console.log(`- SA POST to financial_ledger: Status ${ledgerPostRes.status} (Expected 201)`);
    
    console.log('--- EMPIRICAL VALIDATION COMPLETE ---');
}

testApi().catch(console.error);
