import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:9093'; // bctest-api
const JWT_SECRET = 'bcauto_jwt_secret_2026_change_in_production';

function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function testPhase4() {
    console.log('--- STARTING PHASE 4 EMPIRICAL VALIDATION ---');

    const adminToken = createToken({ id: 'admin1', username: 'admin', name: 'Admin', role: 'admin', branch: 'bc-auto-service' });
    const saToken = createToken({ id: 'sa1', username: 'test_sa', name: 'Test SA', role: 'sa', branch: 'BranchA' });

    // BUG 53: Math Validation
    console.log('\n[TEST] Bug 53: Client-Side VAT Manipulation');
    const docRes = await fetch(`${BASE_URL}/api/data/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
        body: JSON.stringify({ 
            doc_no: 'INV-MATH', 
            branch_id: 'BranchA', 
            subtotal: 100,
            discount: 0,
            vat_amount: 7,
            grand_total: 50 // Tampered! Should be 107
        })
    });
    console.log(`- Creating tampered invoice: Status ${docRes.status} (Expected 400)`);
    const docData = await docRes.json();
    if(docData.error) console.log(`  Detail: ${docData.error} - ${JSON.stringify(docData.details)}`);

    // BUG 49/51: Delete Completed Job
    console.log('\n[TEST] Bug 49: Ledger Deletion Protection');
    const jobRes = await fetch(`${BASE_URL}/api/data/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ job_no: 'JOB-PROTECT', branch_id: 'BranchA', status: 'completed' })
    });
    const jobData = await jobRes.json();
    
    if (jobData.id) {
        const delRes = await fetch(`${BASE_URL}/api/data/jobs/${jobData.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log(`- Admin deleting completed job: Status ${delRes.status} (Expected 403)`);
    }

    console.log('--- PHASE 4 VALIDATION COMPLETE ---');
}

testPhase4().catch(console.error);
