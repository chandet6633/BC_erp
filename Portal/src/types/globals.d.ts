export { };

declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
        showLoading: () => void;
        hideLoading: () => void;
        showImage: (url: string) => void;
        closeImageModal: () => void;
        PocketBase: any;
        pb: any;
        PAYROLL_API: any;
        HR_API: any;
        loadCollections: () => void;
        deleteCollection: (id: string, name: string) => void;
        createPreset: (key: string) => void;
    }
    var PocketBase: any;

    interface HTMLElement {
        src?: string;
    }
}
