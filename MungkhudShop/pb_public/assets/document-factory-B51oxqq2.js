import{n as et,a as J,o as st,s as h,f as b,e as S,b as at,u as F,d as K,h as H,j as ot,m as M,r as lt,g as it,c as nt,k as dt,l as rt}from"./index-9Z-6SckO.js";import{B as C,p as ct}from"./inventory-BROWFZn2.js";function pt(n){return function(l){var R,z,B,G,N,O;let L=[],f=null,y=null;const Q=new Date().toISOString().slice(0,10);l.innerHTML=`
            <div class="page-header">
                <div class="page-title">
                    <span class="material-icons-outlined">${n.icon}</span>
                    <h1>${n.title}</h1>
                </div>
            </div>
            <div id="${n.prefix}Tabs"></div>
            <div id="panel-search" class="tab-panel active"></div>
            <div id="panel-add" class="tab-panel"></div>
        `;const P=l.querySelector(`#${n.prefix}Tabs`);et(l,[{id:"search",label:"ค้นหา",icon:"search"},{id:"add",label:"เพิ่ม / แก้ไข",icon:"add_circle_outline"}]);const V=l.querySelector(".tabs");V&&P&&P.appendChild(V);const W=l.querySelector("#panel-search");W.innerHTML=`
            <div class="card">
                <div class="card-body">
                    <div class="form-row-4" style="margin-bottom:var(--sp-4);">
                        <div class="form-group">
                            <label class="form-label">ค้นหาเอกสาร</label>
                            <input type="text" class="form-control" id="searchDocInput" placeholder="พิมพ์เพื่อค้นหา...">
                        </div>
                    </div>
                </div>
            </div>
            <div id="docGrid" style="margin-top:var(--sp-4);"></div>
        `;const X=[{key:"doc_no",label:"เลขเอกสาร"},{key:"issue_date",label:"วันที่",render:t=>dt(t.issue_date)},{key:"ref_no",label:"อ้างอิง"},{key:"grand_total",label:"ยอดรวม",render:t=>rt(t.grand_total)},{key:"status",label:"สถานะ",render:t=>{const e=t.status||"pending";return`<span class="badge badge-${e==="confirmed"?"closed":e==="voided"?"cancelled":"open"}">${e==="confirmed"?"ยืนยัน":e==="voided"?"ยกเลิก":"รอดำเนินการ"}</span>`}},{key:"actions",label:"จัดการ",render:t=>`
                <div class="grid-actions">
                    <button class="btn btn-sm btn-outline btn-edit" data-id="${t.id}"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${t.id}"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                </div>
            `}];async function x(){const t=l.querySelector("#docGrid");t.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>';let e=`doc_type='${S(n.prefix)}'`;const o=it();o&&(e+=` && ${o}`),L=await b("documents",{filter:e}),A(L)}function A(t){const e=l.querySelector("#docGrid");e.innerHTML=lt({columns:X,items:t}),e.querySelectorAll(".btn-edit").forEach(o=>o.onclick=a=>{a.stopPropagation(),Y(a.currentTarget.dataset.id)}),e.querySelectorAll(".btn-delete").forEach(o=>o.onclick=a=>{a.stopPropagation(),tt(a.currentTarget.dataset.id)})}l.querySelector("#searchDocInput").addEventListener("input",t=>{const e=t.target.value.toLowerCase(),o=L.filter(a=>(a.doc_no||"").toLowerCase().includes(e)||(a.ref_no||"").toLowerCase().includes(e));A(o)});const s=l.querySelector("#panel-add");let T=`
                <div class="toolbar">
                <div class="toolbar-actions">
                    <button class="btn btn-primary" id="btnSaveDoc"><span class="material-icons-outlined">save</span> บันทึก</button>
                    <button class="btn btn-outline" id="btnClearDoc"><span class="material-icons-outlined">refresh</span> ล้างแบบฟอร์ม</button>
                    <button class="btn btn-success" id="btnConfirmDoc" style="display:none;"><span class="material-icons-outlined">check_circle</span> ยืนยัน</button>
                    <button class="btn btn-danger" id="btnVoidDoc" style="display:none;"><span class="material-icons-outlined">cancel</span> ยกเลิก</button>
                </div>
            </div>
                <div class="job-form-grid">
                    <div class="job-section">
                        <div class="job-section-title"><span class="material-icons-outlined">description</span> ข้อมูลเอกสาร</div>
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label">เลขเอกสาร</label>
                                <input type="text" class="form-control" id="doc_no" readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label">วันที่</label>
                                <input type="date" class="form-control" id="issue_date">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">อ้างอิงเอกสาร</label>
                            <input type="text" class="form-control" id="ref_no" placeholder="อ้างอิง...">
                        </div>
                    </div>
                    <div class="job-section">
                        <div class="job-section-title"><span class="material-icons-outlined">person</span> รายละเอียดเพิ่มเติม</div>
                        <div class="form-group">
                            <label class="form-label">คู่ค้า / ลูกค้า</label>
                            <div id="docEntityAC"></div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">หมายเหตุ</label>
                            <textarea class="form-control" id="notes" rows="3" placeholder="กรอกข้อมูลเพิ่มเติม..."></textarea>
                        </div>
                        <div id="docVatToggle" style="margin-top:var(--sp-3);"></div>
                    </div>
                    `;n.hasItems!==!1&&(T+=`
                <div class="job-section job-items-section">
                    <div class="job-section-title"><span class="material-icons-outlined">list_alt</span> รายการ</div>
                    <div class="toolbar" style="margin-bottom:var(--sp-3);">
                        <button class="btn btn-sm btn-primary btn-add-line"><span class="material-icons-outlined" style="font-size:16px;">add</span> เพิ่มรายการ</button>
                    </div>
                    <div class="data-grid">
                        <table>
                            <thead><tr><th>#</th><th>สินค้า / บริการ</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>ส่วนลด</th><th>รวม</th><th></th></tr></thead>
                            <tbody class="doc-items-body">
                                <tr><td colspan="7" class="grid-empty" style="text-align:center;padding:var(--sp-6);">กดปุ่ม "เพิ่มรายการ"</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:var(--sp-6);margin-top:var(--sp-4);">
                        <div style="text-align:right;"><div class="text-sm text-muted">รวม</div><div class="text-bold doc-subtotal" id="doc_subtotal">฿0.00</div></div>
                        <div style="text-align:right;"><div class="text-sm text-muted">ส่วนลด</div><div class="text-bold doc-discount" id="doc_discount" style="color:var(--color-danger);">-฿0.00</div></div>
                        <div style="text-align:right;"><div class="text-sm text-muted">VAT 7%</div><div class="text-bold doc-vat" id="doc_vat">฿0.00</div></div>
                        <div style="text-align:right;"><div class="text-sm" style="color:var(--color-primary);font-weight:600;">ยอดรวมสุทธิ</div><div style="font-size:1.4rem;font-weight:700;color:var(--color-primary);" class="doc-total" id="doc_grand_total">฿0.00</div></div>
                    </div>
                </div>`),T+="</div>",s.innerHTML=T;const E=["RR","PI","PCN","P"].includes(n.prefix)?"vendors":"customers",g=J({container:s.querySelector("#docEntityAC"),placeholder:E==="vendors"?"ค้นหาผู้จำหน่าย...":"ค้นหาลูกค้า...",fetchItems:async()=>(await b(E)).map(e=>({id:e.id,code:e.code,label:e.name,secondary:e.phone||""})),onSelect:()=>{}});y=st({container:s.querySelector("#docVatToggle"),vatEnabled:!1,vatMode:"customer_pays",onUpdate:()=>_()});function _(){let t=0,e=0;s.querySelectorAll(".doc-items-body tr").forEach(r=>{var q,D,w;if(r.classList.contains("grid-empty"))return;const p=parseFloat((q=r.querySelector(".line-qty"))==null?void 0:q.value)||0,u=parseFloat((D=r.querySelector(".line-price"))==null?void 0:D.value)||0,c=parseFloat((w=r.querySelector(".line-disc"))==null?void 0:w.value)||0,i=p*u-c;t+=p*u,e+=c,r.querySelector(".line-total").textContent="฿"+i.toLocaleString("th-TH",{minimumFractionDigits:2})});const o=y?y.getState():{vatEnabled:!1,vatMode:"customer_pays"},{vat_amount:a,grand_total:d}=nt(t,e,o.vatEnabled,o.vatMode);n.hasItems!==!1&&(s.querySelector("#doc_subtotal").textContent="฿"+t.toLocaleString("th-TH",{minimumFractionDigits:2}),s.querySelector("#doc_discount").textContent="-฿"+e.toLocaleString("th-TH",{minimumFractionDigits:2}),s.querySelector("#doc_vat").textContent="฿"+a.toLocaleString("th-TH",{minimumFractionDigits:2}),s.querySelector("#doc_grand_total").textContent="฿"+d.toLocaleString("th-TH",{minimumFractionDigits:2}),s.dataset.subtotal=t,s.dataset.discount=e,s.dataset.vat=a,s.dataset.total=d)}async function Y(t){const e=L.find(d=>d.id===t);if(!e)return;if(f=t,l.querySelector("#doc_no").value=e.doc_no||"",l.querySelector("#issue_date").value=e.issue_date?e.issue_date.split(" ")[0]:"",l.querySelector("#ref_no").value=e.ref_no||"",l.querySelector("#notes").value=e.notes||"",g&&e.entity_id)try{const d=await b(E,{filter:`id='${S(e.entity_id)}'`});d.length>0&&g.setValue(d[0].name)}catch{}if(y&&y.setState({vatEnabled:!!e.vat_enabled,vatMode:e.vat_mode||"customer_pays"}),n.hasItems!==!1){const d=s.querySelector(".doc-items-body");d.innerHTML='<tr class="grid-empty"><td colspan="7" style="text-align:center;">กำลังโหลดรายการ...</td></tr>';const r=await b("document_items",{filter:`document_id='${S(e.id)}'`});d.innerHTML="",r.length===0&&(d.innerHTML='<tr class="grid-empty"><td colspan="7" style="text-align:center;">ไม่มีรายการ</td></tr>'),r.forEach((p,u)=>j(p,u+1)),_()}const o=s.querySelector("#btnConfirmDoc"),a=s.querySelector("#btnVoidDoc");e.status==="pending"||!e.status?(o.style.display="inline-flex",a.style.display="inline-flex"):(o.style.display="none",a.style.display=e.status!=="voided"?"inline-flex":"none"),l.querySelector('.tab-btn[data-tab="add"]').click()}async function tt(t){if(await M("ยืนยัน","คุณต้องการลบเอกสารนี้ใช่หรือไม่?")){const e=await b("document_items",{filter:`document_id='${S(t)}'`});for(let o=0;o<e.length;o+=C)await Promise.all(e.slice(o,o+C).map(a=>H("document_items",a.id)));await H("documents",t),h("ลบเอกสารเรียบร้อย","success"),x()}}(R=s.querySelector("#btnSaveDoc"))==null||R.addEventListener("click",async()=>{var u,c;const t=l.querySelector("#doc_no").value,e=l.querySelector("#issue_date").value,o=l.querySelector("#ref_no").value,a=l.querySelector("#notes").value,d=(g==null?void 0:g.getSelectedId())||"",r=y?y.getState():{vatEnabled:!1,vatMode:"customer_pays"};if(!t)return h("กรุณาระบุเลขเอกสาร","error");if(!f&&(await b("documents",{filter:`doc_no='${S(t)}'`})).length>0)return h(`เลขเอกสาร ${t} ซ้ำกันแล้ว`,"error");const p={doc_no:t,doc_type:n.prefix,issue_date:e,ref_no:o,notes:a,entity_id:d,status:"pending",branch_id:at()||"",vat_enabled:r.vatEnabled,vat_mode:r.vatMode,discount_amount:parseFloat(s.dataset.discount||0),subtotal:parseFloat(s.dataset.subtotal||0),vat_amount:parseFloat(s.dataset.vat||0),grand_total:parseFloat(s.dataset.total||0)};try{let i=f;if(i?await F("documents",i,p):i=(await K("documents",p)).id,n.hasItems!==!1){const q=await b("document_items",{filter:`document_id='${S(i)}'`});for(let v=0;v<q.length;v+=C)await Promise.all(q.slice(v,v+C).map(m=>H("document_items",m.id)));const D=s.querySelectorAll(".doc-items-body tr:not(.grid-empty)"),w=[];for(const v of D){const m=v.querySelector(".line-prod"),I=((u=m==null?void 0:m.dataset)==null?void 0:u.selectedId)||(m==null?void 0:m.value)||"",U=(m==null?void 0:m.value)||"",$=parseFloat(v.querySelector(".line-qty").value)||0,k=parseFloat(v.querySelector(".line-price").value)||0,Z=parseFloat((c=v.querySelector(".line-disc"))==null?void 0:c.value)||0;(I||U)&&(await K("document_items",{document_id:i,product_id:I,product_name:U,qty:$,unit_price:k,discount:Z,total:$*k-Z}),w.push({product_id:I,qty:$,unit_price:k}))}await ct(n.prefix,t,w)}h("บันทึกเอกสารเรียบร้อย","success"),l.querySelector("#btnClearDoc").click(),l.querySelector('.tab-btn[data-tab="search"]').click(),x()}catch(i){console.error(i),h("เกิดข้อผิดพลาดในการบันทึก","error")}}),(z=s.querySelector("#btnClearDoc"))==null||z.addEventListener("click",()=>{f=null,b("documents",{filter:`doc_type='${S(n.prefix)}'`}).then(t=>{const e=ot(n.prefix,t.length+1);l.querySelector("#doc_no").value=e}),l.querySelector("#issue_date").value=Q,l.querySelector("#ref_no").value="",l.querySelector("#notes").value="",g&&(g.setValue(""),g.setSelectedId("")),y&&y.setState({vatEnabled:!1,vatMode:"customer_pays"}),n.hasItems!==!1&&(s.querySelector(".doc-items-body").innerHTML='<tr class="grid-empty"><td colspan="7" style="text-align:center;">กดปุ่ม "เพิ่มรายการ"</td></tr>',_()),s.querySelector("#btnConfirmDoc").style.display="none",s.querySelector("#btnVoidDoc").style.display="none"}),(B=s.querySelector("#btnConfirmDoc"))==null||B.addEventListener("click",async()=>{f&&await M("ยืนยันเอกสาร","ต้องการยืนยันเอกสารนี้?")&&(await F("documents",f,{status:"confirmed"}),h("ยืนยันเอกสารเรียบร้อย","success"),s.querySelector("#btnConfirmDoc").style.display="none",x())}),(G=s.querySelector("#btnVoidDoc"))==null||G.addEventListener("click",async()=>{f&&await M("ยกเลิกเอกสาร","ต้องการยกเลิกเอกสารนี้? การกระทำนี้ไม่สามารถย้อนกลับได้")&&(await F("documents",f,{status:"voided"}),h("ยกเลิกเอกสารเรียบร้อย","warning"),s.querySelector("#btnVoidDoc").style.display="none",s.querySelector("#btnConfirmDoc").style.display="none",x())});function j(t=null,e=1){const o=s.querySelector(".doc-items-body");o.querySelector(".grid-empty")&&(o.innerHTML="");const a=document.createElement("tr"),d=t&&(t.product_name||t.product_id)||"";a.innerHTML=`
                <td>${e}</td>
                <td><div class="ac-doc-line-host"></div></td>
                <td><input type="number" class="form-control line-qty" value="${t?t.qty:1}" min="1" style="width:80px;"></td>
                <td><input type="number" class="form-control line-price" value="${t?t.unit_price:0}" min="0" style="width:100px;"></td>
                <td><input type="number" class="form-control line-disc" value="${t&&t.discount||0}" min="0" style="width:100px;"></td>
                <td class="line-total text-bold">฿0.00</td>
                <td><button class="btn btn-sm btn-danger line-rm"><span class="material-icons-outlined" style="font-size:16px;">close</span></button></td>
            `,o.appendChild(a);const r=a.querySelector(".ac-doc-line-host"),p=["RR","PI","PCN","P"].includes(n.prefix),u=J({container:r,placeholder:"พิมพ์ชื่อสินค้า...",value:d,fetchItems:async()=>(await b("products")).map(i=>({id:i.id,code:i.code,label:i.name,secondary:p?`ทุน ฿${i.cost||0} | ขาย ฿${i.price||0}`:`฿${i.price||0}`,_raw:i})),onSelect:c=>{a.querySelector(".line-price").value=p?c._raw.cost||c._raw.price||0:c._raw.price||0,u.input.dataset.selectedId=c.id,u.input.classList.add("line-prod"),_()}});u.input.classList.add("line-prod"),t!=null&&t.product_id&&(u.input.dataset.selectedId=t.product_id),a.querySelectorAll("input").forEach(c=>c.addEventListener("input",_)),a.querySelector(".line-rm").addEventListener("click",()=>{a.remove(),_()}),_()}(N=s.querySelector(".btn-add-line"))==null||N.addEventListener("click",()=>{const t=s.querySelectorAll(".doc-items-body tr:not(.grid-empty)").length;j(null,t+1)}),x(),(O=l.querySelector("#btnClearDoc"))==null||O.click()}}export{pt as c};
