// Accesses global: pb, PAYROLL_API, HR_API
/* global pb, PAYROLL_API, HR_API */
// @ts-nocheck

/**
 * @typedef {Object} DataManager
 * @property {function(string): Promise<boolean>} hasMonthData
 * @property {function(string): string} normalizeTimestamp
 * @property {function(string, string=): Promise<Array>} getAttendance
 * @property {function(string, string=): Promise<Array>} fetchLocalAttendance
 * @property {function(string): Promise<void>} syncMonth
 * @property {function(string, Array=): Promise<void>} syncLeaves
 * @property {function(string, string=): Promise<Array>} getLeaves
 * @property {function(function(string): void=): Promise<void>} syncAll
 * @property {function(): Promise<Array>} getRoster
 * @property {function(): Promise<Array>} syncRoster
 * @property {function(Object): Promise<boolean>} saveRecord
 * @property {function(Array, number): Array<Array>} chunkArray
 * @property {function(string): Promise<Array>} forceSync
 */

/** @type {DataManager} */
window.DataManager = {
    // Check if we have data for a specific month
    async hasMonthData(monthStr) {
        const start = `${monthStr}-01 00:00:00`;
        const end = `${monthStr}-31 23:59:59`;
        try {
            const result = await pb.collection('hr_attendance').getList(1, 1, {
                filter: `date >= '${start}' && date <= '${end}'`,
                sort: '-date'
            });
            return result.totalItems > 0;
        } catch (e) {
            return false;
        }
    },

    // Helper to normalize timestamps for comparison (to nearest second, UTC)
    normalizeTimestamp(ts) {
        if (!ts) return '';
        try {
            // Handle DD/MM/YYYY HH:mm:ss format (common in Google Sheets/Thai locale)
            if (typeof ts === 'string' && ts.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
                const parts = ts.split(/[/\s:]/);
                // parts: [DD, MM, YYYY, HH, mm, ss]
                if (parts.length >= 3) {
                    const day = parts[0];
                    const month = parts[1];
                    const year = parts[2];
                    const hour = parts[3] || '00';
                    const min = parts[4] || '00';
                    const sec = parts[5] || '00';
                    // Reformat to ISO-like YYYY-MM-DDTHH:mm:ss
                    // Note: This assumes local time.
                    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:${sec.padStart(2, '0')}`;
                    return new Date(iso).toISOString();
                }
            }

            const d = new Date(ts);
            // Check if valid
            if (isNaN(d.getTime())) {
                console.warn(`Invalid timestamp encountered: ${ts}`);
                return ts;
            }
            return d.toISOString();
        } catch (e) {
            console.error('Error normalizing timestamp:', ts, e);
            return ts;
        }
    },

    async getAttendance(monthStr, dept = null) {
        return await this.fetchLocalAttendance(monthStr, dept);
    },

    async fetchLocalAttendance(monthStr, dept) {
        // Note: department field in hr_attendance is often empty,
        // so we fetch all records for the month and let caller filter by roster names
        let filter = `date >= '${monthStr}-01 00:00:00' && date <= '${monthStr}-31 23:59:59'`;

        const records = await pb.collection('hr_attendance').getFullList({
            filter: filter,
            sort: '-date'
        });

        return records;
    },

    async syncMonth(monthStr, onProgress = null) {
        if (onProgress) onProgress(`เเผนก: Sync ${monthStr}...`);
        console.log(`Starting Sync for ${monthStr}...`);

        // 1. Sync Roster first
        const employees = await this.syncRoster();
        const depts = [...new Set(employees.map(e => e.department))].filter(d => d);
        if (onProgress) onProgress(`เเผนก: พบ ${depts.length} เเผนก...`);
        console.log(`Fetching logs for departments: ${depts.join(', ')}`);

        // 2. Fetch Attendance logs from Google
        const promises = depts.map(d => {
            return new Promise(resolve => {
                PAYROLL_API.getChecklog(
                    d,
                    monthStr,
                    res => resolve(res.records || []),
                    err => {
                        console.error(`Error fetching attendance for Dept ${d}:`, err);
                        resolve([]);
                    }
                );
            });
        });

        const results = await Promise.all(promises);
        const allRecords = results.flat();
        if (onProgress) onProgress(`พบ ${allRecords.length} รายการจาก Google...`);
        console.log(`Fetched ${allRecords.length} attendance records from Google.`);

        if (allRecords.length === 0) {
            console.log('No attendance records found from Google.');
        } else {
            // 3. De-duplicate: Fetch existing local records for this month
            const existingRecords = await this.fetchLocalAttendance(monthStr);
            console.log(`Found ${existingRecords.length} existing local records for ${monthStr}.`);

            // Use a Set for O(1) lookups
            const existingKeys = new Set(
                existingRecords.map(r => {
                    const ts = r.date || r.timestamp;
                    const eid = r.employee_id || r.name;
                    return `${eid}_${this.normalizeTimestamp(ts)}`;
                })
            );

            const recordsToSave = [];
            allRecords.forEach(r => {
                const name = r.Name || r.name || 'Unknown';
                const rawTs = r.Timestamp || r.timestamp || r.date;
                const normTs = this.normalizeTimestamp(rawTs);

                if (!normTs) return;

                const key = `${name}_${normTs}`;
                if (!existingKeys.has(key)) {
                    recordsToSave.push({
                        Name: name,
                        Timestamp: rawTs,
                        Type: r.Type || r.type || r.status,
                        Department: r.Department || r.department,
                        Store: r.Store || r.store,
                        _normalizedTs: normTs
                    });
                }
            });

            console.log(`Identified ${recordsToSave.length} NEW records to save.`);

            // 4. Save NEW records in optimized chunks
            if (recordsToSave.length > 0) {
                const CHUNK_SIZE = 50;
                let savedCount = 0;
                for (let i = 0; i < recordsToSave.length; i += CHUNK_SIZE) {
                    if (onProgress) onProgress(`บันทึก: ${i} / ${recordsToSave.length}...`);
                    const chunk = recordsToSave.slice(i, i + CHUNK_SIZE);
                    const results = await Promise.all(chunk.map(r => this.saveRecord(r)));
                    savedCount += results.filter(s => s).length;
                }
                if (onProgress) onProgress(`บันทึกสำเร็จ ${savedCount} รายการ`);
                console.log(`Successfully saved ${savedCount} / ${recordsToSave.length} records.`);
            }
        }

        // 5. Sync Leaves
        await this.syncLeaves(monthStr, depts, onProgress);

        // Mark Sync Complete
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`last_sync_${monthStr}`, today);
        console.log(`Sync Complete for ${monthStr}.`);
    },

    async syncLeaves(monthStr, depts = [], onProgress = null) {
        if (onProgress) onProgress(`วันลา: Sync ${monthStr}...`);
        console.log(`Syncing Leaves for ${monthStr}...`);

        if (depts.length === 0) {
            const employees = await this.syncRoster();
            depts = [...new Set(employees.map(e => e.department))].filter(d => d);
        }

        const promises = depts.map(d => {
            return new Promise(resolve => {
                PAYROLL_API.getLeavelog(
                    d,
                    monthStr,
                    res => resolve(res.records || []),
                    err => {
                        console.error(`Error fetching leaves for Dept ${d}:`, err);
                        resolve([]);
                    }
                );
            });
        });

        const results = await Promise.all(promises);
        const allLeaves = results.flat();
        console.log(`Fetched ${allLeaves.length} leave records.`);

        if (allLeaves.length === 0) return;

        // De-duplicate Leaves
        // Strategy: Fetch local leaves for month
        // Range check: Starts in month OR Ends in month
        // Range check logic (Client-Side for robustness)
        const [y, m] = monthStr.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();

        const yStr = String(y);
        const mStr = String(m).padStart(2, '0');
        const dStr = String(lastDay).padStart(2, '0');

        const start = `${yStr}-${mStr}-01 00:00:00`;
        const end = `${yStr}-${mStr}-${dStr} 23:59:59`;

        console.log(`[SyncLeaves] Fetching leaves using server-side filtering...`);
        // BUG 6 FIX: Use server-side filtering instead of downloading all history
        const existingLeaves = await pb.collection('hr_leaves').getFullList({
            filter: `start_date <= '${end}' && end_date >= '${start}'`
        });
        console.log(`[SyncLeaves] Server returned ${existingLeaves.length} matching leaves.`);

        // Key: Name + StartDate + EndDate (Approximate unique key)
        const existingSet = new Set(existingLeaves.map(l => `${l.name}_${l.start_date}_${l.end_date}`));

        const newLeaves = allLeaves.filter(l => {
            const lName = l['Name-นามสกุล'] || l.Name || 'Unknown';
            const lStart = l.StartDate || l['Start Date'] || l.start_date;
            const lEnd = l.EndDate || l['End Date'] || l.end_date;

            if (!lStart || !lName) return false; // Skip invalid

            const key = `${lName}_${lStart.slice(0, 10)}_${lEnd.slice(0, 10)}`;
            return !existingSet.has(key);
        });

        console.log(`Identify ${newLeaves.length} NEW leave records.`);

        const chunks = this.chunkArray(newLeaves, 50);
        for (const chunk of chunks) {
            await Promise.all(
                chunk.map(async l => {
                    try {
                        await pb.collection('hr_leaves').create({
                            employee_id: l['Employee ID'] || l.Name || 'Unknown',
                            name: l['Name-นามสกุล'] || l.Name || l['Name'],
                            department: l.department || l.Department,
                            start_date: l.StartDate || l['Start Date'] || l.start_date,
                            end_date: l.EndDate || l['End Date'] || l.end_date,
                            reason: l.Reason || l.reason,
                            type: l.LeaveType || l['Leave Type'] || l.type || 'other'
                        });
                        window.AuditService?.log('create_leave', `Imported leave for ${l['Name-นามสกุล'] || l.Name}`, 'hr_data_manager');
                    } catch (e) {
                        console.error('Error saving leave:', e);
                    }
                })
            );
        }
    },

    async getLeaves(monthStr, dept = null) {
        // Return from Local PB directly
        // Range check: Starts in month OR Ends in month
        // Safer than '~' which fails on Date fields
        const [y, m] = monthStr.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();

        // Strict Padding
        const yStr = String(y);
        const mStr = String(m).padStart(2, '0');
        const dStr = String(lastDay).padStart(2, '0');

        const start = `${yStr}-${mStr}-01 00:00:00`;
        const end = `${yStr}-${mStr}-${dStr} 23:59:59`;

        try {
            // BUG 6 FIX: Server-Side Filter Strategy
            let filter = `start_date <= '${end}' && end_date >= '${start}'`;
            if (dept && dept !== '') {
                filter += ` && department='${dept}'`;
            }
            
            const leaves = await pb.collection('hr_leaves').getFullList({
                filter: filter
            });

            return leaves.sort((a, b) => b.start_date.localeCompare(a.start_date));
        } catch (e) {
            console.error('Error fetching leaves:', e);
            return [];
        }
    },

    async syncAll(onProgress) {
        // Sync from May 2025 to Current Month
        const startYear = 2025;
        const startMonth = 5;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        let y = startYear;
        let m = startMonth;

        while (y < currentYear || (y === currentYear && m <= currentMonth)) {
            const monthStr = `${y}-${String(m).padStart(2, '0')}`;
            if (onProgress) onProgress(`กำลัง Sync ข้อมูลเดือน ${monthStr}...`);

            try {
                await this.syncMonth(monthStr);
            } catch (e) {
                console.error(`Failed to sync ${monthStr}:`, e);
                if (onProgress) onProgress(`Error syncing ${monthStr}: ${e.message}`);
            }

            // Next month
            m++;
            if (m > 12) {
                m = 1;
                y++;
            }
        }
        if (onProgress) onProgress('Sync เสร็จสิ้นทั้งหมด!');
    },

    async getRoster() {
        // Pure Local Fetch
        try {
            const localRoster = await pb.collection('hr_employees').getFullList({ sort: 'name' });
            return localRoster.map(e => ({
                id: e.emp_id,
                name: e.name,
                department: e.department,
                sex: e.sex
            }));
        } catch (e) {
            console.error('Failed to fetch local roster:', e);
            return [];
        }
    },

    async syncRoster() {
        console.log('Syncing Roster...');
        return new Promise(resolve => {
            HR_API.getRoster(
                async data => {
                    // 1. Sync Logic (Upsert)
                    try {
                        const existingEmployees = await pb.collection('hr_employees').getFullList();
                        const existingMap = new Map(existingEmployees.map(e => [e.emp_id, e]));

                        const chunks = this.chunkArray([...data], 50);
                        for (const chunk of chunks) {
                            await Promise.all(
                                chunk.map(async u => {
                                    const empData = {
                                        emp_id: u.id,
                                        name: u.name,
                                        department: u.department,
                                        sex: u.sex
                                    };
                                    const existing = existingMap.get(u.id);
                                    try {
                                        if (existing) {
                                            await pb.collection('hr_employees').update(existing.id, empData);
                                            window.AuditService?.log('update_employee', `Updated employee ${u.name}`, 'hr_data_manager');
                                        } else {
                                            await pb.collection('hr_employees').create(empData);
                                            window.AuditService?.log('create_employee', `Created employee ${u.name}`, 'hr_data_manager');
                                        }
                                    } catch (e) {
                                        console.error(`Error syncing employee ${u.name}:`, e);
                                    }
                                })
                            );
                        }
                    } catch (err) {
                        console.error('Error updating roster in PB:', err);
                    }

                    // Return updated local data
                    resolve(await this.getRoster());
                },
                async err => {
                    console.error('Error fetching roster from API:', err);
                    resolve(await this.getRoster()); // Fallback to local
                }
            );
        });
    },

    async saveRecord(r) {
        // r: { Timestamp, Name, Type, Store, Department, ... }

        // Use pre-calculated normalized timestamp if available
        const normalizedTs = r._normalizedTs || this.normalizeTimestamp(r.Timestamp);

        // Use Name directly for employee_id as per user confirmation that it stores names
        const empId = r.Name || r.name || 'Unknown';

        // Prepare Record Data
        const recordData = {
            employee_id: empId,
            date: normalizedTs, // PB Field: date
            status: r.Type, // PB Field: status
            department: r.Department || r.department || '',
            store: r.Store || '',
            name: empId // PB Field: name
        };

        // Attempt Create
        try {
            await pb.collection('hr_attendance').create(recordData);
            window.AuditService?.log('create_attendance', `Recorded attendance for ${empId}`, 'hr_data_manager');
            return true; // Success
        } catch (e) {
            console.error('FAILED TO SAVE RECORD:', recordData);
            if (e.response) {
                console.error('Server Response (Validation Errors):', e.response);
            } else {
                console.error('Error Details:', e);
            }
            return false; // Failed
        }
    },

    chunkArray(myArray, chunk_size) {
        var results = [];
        while (myArray.length) {
            results.push(myArray.splice(0, chunk_size));
        }
        return results;
    },

    // Explicit Sync Button Handler
    async forceSync(monthStr) {
        localStorage.removeItem(`last_sync_${monthStr}`);
        await this.syncMonth(monthStr);
        return await this.fetchLocalAttendance(monthStr);
    }
};
