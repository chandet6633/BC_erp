// API Wrapper for Google Apps Script using JSONP pattern

var API_URL =
    'https://script.google.com/macros/s/AKfycbxXWD5-yCByRCOp0bHGjdgy4IvXcy7C7dabKYoDhRP_vnqM3VKAW1_nZVtCPFvqIhG_/exec';
var PAYROLL_API_URL =
    'https://script.google.com/macros/s/AKfycbxMHRibai8_odtJn586zZ4_X8KD0FcWVzXWA3oO4kWWK7OVrQWMM9GIvAXHGjVhgMQcng/exec';

function jsonp(url, params, onSuccess, onError) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${url}?${queryString}`;
    const cbName = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    window[cbName] = data => {
        cleanup();
        if (onSuccess) onSuccess(data);
    };

    const script = document.createElement('script');
    script.src = `${fullUrl}&callback=${cbName}`;
    script.onerror = () => {
        cleanup();
        if (onError) onError(new Error('Network error or script failed to load'));
    };

    document.head.appendChild(script);

    function cleanup() {
        delete window[cbName];
        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }
    }
}

const fetchJson = async (url, params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${url}?${q}`);
    if (!res.ok) throw new Error('Network response was not ok');
    return await res.json();
};

window.HR_API = {
    getAttendance: (onSuccess, onError) => {
        jsonp(API_URL, { action: 'getAttendanceData' }, onSuccess, onError);
    },
    getRoster: (onSuccess, onError) => {
        jsonp(API_URL, { action: 'getRoster' }, onSuccess, onError);
    },
    getCurrentDate: (onSuccess, onError) => {
        jsonp(API_URL, { action: 'getCurrentDate' }, onSuccess, onError);
    },
    addMember: (data, onSuccess, onError) => {
        jsonp(
            API_URL,
            {
                action: 'addMember',
                ...data
            },
            onSuccess,
            onError
        );
    },
    removeMember: (id, onSuccess, onError) => {
        jsonp(
            API_URL,
            {
                action: 'removeMember',
                id: id
            },
            onSuccess,
            onError
        );
    }
};

window.PAYROLL_API = {
    getChecklog: async (dept, month, onSuccess, onError) => {
        try {
            const data = await fetchJson(PAYROLL_API_URL, {
                action: 'getChecklog',
                dept,
                month
            });
            if (onSuccess) onSuccess(data);
        } catch (e) {
            if (onError) onError(e);
        }
    },
    getLeavelog: async (dept, month, onSuccess, onError) => {
        try {
            const data = await fetchJson(PAYROLL_API_URL, {
                action: 'getLeavelog',
                dept,
                month
            });
            if (onSuccess) onSuccess(data);
        } catch (e) {
            if (onError) onError(e);
        }
    },
    getDepartments: async (onSuccess, onError) => {
        try {
            const data = await fetchJson(PAYROLL_API_URL, { action: 'getDepartments' });
            if (onSuccess) onSuccess(data);
        } catch (e) {
            if (onError) onError(e);
        }
    }
};
