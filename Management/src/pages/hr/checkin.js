import '../../services/pocketbase.js';
import '../../utils/helpers.js';
import '../../services/authService.js';

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
// BUG 23 FIX: Removed hardcoded ADMIN_PASSWORD
const LATE_THRESHOLD_HOUR = 8;   // After 08:00 = late
const COLLECTION_ATT = 'hr_attendance';
const COLLECTION_EMP = 'users';
const GPS_RADIUS_M = 500; // Max distance in meters from branch

let isAdminMode = false;
let isSubmitting = false;
let employeeRoster = [];
let branchGpsMap = {}; // { branchName: { lat, lng } }

// Haversine distance (meters)
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
// LOAD ROSTER (Departments & Names from PB)
// ═══════════════════════════════════════════════════════════════
async function loadRoster() {
    isLoading = true;
    updateStatus();
    const deptSel = document.getElementById('deptSelect');
    deptSel.classList.add('loading-state');

    try {
        const [empRecords, branchRecords] = await Promise.all([
            window.pb.collection(COLLECTION_EMP).getFullList(),
            window.pb.collection('branches').getFullList()
        ]);
        
        employeeRoster = empRecords.filter(r => r.role !== 'admin').map(r => ({
            id: r.id,
            emp_id: r.username,
            name: r.display_name || r.name || r.username,
            branch_id: r.branch || r.Branch || 'ไม่ระบุ',
            role: r.role
        }));

        // Build GPS map from branches
        branchGpsMap = {};
        branchRecords.forEach(b => {
            const name = b.name || b.Name || b.title || '';
            const lat = parseFloat(b.latitude || b.Latitude || b.lat || 0);
            const lng = parseFloat(b.longitude || b.Longitude || b.lng || 0);
            if (name && lat && lng) branchGpsMap[name] = { lat, lng };
        });
        console.log('Branch GPS map:', branchGpsMap);

        const branches = branchRecords.map(b => b.name || b.Name || b.code || '');
        
        // Add fallback if some users have branch not in branches table
        const allUserBranches = new Set(employeeRoster.map(e => e.branch_id).filter(Boolean));
        branches.forEach(b => allUserBranches.add(b));
        const sortedBranches = [...allUserBranches].sort();

        populateSelect(deptSel, sortedBranches, '– เลือกสาขา –');
        deptsLoaded = true;

        // Auto-select and lock if standard user
        const currentUser = window.AuthService ? window.AuthService.getUser() : null;
        const isOwnerOrAdmin = window.AuthService ? window.AuthService.isOwner() : false;

        if (currentUser && !isOwnerOrAdmin && !isAdminMode) {
            // Lock to this user's branch
            deptSel.value = currentUser.branch || 'ไม่ระบุ';
            deptSel.disabled = true;
            onDeptChange(deptSel.value, 'nameSelect');
            
            // Lock to this user's name
            const nameSel = document.getElementById('nameSelect');
            if (employeeRoster.some(e => e.name === currentUser.name)) {
                nameSel.value = currentUser.name;
                nameSel.disabled = true;
                namesLoaded = true;
                updateButtons();
            }
        } else {
            deptSel.disabled = false;
        }

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
    const emps = employeeRoster.filter(e => e.branch_id === deptValue).sort((a,b) => a.name.localeCompare(b.name));
    nameSel.innerHTML = `<option value="">– เลือกชื่อ –</option>`;
    emps.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id; 
        opt.textContent = e.name;
        nameSel.appendChild(opt);
    });
    nameSel.disabled = false;
    namesLoaded = true;
    updateButtons();
}

document.getElementById('deptSelect').addEventListener('change', e => {
    onDeptChange(e.target.value, 'nameSelect');
});

document.getElementById('nameSelect').addEventListener('change', () => updateButtons());

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
        document.getElementById('adminToggle').innerHTML = '<span class="material-icons-outlined" style="font-size:1.1rem;vertical-align:text-bottom">admin_panel_settings</span> เข้าสู่ระบบผู้ดูแล';
        document.getElementById('adminToggle').classList.remove('active');
        document.getElementById('adminBar').classList.remove('show');
        document.getElementById('adminFields').classList.remove('show');
        showToast('ออกจากโหมดผู้ดูแลแล้ว', 'info');
        
        // Relock dropdowns if standard user
        const currentUser = window.AuthService ? window.AuthService.getUser() : null;
        const isOwnerOrAdmin = window.AuthService ? window.AuthService.isOwner() : false;
        if (currentUser && !isOwnerOrAdmin) {
            const deptSel = document.getElementById('deptSelect');
            const nameSel = document.getElementById('nameSelect');
            
            // Re-populate names for the branch since it might have been cleared
            onDeptChange(currentUser.branch, 'nameSelect');
            
            const match = employeeRoster.find(e => e.name === currentUser.name || e.id === currentUser.id);
            if (match) {
                nameSel.value = match.id;
            }
            
            deptSel.disabled = true;
            nameSel.disabled = true;
        }
        
        updateButtons();
    } else {
        const pw = prompt('กรุณาใส่รหัสผ่านผู้ดูแลระบบ:');
        if (pw !== null) {
            // BUG 23 FIX: Use secure API call instead of plaintext frontend password
            fetch('/api/auth/pin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pw, roleGroup: 'manager' })
            }).then(async (res) => {
                if (res.ok) {
                    isAdminMode = true;
                    document.getElementById('adminToggle').innerHTML = '<span class="material-icons-outlined" style="font-size:1.1rem;vertical-align:text-bottom">lock_open</span> ออกจากโหมดผู้ดูแล';
                    document.getElementById('adminToggle').classList.add('active');
                    document.getElementById('adminBar').classList.add('show');
                    document.getElementById('adminFields').classList.add('show');
                    
                    // Unlock dropdowns
                    document.getElementById('deptSelect').disabled = false;
                    document.getElementById('nameSelect').disabled = false;
                    const now = new Date();
                    document.getElementById('overrideDate').value = now.toISOString().split('T')[0];
                    document.getElementById('overrideTime').value = now.toTimeString().slice(0, 5);
                    showToast('เข้าสู่โหมดผู้ดูแลแล้ว', 'success');
                    updateButtons();
                } else {
                    showToast('รหัสผ่านไม่ถูกต้อง', 'error');
                }
            }).catch(() => {
                showToast('เกิดข้อผิดพลาด', 'error');
            });
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

            // BUG 7 FIX: Map selected ID to name
            const selectedId = name;
            const emp = employeeRoster.find(e => e.id === selectedId);
            
            await window.pb.collection(COLLECTION_ATT).create({
                name: emp ? emp.name : selectedId,
                employee_id: selectedId,
                department: dept, // actually branch
                type: type, // IN or OUT
                timestamp: timestamp,
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

    // Get branch GPS coords
    const branchGps = branchGpsMap[dept];

    // Normal: try geolocation
    if (!navigator.geolocation) {
        if (branchGps) {
            showToast('เบราว์เซอร์ไม่รองรับ GPS — ไม่สามารถตรวจสอบตำแหน่งได้', 'error');
            btn.classList.remove('submitting');
            isSubmitting = false;
            updateButtons();
            return;
        }
        await sendRecord('', '');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async pos => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;

            // If branch has GPS set, validate distance
            if (branchGps) {
                const dist = haversine(userLat, userLng, branchGps.lat, branchGps.lng);
                if (dist > GPS_RADIUS_M) {
                    showToast(`ตำแหน่งของคุณห่างจากสาขา ${Math.round(dist)} เมตร (เกินรัศมี ${GPS_RADIUS_M}m)`, 'error', 6000);
                    btn.classList.remove('submitting');
                    isSubmitting = false;
                    updateButtons();
                    return;
                }
                showToast(`ตำแหน่งถูกต้อง (ห่าง ${Math.round(dist)}m)`, 'success');
            }

            await sendRecord(userLat, userLng);
        },
        async err => {
            if (branchGps) {
                showToast('ไม่สามารถระบุตำแหน่งได้ — กรุณาเปิด GPS', 'error');
                btn.classList.remove('submitting');
                isSubmitting = false;
                updateButtons();
                return;
            }
            showToast('ไม่สามารถระบุตำแหน่งได้ (ข้าม GPS)', 'warning');
            await sendRecord('', '');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
};



// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
loadRoster();
updateButtons();
updateStatus();
