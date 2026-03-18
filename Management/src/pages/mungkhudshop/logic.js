/**
 * MungkhudShop Iframe Loader
 * Generates an SSO token from Management's auth and loads MungkhudShop in an iframe.
 */
import '../../assets/js/app-shell.js';

const MUNGKHUD_PORT = 8091;

function getMungkhudBaseUrl() {
    // Use the same hostname as the current page but on MungkhudShop's port
    return `${window.location.protocol}//${window.location.hostname}:${MUNGKHUD_PORT}`;
}

function getSSOToken() {
    // Try AuthService first (if loaded via app-shell)
    const AuthService = window['AuthService'];
    if (AuthService && typeof AuthService.getSSOToken === 'function') {
        const token = AuthService.getSSOToken();
        if (token) return token;
    }

    // Fallback: build token from sessionStorage/localStorage directly
    const role = sessionStorage.getItem('bcauto_role');
    const name = sessionStorage.getItem('bcauto_user_name');
    const id = sessionStorage.getItem('bcauto_user_id');
    if (!role || !name) return null;

    const ssoData = {
        id: id || 'sso_user',
        username: name,
        display_name: name,
        role: role,
        branch_id: localStorage.getItem('bcauto_branch') || 'main',
        issued_at: Date.now()
    };

    try {
        return btoa(unescape(encodeURIComponent(JSON.stringify(ssoData))));
    } catch (e) {
        console.error('SSO fallback token generation failed:', e);
        return null;
    }
}

function loadMungkhudShop() {
    const frame = document.getElementById('mungkhudFrame');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');

    // Reset state
    loading.style.display = 'flex';
    error.style.display = 'none';
    frame.style.display = 'none';

    const token = getSSOToken();
    if (!token) {
        loading.style.display = 'none';
        error.style.display = 'flex';
        error.querySelector('span:nth-child(2)').textContent = 'ไม่สามารถสร้าง SSO Token ได้ — กรุณาเข้าสู่ระบบใหม่';
        return;
    }

    const baseUrl = getMungkhudBaseUrl();
    const url = `${baseUrl}/?sso_token=${encodeURIComponent(token)}#/dashboard`;

    frame.src = url;

    // Handle successful load
    frame.onload = () => {
        loading.style.display = 'none';
        frame.style.display = 'block';
    };

    // Handle load failure (timeout fallback since cross-origin errors are silent)
    const timeout = setTimeout(() => {
        if (frame.style.display === 'none') {
            loading.style.display = 'none';
            error.style.display = 'flex';
        }
    }, 10000);

    frame.addEventListener('load', () => clearTimeout(timeout), { once: true });
}

// Expose globally for the retry button
window.loadMungkhudShop = loadMungkhudShop;

// Boot
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadMungkhudShop);
} else {
    loadMungkhudShop();
}
