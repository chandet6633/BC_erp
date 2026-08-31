import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:9093'; // bctest-api
const JWT_SECRET = 'bcauto_jwt_secret_2026_change_in_production';

function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function testPhase3() {
    console.log('--- STARTING PHASE 3 EMPIRICAL VALIDATION ---');

    const adminToken = createToken({ id: 'admin1', username: 'admin', name: 'Admin', role: 'admin', branch: 'bc-auto-service' });
    const saToken = createToken({ id: 'sa1', username: 'test_sa', name: 'Test SA', role: 'sa', branch: 'BranchA' });

    // ---------------------------------------------------------
    // BUG 21: Wholesale Cost Leak
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 21: Wholesale Cost Leak');
    // Admin creates a product with cost
    await fetch(`${BASE_URL}/api/data/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Oil', price: 100, cost: 50 })
    });
    
    // SA fetches products
    const prodRes = await fetch(`${BASE_URL}/api/data/products/all`, {
        headers: { 'Authorization': `Bearer ${saToken}` }
    });
    const products = await prodRes.json();
    const oil = products.find(p => p.name === 'Oil');
    console.log(`- SA sees cost? ${oil && oil.cost !== undefined ? 'YES (VULNERABLE)' : 'NO (SECURE)'}`);

    // ---------------------------------------------------------
    // BUG 22: Leave Auto-Approval
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 22: Leave Auto-Approval');
    const leaveRes = await fetch(`${BASE_URL}/api/data/hr_leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
        body: JSON.stringify({ employee_id: 'sa1', status: 'approved' })
    });
    const leaveData = await leaveRes.json();
    console.log(`- Created leave status: ${leaveData.status} (Expected pending)`);

    // ---------------------------------------------------------
    // BUG 24: Time-Travel Check-In
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 24: Time-Travel Check-In');
    const pastTime = '2020-01-01 08:00:00';
    const attRes = await fetch(`${BASE_URL}/api/data/hr_attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
        body: JSON.stringify({ employee_id: 'sa1', timestamp: pastTime })
    });
    const attData = await attRes.json();
    console.log(`- Att timestamp applied? ${attData.timestamp === pastTime ? 'YES (VULNERABLE)' : 'NO (SECURE) -> ' + attData.timestamp}`);

    // ---------------------------------------------------------
    // BUG 27: Status Revert Bypass
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 27: Status Revert Bypass');
    // Admin creates completed job
    const jobRes = await fetch(`${BASE_URL}/api/data/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ job_no: 'JOB-COMPLETE', branch_id: 'BranchA', status: 'completed' })
    });
    const jobData = await jobRes.json();
    
    // SA tries to revert
    if (jobData.id) {
        const revertRes = await fetch(`${BASE_URL}/api/data/jobs/${jobData.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
            body: JSON.stringify({ status: 'pending' })
        });
        console.log(`- SA reverting completed job: Status ${revertRes.status} (Expected 403)`);
    } else {
        console.log('- Failed to create test job.');
    }

    // ---------------------------------------------------------
    // BUG 29: Negative Invoices
    // ---------------------------------------------------------
    console.log('\n[TEST] Bug 29: Negative Invoices');
    const docRes = await fetch(`${BASE_URL}/api/data/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
        body: JSON.stringify({ doc_no: 'INV-001', branch_id: 'BranchA', grand_total: -100 })
    });
    console.log(`- Creating negative invoice: Status ${docRes.status} (Expected 400)`);
    const docData = await docRes.json();
    if(docData.error) console.log(`  Detail: ${docData.error} - ${JSON.stringify(docData.details)}`);

    console.log('--- PHASE 3 VALIDATION COMPLETE ---');
}

testPhase3().catch(console.error);
