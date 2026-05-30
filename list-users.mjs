

const NOCO_URL = 'http://localhost:9080';
const API_TOKEN = 'UmqurJUh0NhbrQWnhMJ-sXRgA6wfrlX4dvk9Y5YD';

async function run() {
    const wsRes = await fetch(`${NOCO_URL}/api/v2/meta/workspaces`, { headers: { 'xc-token': API_TOKEN }});
    const ws = await wsRes.json();
    const wsId = ws.list[0].id;
    
    const basesRes = await fetch(`${NOCO_URL}/api/v2/meta/workspaces/${wsId}/bases`, { headers: { 'xc-token': API_TOKEN }});
    const bases = await basesRes.json();
    const base = bases.list.find(b => b.title === 'BC_ERP') || bases.list[0];
    
    const tablesRes = await fetch(`${NOCO_URL}/api/v2/meta/bases/${base.id}/tables`, { headers: { 'xc-token': API_TOKEN }});
    const tables = await tablesRes.json();
    const usersTable = tables.list.find(t => t.title.toLowerCase() === 'users');
    
    const usersRes = await fetch(`${NOCO_URL}/api/v2/tables/${usersTable.id}/records`, { headers: { 'xc-token': API_TOKEN }});
    const usersData = await usersRes.json();
    console.log(usersData.list.map(u => `${u.username} (${u.role}): ${u.password}`));
}
run();
