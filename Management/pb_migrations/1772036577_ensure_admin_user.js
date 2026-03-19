/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    try {
        const admin = app.findAdminByEmail("admin@bcas.com");
        if (admin) {
            admin.setPassword("adminpassword123");
            app.save(admin);
        } else {
            const newAdmin = new Admin();
            newAdmin.email = "admin@bcas.com";
            newAdmin.setPassword("adminpassword123");
            app.save(newAdmin);
        }
        console.log("✅ Superuser admin@bcas.com ensured");
    } catch (e) {
        // In newer PB versions, Admins are Superusers and might use a different API
        // Try the Superuser collection if Admin fails
        try {
            const collection = app.findCollectionByNameOrId("_superusers");
            let record;
            try {
                record = app.dao().findFirstRecordByData("_superusers", "email", "admin@bcas.com");
            } catch (err) {
                // Not found
            }

            if (record) {
                record.setPassword("adminpassword123");
                app.dao().saveRecord(record);
            } else {
                record = new Record(collection);
                record.set("email", "admin@bcas.com");
                record.setPassword("adminpassword123");
                app.dao().saveRecord(record);
            }
            console.log("✅ Superuser admin@bcas.com ensured (via _superusers)");
        } catch (err2) {
            console.warn("⚠️ Could not ensure superuser: " + err2.message);
        }
    }
}, (app) => {
    // No undo for superuser creation
})
