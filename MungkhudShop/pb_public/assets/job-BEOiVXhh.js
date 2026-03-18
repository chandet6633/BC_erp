import{f as h,c as tt,a as D,g as et,s as I,b as ot,u as F,d as G,e as k,h as U,i as at,j as J,r as st,k as lt,l as rt,m as H,n as it,o as ct,p as nt,q as T}from"./index-BeHq0lp5.js";import{B as Q,p as B}from"./inventory-Cf0eCzb2.js";let V=[],z=null,O=null,N=null,K=null,$=null,P=null;function L(){return{currentItems:V,editingId:z,plateAC:O,customerAC:N,vatToggle:K}}function dt(t){V=t}function W(t){z=t}function ut(t){O=t}function bt(t){N=t}function mt(t){K=t}function vt(){V=[],z=null,O=null,N=null,K=null,yt()}async function pt(){if(!$){const[t,e]=await Promise.all([h("products",{requestKey:null}),h("stock_ledgers",{requestKey:null})]);$=t,P={},e.forEach(i=>{P[i.product_id]=(P[i.product_id]||0)+(i.qty||0)})}return{products:$,stockMap:P}}function yt(){$=null,P=null}function R(t,e=null,i=1){const c=t.querySelector("#jobItemsBody");c.querySelector(".grid-empty")&&(c.innerHTML="");const a=document.createElement("tr"),n=e&&(e.product_name||e.product_id)||"";a.innerHTML=`
        <td>${i}</td>
        <td><div class="ac-line-host"></div></td>
        <td><input type="number" class="form-control item-qty" value="${e?e.qty:1}" min="1" style="width:80px;"></td>
        <td><input type="number" class="form-control item-price" value="${e?e.unit_price:0}" min="0" style="width:100px;"></td>
        <td><input type="number" class="form-control item-disc" value="${e?e.discount:0}" min="0" style="width:100px;"></td>
        <td class="item-total text-bold">฿0.00</td>
        <td><button class="btn btn-sm btn-danger item-remove"><span class="material-icons-outlined" style="font-size:16px;">close</span></button></td>
    `,c.appendChild(a);const s=a.querySelector(".ac-line-host"),l=D({container:s,placeholder:"พิมพ์ชื่อสินค้า...",value:n,fetchItems:async()=>{const{products:d,stockMap:r}=await pt();return d.map(o=>({id:o.id,code:o.code,label:o.name,secondary:`คงเหลือ: ${r[o.id]||0} | ฿${o.price||0}`,_raw:o}))},onSelect:d=>{a.querySelector(".item-price").value=d._raw.price||0,l.input.dataset.selectedId=d.id,l.input.classList.add("item-prod"),w(t)}});l.input.classList.add("item-prod"),e!=null&&e.product_id&&(l.input.dataset.selectedId=e.product_id),a.querySelectorAll("input").forEach(d=>d.addEventListener("input",()=>w(t))),a.querySelector(".item-remove").addEventListener("click",()=>{a.remove(),w(t)}),w(t)}function w(t){var d;const{vatToggle:e}=L();let i=0;t.querySelectorAll("#jobItemsBody tr").forEach(r=>{var S,g,p;if(r.classList.contains("grid-empty"))return;const o=parseFloat((S=r.querySelector(".item-qty"))==null?void 0:S.value)||0,u=parseFloat((g=r.querySelector(".item-price"))==null?void 0:g.value)||0,b=parseFloat((p=r.querySelector(".item-disc"))==null?void 0:p.value)||0,y=o*u-b;i+=y;const v=r.querySelector(".item-total");v&&(v.textContent="฿"+y.toLocaleString("th-TH",{minimumFractionDigits:2}))});const c=parseFloat((d=t.querySelector("#jobDiscount"))==null?void 0:d.value)||0,a=i*(c/100),n=e?e.getState():{vatEnabled:!1,vatMode:"customer_pays"},{vat_amount:s,grand_total:l}=tt(i,a,n.vatEnabled,n.vatMode);t.querySelector("#jobSubtotal").textContent="฿"+i.toLocaleString("th-TH",{minimumFractionDigits:2}),t.querySelector("#jobDiscountAmt").textContent="-฿"+a.toLocaleString("th-TH",{minimumFractionDigits:2}),t.querySelector("#jobVat").textContent="฿"+s.toLocaleString("th-TH",{minimumFractionDigits:2}),t.querySelector("#jobTotal").textContent="฿"+l.toLocaleString("th-TH",{minimumFractionDigits:2}),t.dataset.subtotal=i,t.dataset.discAmt=a,t.dataset.vat=s,t.dataset.total=l}async function E(t,e){const i=t.querySelector("#jobSearchResults");i.innerHTML='<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>';const c=et(),n=await h("jobs",c?{filter:c}:{});dt(n),Z(n,e)}function ft(t,e){const{currentItems:i}=L(),c=(t.querySelector("#searchKeyword").value||"").toLowerCase(),a=t.querySelector("#searchStatus").value,n=i.filter(s=>{let l=!0;c&&(l=(s.job_no||"").toLowerCase().includes(c)||(s.plate||"").toLowerCase().includes(c)||(s.customer_name||"").toLowerCase().includes(c));let d=!0;return a&&(d=s.status===a),l&&d});Z(n,e)}function Z(t,e){const i=e.querySelector("#panel-search"),c=i.querySelector("#jobSearchResults");c.innerHTML=st({columns:[{key:"job_no",label:"เลขใบงาน"},{key:"status",label:"สถานะ",render:a=>`<span class="badge badge-${a.status||"open"}">${a.status==="closed"?"ปิดงาน":a.status==="cancelled"?"ยกเลิก":"เปิด"}</span>`},{key:"plate",label:"ทะเบียนรถ"},{key:"customer_name",label:"ลูกค้า"},{key:"start_date",label:"วันเริ่ม",render:a=>lt(a.start_date)},{key:"grand_total",label:"ยอดรวม",render:a=>rt(a.grand_total)},{key:"profit",label:"กำไร",render:a=>{if(a.status!=="closed"||a.profit==null)return"-";const n=a.profit||0;return`<span style="color:${n>=0?"#22c55e":"#ef4444"};font-weight:600;">${n>=0?"":"-"}฿${Math.abs(n).toLocaleString("th-TH",{minimumFractionDigits:2})}</span>`}},{key:"actions",label:"",render:a=>`<div class="grid-actions"><button class="btn btn-sm btn-outline btn-edit" data-id="${a.id}"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button><button class="btn btn-sm btn-danger btn-delete" data-id="${a.id}"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button></div>`}],items:t}),c.querySelectorAll(".btn-edit").forEach(a=>a.onclick=n=>{n.stopPropagation(),ht(n.currentTarget.dataset.id,e)}),c.querySelectorAll(".btn-delete").forEach(a=>a.onclick=n=>{n.stopPropagation(),St(n.currentTarget.dataset.id,i,e)})}async function ht(t,e){const{currentItems:i,plateAC:c,customerAC:a,vatToggle:n}=L(),s=i.find(o=>o.id===t);if(!s)return;const l=e.querySelector("#panel-add");W(t),l.querySelector("#jobDocId").value=s.job_no||"",l.querySelector("#jobStatus").value=s.status||"open",l.querySelector("#jobStartDate").value=s.start_date?s.start_date.split(" ")[0]:"",l.querySelector("#jobEndDate").value=s.end_date?s.end_date.split(" ")[0]:"",l.querySelector("#jobNotes").value=s.notes||"",l.querySelector("#jobTechnician").value=s.technician||"",c&&c.setValue(s.plate||""),s.is_red_plate?l.querySelector("#jobRedPlate").classList.add("active"):l.querySelector("#jobRedPlate").classList.remove("active"),l.querySelector("#jobModel").value=s.model||"",l.querySelector("#jobMileage").value=s.mileage||"",l.querySelector("#jobChassis").value=s.chassis||"",a&&a.setValue(s.customer_name||""),l.querySelector("#jobCustomerPhone").value=s.customer_phone||"",l.querySelector("#jobPaymentType").value=s.payment_type||"cash",l.querySelector("#jobDiscount").value=s.discount_pct||0,n&&n.setState({vatEnabled:!!s.vat_enabled,vatMode:s.vat_mode||"customer_pays"}),s.status==="open"?(l.querySelector("#btnCloseJob").style.display="inline-flex",l.querySelector("#btnCancelJob").style.display="inline-flex"):(l.querySelector("#btnCloseJob").style.display="none",l.querySelector("#btnCancelJob").style.display="none");const d=l.querySelector("#jobItemsBody");d.innerHTML='<tr class="grid-empty"><td colspan="7" style="text-align:center;">กำลังโหลดรายการ...</td></tr>';const r=await h("job_items",{filter:`job_id='${k(s.id)}'`});d.innerHTML="",r.length===0&&(d.innerHTML='<tr class="grid-empty"><td colspan="7" style="text-align:center;">ไม่มีรายการ</td></tr>'),r.forEach((o,u)=>R(l,o,u+1)),w(l),e.querySelector('.tab-btn[data-tab="add"]').click()}async function St(t,e,i){await H("ยืนยันลบ","คุณต้องการลบใบงานนี้ใช่หรือไม่?")&&(await U("jobs",t),I("ลบใบงานเรียบร้อย","success"),E(e,i))}async function gt(t,e){var u;const{editingId:i,plateAC:c,customerAC:a,vatToggle:n}=L(),s=t.querySelector("#jobDocId").value,l=c?c.input.value:"",d=a?a.input.value:"";if(!s||!l||!d)return I("กรุณากรอกทะเบียนรถ และชื่อลูกค้า","error");const r=n?n.getState():{vatEnabled:!1,vatMode:"customer_pays"},o={job_no:s,status:t.querySelector("#jobStatus").value,start_date:t.querySelector("#jobStartDate").value,end_date:t.querySelector("#jobEndDate").value,notes:t.querySelector("#jobNotes").value,plate:l,is_red_plate:t.querySelector("#jobRedPlate").classList.contains("active"),model:t.querySelector("#jobModel").value,mileage:parseFloat(t.querySelector("#jobMileage").value)||0,chassis:t.querySelector("#jobChassis").value,customer_name:d,customer_phone:t.querySelector("#jobCustomerPhone").value,payment_type:t.querySelector("#jobPaymentType").value,discount_pct:parseFloat(t.querySelector("#jobDiscount").value)||0,technician:t.querySelector("#jobTechnician").value,branch_id:ot()||"",vat_enabled:r.vatEnabled,vat_mode:r.vatMode,subtotal:parseFloat(t.dataset.subtotal||0),discount_amount:parseFloat(t.dataset.discAmt||0),vat_amount:parseFloat(t.dataset.vat||0),grand_total:parseFloat(t.dataset.total||0)};try{let b=i;b?await F("jobs",b,o):b=(await G("jobs",o)).id;const y=await h("job_items",{filter:`job_id='${k(b)}'`});for(let p=0;p<y.length;p+=Q)await Promise.all(y.slice(p,p+Q).map(m=>U("job_items",m.id)));const v=t.querySelectorAll("#jobItemsBody tr:not(.grid-empty)"),S=[];for(const p of v){const m=p.querySelector(".item-prod"),f=((u=m==null?void 0:m.dataset)==null?void 0:u.selectedId)||(m==null?void 0:m.value)||"",C=(m==null?void 0:m.value)||"",_=parseFloat(p.querySelector(".item-qty").value)||0,q=parseFloat(p.querySelector(".item-price").value)||0,x=parseFloat(p.querySelector(".item-disc").value)||0;(f||C)&&(await G("job_items",{job_id:b,product_id:f,product_name:C,qty:_,unit_price:q,discount:x,total:_*q-x}),S.push({product_id:f,qty:_,unit_price:q}))}t.querySelector("#jobStatus").value==="closed"?await B("JOB",s,S):await B("JOB",s,[]),I("บันทึกใบงานเรียบร้อย","success"),X(t),e.querySelector('.tab-btn[data-tab="search"]').click(),E(e.querySelector("#panel-search"),e)}catch(b){console.error(b),I("เกิดข้อผิดพลาดในการบันทึก","error")}}function X(t){const{plateAC:e,customerAC:i,vatToggle:c}=L();W(null),at("jobs",1,1,{sort:"-created",requestKey:null}).then(a=>{t.querySelector("#jobDocId").value=J("JOB",((a==null?void 0:a.totalItems)||0)+1)}).catch(()=>{t.querySelector("#jobDocId").value=J("JOB")}),t.querySelector("#jobStatus").value="open",t.querySelector("#jobStartDate").value=new Date().toISOString().slice(0,10),t.querySelector("#jobEndDate").value="",t.querySelector("#jobNotes").value="",t.querySelector("#jobTechnician").value="",e&&(e.setValue(""),e.setSelectedId("")),t.querySelector("#jobRedPlate").classList.remove("active"),t.querySelector("#jobModel").value="",t.querySelector("#jobMileage").value="",t.querySelector("#jobChassis").value="",i&&(i.setValue(""),i.setSelectedId("")),t.querySelector("#jobCustomerPhone").value="",t.querySelector("#jobPaymentType").value="cash",t.querySelector("#jobDiscount").value="0",c&&c.setState({vatEnabled:!1,vatMode:"customer_pays"}),t.querySelector("#btnCloseJob").style.display="none",t.querySelector("#btnCancelJob").style.display="none",t.querySelector("#jobItemsBody").innerHTML='<tr class="grid-empty"><td colspan="7" style="text-align:center;">กดปุ่ม "เพิ่มรายการ"</td></tr>',w(t)}function wt(t){vt(),t.innerHTML=`
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">build</span>
                <h1>ใบงาน (Job)</h1>
            </div>
        </div>
        <div id="jobTabs"></div>
        <div id="panel-search" class="tab-panel active"></div>
        <div id="panel-add" class="tab-panel"></div>
    `;const e=t.querySelector("#jobTabs");it(t,[{id:"search",label:"ค้นหา",icon:"search"},{id:"add",label:"เพิ่ม / แก้ไข",icon:"add_circle_outline"}]);const i=t.querySelector(".tabs");i&&e&&e.appendChild(i),qt(t.querySelector("#panel-search"),t),jt(t.querySelector("#panel-add"),t)}function qt(t,e){t.innerHTML=`
        <div class="card">
            <div class="card-body">
                <div class="form-row-4" style="margin-bottom:var(--sp-4);">
                    <div class="form-group">
                        <label class="form-label">เลขใบงาน</label>
                        <input type="text" class="form-control" id="searchJobId" placeholder="JOB2603-0001">
                    </div>
                    <div class="form-group">
                        <label class="form-label">สถานะ</label>
                        <select class="form-control" id="searchStatus">
                            <option value="">ทั้งหมด</option>
                            <option value="open">เปิด</option>
                            <option value="closed">ปิดงาน</option>
                            <option value="cancelled">ยกเลิก</option>
                        </select>
                    </div>
                </div>
                <div class="form-row-3" style="margin-bottom:var(--sp-4);">
                    <div class="form-group">
                        <label class="form-label">ทะเบียนรถ / ลูกค้า</label>
                        <input type="text" class="form-control" id="searchKeyword" placeholder="พิมพ์เพื่อค้นหา...">
                    </div>
                    <div class="form-group" style="justify-content:flex-end;">
                        <button class="btn btn-primary" id="btnSearchJob">
                            <span class="material-icons-outlined">search</span> ค้นหา
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div id="jobSearchResults" style="margin-top:var(--sp-4);"></div>
    `,t.querySelector("#btnSearchJob").addEventListener("click",()=>E(t,e)),t.querySelector("#searchKeyword").addEventListener("input",()=>ft(t,e)),E(t,e)}function jt(t,e){const i=J("JOB"),c=new Date().toISOString().slice(0,10);t.innerHTML=`
        <div class="toolbar">
            <div class="toolbar-actions">
                <button class="btn btn-primary" id="btnSaveJob"><span class="material-icons-outlined">save</span> บันทึก</button>
                <button class="btn btn-outline" id="btnClearJob"><span class="material-icons-outlined">refresh</span> ล้างฟอร์ม</button>
                <button class="btn btn-success" id="btnCloseJob" style="display:none;"><span class="material-icons-outlined">check_circle</span> ปิดงาน</button>
                <button class="btn btn-danger" id="btnCancelJob" style="display:none;"><span class="material-icons-outlined">cancel</span> ยกเลิกงาน</button>
            </div>
        </div>

        <div class="job-form-grid">
            <!-- Job Info -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">assignment</span> ข้อมูลใบงาน</div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">เลขใบงาน</label>
                        <input type="text" class="form-control" id="jobDocId" value="${i}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">สถานะ</label>
                        <select class="form-control" id="jobStatus" disabled>
                            <option value="open">เปิด</option>
                            <option value="closed">ปิดงาน</option>
                            <option value="cancelled">ยกเลิก</option>
                        </select>
                    </div>
                </div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">วันเริ่มงาน</label>
                        <input type="date" class="form-control" id="jobStartDate" value="${c}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">วันกำหนดเสร็จ</label>
                        <input type="date" class="form-control" id="jobEndDate">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">ช่างผู้รับผิดชอบ</label>
                    <input type="text" class="form-control" id="jobTechnician" placeholder="ชื่อช่าง...">
                </div>
                <div class="form-group">
                    <label class="form-label">หมายเหตุ</label>
                    <textarea class="form-control" id="jobNotes" rows="2" placeholder="หมายเหตุ..."></textarea>
                </div>
            </div>

            <!-- Vehicle Info -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">directions_car</span> ข้อมูลยานพาหนะ</div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label required">ทะเบียนรถ</label>
                        <div id="jobPlateAC"></div>
                    </div>
                    <div class="form-group" style="align-items:flex-start;">
                        <label class="form-label">ป้ายแดง</label>
                        <div class="toggle" id="jobRedPlate"></div>
                    </div>
                </div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">รุ่นรถ</label>
                        <input type="text" class="form-control" id="jobModel" placeholder="Toyota Camry">
                    </div>
                    <div class="form-group">
                        <label class="form-label">เลขไมล์</label>
                        <input type="number" class="form-control" id="jobMileage" placeholder="0">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">เลขตัวถัง (Chassis)</label>
                    <input type="text" class="form-control" id="jobChassis" placeholder="VIN...">
                </div>
            </div>

            <!-- Customer Info -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">person</span> ข้อมูลลูกค้า</div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label required">ชื่อลูกค้า</label>
                        <div id="jobCustomerAC"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">เบอร์โทร</label>
                        <input type="text" class="form-control" id="jobCustomerPhone" placeholder="08x-xxx-xxxx">
                    </div>
                </div>
            </div>

            <!-- Payment Info + VAT Toggle -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">payment</span> การชำระเงิน</div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">ประเภทการชำระ</label>
                        <select class="form-control" id="jobPaymentType">
                            <option value="cash">เงินสด</option>
                            <option value="transfer">โอนเงิน</option>
                            <option value="credit">บัตรเครดิต</option>
                            <option value="qr">QR Payment</option>
                            <option value="credit_term">เครดิต</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ส่วนลด (%)</label>
                        <input type="number" class="form-control" id="jobDiscount" value="0" min="0" max="100">
                    </div>
                </div>
                <div id="jobVatToggle" style="margin-top:var(--sp-3);"></div>
            </div>

            <!-- Service Items Grid -->
            <div class="job-section job-items-section">
                <div class="job-section-title"><span class="material-icons-outlined">list_alt</span> รายการบริการ / สินค้า</div>
                <div class="toolbar" style="margin-bottom:var(--sp-3);gap:var(--sp-2);flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary" id="btnAddItem"><span class="material-icons-outlined" style="font-size:16px;">add</span> เพิ่มรายการ</button>
                    <button class="btn btn-sm btn-outline" id="btnShowFavorites"><span class="material-icons-outlined" style="font-size:16px;">star</span> สินค้าโปรด</button>
                </div>
                <div id="favoritesPanel" style="display:none;margin-bottom:var(--sp-3);padding:var(--sp-3);background:var(--color-warning-light);border-radius:var(--radius-md);">
                    <div style="font-weight:600;font-size:0.85rem;margin-bottom:var(--sp-2);">⭐ เลือกสินค้าโปรดเพื่อเพิ่มเข้ารายการ:</div>
                    <div id="favoritesGrid" style="display:flex;flex-wrap:wrap;gap:var(--sp-2);">กำลังโหลด...</div>
                </div>
                <div class="data-grid">
                    <table>
                        <thead>
                            <tr>
                                <th style="width:40px;">#</th>
                                <th>สินค้า / บริการ</th>
                                <th style="width:80px;">จำนวน</th>
                                <th style="width:100px;">ราคา/หน่วย</th>
                                <th style="width:100px;">ส่วนลด</th>
                                <th style="width:120px;">รวม</th>
                                <th style="width:60px;"></th>
                            </tr>
                        </thead>
                        <tbody id="jobItemsBody">
                            <tr><td colspan="7" class="grid-empty" style="text-align:center;padding:var(--sp-6);color:var(--color-text-muted);">กดปุ่ม "เพิ่มรายการ" เพื่อเริ่มต้น</td></tr>
                        </tbody>
                    </table>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:var(--sp-4);gap:var(--sp-6);">
                    <div style="text-align:right;">
                        <div class="text-sm text-muted">รวมก่อนส่วนลด</div>
                        <div class="text-bold" id="jobSubtotal">฿0.00</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="text-sm text-muted">ส่วนลด</div>
                        <div class="text-bold" style="color:var(--color-danger);" id="jobDiscountAmt">-฿0.00</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="text-sm text-muted">ภาษีมูลค่าเพิ่ม 7%</div>
                        <div class="text-bold" id="jobVat">฿0.00</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="text-sm" style="color:var(--color-primary);font-weight:600;">ยอดรวมสุทธิ</div>
                        <div style="font-size:1.4rem;font-weight:700;color:var(--color-primary);" id="jobTotal">฿0.00</div>
                    </div>
                </div>
            </div>

            <!-- Repair Evaluation -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">checklist</span> ประเมินงานซ่อม</div>
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">ผลการตรวจสอบ</label>
                        <select class="form-control" id="jobEvalResult">
                            <option value="">ยังไม่ประเมิน</option>
                            <option value="pass">ผ่าน ✅</option>
                            <option value="fix_needed">ต้องแก้ไข ⚠️</option>
                            <option value="fail">ไม่ผ่าน ❌</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">ผู้ประเมิน</label>
                        <input type="text" class="form-control" id="jobEvaluator" placeholder="ชื่อผู้ประเมิน...">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">บันทึกผลการประเมิน</label>
                    <textarea class="form-control" id="jobEvalNotes" rows="2" placeholder="ผลตรวจสอบ / รายละเอียดที่ต้องแก้ไข..."></textarea>
                </div>
            </div>

            <!-- Multiple Payment Methods -->
            <div class="job-section">
                <div class="job-section-title"><span class="material-icons-outlined">account_balance_wallet</span> แยกชำระหลายช่องทาง</div>
                <div id="jobPaymentMethods">
                    <div class="payment-row" style="display:flex;gap:var(--sp-3);align-items:center;margin-bottom:var(--sp-2);">
                        <select class="form-control pay-method" style="flex:1;">
                            <option value="cash">เงินสด</option>
                            <option value="transfer">โอนเงิน</option>
                            <option value="credit">บัตรเครดิต</option>
                            <option value="qr">QR Payment</option>
                            <option value="credit_term">เครดิต</option>
                        </select>
                        <input type="number" class="form-control pay-amount" placeholder="จำนวนเงิน" min="0" style="flex:1;">
                        <input type="text" class="form-control pay-ref" placeholder="อ้างอิง (ถ้ามี)" style="flex:1;">
                    </div>
                </div>
                <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-2);">
                    <button class="btn btn-sm btn-outline" id="btnAddPayment"><span class="material-icons-outlined" style="font-size:16px;">add</span> เพิ่มช่องทาง</button>
                    <span class="text-sm text-muted" style="align-self:center;" id="paymentSumLabel">ยอดชำระ: ฿0.00</span>
                </div>
            </div>
        </div>
    `;const a=D({container:t.querySelector("#jobPlateAC"),placeholder:"กข-1234 (พิมพ์เพื่อค้นหา)",fetchItems:async()=>(await h("vehicles")).map(o=>({id:o.id,code:o.plate_number,label:o.plate_number,secondary:`${o.brand||""} ${o.model||""}`.trim(),_raw:o})),onSelect:r=>{const o=r._raw;t.querySelector("#jobModel").value=`${o.brand||""} ${o.model||""}`.trim(),t.querySelector("#jobMileage").value=o.mileage||"",t.querySelector("#jobChassis").value=o.chassis_number||"",o.customer_id&&h("customers",{filter:`id='${k(o.customer_id)}'`}).then(u=>{if(u.length>0){const{customerAC:b}=L();b&&(b.setValue(u[0].name),b.setSelectedId(u[0].id)),t.querySelector("#jobCustomerPhone").value=u[0].phone||""}})}});ut(a);const n=D({container:t.querySelector("#jobCustomerAC"),placeholder:"ค้นหาลูกค้า...",fetchItems:async()=>(await h("customers")).map(o=>({id:o.id,code:o.code,label:o.name,secondary:o.phone||"",_raw:o})),onSelect:r=>{t.querySelector("#jobCustomerPhone").value=r._raw.phone||""}});bt(n);const s=ct({container:t.querySelector("#jobVatToggle"),vatEnabled:!1,vatMode:"customer_pays",onUpdate:()=>w(t)});mt(s);const l=t.querySelector("#jobRedPlate");l.addEventListener("click",()=>l.classList.toggle("active")),t.querySelector("#jobDiscount").addEventListener("input",()=>w(t)),t.querySelector("#btnAddItem").addEventListener("click",()=>{const r=t.querySelectorAll("#jobItemsBody tr:not(.grid-empty)").length;R(t,null,r+1)}),t.querySelector("#btnSaveJob").addEventListener("click",()=>gt(t,e)),t.querySelector("#btnClearJob").addEventListener("click",()=>X(t)),t.querySelector("#btnCloseJob").addEventListener("click",async()=>{var y,v,S,g;const{editingId:r}=L(),o=t.querySelectorAll("#jobItemsBody tr:not(.grid-empty)");let u=[];try{const p=await h("products"),m={};p.forEach(f=>{m[f.id]=f,m[f.code]=f}),o.forEach(f=>{var x,M,j,A;const C=((M=(x=f.querySelector(".item-prod"))==null?void 0:x.dataset)==null?void 0:M.selectedId)||((j=f.querySelector(".item-prod"))==null?void 0:j.value),_=parseFloat((A=f.querySelector(".item-price"))==null?void 0:A.value)||0,q=m[C];q&&q.cost>0&&_<q.cost&&u.push(`${q.name||q.code}: ขาย ฿${_} < ทุน ฿${q.cost}`)})}catch{}let b="คุณต้องการปิดใบงานนี้?";if(u.length>0&&(b=`⚠️ พบสินค้าราคาต่ำกว่าทุน:
${u.join(`
`)}

ยืนยันปิดงาน?`),await H("ปิดงาน",b)){const p=await h("job_items",{filter:`job_id='${k(r)}'`});let m=0;const f=[];try{const x=await h("products",{requestKey:null}),M={};x.forEach(j=>{M[j.id]=j});for(const j of p){const A=M[j.product_id],Y=A&&A.cost||0;m+=Y*(j.qty||0),j.product_id&&j.qty&&f.push({product_id:j.product_id,qty:j.qty,unit_price:j.unit_price||0})}}catch{}const C=parseFloat(t.dataset.total)||0,_=C-m;await F("jobs",r,{status:"closed",end_date:new Date().toISOString(),total_cost:Math.round(m*100)/100,profit:Math.round(_*100)/100});const q=t.querySelector("#jobDocId").value;await B("JOB",q,f),nt({job_no:q,plate:((y=t.querySelector("#jobPlateAC input"))==null?void 0:y.value)||"",customer_name:((g=(S=(v=t.querySelector("#jobCustomerPhone"))==null?void 0:v.closest(".job-section"))==null?void 0:S.querySelector('[id$="AC"] input'))==null?void 0:g.value)||"",grand_total:C}).catch(()=>{}),I(`ปิดงานเรียบร้อย (กำไร: ${_>=0?"":"-"}฿${Math.abs(_).toFixed(2)})`,_>=0?"success":"warning"),E(e.querySelector("#panel-search"),e),e.querySelector('.tab-btn[data-tab="search"]').click()}}),t.querySelector("#btnCancelJob").addEventListener("click",async()=>{const{editingId:r}=L();await H("ยกเลิกงาน","คุณต้องการยกเลิกใบงานนี้?")&&(await F("jobs",r,{status:"cancelled"}),I("ยกเลิกใบงานเรียบร้อย","warning"),E(e.querySelector("#panel-search"),e),e.querySelector('.tab-btn[data-tab="search"]').click())}),t.querySelector("#btnShowFavorites").addEventListener("click",async()=>{const r=t.querySelector("#favoritesPanel"),o=r.style.display!=="none";if(r.style.display=o?"none":"block",!o){const u=t.querySelector("#favoritesGrid");try{const b=await h("favorite_products");if(b.length===0){const y=await h("products");u.innerHTML=y.slice(0,20).map(v=>`<button class="btn btn-sm btn-outline fav-btn" data-id="${T(v.id)}" data-name="${T(v.name)}" data-price="${v.price||0}" style="font-size:0.8rem;">
                            ${T(v.name)} <span class="text-muted">(฿${v.price||0})</span>
                        </button>`).join("")}else{const y=await h("products"),v={};y.forEach(S=>{v[S.id]=S}),u.innerHTML=b.map(S=>{const g=v[S.product_id];return g?`<button class="btn btn-sm btn-outline fav-btn" data-id="${T(g.id)}" data-name="${T(g.name)}" data-price="${g.price||0}" style="font-size:0.8rem;">
                            ⭐ ${T(g.name)} <span class="text-muted">(฿${g.price||0})</span>
                        </button>`:""}).join("")}u.querySelectorAll(".fav-btn").forEach(y=>{y.addEventListener("click",()=>{const v=t.querySelectorAll("#jobItemsBody tr:not(.grid-empty)").length;R(t,{product_id:y.dataset.id,product_name:y.dataset.name,qty:1,unit_price:parseFloat(y.dataset.price)||0,discount:0},v+1)})})}catch{u.innerHTML='<span class="text-sm text-muted">ไม่สามารถโหลดข้อมูลได้</span>'}}}),t.querySelector("#btnAddPayment").addEventListener("click",()=>{const r=t.querySelector("#jobPaymentMethods"),o=document.createElement("div");o.className="payment-row",o.style.cssText="display:flex;gap:var(--sp-3);align-items:center;margin-bottom:var(--sp-2);",o.innerHTML=`
            <select class="form-control pay-method" style="flex:1;">
                <option value="cash">เงินสด</option>
                <option value="transfer">โอนเงิน</option>
                <option value="credit">บัตรเครดิต</option>
                <option value="qr">QR Payment</option>
                <option value="credit_term">เครดิต</option>
            </select>
            <input type="number" class="form-control pay-amount" placeholder="จำนวนเงิน" min="0" style="flex:1;">
            <input type="text" class="form-control pay-ref" placeholder="อ้างอิง" style="flex:1;">
            <button class="btn btn-sm btn-danger pay-remove"><span class="material-icons-outlined" style="font-size:16px;">close</span></button>
        `,r.appendChild(o),o.querySelector(".pay-remove").addEventListener("click",()=>{o.remove(),d()}),o.querySelector(".pay-amount").addEventListener("input",d)});function d(){let r=0;t.querySelectorAll(".pay-amount").forEach(u=>{r+=parseFloat(u.value)||0});const o=t.querySelector("#paymentSumLabel");o&&(o.textContent=`ยอดชำระ: ฿${r.toLocaleString("th-TH",{minimumFractionDigits:2})}`)}t.querySelectorAll(".pay-amount").forEach(r=>r.addEventListener("input",d))}export{wt as initJobPage};
