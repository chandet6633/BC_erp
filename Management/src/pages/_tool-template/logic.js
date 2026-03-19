/**
 * TOOL_TITLE — Logic File
 *
 * Standard pattern for all tools:
 * 1. Check role access
 * 2. Get branch filter
 * 3. Fetch data from PocketBase
 * 4. Render UI
 *
 * Available globals (from shared imports):
 *   window.pb              — PocketBase client
 *   window.AuthService     — Login, roles, branch
 *   window.showToast()     — Toast notifications
 *   window.showLoading()   — Loading overlay
 *   window.hideLoading()   — Hide loading overlay
 *   window.showImage()     — Image viewer modal
 *   window.formatCurrency()— Format number to Thai currency
 *   window.formatDate()    — Format date to Thai locale
 *   window.getBranch()     — Get current branch
 *   window.getBranchFilter() — Get PocketBase branch filter
 */

// ==========================================
// 1. ROLE CHECK (Poka-Yoke: prevent unauthorized access)
// ==========================================
const user = window.AuthService.getUser();
if (!user) {
    window.location.href = '../main/index.html';
}
// Uncomment and adjust roles as needed:
// window.AuthService.requireRole(['owner', 'manager']);

// ==========================================
// 2. BRANCH FILTER
// ==========================================
const branchFilter = window.getBranchFilter();

// ==========================================
// 3. DATA LOADING
// ==========================================
async function loadData() {
    window.showLoading();
    try {
        // Example: Fetch records from PocketBase
        // const records = await window.pb.collection('your_collection').getFullList({
        //     filter: branchFilter,
        //     sort: '-created'
        // });

        // renderUI(records);
        window.showToast('ข้อมูลโหลดสำเร็จ', 'success');
    } catch (err) {
        console.error('Load error:', err);
        window.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
    window.hideLoading();
}

// ==========================================
// 4. UI RENDERING
// ==========================================
function renderUI(records) {
    const content = document.getElementById('content');
    if (!content) return;

    content.innerHTML = `
        <div class="card p-4">
            <h3 class="text-lg mb-2">Ready to build!</h3>
            <p class="text-sub">Replace this with your tool's UI.</p>
        </div>
    `;
}

// ==========================================
// INIT
// ==========================================
loadData();
