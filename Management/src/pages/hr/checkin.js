import '../../services/pocketbase.js';
import '../../utils/helpers.js';
import '../../services/authService.js';

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const ADMIN_PASSWORD = '280612';
const LATE_THRESHOLD_HOUR = 8;   // After 08:00 = late
const COLLECTION_ATT = 'hr_attendance';
const COLLECTION_EMP = 'hr_employees';

let isAdminMode = false;
let isSubmitting = false;
let employeeRoster = [];   // { id, emp_id, name, department, sex }

// ═══════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════
function showToast(msg, type = 'info', duration = 4000) {
    const stack = document.getElementById('toastStack');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast-msg ${type}`;
    el.innerHTML = `<span style="font-size:1.15rem">${icons[type] || icons.info}</span><span>${msg}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'toastIn 0.3s ease reverse';
        setTimeout(() => el.remove(), 300);
    }, duration);
}
window.showToast = showToast;

// ═══════════════════════════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════════════════════════
function tickClock() {
    const now = new Date();
    document.getElementById('liveClock').textContent = now.toLocaleTimeString('th-TH', { hour12: false });
    document.getElementById('liveDate').textContent = now.toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}
tickClock();
setInterval(tickClock, 1000);

// ═══════════════════════════════════════════════════════════════
// STATUS INDICATOR
// ═══════════════════════════════════════════════════════════════
let deptsLoaded = false, namesLoaded = false, isLoading = false;

function updateStatus() {
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    if (isLoading) {
        dot.className = 'status-dot loading';
        txt.textContent = 'กำลังโหลด...';
    } else if (deptsLoaded) {
        dot.className = 'status-dot ready';
        txt.textContent = 'พร้อมใช้งาน';
    } else {
        dot.className = 'status-dot';
        txt.textContent = 'รอข้อมูล';
    }
}

// ═══════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════
document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');

        // Sync dept dropdown on history tab
        if (btn.dataset.tab === 'history') {
            syncHistoryDepts();
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// LOAD ROSTER (Departments & Names from PB)
// ═══════════════════════════════════════════════════════════════
async function loadRoster() {
    isLoading = true;
    updateStatus();
    const deptSel = document.getElementById('deptSelect');
    deptSel.classList.add('loading-state');

    try {
        const records = await window.pb.collection(COLLECTION_EMP).getFullList({ sort: 'name' });
        employeeRoster = records.map(r => ({
            id: r.id,
            emp_id: r.emp_id,
            name: r.name,
            department: r.department,
            sex: r.sex
        }));

        const depts = [...new Set(employeeRoster.map(e => e.department).filter(Boolean))].sort();
        populateSelect(deptSel, depts, '– เลือกแผนก –');
        deptSel.disabled = false;
        deptsLoaded = true;

        // Also populate history dept
        syncHistoryDepts();
    } catch (e) {
        console.error('Load roster error:', e);
        deptSel.innerHTML = '<option>❌ โหลดข้อมูลไม่สำเร็จ</option>';
        showToast('ไม่สามารถโหลดข้อมูลพนักงาน', 'error');
    } finally {
        isLoading = false;
        deptSel.classList.remove('loading-state');
        updateStatus();
    }
}

function populateSelect(sel, items, placeholder) {
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d; opt.textContent = d;
        sel.appendChild(opt);
    });
}

function syncHistoryDepts() {
    const histDept = document.getElementById('histDept');
    const depts = [...new Set(employeeRoster.map(e => e.department).filter(Boolean))].sort();
    populateSelect(histDept, depts, '– เลือกแผนก –');
    histDept.disabled = depts.length === 0;
}

// ═══════════════════════════════════════════════════════════════
// DEPARTMENT → NAMES CASCADE
// ═══════════════════════════════════════════════════════════════
function onDeptChange(deptValue, nameSelectId) {
    const nameSel = document.getElementById(nameSelectId);
    if (!deptValue) {
        nameSel.innerHTML = '<option value="">– เลือกชื่อ –</option>';
        nameSel.disabled = true;
        namesLoaded = false;
        updateButtons();
        return;
    }
    const names = employeeRoster.filter(e => e.department === deptValue).map(e => e.name).sort();
    populateSelect(nameSel, names, '– เลือกชื่อ –');
    nameSel.disabled = false;
    namesLoaded = true;
    updateButtons();
}

document.getElementById('deptSelect').addEventListener('change', e => {
    onDeptChange(e.target.value, 'nameSelect');
});

document.getElementById('nameSelect').addEventListener('change', () => updateButtons());

document.getElementById('histDept').addEventListener('change', e => {
    onDeptChange(e.target.value, 'histName');
    hideHistoryCards();
});

document.getElementById('histName').addEventListener('change', e => {
    const dept = document.getElementById('histDept').value;
    if (dept && e.target.value) loadHistory(dept, e.target.value);
});

// ═══════════════════════════════════════════════════════════════
// DEVICE-LEVEL DAILY GATE
// ═══════════════════════════════════════════════════════════════
function todayKey() { return new Date().toISOString().split('T')[0]; }
function typeGateKey(type) { return `attend_${type}_${todayKey()}`; }

// ═══════════════════════════════════════════════════════════════
// UPDATE BUTTONS
// ═══════════════════════════════════════════════════════════════
function updateButtons() {
    const dept = document.getElementById('deptSelect').value;
    const name = document.getElementById('nameSelect').value;
    const btnIn = document.getElementById('btnIn');
    const btnOut = document.getElementById('btnOut');
    const busy = isLoading || isSubmitting;
    const valid = dept && name;

    if (isAdminMode) {
        btnIn.disabled = !(valid && !busy);
        btnOut.disabled = !(valid && !busy);
    } else {
        const doneIn = !!localStorage.getItem(typeGateKey('IN'));
        const doneOut = !!localStorage.getItem(typeGateKey('OUT'));
        btnIn.disabled = !(valid && deptsLoaded && namesLoaded && !doneIn && !busy);
        btnOut.disabled = !(valid && deptsLoaded && namesLoaded && !doneOut && !busy);
    }
}
window.updateButtons = updateButtons;

// ═══════════════════════════════════════════════════════════════
// ADMIN TOGGLE
// ═══════════════════════════════════════════════════════════════
window.toggleAdmin = function () {
    if (isAdminMode) {
        isAdminMode = false;
        document.getElementById('adminToggle').textContent = '🔐 เข้าสู่ระบบผู้ดูแล';
        document.getElementById('adminToggle').classList.remove('active');
        document.getElementById('adminBar').classList.remove('show');
        document.getElementById('adminFields').classList.remove('show');
        showToast('ออกจากโหมดผู้ดูแลแล้ว', 'info');
        updateButtons();
    } else {
        const pw = prompt('กรุณาใส่รหัสผ่านผู้ดูแลระบบ:');
        if (pw === ADMIN_PASSWORD) {
            isAdminMode = true;
            document.getElementById('adminToggle').textContent = '🔓 ออกจากโหมดผู้ดูแล';
            document.getElementById('adminToggle').classList.add('active');
            document.getElementById('adminBar').classList.add('show');
            document.getElementById('adminFields').classList.add('show');
            const now = new Date();
            document.getElementById('overrideDate').value = now.toISOString().split('T')[0];
            document.getElementById('overrideTime').value = now.toTimeString().slice(0, 5);
            showToast('เข้าสู่โหมดผู้ดูแลแล้ว', 'success');
            updateButtons();
        } else if (pw !== null) {
            showToast('รหัสผ่านไม่ถูกต้อง', 'error');
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// PUNCH IN / OUT
// ═══════════════════════════════════════════════════════════════
window.doPunch = async function (type) {
    const dept = document.getElementById('deptSelect').value;
    const name = document.getElementById('nameSelect').value;
    if (!dept || !name) { showToast('กรุณาเลือกทั้งแผนกและชื่อ', 'error'); return; }
    if (isSubmitting) return;

    const btn = type === 'IN' ? document.getElementById('btnIn') : document.getElementById('btnOut');
    btn.classList.add('submitting');
    isSubmitting = true;
    updateButtons();

    const sendRecord = async (lat, lon) => {
        try {
            // Determine timestamp
            let timestamp;
            if (isAdminMode) {
                const d = document.getElementById('overrideDate').value;
                const t = document.getElementById('overrideTime').value;
                timestamp = d && t ? new Date(`${d}T${t}:00`).toISOString() : new Date().toISOString();
            } else {
                timestamp = new Date().toISOString();
            }

            // Find store from geo (placeholder — can add store matching logic later)
            let store = '';
            if (lat && lon) {
                // Simple: attach coords as store info for now
                store = `GPS: ${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`;
            }

            await window.pb.collection(COLLECTION_ATT).create({
                employee_id: name,
                name: name,
                department: dept,
                status: type,
                date: timestamp,
                store: store || ''
            });

            if (!isAdminMode) {
                localStorage.setItem(typeGateKey(type), '1');
            }

            const label = type === 'IN' ? 'ลงเวลาเข้า' : 'ลงเวลาออก';
            showToast(`${label}สำเร็จ!${store ? ' (' + store + ')' : ''}`, 'success');
        } catch (e) {
            console.error('Punch error:', e);
            showToast('บันทึกเวลาไม่สำเร็จ: ' + (e.message || 'Unknown error'), 'error');
        } finally {
            btn.classList.remove('submitting');
            isSubmitting = false;
            updateButtons();
        }
    };

    // Admin mode: skip geolocation
    if (isAdminMode) {
        await sendRecord('', '');
        return;
    }

    // Normal: require geolocation
    if (!navigator.geolocation) {
        showToast('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง', 'error');
        btn.classList.remove('submitting');
        isSubmitting = false;
        updateButtons();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async pos => { await sendRecord(pos.coords.latitude, pos.coords.longitude); },
        err => {
            showToast('ไม่สามารถตรวจหาตำแหน่งได้ กรุณาอนุญาตการเข้าถึง', 'error');
            btn.classList.remove('submitting');
            isSubmitting = false;
            updateButtons();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
};

// ═══════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════
function hideHistoryCards() {
    ['statsCard', 'historyCard', 'historyEmpty', 'historyLoading'].forEach(id =>
        document.getElementById(id).style.display = 'none'
    );
}

async function loadHistory(dept, name) {
    hideHistoryCards();
    document.getElementById('historyLoading').style.display = 'block';

    try {
        // Get current month range
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
        const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31 23:59:59`;

        const records = await window.pb.collection(COLLECTION_ATT).getFullList({
            filter: `name='${name}' && date >= '${monthStart}' && date <= '${monthEnd}'`,
            sort: '-date'
        });

        document.getElementById('historyLoading').style.display = 'none';

        if (records.length === 0) {
            document.getElementById('historyEmpty').style.display = 'block';
            return;
        }

        // Stats
        const checkIns = records.filter(r => (r.status || r.type || '').toUpperCase() === 'IN');
        const uniqueDays = new Set(checkIns.map(r => (r.date || '').slice(0, 10))).size;
        let lateCount = 0;
        checkIns.forEach(r => {
            const d = new Date(r.date);
            if (d.getHours() >= LATE_THRESHOLD_HOUR) lateCount++;
        });
        const onTimePct = uniqueDays > 0 ? Math.round(((uniqueDays - lateCount) / uniqueDays) * 100) : 0;

        document.getElementById('statCheckIns').textContent = uniqueDays;
        document.getElementById('statLate').textContent = lateCount;
        document.getElementById('statOnTime').textContent = onTimePct + '%';
        document.getElementById('statsCard').style.display = 'block';

        // History list
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const list = document.getElementById('historyList');
        list.innerHTML = records.slice(0, 50).map(r => {
            const d = new Date(r.date);
            const typeVal = (r.status || r.type || '').toUpperCase();
            const isIn = typeVal === 'IN';
            return `
                <div class="history-item">
                    <div class="history-icon ${isIn ? 'in' : 'out'}">${isIn ? '🟢' : '🔴'}</div>
                    <div class="history-info">
                        <div class="history-type">${isIn ? 'เข้างาน' : 'ออกงาน'}</div>
                        <div class="history-store">${r.store || '-'}</div>
                    </div>
                    <div class="history-time">
                        <div class="history-date">${d.getDate()} ${months[d.getMonth()]}</div>
                        <div class="history-hour">${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>
            `;
        }).join('');
        document.getElementById('historyCard').style.display = 'block';

    } catch (e) {
        console.error('History error:', e);
        document.getElementById('historyLoading').style.display = 'none';
        showToast('โหลดประวัติไม่สำเร็จ: ' + (e.message || ''), 'error');
        document.getElementById('historyEmpty').style.display = 'block';
    }
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
loadRoster();
updateButtons();
updateStatus();
