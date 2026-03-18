import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8091');
const BRANCH = 'BC Auto Service';

// 1. Update existing jobs
const jobs = await pb.collection('jobs').getFullList();
for (const job of jobs) {
    if (!job.branch_id) {
        await pb.collection('jobs').update(job.id, { branch_id: BRANCH });
        console.log('Updated', job.job_no, '→ branch_id:', BRANCH);
    }
}

// 2. Create test jobs
const testJobs = [
    { job_no: 'JOB2603-0010', status: 'open', start_date: new Date().toISOString(), plate: 'กข 5678', customer_name: 'สมชาย ใจดี', branch_id: BRANCH, grand_total: 3500 },
    { job_no: 'JOB2603-0011', status: 'in_progress', start_date: new Date(Date.now()-7200000).toISOString(), plate: 'ขค 9012', customer_name: 'วิภา สุขใจ', branch_id: BRANCH, grand_total: 12000, technician: 'ช่างเอก' },
    { job_no: 'JOB2603-0012', status: 'pending_review', start_date: new Date(Date.now()-86400000).toISOString(), plate: 'AB 3456', customer_name: 'John Smith', branch_id: BRANCH, grand_total: 8500, technician: 'ช่างบอย' },
    { job_no: 'JOB2603-0013', status: 'open', start_date: new Date(Date.now()-1800000).toISOString(), plate: 'ฮอ 7890', customer_name: 'มานะ พากเพียร', branch_id: BRANCH, grand_total: 1500 },
];

for (const j of testJobs) {
    try {
        const ex = await pb.collection('jobs').getFullList({ filter: `job_no='${j.job_no}'` });
        if (ex.length > 0) { console.log('SKIP', j.job_no); continue; }
        await pb.collection('jobs').create(j);
        console.log('Created', j.job_no, '|', j.status, '|', j.customer_name);
    } catch(e) { console.error('FAIL', j.job_no, e.message); }
}

// 3. Verify
const all = await pb.collection('jobs').getFullList({sort:'job_no'});
console.log('\n=== All Jobs ===');
console.log('Total:', all.length);
for (const x of all) {
    console.log(`  ${x.job_no} | ${x.status.padEnd(16)} | ${x.branch_id || '(none)'} | ${x.customer_name}`);
}
