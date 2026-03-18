export { };

declare global {
    interface Window {
        formatCurrency(num: any): string;
        formatDate(dateStr: string): string;
        formatDateTime(dateStr: string): string;
        setupTabs(tabBtns: any, tabContents: any): void;
        getCurrentMonth(): number;
        getTodayThailand(): string;
        getCurrentYear(): number;
        getMonthName(month: number): string;
        getDayName(day: number): string;
        excelDateToJS(serial: any): Date | null;
        parseNumber(val: any): number;
        getChartDefaults(): any;
        EXPENSE_CATEGORIES: string[];
        OWNER_EXPENSE_CATEGORIES: string[];
        compressImage(file: File, maxWidth?: number, quality?: number): Promise<File>;
        uploadReceipt(file: File, folder?: string): Promise<string | null>;
        debounce(func: Function, wait: number): Function;
        EntryService: any;
        TransactionService: any;
        AuthService: any;
        isOwner: () => boolean;
        requireOwner: (redirectPath?: string) => boolean;
        getBranch: () => string | null;
        getBranchFilter: (prefix?: string) => string;
        setBranch: (branch: string) => void;
        DataManager: any;
        pb: any;
    }
    var PAYROLL_API: any;
    var HR_API: any;
}
