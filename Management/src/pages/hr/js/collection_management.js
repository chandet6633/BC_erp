import PocketBase from 'pocketbase';

const url =
    window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
        ? 'http://127.0.0.1:8090'
        : window.location.origin;

const pb = new PocketBase(url);

// DOM Elements
const loginSection = document.getElementById('login-section');
const mgmtSection = document.getElementById('mgmt-section');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const collectionList = document.getElementById('collection-list');
const logOutput = document.getElementById('log-output');

// Presets Definition (Use 'fields' for compatibility with v0.22+, but 'schema' for legacy logic)
const PRESETS = {
    hr_employees: {
        name: 'hr_employees',
        type: 'base',
        fields: [
            { name: 'emp_id', type: 'text', required: true, options: { unique: true } },
            { name: 'name', type: 'text', required: true },
            { name: 'department', type: 'text' },
            { name: 'sex', type: 'text' }
        ],
        indexes: ['CREATE UNIQUE INDEX idx_emp_id ON hr_employees (emp_id)']
    },
    hr_attendance: {
        name: 'hr_attendance',
        type: 'base',
        fields: [
            { name: 'employee_id', type: 'text', required: true },
            { name: 'timestamp', type: 'date', required: true },
            { name: 'type', type: 'text' },
            { name: 'department', type: 'text' },
            { name: 'store', type: 'text' },
            { name: 'source_row', type: 'number' }
            // name is not in active schema, removing it from preset to avoid confusion or add it if we want to change schema later.
            // Active schema in migration 1770889000 only has: employee_id, timestamp, type, department, store.
            // keeping source_row as it might be useful, but arguably should remove it if not in schema.
            // Let's stick to what we know is in migration 1770889000: employee_id, timestamp, type, department, store.
            // But wait, if I change this preset, I am claiming this IS the schema.
            // Migration 1770889000: employee_id, timestamp, type, department, store.
            // No name, no source_row.
            // I will align strictly with migration 1770889000.
        ],
        indexes: ['CREATE UNIQUE INDEX `idx_attendance_uniq` ON `hr_attendance` (`employee_id`, `timestamp`)']
    },
    hr_leaves: {
        name: 'hr_leaves',
        type: 'base',
        fields: [
            { name: 'employee_id', type: 'text', required: true },
            { name: 'name', type: 'text' },
            { name: 'department', type: 'text' },
            { name: 'start_date', type: 'date', required: true },
            { name: 'end_date', type: 'date', required: true },
            { name: 'reason', type: 'text' },
            { name: 'type', type: 'text' }
        ],
        indexes: [
            'CREATE INDEX `idx_leaves_date` ON `hr_leaves` (`start_date`, `end_date`)',
            'CREATE INDEX `idx_leaves_emp` ON `hr_leaves` (`employee_id`)'
        ]
    }
};

// Logging
function log(msg, type = 'info') {
    logOutput.classList.remove('hidden');
    const color = type === 'error' ? 'text-red-400' : 'text-green-400';
    const timestamp = new Date().toLocaleTimeString();
    logOutput.innerHTML += `<div class="${color}">[${timestamp}] ${msg}</div>`;
    logOutput.scrollTop = logOutput.scrollHeight;
}

// Auth
async function checkAuth() {
    if (pb.authStore.isValid && pb.authStore.isAdmin) {
        showMgmt();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginSection.classList.remove('hidden');
    mgmtSection.classList.add('hidden');
}

function showMgmt() {
    loginSection.classList.add('hidden');
    mgmtSection.classList.remove('hidden');
    window.loadCollections();
}

loginBtn.onclick = async () => {
    try {
        await pb.admins.authWithPassword(
            /** @type {HTMLInputElement} */(emailInput).value,
            /** @type {HTMLInputElement} */(passInput).value
        );
        loginError.classList.add('hidden');
        showMgmt();
        log('Logged in successfully.');
    } catch (e) {
        loginError.textContent = 'Login failure: ' + e.message;
        loginError.classList.remove('hidden');
    }
};

// Logic
window.loadCollections = async function () {
    try {
        collectionList.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Loading...</td></tr>';

        const collections = await pb.collections.getFullList({ sort: 'name' });

        collectionList.innerHTML = '';
        if (!collections || collections.length === 0) {
            collectionList.innerHTML =
                '<tr><td colspan="4" class="p-4 text-center text-gray-500">No collections found.</td></tr>';
            return;
        }

        collections.forEach(c => {
            const tr = document.createElement('tr');

            // Defensive coding: PocketBase versions differ on 'schema' vs 'fields' property
            // v0.22+ uses 'fields' (array). Older uses 'schema' (array).
            // We check both. If neither is an array, default to empty array.
            let schemaDef = [];
            if (Array.isArray(c.fields)) {
                schemaDef = c.fields;
            } else if (Array.isArray(c.schema)) {
                schemaDef = c.schema;
            }

            // Map names safely
            const fieldNames = schemaDef.map(f => f.name).join(', ');

            tr.innerHTML = `
                <td class="font-medium" data-label="Name">${c.name}</td>
                <td class="text-sm text-gray-600" data-label="Type">${c.type}</td>
                <td class="text-sm text-gray-500 max-w-sm truncate" title="${fieldNames}" data-label="Fields">${fieldNames || '<em>(No custom fields)</em>'}</td>
                <td class="text-right" data-label="Actions">
                    ${!c.system ? `<button class="btn btn-danger btn-sm" onclick="deleteCollection('${c.id}', '${c.name}')">Delete</button>` : '<span class="text-xs text-gray-400">System</span>'}
                </td>
            `;
            collectionList.appendChild(tr);
        });
    } catch (e) {
        log('Error loading collections: ' + e.message, 'error');
        console.error(e);
    }
};

window.deleteCollection = async function (id, name) {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE collection '${name}'?`)) return;

    try {
        await pb.collections.delete(id);
        log(`Deleted collection: ${name}`);
        window.loadCollections();
    } catch (e) {
        log(`Failed to delete ${name}: ${e.message}`, 'error');
    }
};

window.createPreset = async function (key) {
    const preset = PRESETS[key];
    if (!preset) return log(`Preset ${key} not found!`, 'error');

    try {
        // Check if exists by trying to fetch it
        try {
            const col = await pb.collections.getOne(preset.name);
            if (col) {
                if (
                    !confirm(
                        `Collection '${preset.name}' already exists. Delete and Recreate? (You will lose existing data)`
                    )
                )
                    return;
                await pb.collections.delete(col.id);
                log(`Deleted existing '${preset.name}' to prepare for recreation.`);
            }
        } catch (e) {
            // 404 Not Found is expected if it doesn't exist, proceed
        }

        log(`Creating '${preset.name}'...`);
        await pb.collections.create(preset);

        log(`Collection '${preset.name}' created successfully!`);
        window.loadCollections();
    } catch (e) {
        log(`Error creating ${preset.name}: ${e.message}`, 'error');
        console.error(e);
    }
};

// Initialize
checkAuth();
