import{n as S,s as o,u as q,d as x,r as T,f as k,m as L,h as w}from"./index-XszaqNmQ.js";function g(r){return function(s){s.innerHTML=`
            <div class="page-header">
                <div class="page-title">
                    <span class="material-icons-outlined">${r.icon}</span>
                    <h1>${r.title}</h1>
                </div>
            </div>
            <div id="${r.collection}Tabs"></div>
            <div id="panel-search" class="tab-panel active"></div>
            <div id="panel-add" class="tab-panel"></div>
        `;const p=s.querySelector(`#${r.collection}Tabs`);S(s,[{id:"search",label:"ค้นหา",icon:"search"},{id:"add",label:"เพิ่ม / แก้ไข",icon:"add_circle_outline"}]);const v=s.querySelector(".tabs");v&&p&&p.appendChild(v);const b=[...r.columns,{key:"actions",label:"จัดการ",render:e=>`
                <div class="grid-actions">
                    <button class="btn btn-sm btn-outline btn-edit" data-id="${e.id}" title="แก้ไข"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${e.id}" title="ลบ"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                </div>
            `}];let i=[],n=null;const m=s.querySelector("#panel-search");m.innerHTML=`
            <div class="card" style="margin-bottom:var(--sp-4);">
                <div class="card-body">
                    <div style="display:flex;gap:var(--sp-3);align-items:flex-end;">
                        <div class="form-group" style="flex:1;margin:0;">
                            <label class="form-label">ค้นหา</label>
                            <div class="search-bar">
                                <span class="material-icons-outlined">search</span>
                                <input type="text" id="masterSearchInput" placeholder="ค้นหา ${r.title}...">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="masterGrid"></div>
        `;async function u(){const e=s.querySelector("#masterGrid");e.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>';try{if(i=await k(r.collection),r.onDataLoaded&&await r.onDataLoaded(i),i.length===0){e.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">ยังไม่มีข้อมูล — เพิ่มรายการแรกได้ที่แท็บ "เพิ่ม / แก้ไข"</div>';return}y(i)}catch(l){console.warn(`[Master] Collection "${r.collection}" may not exist yet:`,l.message),e.innerHTML=`<div style="padding:var(--sp-8);text-align:center;color:var(--color-warning);">Collection "${r.collection}" ยังไม่มีในระบบ<br><small style="color:var(--color-text-muted);">กรุณาสร้าง Collection ใน PocketBase Admin ก่อน</small></div>`}}function y(e){const l=s.querySelector("#masterGrid");l.innerHTML=T({columns:b,items:e}),l.querySelectorAll(".btn-edit").forEach(t=>t.onclick=a=>{a.stopPropagation(),f(a.currentTarget.dataset.id)}),l.querySelectorAll(".btn-delete").forEach(t=>t.onclick=a=>{a.stopPropagation(),$(a.currentTarget.dataset.id)})}s.querySelector("#masterSearchInput").addEventListener("input",e=>{const l=e.target.value.toLowerCase(),t=i.filter(a=>Object.values(a).some(d=>String(d).toLowerCase().includes(l)));y(t)});const h=r.fields.map(e=>{let l="";return e.type==="textarea"?l=`<textarea class="form-control" id="field_${e.key}" rows="3" placeholder="${e.label}"></textarea>`:e.type==="async_select"?l=`<select class="form-control" id="field_${e.key}"><option value="">กำลังโหลด...</option></select>`:e.type==="select"&&e.options?l=`<select class="form-control" id="field_${e.key}">${e.options.map(t=>`<option value="${t.value||t}">${t.label||t}</option>`).join("")}</select>`:l=`<input type="${e.type||"text"}" class="form-control" id="field_${e.key}" placeholder="${e.label}">`,`<div class="form-group"><label class="form-label${e.required?" required":""}">${e.label}</label>${l}</div>`}).join(""),c=s.querySelector("#panel-add");c.innerHTML=`
            <div class="card">
                <div class="card-header">
                    <h3 id="formTitle">เพิ่มข้อมูลใหม่</h3>
                    <div class="toolbar-actions">
                        <button class="btn btn-primary" id="btnSaveMaster"><span class="material-icons-outlined">save</span> บันทึก</button>
                        <button class="btn btn-outline" id="btnClearMaster"><span class="material-icons-outlined">refresh</span> ล้างแบบฟอร์ม</button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="form-row-2">${h}</div>
                </div>
            </div>
        `;function f(e){const l=i.find(t=>t.id===e);l&&(n=e,s.querySelector("#formTitle").innerText="แก้ไขข้อมูล",r.fields.forEach(t=>{const a=s.querySelector(`#field_${t.key}`);a&&(a.value=l[t.key]||"")}),s.querySelector('.tab-btn[data-tab="add"]').click())}async function $(e){if(await L("ยืนยันลบข้อมูล","คุณต้องการลบรายการนี้ใช่หรือไม่?"))try{await w(r.collection,e),o("ลบข้อมูลเรียบร้อย","success"),u()}catch{o("ไม่สามารถลบข้อมูลได้","error")}}c.querySelector("#btnSaveMaster").addEventListener("click",async()=>{const e={};let l=!1;if(r.fields.forEach(t=>{const a=s.querySelector(`#field_${t.key}`);a&&(e[t.key]=a.value,t.required&&!a.value&&(l=!0))}),l)return o("กรุณากรอกข้อมูลที่จำเป็น (*)","error");try{n?(await q(r.collection,n,e),o("อัปเดตข้อมูลเรียบร้อย","success")):(await x(r.collection,e),o("เพิ่มข้อมูลใหม่เรียบร้อย","success")),n=null,s.querySelector("#formTitle").innerText="เพิ่มข้อมูลใหม่",c.querySelectorAll(".form-control").forEach(t=>t.value=""),s.querySelector('.tab-btn[data-tab="search"]').click(),u()}catch(t){console.error(t),o("เกิดข้อผิดพลาดในการบันทึกข้อมูล","error")}}),c.querySelector("#btnClearMaster").addEventListener("click",()=>{n=null,s.querySelector("#formTitle").innerText="เพิ่มข้อมูลใหม่",c.querySelectorAll(".form-control").forEach(e=>e.value="")}),r.fields.filter(e=>e.type==="async_select"&&e.fetchOptions).forEach(async e=>{const l=s.querySelector(`#field_${e.key}`);if(l)try{const t=await e.fetchOptions();l.innerHTML=`<option value="">${e.placeholder||"-- เลือก --"}</option>`,t.forEach(a=>{const d=document.createElement("option");d.value=a.value||a,d.textContent=a.label||a,l.appendChild(d)})}catch(t){l.innerHTML='<option value="">โหลดไม่สำเร็จ</option>',console.warn(`[Master] Could not load options for ${e.key}:`,t.message)}}),u()}}export{g as c};
