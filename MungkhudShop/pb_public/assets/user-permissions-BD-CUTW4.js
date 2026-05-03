import{n as _,f as y,s as n,u as q,d as w,r as E,m as x,h as A}from"./index-XszaqNmQ.js";async function U(l){const o=new TextEncoder().encode(l),c=await crypto.subtle.digest("SHA-256",o);return Array.from(new Uint8Array(c)).map(d=>d.toString(16).padStart(2,"0")).join("")}async function P(l,o){return await U(l)}const L=[{key:"can_create_job",label:"สร้างใบงาน",group:"ใบงาน"},{key:"can_close_job",label:"ปิดใบงาน",group:"ใบงาน"},{key:"can_cancel_job",label:"ยกเลิกใบงาน",group:"ใบงาน"},{key:"can_create_doc",label:"สร้างเอกสาร",group:"เอกสาร"},{key:"can_void_doc",label:"ยกเลิกเอกสาร",group:"เอกสาร"},{key:"can_print_doc",label:"พิมพ์เอกสาร",group:"เอกสาร"},{key:"can_manage_stock",label:"จัดการคลังสินค้า",group:"คลัง"},{key:"can_approve_stock",label:"อนุมัติรายการคลัง",group:"คลัง"},{key:"can_view_cost",label:"ดูราคาทุน",group:"การเงิน"},{key:"can_view_reports",label:"ดูรายงาน",group:"การเงิน"},{key:"can_export_data",label:"ส่งออกข้อมูล",group:"การเงิน"},{key:"can_manage_users",label:"จัดการผู้ใช้",group:"ระบบ"},{key:"can_manage_settings",label:"จัดการตั้งค่า",group:"ระบบ"},{key:"can_manage_branches",label:"จัดการสาขา",group:"ระบบ"}];function T(l){let o=[],c=null;l.innerHTML=`
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">admin_panel_settings</span>
                <h1>จัดการผู้ใช้ & สิทธิ์</h1>
            </div>
        </div>
        <div id="userPermTabs"></div>
        <div id="panel-search" class="tab-panel active"></div>
        <div id="panel-add" class="tab-panel"></div>
    `;const d=l.querySelector("#userPermTabs");_(l,[{id:"search",label:"รายชื่อผู้ใช้",icon:"people"},{id:"add",label:"เพิ่ม / แก้ไข",icon:"person_add"}]);const v=l.querySelector(".tabs");v&&d&&d.appendChild(v);const h=l.querySelector("#panel-search");h.innerHTML=`
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="search-bar" style="max-width:400px;">
                    <span class="material-icons-outlined">search</span>
                    <input type="text" id="searchUserInput" placeholder="ค้นหาผู้ใช้...">
                </div>
            </div>
        </div>
        <div id="userGrid"></div>
    `;async function p(){const r=l.querySelector("#userGrid");r.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>',o=await y("app_users",{}),b(o)}function b(r){const s=l.querySelector("#userGrid");s.innerHTML=E({columns:[{key:"username",label:"ชื่อผู้ใช้"},{key:"display_name",label:"ชื่อแสดง"},{key:"role",label:"บทบาท",render:e=>({admin:"👑 ผู้ดูแล",manager:"📋 ผู้จัดการ",employee:"👤 พนักงาน"})[e.role]||e.role},{key:"is_active",label:"สถานะ",render:e=>e.is_active?'<span class="badge badge-open">ใช้งาน</span>':'<span class="badge badge-cancelled">ปิดใช้งาน</span>'},{key:"permissions",label:"สิทธิ์พิเศษ",render:e=>{if(e.role==="admin")return'<span class="text-sm text-muted">ทั้งหมด</span>';try{const t=typeof e.permissions=="string"?JSON.parse(e.permissions):e.permissions||{};return`<span class="text-sm">${Object.values(t).filter(S=>S).length} สิทธิ์</span>`}catch{return"-"}}},{key:"actions",label:"",render:e=>`
                    <div class="grid-actions">
                        <button class="btn btn-sm btn-outline btn-edit" data-id="${e.id}"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${e.id}"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                    </div>
                `}],items:r}),s.querySelectorAll(".btn-edit").forEach(e=>e.onclick=t=>{t.stopPropagation(),f(t.currentTarget.dataset.id)}),s.querySelectorAll(".btn-delete").forEach(e=>e.onclick=t=>{t.stopPropagation(),k(t.currentTarget.dataset.id)})}l.querySelector("#searchUserInput").addEventListener("input",r=>{const s=r.target.value.toLowerCase(),e=o.filter(t=>(t.username||"").toLowerCase().includes(s)||(t.display_name||"").toLowerCase().includes(s));b(e)});const a=l.querySelector("#panel-add"),u={};L.forEach(r=>{u[r.group]||(u[r.group]=[]),u[r.group].push(r)});const g=Object.entries(u).map(([r,s])=>`
        <div style="margin-bottom:var(--sp-3);">
            <div style="font-weight:600;font-size:0.85rem;color:var(--color-primary);margin-bottom:var(--sp-2);">${r}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);">
                ${s.map(e=>`
                    <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;font-size:0.85rem;">
                        <input type="checkbox" class="perm-check" data-key="${e.key}">
                        ${e.label}
                    </label>
                `).join("")}
            </div>
        </div>
    `).join("");a.innerHTML=`
        <div class="toolbar">
            <div class="toolbar-actions">
                <button class="btn btn-primary" id="btnSaveUser"><span class="material-icons-outlined">save</span> บันทึก</button>
                <button class="btn btn-outline" id="btnClearUser"><span class="material-icons-outlined">refresh</span> ล้างฟอร์ม</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);">
            <div class="card">
                <div class="card-header"><h3>ข้อมูลผู้ใช้</h3></div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label required">ชื่อผู้ใช้</label>
                        <input type="text" class="form-control" id="userUsername">
                    </div>
                    <div class="form-group">
                        <label class="form-label required">รหัสผ่าน</label>
                        <input type="password" class="form-control" id="userPassword" placeholder="ตั้งรหัสผ่าน...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ชื่อแสดง</label>
                        <input type="text" class="form-control" id="userDisplayName">
                    </div>
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">บทบาท</label>
                            <select class="form-control" id="userRole">
                                <option value="employee">พนักงาน</option>
                                <option value="manager">ผู้จัดการ</option>
                                <option value="admin">ผู้ดูแลระบบ</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">สถานะ</label>
                            <select class="form-control" id="userActive">
                                <option value="true">ใช้งาน</option>
                                <option value="false">ปิดใช้งาน</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">สาขา</label>
                        <select class="form-control" id="userBranch">
                            <option value="">ไม่กำหนด (ทุกสาขา)</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>สิทธิ์การใช้งาน</h3>
                    <div class="toolbar-actions" style="gap:var(--sp-2);">
                        <button class="btn btn-sm btn-outline" id="btnCheckAll">เลือกทั้งหมด</button>
                        <button class="btn btn-sm btn-outline" id="btnUncheckAll">ยกเลิกทั้งหมด</button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="padding:var(--sp-2);background:var(--color-warning-light);border-radius:var(--radius-sm);margin-bottom:var(--sp-3);font-size:0.8rem;">
                        💡 <strong>Admin</strong> มีสิทธิ์ทั้งหมดโดยอัตโนมัติ — ไม่ต้องเลือก checkbox
                    </div>
                    ${g}
                </div>
            </div>
        </div>
    `,y("branches").then(r=>{const s=a.querySelector("#userBranch");r.forEach(e=>{const t=document.createElement("option");t.value=e.id,t.textContent=e.name,s.appendChild(t)})}).catch(()=>{}),a.querySelector("#btnCheckAll").addEventListener("click",()=>{a.querySelectorAll(".perm-check").forEach(r=>r.checked=!0)}),a.querySelector("#btnUncheckAll").addEventListener("click",()=>{a.querySelectorAll(".perm-check").forEach(r=>r.checked=!1)});function f(r){const s=o.find(t=>t.id===r);if(!s)return;c=r,a.querySelector("#userUsername").value=s.username||"",a.querySelector("#userPassword").value="",a.querySelector("#userPassword").placeholder="(ไม่เปลี่ยนแปลง — กรอกเฉพาะเมื่อต้องการเปลี่ยน)",a.querySelector("#userDisplayName").value=s.display_name||"",a.querySelector("#userRole").value=s.role||"employee",a.querySelector("#userActive").value=s.is_active?"true":"false",a.querySelector("#userBranch").value=s.branch_id||"";let e={};try{e=typeof s.permissions=="string"?JSON.parse(s.permissions):s.permissions||{}}catch{e={}}a.querySelectorAll(".perm-check").forEach(t=>{t.checked=!!e[t.dataset.key]}),l.querySelector('.tab-btn[data-tab="add"]').click()}async function k(r){if(await x("ยืนยันลบ","คุณต้องการลบผู้ใช้นี้ใช่หรือไม่?"))try{await A("app_users",r),n("ลบผู้ใช้เรียบร้อย","success"),p()}catch{n("ไม่สามารถลบผู้ใช้ได้","error")}}a.querySelector("#btnSaveUser").addEventListener("click",async()=>{const r=a.querySelector("#userUsername").value.trim(),s=a.querySelector("#userPassword").value.trim();if(!r)return n("กรุณากรอกชื่อผู้ใช้","error");if(!c&&!s)return n("กรุณากรอกรหัสผ่าน","error");const e={};a.querySelectorAll(".perm-check").forEach(i=>{e[i.dataset.key]=i.checked});const t={username:r,display_name:a.querySelector("#userDisplayName").value,role:a.querySelector("#userRole").value,is_active:a.querySelector("#userActive").value==="true",branch_id:a.querySelector("#userBranch").value,permissions:JSON.stringify(e)};s&&(t.password=await P(s));try{c?(await q("app_users",c,t),n("อัปเดตผู้ใช้เรียบร้อย","success")):(await w("app_users",t),n("เพิ่มผู้ใช้ใหม่เรียบร้อย","success")),m(),l.querySelector('.tab-btn[data-tab="search"]').click(),p()}catch(i){console.error(i),n("เกิดข้อผิดพลาด: "+(i.message||""),"error")}});function m(){c=null,a.querySelector("#userUsername").value="",a.querySelector("#userPassword").value="",a.querySelector("#userDisplayName").value="",a.querySelector("#userRole").value="employee",a.querySelector("#userActive").value="true",a.querySelector("#userBranch").value="",a.querySelectorAll(".perm-check").forEach(r=>r.checked=!1)}a.querySelector("#btnClearUser").addEventListener("click",m),p()}export{T as initUserPermissionsPage};
