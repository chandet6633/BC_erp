import crypto from 'crypto';

const NOCO_URL = 'http://localhost:9080';
const API_TOKEN = 'UmqurJUh0NhbrQWnhMJ-sXRgA6wfrlX4dvk9Y5YD';

function sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

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

    const usersToUpsert = [
        { username: 'admin', display_name: 'Admin', role: 'admin', password_hash: sha256('admin123'), branch: 'all', active: 1 },
        { username: 'manager1', display_name: 'Manager', role: 'manager', password_hash: sha256('owner123'), branch: 'all', active: 1 },
        { username: 'somchai', display_name: 'Somchai (Mech)', role: 'mechanic', password_hash: sha256('somchai123'), branch: 'samchuk', active: 1 },
        { username: 'sa1', display_name: 'SA 1', role: 'sa', password_hash: sha256('sa123'), branch: 'samchuk', active: 1 }
    ];

    const usersRes = await fetch(`${NOCO_URL}/api/v2/tables/${usersTable.id}/records`, { headers: { 'xc-token': API_TOKEN }});
    const usersData = await usersRes.json();
    
    for (const u of usersToUpsert) {
        const existing = usersData.list.find(x => x.username === u.username);
        if (existing) {
            await fetch(`${NOCO_URL}/api/v2/tables/${usersTable.id}/records`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'xc-token': API_TOKEN },
                body: JSON.stringify({ Id: existing.Id, ...u })
            });
            console.log(`Updated ${u.username}`);
        } else {
            await fetch(`${NOCO_URL}/api/v2/tables/${usersTable.id}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'xc-token': API_TOKEN },
                body: JSON.stringify([u])
            });
            console.log(`Created ${u.username}`);
        }
    }
}
run();
