async function simulateFrontendUpdate() {
    try {
        console.log('--- Logging in as Admin User ---');
        // We know from users collection that 'Nat' is 'admin' or 'owner'. We need a password for Nat.
        // Actually, let's just create an admin user over admin API first, then login as them.
        const adminReq = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'ADMIN_EMAIL', password: 'ADMIN_PASSWORD' })
        });
        const sysAdmin = await adminReq.json();

        console.log('--- Creating a Temp Manager User ---');
        const mkUser = await fetch('http://127.0.0.1:8090/api/collections/users/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': sysAdmin.token },
            body: JSON.stringify({
                email: 'tempmanager@example.com',
                password: 'TEMP_PASSWORD',
                passwordConfirm: 'TEMP_PASSWORD',
                name: 'Temp Manager',
                role: 'manager',
                pin: '9999',
                active: true
            })
        });
        const managerUser = await mkUser.json();

        console.log('--- Logging in as Temp Manager User ---');
        const loginReq = await fetch('http://127.0.0.1:8090/api/collections/users/auth-with-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'tempmanager@example.com', password: 'TEMP_PASSWORD' })
        });
        const managerAuth = await loginReq.json();

        console.log('--- Attempting to update another user as Manager ---');
        // Update user 7d54xh7324aru5f (Test Employee)
        const updateReq = await fetch(`http://127.0.0.1:8090/api/collections/users/records/7d54xh7324aru5f`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': managerAuth.token },
            body: JSON.stringify({
                name: "Updated Name",
                role: "employee",
                // Simulate frontend sending email
                email: "testemployee@example.com",
            })
        });

        if (updateReq.ok) {
            console.log('Update worked! No 400 error.');
        } else {
            console.error('Update failed. Detailed Validation Errors:', await updateReq.text());
        }

        console.log('--- Cleaning Up ---');
        await fetch(`http://127.0.0.1:8090/api/collections/users/records/${managerUser.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': sysAdmin.token }
        });

    } catch (e) {
        console.error(e);
    }
}
simulateFrontendUpdate();
