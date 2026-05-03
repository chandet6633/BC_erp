import '../../services/pocketbase.js';
import '../../utils/helpers.js';
import '../../services/authService.js';

let employeeRoster = [];
let deptsLoaded = false;
let namesLoaded = false;
let isSubmitting = false;

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

function updateDate() {
    const now = new Date();
    document.getElementById('liveDate').textContent = now.toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}
updateDate();

async function loadRoster() {
    const deptSel = document.getElementById('deptSelect');
    
    try {
        const [empRecords, branchRecords] = await Promise.all([
            window.pb.collection('users').getFullList({ sort: 'display_name', filter: "role != 'admin'" }),
            window.pb.collection('branches').getFullList({ sort: 'name' })
        ]);
        
        employeeRoster = empRecords.map(r => ({
            id: r.id,
            emp_id: r.username,
            name: r.display_name || r.username,
            branch_id: r.branch || 'ไม่ระบุ',
            role: r.role
        }));

        const branches = branchRecords.map(b => b.code);
        const allUserBranches = new Set(employeeRoster.map(e => e.branch_id).filter(Boolean));
        branches.forEach(b => allUserBranches.add(b));
        const sortedBranches = [...allUserBranches].sort();

        populateSelect(deptSel, sortedBranches, '– เลือกสาขา –');
        deptsLoaded = true;

        const currentUser = window.AuthService ? window.AuthService.getUser() : null;
        const isOwnerOrAdmin = window.AuthService ? window.AuthService.isOwner() : false;

        if (currentUser && !isOwnerOrAdmin) {
            deptSel.value = currentUser.branch || 'ไม่ระบุ';
            deptSel.disabled = true;
            onDeptChange(deptSel.value, 'nameSelect');
            
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

function onDeptChange(deptValue, nameSelectId) {
    const nameSel = document.getElementById(nameSelectId);
    if (!deptValue) {
        nameSel.innerHTML = '<option value="">– เลือกชื่อ –</option>';
        nameSel.disabled = true;
        namesLoaded = false;
        updateButtons();
        return;
    }
    const names = employeeRoster.filter(e => e.branch_id === deptValue).map(e => e.name).sort();
    populateSelect(nameSel, names, '– เลือกชื่อ –');
    nameSel.disabled = false;
    namesLoaded = true;
    updateButtons();
}

document.getElementById('deptSelect').addEventListener('change', e => {
    onDeptChange(e.target.value, 'nameSelect');
});

function updateButtons() {
    const dept = document.getElementById('deptSelect').value;
    const name = document.getElementById('nameSelect').value;
    const type = document.getElementById('leaveType').value;
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const reason = document.getElementById('leaveReason').value.trim();
    
    const valid = dept && name && type && start && end && reason.length > 0;
    
    const btn = document.getElementById('btnSubmit');
    btn.disabled = !(valid && deptsLoaded && namesLoaded && !isSubmitting);
}

['nameSelect', 'leaveType', 'startDate', 'endDate', 'leaveReason'].forEach(id => {
    document.getElementById(id).addEventListener('change', updateButtons);
    document.getElementById(id).addEventListener('input', updateButtons);
});

document.getElementById('btnSubmit').addEventListener('click', async () => {
    const name = document.getElementById('nameSelect').value;
    const type = document.getElementById('leaveType').value;
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const reason = document.getElementById('leaveReason').value.trim();
    
    if (new Date(end) < new Date(start)) {
        showToast('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น', 'error');
        return;
    }
    
    isSubmitting = true;
    updateButtons();
    
    try {
        // Assume employee_id is name for now
        await window.pb.collection('hr_leaves').create({
            employee_id: name,
            name: name,
            start_date: start,
            end_date: end,
            reason: reason,
            type: type
        });
        
        showToast('ส่งคำร้องลางานสำเร็จ', 'success');
        
        // Reset form
        document.getElementById('leaveType').value = '';
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        document.getElementById('leaveReason').value = '';
        
    } catch (err) {
        console.error('Submit error:', err);
        showToast('ไม่สามารถส่งคำร้องได้', 'error');
    } finally {
        isSubmitting = false;
        updateButtons();
    }
});

loadRoster();
