import{n as m,s as c,u as y,d as f,f as q,r as S,m as g,h as x}from"./index-BeHq0lp5.js";function k(r){let n=[],t=null;r.innerHTML=`
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">store</span>
                <h1>จัดการสาขา</h1>
            </div>
        </div>
        <div id="branchTabs"></div>
        <div id="panel-search" class="tab-panel active"></div>
        <div id="panel-add" class="tab-panel"></div>
    `;const i=r.querySelector("#branchTabs");m(r,[{id:"search",label:"รายชื่อสาขา",icon:"store"},{id:"add",label:"เพิ่ม / แก้ไข",icon:"add_business"}]);const o=r.querySelector(".tabs");o&&i&&i.appendChild(o);const b=r.querySelector("#panel-search");b.innerHTML=`
        <div id="branchGrid"></div>
    `;const e=r.querySelector("#panel-add");e.innerHTML=`
        <div class="toolbar">
            <div class="toolbar-actions">
                <button class="btn btn-primary" id="btnSaveBranch"><span class="material-icons-outlined">save</span> บันทึก</button>
                <button class="btn btn-outline" id="btnClearBranch"><span class="material-icons-outlined">refresh</span> ล้างฟอร์ม</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);">
            <div class="card">
                <div class="card-header"><h3>ข้อมูลสาขา</h3></div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label required">รหัสสาขา</label>
                        <input type="text" class="form-control" id="branchCode" placeholder="e.g. HQ, BR01">
                    </div>
                    <div class="form-group">
                        <label class="form-label required">ชื่อสาขา</label>
                        <input type="text" class="form-control" id="branchName" placeholder="สาขาหลัก">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ที่อยู่</label>
                        <textarea class="form-control" id="branchAddress" rows="2" placeholder="ที่อยู่สาขา..."></textarea>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>ข้อมูลเพิ่มเติม</h3></div>
                <div class="card-body">
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">เบอร์โทร</label>
                            <input type="text" class="form-control" id="branchPhone">
                        </div>
                        <div class="form-group">
                            <label class="form-label">อีเมล</label>
                            <input type="email" class="form-control" id="branchEmail">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">เลขประจำตัวผู้เสียภาษี</label>
                        <input type="text" class="form-control" id="branchTaxId">
                    </div>
                    <div class="form-group">
                        <label class="form-label">สถานะ</label>
                        <select class="form-control" id="branchActive">
                            <option value="true">เปิดใช้งาน</option>
                            <option value="false">ปิดใช้งาน</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;async function d(){const l=b.querySelector("#branchGrid");l.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลด...</div>',n=await q("branches",{requestKey:null}),l.innerHTML=S({columns:[{key:"code",label:"รหัส"},{key:"name",label:"ชื่อสาขา"},{key:"address",label:"ที่อยู่"},{key:"phone",label:"โทร"},{key:"is_active",label:"สถานะ",render:a=>a.is_active!==!1?'<span class="badge badge-open">เปิด</span>':'<span class="badge badge-cancelled">ปิด</span>'},{key:"actions",label:"",render:a=>`
                    <div class="grid-actions">
                        <button class="btn btn-sm btn-outline btn-edit" data-id="${a.id}"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${a.id}"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                    </div>
                `}],items:n}),l.querySelectorAll(".btn-edit").forEach(a=>a.onclick=()=>v(a.dataset.id)),l.querySelectorAll(".btn-delete").forEach(a=>a.onclick=()=>h(a.dataset.id))}function v(l){const a=n.find(s=>s.id===l);a&&(t=l,e.querySelector("#branchCode").value=a.code||"",e.querySelector("#branchName").value=a.name||"",e.querySelector("#branchAddress").value=a.address||"",e.querySelector("#branchPhone").value=a.phone||"",e.querySelector("#branchEmail").value=a.email||"",e.querySelector("#branchTaxId").value=a.tax_id||"",e.querySelector("#branchActive").value=a.is_active!==!1?"true":"false",r.querySelector('.tab-btn[data-tab="add"]').click())}async function h(l){await g("ยืนยันลบ","คุณต้องการลบสาขานี้?")&&(await x("branches",l),c("ลบสาขาเรียบร้อย","success"),d())}e.querySelector("#btnSaveBranch").addEventListener("click",async()=>{const l=e.querySelector("#branchCode").value.trim(),a=e.querySelector("#branchName").value.trim();if(!l||!a)return c("กรุณากรอกรหัสและชื่อสาขา","error");const s={code:l,name:a,address:e.querySelector("#branchAddress").value,phone:e.querySelector("#branchPhone").value,email:e.querySelector("#branchEmail").value,tax_id:e.querySelector("#branchTaxId").value,is_active:e.querySelector("#branchActive").value==="true"};try{t?await y("branches",t,s):await f("branches",s),c("บันทึกสาขาเรียบร้อย","success"),u(),r.querySelector('.tab-btn[data-tab="search"]').click(),d()}catch(p){c("เกิดข้อผิดพลาด: "+p.message,"error")}});function u(){t=null,e.querySelector("#branchCode").value="",e.querySelector("#branchName").value="",e.querySelector("#branchAddress").value="",e.querySelector("#branchPhone").value="",e.querySelector("#branchEmail").value="",e.querySelector("#branchTaxId").value="",e.querySelector("#branchActive").value="true"}e.querySelector("#btnClearBranch").addEventListener("click",u),d()}export{k as initBranchPage};
