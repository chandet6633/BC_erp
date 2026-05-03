/**
 * Import Service — Shared Excel/JSON Import and Duplicate Checking Logic
 * ══════════════════════════════════════════════════════════════════════
 * Provides headless utility functions to parse Excel files, detect sheet types,
 * and check for duplicate records against the database before importing.
 * Extracted from the legacy database.js tool.
 */

import * as XLSX from 'xlsx';
import { pb } from '../Management/src/services/pocketbase.js'; // Adjust path depending on usage

/**
 * Parse an Excel or JSON file into headers and data rows.
 * @param {File} file 
 * @returns {Promise<{headers: string[], data: any[][]}>}
 */
export async function parseImportFile(file) {
    if (!file.name.match(/\.xlsx?$/i) && !file.name.match(/\.json$/i)) {
        throw new Error('Invalid file type. Please use .xlsx or .json');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
                const sheetName = wb.SheetNames[0];
                const sheet = wb.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                if (data.length < 2) {
                    throw new Error('File contains no data');
                }

                const headers = data[0];
                const rows = data.slice(1).filter(r => r.some(c => c != null && c !== ''));

                resolve({ headers, data: rows });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Auto-detect the type of data being imported based on column headers.
 * @param {string[]} headers 
 * @returns {string} - 'product_groups' | 'service_items' | 'transactions' | 'auto'
 */
export function detectSheetType(headers) {
    const h = headers.map(String).join(' ');
    if (h.includes('รหัสกลุ่มสินค้า') || h.includes('ชื่อกลุ่มสินค้า')) return 'product_groups';
    if (h.includes('รหัสสินค้า') || h.includes('ชื่อสินค้า')) return 'service_items';
    if (h.includes('ใบบันทึกบริการ')) return 'transactions';
    return 'auto';
}

/**
 * Check a set of parsed rows against the database for duplicates.
 * @param {string} sheetType 
 * @param {any[][]} parsedData 
 * @param {string} branch - branch id/name to scope the check
 * @param {string} reportMonth - optional, used for product_groups
 * @returns {Promise<{dupCount: number, newCount: number, rowsWithStatus: any[]}>}
 */
export async function detectDuplicates(sheetType, parsedData, branch, reportMonth = '') {
    let existingIds = new Set();
    const branchFilter = branch && branch !== 'all' ? `branch_id = '${branch}'` : '';

    try {
        if (sheetType === 'transactions') {
            const data = await pb.collection('jobs').getFullList({
                fields: 'job_id',
                filter: branchFilter
            });
            existingIds = new Set((data || []).map(e => String(e.job_id)));
        } else if (sheetType === 'service_items') {
            const data = await pb.collection('job_items').getFullList({
                fields: 'job_id,item_name',
                filter: branchFilter
            });
            existingIds = new Set((data || []).map(e => `${e.job_id}|${e.item_name}`));
        } else if (sheetType === 'product_groups') {
            const filter = branchFilter ? `(${branchFilter}) && report_month = '${reportMonth}'` : `report_month = '${reportMonth}'`;
            const data = await pb.collection('product_groups').getFullList({
                fields: 'code',
                filter: filter
            });
            existingIds = new Set((data || []).map(e => `${e.code}|${reportMonth}`));
        }
    } catch (err) {
        console.error('Duplicate check error:', err);
    }

    let dupCount = 0;
    let newCount = 0;
    const rowsWithStatus = parsedData.map(row => {
        let isDuplicate = false;
        const id = String(row[0] || '').trim();

        if (sheetType === 'transactions') {
            isDuplicate = existingIds.has(id);
        } else if (sheetType === 'service_items') {
            const itemName = String(row[4] || '').trim(); // Row 4 (column E) should be Name/Description
            isDuplicate = existingIds.has(`${id}|${itemName}`);
        } else if (sheetType === 'product_groups') {
            isDuplicate = existingIds.has(`${id}|${reportMonth}`);
        }

        if (isDuplicate) dupCount++;
        else newCount++;

        return { row, isDuplicate };
    });

    return { dupCount, newCount, rowsWithStatus };
}
