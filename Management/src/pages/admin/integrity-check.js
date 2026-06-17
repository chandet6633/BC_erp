import { pb } from '../../services/pocketbase.js';
import { AuthService } from '../../services/authService.js';

// Enforce admin access control
if (!AuthService.hasRole(['admin'])) {
    AuthService.requireRole(['admin']);
}

const token = localStorage.getItem('bcauto_jwt');
const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};

// UI Elements
const btnCheckStock = document.getElementById('btnCheckStock');
const btnRecalcCosts = document.getElementById('btnRecalcCosts');
const btnCheckDocs = document.getElementById('btnCheckDocs');
const btnLoadAudit = document.getElementById('btnLoadAudit');

const stockResults = document.getElementById('stockResults');
const docResults = document.getElementById('docResults');
const auditLogsBody = document.getElementById('auditLogsBody');

// --- Helper: Format dates ---
function formatDateTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleString('th-TH');
}

// --- Task 4.1 Endpoint A: Stock Integrity Check ---
btnCheckStock.addEventListener('click', async () => {
    btnCheckStock.disabled = true;
    stockResults.textContent = 'กำลังตรวจสอบ...';
    try {
        const res = await fetch('/api/data/custom/integrity/stock-check', { headers });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        
        let html = '';
        
        // 1. Negative Stock
        html += `<div style="font-weight:700;color:var(--surface-900);margin-bottom:8px;">🚨 สินค้าติดลบ (${data.negativeStock.length})</div>`;
        if (data.negativeStock.length === 0) {
            html += '<p style="color:#22c55e;margin-bottom:16px;">✅ ไม่พบสต็อกติดลบ</p>';
        } else {
            data.negativeStock.forEach(p => {
                html += `<div class="result-row"><span>${p.code} - ${p.name}</span><span style="color:#ef4444">${p.qty} ชิ้น</span></div>`;
            });
        }
        
        // 2. Orphaned Ledgers
        html += `<div style="font-weight:700;color:var(--surface-900);margin-top:16px;margin-bottom:8px;">🚨 รายการเดินสะพัดกำพร้า (ไม่มีเอกสารอ้างอิง) (${data.orphanLedgers.length})</div>`;
        if (data.orphanLedgers.length === 0) {
            html += '<p style="color:#22c55e;margin-bottom:16px;">✅ ไม่พบรายการเดินสะพัดกำพร้า</p>';
        } else {
            data.orphanLedgers.forEach(l => {
                html += `<div class="result-row"><span>${l.transaction_no} (อ้างอิง: ${l.reference_doc || '-'})</span><span style="color:#ef4444">${l.qty} ชิ้น</span></div>`;
            });
        }
        
        // 3. Confirmed Stock Docs with 0 Ledger
        html += `<div style="font-weight:700;color:var(--surface-900);margin-top:16px;margin-bottom:8px;">🚨 เอกสารยืนยันแล้วที่ไม่มีรายการเดินสะพัด (${data.confirmedNoLedger.length})</div>`;
        if (data.confirmedNoLedger.length === 0) {
            html += '<p style="color:#22c55e;">✅ เอกสารสต็อกครบถ้วน</p>';
        } else {
            data.confirmedNoLedger.forEach(d => {
                html += `<div class="result-row"><span>${d.doc_no} (${d.doc_type})</span><span style="color:#ef4444">ไม่มีประวัติสต็อก</span></div>`;
            });
        }
        
        stockResults.innerHTML = html;
    } catch (err) {
        stockResults.innerHTML = `<span style="color:#ef4444">เกิดข้อผิดพลาด: ${err.message}</span>`;
    } finally {
        btnCheckStock.disabled = false;
    }
});

// --- Task 4.1 Endpoint C: Recalculate Costs ---
btnRecalcCosts.addEventListener('click', async () => {
    if (!confirm('ยืนยันที่จะคำนวณราคาต้นทุนเฉลี่ยของสินค้าทั้งหมดใหม่หรือไม่? ระบบจะไล่ตามประวัติรับเข้าสต็อก')) return;
    
    btnRecalcCosts.disabled = true;
    stockResults.textContent = 'กำลังคำนวณต้นทุนเฉลี่ย...';
    try {
        const res = await fetch('/api/data/custom/admin/recalculate-costs', { method: 'POST', headers });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        
        stockResults.innerHTML = `<p style="color:#22c55e;font-weight:700;">✅ ดำเนินการสำเร็จ</p><p>อัปเดตราคาต้นทุนเรียบร้อยทั้งหมด ${data.updated} รายการ</p>`;
    } catch (err) {
        stockResults.innerHTML = `<span style="color:#ef4444">เกิดข้อผิดพลาด: ${err.message}</span>`;
    } finally {
        btnRecalcCosts.disabled = false;
    }
});

// --- Task 4.1 Endpoint B: Document Integrity Check ---
btnCheckDocs.addEventListener('click', async () => {
    btnCheckDocs.disabled = true;
    docResults.textContent = 'กำลังตรวจสอบเอกสาร...';
    try {
        const res = await fetch('/api/data/custom/integrity/document-check', { headers });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        
        let html = '';
        
        // 1. Duplicate Document Numbers
        html += `<div style="font-weight:700;color:var(--surface-900);margin-bottom:8px;">🚨 เลขที่เอกสารซ้ำในระบบ (${data.duplicateDocNos.length})</div>`;
        if (data.duplicateDocNos.length === 0) {
            html += '<p style="color:#22c55e;margin-bottom:16px;">✅ ไม่พบเลขที่เอกสารซ้ำ</p>';
        } else {
            data.duplicateDocNos.forEach(d => {
                const docDetails = d.documents.map(doc => `[ID: ${doc.id}, สาขา: ${doc.branch_id}, สถานะ: ${doc.status}]`).join(', ');
                html += `<div class="result-row"><span>${d.doc_no} (พบ ${d.count} รายการ)</span><span style="color:#ef4444;font-size:0.75rem">${docDetails}</span></div>`;
            });
        }
        
        // 2. Orphaned Items
        html += `<div style="font-weight:700;color:var(--surface-900);margin-top:16px;margin-bottom:8px;">🚨 รายการในเอกสารที่ไม่มีตัวแม่ (Orphan Items) (${data.orphanItems.length})</div>`;
        if (data.orphanItems.length === 0) {
            html += '<p style="color:#22c55e;margin-bottom:16px;">✅ ไม่พบรายการที่ไม่มีเอกสารหลัก</p>';
        } else {
            data.orphanItems.forEach(i => {
                html += `<div class="result-row"><span>${i.product_name || 'ไม่ระบุชื่อ'} (รหัสอ้างอิงเอกสารแม่: ${i.document_id})</span><span style="color:#ef4444">จำนวน ${i.qty}</span></div>`;
            });
        }
        
        // 3. Confirmed Stock Docs with 0 Ledger
        html += `<div style="font-weight:700;color:var(--surface-900);margin-top:16px;margin-bottom:8px;">🚨 เอกสารยืนยันแล้วที่ไม่มีรายการเดินสะพัด (${data.confirmedNoLedger.length})</div>`;
        if (data.confirmedNoLedger.length === 0) {
            html += '<p style="color:#22c55e;">✅ เอกสารสต็อกครบถ้วน</p>';
        } else {
            data.confirmedNoLedger.forEach(d => {
                html += `<div class="result-row"><span>${d.doc_no} (${d.doc_type})</span><span style="color:#ef4444">ไม่มีประวัติสต็อก</span></div>`;
            });
        }
        
        docResults.innerHTML = html;
    } catch (err) {
        docResults.innerHTML = `<span style="color:#ef4444">เกิดข้อผิดพลาด: ${err.message}</span>`;
    } finally {
        btnCheckDocs.disabled = false;
    }
});

// --- Load Audit Log History ---
async function loadAuditLogs() {
    btnLoadAudit.disabled = true;
    auditLogsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">กำลังโหลด...</td></tr>';
    try {
        // Fetch last 20 audit logs
        const filter = `action='confirm'||action='void'||action='delete'`;
        const logs = await pb.collection('audit_logs').getList(1, 20, {
            filter,
            sort: '-created'
        });
        
        const items = logs.items || [];
        if (items.length === 0) {
            auditLogsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--surface-500)">ไม่พบประวัติการแก้ไขรายการล่าสุด</td></tr>';
            return;
        }
        
        auditLogsBody.innerHTML = items.map(l => `
            <tr>
                <td>${formatDateTime(l.created || l.timestamp)}</td>
                <td><strong>${l.user_name || '-'}</strong></td>
                <td>
                    <span class="badge badge-${l.action === 'delete' ? 'cancelled' : l.action === 'void' ? 'pending' : 'closed'}">
                        ${l.action.toUpperCase()}
                    </span>
                </td>
                <td style="font-size:0.75rem;max-width:300px;word-break:break-all;">${l.details || '-'}</td>
            </tr>
        `).join('');
    } catch (err) {
        auditLogsBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#ef4444">ไม่สามารถโหลดข้อมูลได้: ${err.message}</td></tr>`;
    } finally {
        btnLoadAudit.disabled = false;
    }
}

btnLoadAudit.addEventListener('click', loadAuditLogs);

// Run initial audit load
loadAuditLogs().catch(() => {});
