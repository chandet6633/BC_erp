import{n as te,a as Z,o as se,s as h,f as b,e as S,b as ae,u as F,d as J,h as H,j as oe,m as M,r as le,g as ie,c as ne,k as de,l as re}from"./index-BeHq0lp5.js";import{B as C,p as ce}from"./inventory-Cf0eCzb2.js";function ye(n){return function(l){var R,z,B,G,K,N;let L=[],f=null,p=null;const Q=new Date().toISOString().slice(0,10);l.innerHTML=`
            <div class="page-header">
                <div class="page-title">
                    <span class="material-icons-outlined">${n.icon}</span>
                    <h1>${n.title}</h1>
                </div>
            </div>
            <div id="${n.prefix}Tabs"></div>
            <div id="panel-search" class="tab-panel active"></div>
            <div id="panel-add" class="tab-panel"></div>
        `;const P=l.querySelector(`#${n.prefix}Tabs`);te(l,[{id:"search",label:"ค้นหา",icon:"search"},{id:"add",label:"เพิ่ม / แก้ไข",icon:"add_circle_outline"}]);const V=l.querySelector(".tabs");V&&P&&P.appendChild(V);const W=l.querySelector("#panel-search");W.innerHTML=`
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
        `;const X=[{key:"doc_no",label:"เลขเอกสาร"},{key:"issue_date",label:"วันที่",render:e=>de(e.issue_date)},{key:"ref_no",label:"อ้างอิง"},{key:"grand_total",label:"ยอดรวม",render:e=>re(e.grand_total)},{key:"status",label:"สถานะ",render:e=>{const t=e.status||"pending";return`<span class="badge badge-${t==="confirmed"?"closed":t==="voided"?"cancelled":"open"}">${t==="confirmed"?"ยืนยัน":t==="voided"?"ยกเลิก":"รอดำเนินการ"}</span>`}},{key:"actions",label:"จัดการ",render:e=>`
                <div class="grid-actions">
                    <button class="btn btn-sm btn-outline btn-edit" data-id="${e.id}"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${e.id}"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                </div>
            `}];async function x(){const e=l.querySelector("#docGrid");e.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>';let t=`doc_type='${S(n.prefix)}'`;const o=ie();o&&(t+=` && ${o}`),L=await b("documents",{filter:t,requestKey:null}),A(L)}function A(e){const t=l.querySelector("#docGrid");t.innerHTML=le({columns:X,items:e}),t.querySelectorAll(".btn-edit").forEach(o=>o.onclick=a=>{a.stopPropagation(),Y(a.currentTarget.dataset.id)}),t.querySelectorAll(".btn-delete").forEach(o=>o.onclick=a=>{a.stopPropagation(),ee(a.currentTarget.dataset.id)})}l.querySelector("#searchDocInput").addEventListener("input",e=>{const t=e.target.value.toLowerCase(),o=L.filter(a=>(a.doc_no||"").toLowerCase().includes(t)||(a.ref_no||"").toLowerCase().includes(t));A(o)});const s=l.querySelector("#panel-add");let T=`
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
                </div>`),T+="</div>",s.innerHTML=T;const E=["RR","PI","PCN","P"].includes(n.prefix)?"vendors":"customers",g=Z({container:s.querySelector("#docEntityAC"),placeholder:E==="vendors"?"ค้นหาผู้จำหน่าย...":"ค้นหาลูกค้า...",fetchItems:async()=>(await b(E)).map(t=>({id:t.id,code:t.code,label:t.name,secondary:t.phone||""})),onSelect:()=>{}});p=se({container:s.querySelector("#docVatToggle"),vatEnabled:!1,vatMode:"customer_pays",onUpdate:()=>_()});function _(){let e=0,t=0;s.querySelectorAll(".doc-items-body tr").forEach(r=>{var q,D,w;if(r.classList.contains("grid-empty"))return;const y=parseFloat((q=r.querySelector(".line-qty"))==null?void 0:q.value)||0,u=parseFloat((D=r.querySelector(".line-price"))==null?void 0:D.value)||0,c=parseFloat((w=r.querySelector(".line-disc"))==null?void 0:w.value)||0,i=y*u-c;e+=y*u,t+=c,r.querySelector(".line-total").textContent="฿"+i.toLocaleString("th-TH",{minimumFractionDigits:2})});const o=p?p.getState():{vatEnabled:!1,vatMode:"customer_pays"},{vat_amount:a,grand_total:d}=ne(e,t,o.vatEnabled,o.vatMode);n.hasItems!==!1&&(s.querySelector("#doc_subtotal").textContent="฿"+e.toLocaleString("th-TH",{minimumFractionDigits:2}),s.querySelector("#doc_discount").textContent="-฿"+t.toLocaleString("th-TH",{minimumFractionDigits:2}),s.querySelector("#doc_vat").textContent="฿"+a.toLocaleString("th-TH",{minimumFractionDigits:2}),s.querySelector("#doc_grand_total").textContent="฿"+d.toLocaleString("th-TH",{minimumFractionDigits:2}),s.dataset.subtotal=e,s.dataset.discount=t,s.dataset.vat=a,s.dataset.total=d)}async function Y(e){const t=L.find(d=>d.id===e);if(!t)return;if(f=e,l.querySelector("#doc_no").value=t.doc_no||"",l.querySelector("#issue_date").value=t.issue_date?t.issue_date.split(" ")[0]:"",l.querySelector("#ref_no").value=t.ref_no||"",l.querySelector("#notes").value=t.notes||"",g&&t.entity_id)try{const d=await b(E,{filter:`id='${S(t.entity_id)}'`});d.length>0&&g.setValue(d[0].name)}catch{}if(p&&p.setState({vatEnabled:!!t.vat_enabled,vatMode:t.vat_mode||"customer_pays"}),n.hasItems!==!1){const d=s.querySelector(".doc-items-body");d.innerHTML='<tr class="grid-empty"><td colspan="7" style="text-align:center;">กำลังโหลดรายการ...</td></tr>';const r=await b("document_items",{filter:`document_id='${S(t.id)}'`});d.innerHTML="",r.length===0&&(d.innerHTML='<tr class="grid-empty"><td colspan="7" style="text-align:center;">ไม่มีรายการ</td></tr>'),r.forEach((y,u)=>j(y,u+1)),_()}const o=s.querySelector("#btnConfirmDoc"),a=s.querySelector("#btnVoidDoc");t.status==="pending"||!t.status?(o.style.display="inline-flex",a.style.display="inline-flex"):(o.style.display="none",a.style.display=t.status!=="voided"?"inline-flex":"none"),l.querySelector('.tab-btn[data-tab="add"]').click()}async function ee(e){if(await M("ยืนยัน","คุณต้องการลบเอกสารนี้ใช่หรือไม่?")){const t=await b("document_items",{filter:`document_id='${S(e)}'`});for(let o=0;o<t.length;o+=C)await Promise.all(t.slice(o,o+C).map(a=>H("document_items",a.id)));await H("documents",e),h("ลบเอกสารเรียบร้อย","success"),x()}}(R=s.querySelector("#btnSaveDoc"))==null||R.addEventListener("click",async()=>{var u,c;const e=l.querySelector("#doc_no").value,t=l.querySelector("#issue_date").value,o=l.querySelector("#ref_no").value,a=l.querySelector("#notes").value,d=(g==null?void 0:g.getSelectedId())||"",r=p?p.getState():{vatEnabled:!1,vatMode:"customer_pays"};if(!e)return h("กรุณาระบุเลขเอกสาร","error");if(!f&&(await b("documents",{filter:`doc_no='${S(e)}'`,requestKey:null})).length>0)return h(`เลขเอกสาร ${e} ซ้ำกันแล้ว`,"error");const y={doc_no:e,doc_type:n.prefix,issue_date:t,ref_no:o,notes:a,entity_id:d,status:"pending",branch_id:ae()||"",vat_enabled:r.vatEnabled,vat_mode:r.vatMode,discount_amount:parseFloat(s.dataset.discount||0),subtotal:parseFloat(s.dataset.subtotal||0),vat_amount:parseFloat(s.dataset.vat||0),grand_total:parseFloat(s.dataset.total||0)};try{let i=f;if(i?await F("documents",i,y):i=(await J("documents",y)).id,n.hasItems!==!1){const q=await b("document_items",{filter:`document_id='${S(i)}'`});for(let v=0;v<q.length;v+=C)await Promise.all(q.slice(v,v+C).map(m=>H("document_items",m.id)));const D=s.querySelectorAll(".doc-items-body tr:not(.grid-empty)"),w=[];for(const v of D){const m=v.querySelector(".line-prod"),I=((u=m==null?void 0:m.dataset)==null?void 0:u.selectedId)||(m==null?void 0:m.value)||"",O=(m==null?void 0:m.value)||"",$=parseFloat(v.querySelector(".line-qty").value)||0,k=parseFloat(v.querySelector(".line-price").value)||0,U=parseFloat((c=v.querySelector(".line-disc"))==null?void 0:c.value)||0;(I||O)&&(await J("document_items",{document_id:i,product_id:I,product_name:O,qty:$,unit_price:k,discount:U,total:$*k-U}),w.push({product_id:I,qty:$,unit_price:k}))}await ce(n.prefix,e,w)}h("บันทึกเอกสารเรียบร้อย","success"),l.querySelector("#btnClearDoc").click(),l.querySelector('.tab-btn[data-tab="search"]').click(),x()}catch(i){console.error(i),h("เกิดข้อผิดพลาดในการบันทึก","error")}}),(z=s.querySelector("#btnClearDoc"))==null||z.addEventListener("click",()=>{f=null,b("documents",{filter:`doc_type='${S(n.prefix)}'`,requestKey:null}).then(e=>{const t=oe(n.prefix,e.length+1);l.querySelector("#doc_no").value=t}),l.querySelector("#issue_date").value=Q,l.querySelector("#ref_no").value="",l.querySelector("#notes").value="",g&&(g.setValue(""),g.setSelectedId("")),p&&p.setState({vatEnabled:!1,vatMode:"customer_pays"}),n.hasItems!==!1&&(s.querySelector(".doc-items-body").innerHTML='<tr class="grid-empty"><td colspan="7" style="text-align:center;">กดปุ่ม "เพิ่มรายการ"</td></tr>',_()),s.querySelector("#btnConfirmDoc").style.display="none",s.querySelector("#btnVoidDoc").style.display="none"}),(B=s.querySelector("#btnConfirmDoc"))==null||B.addEventListener("click",async()=>{f&&await M("ยืนยันเอกสาร","ต้องการยืนยันเอกสารนี้?")&&(await F("documents",f,{status:"confirmed"}),h("ยืนยันเอกสารเรียบร้อย","success"),s.querySelector("#btnConfirmDoc").style.display="none",x())}),(G=s.querySelector("#btnVoidDoc"))==null||G.addEventListener("click",async()=>{f&&await M("ยกเลิกเอกสาร","ต้องการยกเลิกเอกสารนี้? การกระทำนี้ไม่สามารถย้อนกลับได้")&&(await F("documents",f,{status:"voided"}),h("ยกเลิกเอกสารเรียบร้อย","warning"),s.querySelector("#btnVoidDoc").style.display="none",s.querySelector("#btnConfirmDoc").style.display="none",x())});function j(e=null,t=1){const o=s.querySelector(".doc-items-body");o.querySelector(".grid-empty")&&(o.innerHTML="");const a=document.createElement("tr"),d=e&&(e.product_name||e.product_id)||"";a.innerHTML=`
                <td>${t}</td>
                <td><div class="ac-doc-line-host"></div></td>
                <td><input type="number" class="form-control line-qty" value="${e?e.qty:1}" min="1" style="width:80px;"></td>
                <td><input type="number" class="form-control line-price" value="${e?e.unit_price:0}" min="0" style="width:100px;"></td>
                <td><input type="number" class="form-control line-disc" value="${e&&e.discount||0}" min="0" style="width:100px;"></td>
                <td class="line-total text-bold">฿0.00</td>
                <td><button class="btn btn-sm btn-danger line-rm"><span class="material-icons-outlined" style="font-size:16px;">close</span></button></td>
            `,o.appendChild(a);const r=a.querySelector(".ac-doc-line-host"),y=["RR","PI","PCN","P"].includes(n.prefix),u=Z({container:r,placeholder:"พิมพ์ชื่อสินค้า...",value:d,fetchItems:async()=>(await b("products")).map(i=>({id:i.id,code:i.code,label:i.name,secondary:y?`ทุน ฿${i.cost||0} | ขาย ฿${i.price||0}`:`฿${i.price||0}`,_raw:i})),onSelect:c=>{a.querySelector(".line-price").value=y?c._raw.cost||c._raw.price||0:c._raw.price||0,u.input.dataset.selectedId=c.id,u.input.classList.add("line-prod"),_()}});u.input.classList.add("line-prod"),e!=null&&e.product_id&&(u.input.dataset.selectedId=e.product_id),a.querySelectorAll("input").forEach(c=>c.addEventListener("input",_)),a.querySelector(".line-rm").addEventListener("click",()=>{a.remove(),_()}),_()}(K=s.querySelector(".btn-add-line"))==null||K.addEventListener("click",()=>{const e=s.querySelectorAll(".doc-items-body tr:not(.grid-empty)").length;j(null,e+1)}),x(),(N=l.querySelector("#btnClearDoc"))==null||N.click()}}export{ye as c};
