/**
 * Excel Export Service — Export data to .xlsx using SheetJS (loaded from CDN).
 * Supports multi-sheet workbooks with auto-column-width and Thai headers.
 */

let XLSX = null

/** Lazy-load SheetJS from CDN */
async function loadSheetJS() {
    if (XLSX) return XLSX
    
    const script = document.createElement('script')
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
    
    await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
    })
    
    XLSX = window.XLSX
    return XLSX
}

/**
 * Export data to Excel (.xlsx) file.
 * @param {Array<{name: string, headers: string[], rows: Array<Array<any>>}>} sheets - Array of sheet definitions
 * @param {string} filename - Output filename (without extension)
 */
export async function exportToExcel(sheets, filename = 'export') {
    const xlsx = await loadSheetJS()
    
    const wb = xlsx.utils.book_new()
    
    for (const sheet of sheets) {
        // Build data array: headers + rows
        const data = [sheet.headers, ...sheet.rows]
        const ws = xlsx.utils.aoa_to_sheet(data)
        
        // Auto-column-width based on content
        const colWidths = sheet.headers.map((h, colIdx) => {
            let maxLen = h.length
            sheet.rows.forEach(row => {
                const val = row[colIdx]
                const len = val != null ? String(val).length : 0
                if (len > maxLen) maxLen = len
            })
            // Thai characters are wider, multiply by ~1.5
            return { wch: Math.min(Math.max(maxLen * 1.5, 8), 50) }
        })
        ws['!cols'] = colWidths
        
        // Style header row (bold) - SheetJS community edition doesn't support styles
        // but column widths still work
        
        xlsx.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31)) // Sheet name max 31 chars
    }
    
    // Generate and download
    xlsx.writeFile(wb, `${filename}.xlsx`)
}

/**
 * Quick export helper: single sheet from a table-like structure.
 * @param {string[]} headers - Column headers
 * @param {Array<Array<any>>} rows - Data rows
 * @param {string} filename - Filename without extension
 * @param {string} sheetName - Sheet tab name
 */
export async function exportSingleSheet(headers, rows, filename, sheetName = 'Data') {
    return exportToExcel([{ name: sheetName, headers, rows }], filename)
}
