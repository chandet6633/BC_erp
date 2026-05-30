/**
 * ReportService handles PDF and Excel exports for the system.
 * Uses html2pdf.js for high-fidelity visual snapshots.
 */
export const ReportService = {
    /**
     * Export an element to PDF
     * @param {HTMLElement} element - The DOM element to export
     * @param {string} filename - The name of the resulting PDF file
     */
    async exportToPDF(element, filename = 'report.pdf') {
        const options = {
            margin: 10,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            // @ts-ignore
            await html2pdf().set(options).from(element).save();
            return true;
        } catch (error) {
            console.error('PDF Export failed:', error);
            return false;
        }
    }
};

// @ts-ignore
window.ReportService = ReportService;
