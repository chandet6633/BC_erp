async function updateSpecificUser() {
    try {
        const authReq = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'ADMIN_EMAIL', password: 'ADMIN_PASSWORD' })
        });
        const auth = await authReq.json();
        const token = auth.token;

        const userId = '7d54xh7324aru5f';
        const data = {
            name: "Test Employee Update",
            role: "employee",
            branch: "main",
            pin: "5555",
            active: true
        };

        const updateReq = await fetch(`http://127.0.0.1:8090/api/collections/users/records/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(data)
        });

        if (updateReq.ok) {
            console.log('Update successful on test script. The frontend must be sending something else.');
        } else {
            const errorData = await updateReq.json();
            console.error('Update failed 400. Detailed validation errors:', JSON.stringify(errorData, null, 2));
        }

    } catch (e) {
        console.error(e);
    }
}
updateSpecificUser();
