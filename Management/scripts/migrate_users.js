import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function migrateUsers() {
    try {
        await pb.admins.authWithPassword('admin2@bcauto.local', '1234567890');
        const employeeData = await pb.collection('employees').getFullList();

        for (const emp of employeeData) {
            try {
                const email = `employee_${emp.id}@bcauto.local`;
                const username = `user_${emp.id}`;
                const randomPassword = 'A1b2' + Math.random().toString(36).substring(2, 10);

                // Ensure branch is either main or suphan
                let branch = emp.branch === 'suphan' ? 'suphan' : 'main';

                await pb.collection('users').create({
                    username: username,
                    email: email,
                    emailVisibility: false,
                    password: randomPassword,
                    passwordConfirm: randomPassword,
                    name: emp.name + (emp.nickname ? ' (' + emp.nickname + ')' : ''),
                    role: 'employee',
                    branch: branch,
                    pin_code: emp.pin_code
                });
                console.log(`✅ Migrated employee: ${emp.name}`);
            } catch (err) {
                console.error(`Failed to migrate ${emp.name}:`);
                if (err.data) console.error(JSON.stringify(err.data, null, 2));
            }
        }
        console.log('✅ User migration complete!');
    } catch (e) {
        console.error('Fatal error:', e.message);
    }
}
migrateUsers();
