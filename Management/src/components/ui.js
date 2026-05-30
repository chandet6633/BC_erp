/**
 * UI Components (Toasts, Loaders, Modals)
 * Centralizes UI generation so HTML doesn't need to be duplicated.
 */

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
window.showToast = function (message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

// ==========================================
// LOADING OVERLAY
// ==========================================
window.showLoading = function () {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    }
    overlay.classList.add('show');
};

window.hideLoading = function () {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.classList.remove('show');
};

// ==========================================
// IMAGE VIEWER MODAL
// ==========================================
window.closeImageModal = function () {
    const modal = document.getElementById('globalImageModal');
    if (modal) {
        modal.classList.remove('show');
        // Clear src to save memory when hidden
        const img = document.getElementById('globalModalImage');
        if (img) img.src = '';
    }
};

window.showImage = function (url) {
    if (!url) return;

    let modal = document.getElementById('globalImageModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'globalImageModal';
        modal.className = 'modal-overlay';
        modal.onclick = window.closeImageModal;

        modal.innerHTML = `
            <div style="position: relative; max-width: 90vw; max-height: 90vh;" onclick="event.stopPropagation()">
                <button onclick="window.closeImageModal()" class="btn" style="
                    position: absolute; 
                    top: -15px; 
                    right: -15px; 
                    background: var(--danger); 
                    color: white; 
                    border: 2px solid white; 
                    border-radius: 50%; 
                    width: 30px; 
                    height: 30px; 
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                ">✕</button>
                <img id="globalModalImage" src="" style="
                    max-width: 100%; 
                    max-height: 85vh; 
                    border-radius: var(--radius-lg); 
                    display: block; 
                    box-shadow: var(--shadow-lg); 
                    background: white;
                ">
            </div>
        `;
        document.body.appendChild(modal);

        // Escape key listener for closing
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') window.closeImageModal();
        });
    }

    const img = document.getElementById('globalModalImage');
    img.src = url;
    modal.classList.add('show');
};
