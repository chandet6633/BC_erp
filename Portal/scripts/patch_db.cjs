const fs = require('fs');

const files = [
    'w:\\Works\\Portal\\src\\pages\\bcauto-service\\js\\database.js',
    'w:\\Works\\Portal\\src\\pages\\bcauto-mueng-suphan\\js\\database.js'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Tab map
    content = content.replace("'tab-expenses': 'expenses'", "'tab-expenses': 'expenses',\n                'tab-revenue': 'revenue_verification'");

    // 2. getSheetLabel
    if (content.includes("table === 'expenses' ? 'รายจ่าย'")) {
        content = content.replace("table === 'expenses' ? 'รายจ่าย'", "table === 'expenses' ? 'รายจ่าย' : table === 'revenue_verification' ? 'รายรับ'");
    }

    // 3. dateCol logic
    content = content.replace(/table === 'expenses' \? 'date' : 'open_date'/g, "(table === 'expenses' || table === 'revenue_verification') ? 'date' : 'open_date'");

    // 4. loadTableData fetch
    const fetchExp = `res = await window.EntryService.getExpenses(page, PAGE_SIZE, {
                        sort: orderCol,
                        filter: filters.join(' && ') || ''
                    });`;
    if (content.includes(fetchExp)) {
        content = content.replace(fetchExp, fetchExp + `
                } else if (table === 'revenue_verification') {
                    res = await window.EntryService.getRevenues(page, PAGE_SIZE, {
                        sort: orderCol,
                        filter: filters.join(' && ') || ''
                    });`);
    }

    // 5. orderCol logic
    content = content.replace("table === 'expenses' ? '-date'", "(table === 'expenses' || table === 'revenue_verification') ? '-date'");

    // 6. orderCol logic in another place (if any)
    // 7. render dispatch
    const renderExp = `renderExpenses(res.items);
                }`;
    if (content.includes(renderExp)) {
        content = content.replace(renderExp, renderExp + ` else if (table === 'revenue_verification') {
                    renderRevenue(res.items);
                }`);
    }

    // 8. deleteRow
    content = content.replace("if (table === 'expenses') await window.EntryService.deleteExpense(id);", "if (table === 'expenses') await window.EntryService.deleteExpense(id); else if (table === 'revenue_verification') await window.EntryService.deleteRevenue(id);");

    // 9. clearTable fetch
    const clearFetchExp = `records = await window.EntryService.getExpenses(1, 10000, {
                fields: 'id',
                filter: \`\${getBranchFilter()}\`
            }).then(r => r.items);`;
    if (content.includes(clearFetchExp)) {
        content = content.replace(clearFetchExp, clearFetchExp + `
        } else if (tableName === 'revenue_verification') {
            records = await window.EntryService.getRevenues(1, 10000, {
                fields: 'id',
                filter: \`\${getBranchFilter()}\`
            }).then(r => r.items);`);
    }

    // 10. clearTable delete
    content = content.replace("if (tableName === 'expenses') return window.EntryService.deleteExpense(id);", "if (tableName === 'expenses') return window.EntryService.deleteExpense(id);\n                    if (tableName === 'revenue_verification') return window.EntryService.deleteRevenue(id);");

    // 11. handleExport
    const exportExp = `data = await window.EntryService.getExpenses(1, 10000, {
                filter: \`\${getBranchFilter()}\`,
                sort: '-created'
            }).then(res => res.items);`;
    if (content.includes(exportExp)) {
        content = content.replace(exportExp, exportExp + `
        } else if (currentTable === 'revenue_verification') {
            data = await window.EntryService.getRevenues(1, 10000, {
                filter: \`\${getBranchFilter()}\`,
                sort: '-created'
            }).then(res => res.items);`);
    }

    // 12. getEditableFields
    const fieldsExp = `if (table === 'expenses')
        return [
            { key: 'date', label: 'วันที่', type: 'date' },
            { key: 'category', label: 'หมวดหมู่' },
            { key: 'amount', label: 'จำนวนเงิน', type: 'number' },
            { key: 'notes', label: 'หมายเหตุ' }
        ];`;
    if (content.includes(fieldsExp)) {
        content = content.replace(fieldsExp, fieldsExp + `
    if (table === 'revenue_verification')
        return [
            { key: 'date', label: 'วันที่', type: 'date' },
            { key: 'category', label: 'หมวดหมู่' },
            { key: 'amount', label: 'จำนวนเงิน', type: 'number' },
            { key: 'notes', label: 'หมายเหตุ' }
        ];`);
    }

    // 13. saveEdit
    content = content.replace("if (table === 'expenses') {", "if (table === 'expenses') {\n            await window.EntryService.updateExpense(id, updates);\n        } else if (table === 'revenue_verification') {");
    // wait, that replacement would destroy the next line!
    // we replaced `await window.EntryService.updateExpense(id, updates);` entirely...
    // Let's use string replace carefully for saveEdit
    content = content.replace("if (table === 'expenses') {\n            await window.EntryService.updateExpense(id, updates);\n        } else {", "if (table === 'expenses') {\n            await window.EntryService.updateExpense(id, updates);\n        } else if (table === 'revenue_verification') {\n            await window.EntryService.updateRevenue(id, updates);\n        } else {");

    // 14. saveNewRow
    content = content.replace("if (table === 'expenses') {\n            await window.EntryService.createExpense(record);\n        } else {", "if (table === 'expenses') {\n            await window.EntryService.createExpense(record);\n        } else if (table === 'revenue_verification') {\n            await window.EntryService.createRevenue(record);\n        } else {");

    // 15. exportFullBackup Array
    content = content.replace("['transactions', 'service_items', 'product_groups', 'expenses', 'owner_expenses']", "['transactions', 'service_items', 'product_groups', 'expenses', 'revenue_verification', 'owner_expenses']");

    // 16. exportFullBackup Fetch
    const fullBackupExp = `data = await window.EntryService.getExpenses(1, 10000, { sort: '-created' }).then(r => r.items);`;
    if (content.includes(fullBackupExp)) {
        content = content.replace(fullBackupExp, fullBackupExp + `
                else if (col === 'revenue_verification')
                    data = await window.EntryService.getRevenues(1, 10000, { sort: '-created' }).then(r => r.items);`);
    }

    // 17. archiveOldData Array
    const archiveArrExp = `{ name: 'expenses', dateField: 'date' },`;
    if (content.includes(archiveArrExp)) {
        content = content.replace(archiveArrExp, archiveArrExp + `\n            { name: 'revenue_verification', dateField: 'date' },`);
    }

    // 18. archiveOldData Fetch
    const archFetchExp1 = `old = await window.EntryService.getExpenses(1, 10000, {
                        filter: \`\${col.dateField} < '\${cutoff} 00:00:00'\`
                    }).then(r => r.items);`;
    if (content.includes(archFetchExp1)) {
        content = content.replace(archFetchExp1, archFetchExp1 + `
                } else if (col.name === 'revenue_verification') {
                    old = await window.EntryService.getRevenues(1, 10000, {
                        filter: \`\${col.dateField} < '\${cutoff} 00:00:00'\`
                    }).then(r => r.items);`);
    }

    const archFetchExp2 = `old = await window.EntryService.getExpenses(1, 10000, {
                        filter: \`\${col.dateField} < '\${cutoff} 00:00:00'\`,
                        fields: 'id'
                    }).then(r => r.items);`;
    if (content.includes(archFetchExp2)) {
        content = content.replace(archFetchExp2, archFetchExp2 + `
                } else if (col.name === 'revenue_verification') {
                    old = await window.EntryService.getRevenues(1, 10000, {
                        filter: \`\${col.dateField} < '\${cutoff} 00:00:00'\`,
                        fields: 'id'
                    }).then(r => r.items);`);
    }

    // 19. append renderRevenue function
    if (!content.includes('function renderRevenue')) {
        content += `

// ==========================================
// RENDER REVENUE
// ==========================================
window.renderRevenue = function (data) {
    const tbody = document.getElementById('tbody-revenue');
    if (!tbody) return;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">ไม่มีข้อมูลรายรับ</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(r => {
        return \`<tr>
            <td data-label="วันที่">\${r.date ? r.date.substring(0, 10) : '-'}</td>
            <td data-label="หมวดหมู่">\${r.category || '-'}</td>
            <td data-label="จำนวนเงิน" class="text-right">\${window.formatCurrency ? window.formatCurrency(r.amount) : Number(r.amount).toLocaleString('th-TH',{minimumFractionDigits:2})}</td>
            <td data-label="หมายเหตุ">\${r.notes || '-'}</td>
            <td data-label="จัดการ">
                <div class="row-actions">
                    <button class="edit-btn" onclick="editRow('revenue_verification','\${r.id}')">✏️</button>
                    <button class="delete-btn" onclick="deleteRow('revenue_verification','\${r.id}')">🗑️</button>
                </div>
            </td>
        </tr>\`;
    }).join('');
};
`;
    }

    fs.writeFileSync(file, content);
    console.log('Patched ' + file);
});
