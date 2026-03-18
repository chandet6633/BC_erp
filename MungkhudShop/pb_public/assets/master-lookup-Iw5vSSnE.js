import{s as l}from"./index-BeHq0lp5.js";const d=[{id:"provinces",label:"จังหวัด",icon:"location_on"},{id:"banks",label:"ธนาคาร",icon:"account_balance"},{id:"credit_cards",label:"บัตรเครดิต",icon:"credit_card"},{id:"tax_categories",label:"ประเภทภาษี",icon:"percent"},{id:"prefixes",label:"คำนำหน้า",icon:"badge"},{id:"units",label:"หน่วยนับ",icon:"straighten"},{id:"product_groups",label:"กลุ่มสินค้า",icon:"category"},{id:"job_types",label:"ประเภทงาน",icon:"build"}];function o(e){e.innerHTML=`
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">list_alt</span>
                <h1>ข้อมูลอ้างอิง</h1>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:240px 1fr;gap:var(--sp-5);">
            <div class="card">
                <div class="card-header"><h3>หมวดหมู่</h3></div>
                <div class="card-body" style="padding:0;">
                    <div id="lookupCategories">
                        ${d.map((a,t)=>`
                            <div class="nav-item ${t===0?"active":""}" data-cat="${a.id}" style="padding:var(--sp-3) var(--sp-4);cursor:pointer;border-left:3px solid ${t===0?"var(--color-primary)":"transparent"};">
                                <span class="material-icons-outlined" style="font-size:18px;">${a.icon}</span>
                                <span>${a.label}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3 id="lookupTitle">${d[0].label}</h3>
                    <button class="btn btn-sm btn-primary" id="btnAddLookup"><span class="material-icons-outlined" style="font-size:16px;">add</span> เพิ่มรายการ</button>
                </div>
                <div class="card-body">
                    <div class="data-grid">
                        <table>
                            <thead><tr><th>#</th><th>รหัส</th><th>ชื่อ</th><th>สถานะ</th><th></th></tr></thead>
                            <tbody id="lookupBody">
                                <tr><td colspan="5" class="grid-empty" style="text-align:center;padding:var(--sp-6);color:var(--color-text-muted);">เลือกหมวดหมู่เพื่อดูข้อมูล</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `,e.querySelectorAll("#lookupCategories .nav-item").forEach(a=>{a.addEventListener("click",()=>{e.querySelectorAll("#lookupCategories .nav-item").forEach(i=>{i.classList.remove("active"),i.style.borderLeftColor="transparent"}),a.classList.add("active"),a.style.borderLeftColor="var(--color-primary)";const t=d.find(i=>i.id===a.dataset.cat);e.querySelector("#lookupTitle").textContent=(t==null?void 0:t.label)||""})}),e.querySelector("#btnAddLookup").addEventListener("click",()=>l("เพิ่มรายการใหม่","info"))}export{o as initMasterLookupPage};
