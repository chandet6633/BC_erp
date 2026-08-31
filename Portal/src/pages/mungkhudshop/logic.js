/**
 * MungkhudShop Iframe Loader
 * Generates an SSO token from Portal's auth and loads MungkhudShop in an iframe.
 */
import '../../assets/js/app-shell.js';
import { getSession, isRealBranchId } from '@shared/session.js';
import { getAuthToken } from '@shared/nocodb-adapter.js';

function getMungkhudBaseUrl() {
    // Auto-detect: Portal 9092 → MungkhudShop 9091, Portal 8092 → 8091
    const currentPort = window.location.port || '8092';
    const shopPort = currentPort === '9092' ? '9091' : '8091';
    return `${window.location.protocol}//${window.location.hostname}:${shopPort}`;
}

function getSSOToken() {
    // Try AuthService first (if loaded via app-shell)
    const AuthService = window['AuthService'];
    if (AuthService && typeof AuthService.getSSOToken === 'function') {
        const token = AuthService.getSSOToken();
        if (token) return token;
    }

    // Fallback: build token from the shared neutral session contract.
    const session = getSession();
    const role = session.role;
    const name = session.userName;
    const id = session.userId;
    const branchId = session.branchId;
    if (!role || !name || !isRealBranchId(branchId)) return null;

    const ssoData = {
        id: id || 'sso_user',
        username: name,
        display_name: name,
        role: role,
        branch_id: branchId,
        branch_locked: true,
        portal_source: 'app.portal',
        issued_at: Date.now(),
        jwt: getAuthToken()
            || localStorage.getItem('bcauto_jwt')
            || sessionStorage.getItem('bcauto_jwt')
            || localStorage.getItem('mungkhud_jwt')
            || sessionStorage.getItem('mungkhud_jwt')
            || ''
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
